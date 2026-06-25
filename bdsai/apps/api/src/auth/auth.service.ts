import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicUsers } from '../db/schema/public-users';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { normalizePhone, toE164 } from './phone-normalize';
import { registerApiSchema, type RegisterDto } from './dto/register.dto';

/**
 * AuthService (AC4, AC5, AC7, AD-2, AD-5, AD-6, AD-8) — Story 2.1.
 *
 * register() flow:
 *   1. Validate input (Zod — AC3) + normalize phone (AC5).
 *   2. Supabase Auth admin.createUser (service-role — AD-5) → userId.
 *   3. public_users insert (Drizzle — AD-2 business entity).
 *   4. Compensate rollback nếu insert fail → admin.deleteUser (AC4c, E5).
 *   5. Enqueue email verification job (AD-6 — async, KHÔNG await job).
 *   6. Return { userId, email, phoneVerified, emailVerified }.
 *
 * AD-2: 2 write (Supabase Auth + public_users) KHÔNG cùng PG transaction
 * (Supabase Auth ngoài PG) → compensate rollback là cơ chế nhất quán thay thế.
 *
 * AD-8: KHÔNG log email/phone raw — pino redact + log chỉ userId/context.
 */
export interface RegisterResponse {
  userId: string;
  email: string;
  phoneVerified: boolean;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly queueService: QueueService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    // AC5: normalize phone trước insert (validate đã qua Zod preprocess).
    const normalizedPhone = normalizePhone(dto.phone);

    // --- Step 1: Supabase Auth createUser (service-role — AD-5) ---
    let authUserId: string;
    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        // Supabase Auth yêu cầu phone E.164 (+84xxxxxxxxx).
        phone: toE164(normalizedPhone),
        email_confirm: false,
      });
      if (error) throw error;
      if (!data.user) {
        throw new Error('Supabase createUser trả user null');
      }
      authUserId = data.user.id;
    } catch (e) {
      const message = this.extractMessage(e);
      const errorCode = this.extractErrorCode(e);
      // E1: email trùng → 409 Conflict (AC7).
      if (this.isDuplicateEmail(message, errorCode)) {
        // AD-8: redact email/phone khỏi rawMsg (Supabase message có thể chứa PII).
        const safeRawMsg = message
          .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email-redacted]')
          .replace(/(\+?84|0)\d{9,10}/g, '[phone-redacted]')
          .slice(0, 200);
        this.logger.warn(
          { action: 'register', reason: 'duplicate-email', rawMsg: safeRawMsg },
          'Email đã được đăng ký',
        );
        throw new ConflictException('Email đã được đăng ký');
      }
      // Phone trùng → 409 Conflict (Supabase Auth enforce phone unique).
      if (this.isPhoneExists(message, errorCode)) {
        this.logger.warn(
          { action: 'register', reason: 'duplicate-phone' },
          'Số điện thoại đã được sử dụng',
        );
        throw new ConflictException('Số điện thoại đã được sử dụng');
      }
      // E9: rate limit → 429 (Supabase Auth built-in).
      if (this.isRateLimited(message)) {
        this.logger.warn(
          { action: 'register', reason: 'rate-limit' },
          'Supabase Auth rate limit',
        );
        throw new ConflictException('Quá nhiều yêu cầu, thử lại sau');
      }
      // E4: network/service down → 500 generic (AD-8 — không leak).
      this.logger.error(
        { action: 'register', reason: 'supabase-fail', err: this.safeErr(e) },
        'Supabase Auth createUser thất bại',
      );
      throw new InternalServerErrorException('Đăng ký thất bại');
    }

    // --- Step 2: public_users insert (Drizzle — AD-2) ---
    try {
      await this.db.insert(publicUsers).values({
        id: authUserId,
        email: dto.email,
        phone: normalizedPhone,
        role: 'user',
      });
    } catch (e) {
      // E5: compensate rollback — xóa Supabase Auth user (AC4c).
      this.logger.error(
        { userId: authUserId, action: 'register', reason: 'insert-fail', err: this.safeErr(e) },
        'public_users insert thất bại — compensate rollback',
      );
      try {
        await this.supabase.auth.admin.deleteUser(authUserId);
        this.logger.warn(
          { userId: authUserId, action: 'register', reason: 'compensate-done' },
          'Đã xóa Supabase Auth user (compensate rollback)',
        );
      } catch (delErr) {
        // R1: compensate fail — log critical + Sentry capture (orphan user).
        this.logger.error(
          { userId: authUserId, action: 'register', reason: 'compensate-fail', err: this.safeErr(delErr) },
          'CRITICAL: compensate rollback thất bại — orphan Supabase Auth user',
        );
      }
      throw new InternalServerErrorException('Đăng ký thất bại');
    }

    // --- Step 3: enqueue email verification job (AD-6 — async) ---
    // Lưu ý (HIGH-2 fix): admin.createUser KHÔNG tự gửi confirmation email kể cả
    // khi config.toml enable_confirmations=true (chỉ anon signUp gửi). Email xác
    // thực thực sự cho path admin.createUser sẽ gửi qua EmailProcessor custom SMTP
    // (Story 6.2) hoặc admin.inviteUserByEmail (Story 2.2). Job này là wrapper cho
    // future custom SMTP. KHÔNG await job hoàn thành.
    try {
      await this.queueService.addEmailVerificationJob({
        userId: authUserId,
        email: dto.email,
      });
    } catch (e) {
      // Queue fail KHÔNG block registration — email verify deferred (xem comment Step 3).
      this.logger.warn(
        { userId: authUserId, action: 'register', reason: 'queue-fail', err: this.safeErr(e) },
        'Email verification job enqueue thất bại (KHÔNG block — email verify deferred)',
      );
    }

    this.logger.log(
      { userId: authUserId, action: 'register', reason: 'success' },
      'Đăng ký thành công',
    );

    return {
      userId: authUserId,
      email: dto.email,
      phoneVerified: false,
      emailVerified: false,
    };
  }

  /** Phát hiện error "User already registered" (email trùng) từ Supabase Auth (E1/AC7). */
  private isDuplicateEmail(message: string, errorCode?: string): boolean {
    // Ưu tiên error_code từ Supabase (email_exists).
    if (errorCode === 'email_exists') return true;
    if (errorCode === 'phone_exists') return false;
    const lower = message.toLowerCase();
    // Chỉ match "user already registered" (email), KHÔNG match "phone already registered".
    return (
      lower.includes('user already registered') ||
      lower.includes('user already exists') ||
      lower.includes('email already')
    );
  }

  /** Phát hiện phone trùng (Supabase Auth enforce phone unique). */
  private isPhoneExists(message: string, errorCode?: string): boolean {
    if (errorCode === 'phone_exists') return true;
    return message.toLowerCase().includes('phone number already registered');
  }

  /** Extract error_code từ Supabase error object. */
  private extractErrorCode(e: unknown): string | undefined {
    if (typeof e === 'object' && e !== null && 'error_code' in e) {
      return String((e as Record<string, unknown>).error_code);
    }
    if (typeof e === 'object' && e !== null && 'code' in e) {
      const code = (e as Record<string, unknown>).code;
      // Supabase error_code là string (email_exists/phone_exists), code số (422).
      if (typeof code === 'string') return code;
    }
    return undefined;
  }

  /** Phát hiện rate limit error từ Supabase Auth (E9). */
  private isRateLimited(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('rate limit') || lower.includes('too many requests');
  }

  /**
   * Extract message từ error — handle cả Supabase error object (có .message
   * nhưng KHÔNG phải Error instance) và Error thường.
   */
  private extractMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'object' && e !== null && 'message' in e) {
      return String((e as Record<string, unknown>).message);
    }
    return String(e);
  }

  /** AD-8: redact thông tin nhạy cảm khỏi error object trước khi log. */
  private safeErr(e: unknown): { name: string; message: string } {
    if (e instanceof Error) {
      // Strip email/phone khỏi message (AD-8 — KHÔNG log PII raw).
      const safeMsg = e.message
        .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email-redacted]')
        .replace(/0\d{9,10}/g, '[phone-redacted]')
        .slice(0, 300);
      return { name: e.name, message: safeMsg };
    }
    // Supabase error object — extract message + redact PII.
    const msg = this.extractMessage(e);
    const safeMsg = msg
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email-redacted]')
      .replace(/0\d{9,10}/g, '[phone-redacted]')
      .slice(0, 300);
    return { name: 'SupabaseError', message: safeMsg };
  }
}

export { registerApiSchema };
