import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicUsers } from '../db/schema/public-users';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { normalizePhone, toE164 } from './phone-normalize';
import { registerApiSchema, type RegisterDto } from './dto/register.dto';
import { type LoginDto } from './dto/login.dto';

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

// Story 2.2 — login/logout/refresh/me response types.

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    phoneVerified: boolean;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  banned: boolean;
  createdAt: Date;
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

  // --- Story 2.2: login / logout / refresh / getMe ---

  /**
   * login() (AC1, AC3, E1, E2, E3, E7) — Story 2.2.
   *
   * Flow:
   *   1. supabase.auth.signInWithPassword({ email, password }) → session.
   *   2. If error → generic 401 "Email hoặc mật khẩu không đúng" (AC3 — anti-enumeration).
   *   3. Query public_users → check banned (E7 → 403).
   *   4. Return { accessToken, refreshToken, user }.
   *
   * AD-5: signInWithPassword qua service-role client (persistSession: false).
   * AD-8: KHÔNG log email raw — log chỉ reason + userId.
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    // Step 1: Supabase Auth signInWithPassword.
    let session: {
      access_token: string;
      refresh_token: string;
      user: { id: string; email?: string };
    };
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });
      if (error) throw error;
      if (!data.session || !data.user) {
        throw new Error('Supabase signInWithPassword trả session null');
      }
      session = data.session;
    } catch (e) {
      const message = this.extractMessage(e);
      // E3: email chưa verify → 403 (message khác — user đã biết email mình).
      if (this.isEmailNotConfirmed(message)) {
        this.logger.warn(
          { action: 'login', reason: 'email-not-confirmed' },
          'Email chưa xác thực',
        );
        throw new ForbiddenException('Vui lòng xác thực email trước khi đăng nhập');
      }
      // AC3/E1/E2: sai password hoặc email không tồn tại → generic 401.
      this.logger.warn(
        { action: 'login', reason: 'invalid-credentials' },
        'Đăng nhập thất bại — thông tin không hợp lệ',
      );
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Step 2: Query public_users → check banned (E7).
    let userRow: typeof publicUsers.$inferSelect | undefined;
    try {
      const rows = await this.db
        .select()
        .from(publicUsers)
        .where(eq(publicUsers.id, session.user.id));
      userRow = rows[0];
    } catch (e) {
      this.logger.error(
        { userId: session.user.id, action: 'login', reason: 'db-fail', err: this.safeErr(e) },
        'public_users query thất bại trong login',
      );
      throw new InternalServerErrorException('Đăng nhập thất bại');
    }

    if (!userRow) {
      // Orphan — user có Supabase Auth nhưng thiếu public_users (Story 2.1 R1).
      this.logger.warn(
        { userId: session.user.id, action: 'login', reason: 'orphan-user' },
        'public_users row không tồn tại (orphan)',
      );
      throw new NotFoundException('Hồ sơ người dùng không tồn tại');
    }

    if (userRow.banned) {
      // E7: banned → 403, KHÔNG return JWT.
      this.logger.warn(
        { userId: session.user.id, action: 'login', reason: 'banned' },
        'Tài khoản đã bị khóa',
      );
      throw new ForbiddenException('Tài khoản đã bị khóa');
    }

    this.logger.log(
      { userId: session.user.id, action: 'login', reason: 'success' },
      'Đăng nhập thành công',
    );

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: {
        id: session.user.id,
        email: userRow.email,
        role: userRow.role,
        phoneVerified: userRow.phoneVerified,
      },
    };
  }

  /**
   * logout() (AC2, E6) — Story 2.2.
   *
   * Supabase Auth signOut({ scope: 'global' }) — revoke tất cả session.
   * JwtAuthGuard đã verify JWT signature + extract userId → truyền trực tiếp
   * (KHÔNG decode lại — fix HIGH-1: jwt.decode không verify signature → DoS).
   * E6 idempotent: signOut fail (đã logout) → vẫn 200 + clear cookie.
   *
   * @param userId — từ req.user.id (guard đã verify JWT signature).
   */
  async logout(userId: string): Promise<{ message: string }> {
    try {
      // AC2: signOut global — revoke tất cả refresh token của user.
      await this.supabase.auth.admin.signOut(userId, 'global');
    } catch (e) {
      // E6 idempotent: signOut fail (đã logout) → vẫn 200 + clear cookie.
      this.logger.warn(
        { userId, action: 'logout', reason: 'supabase-fail', err: this.safeErr(e) },
        'Supabase signOut thất bại (KHÔNG block — cookie vẫn clear)',
      );
    }

    this.logger.log(
      { userId, action: 'logout', reason: 'success' },
      'Đăng xuất thành công',
    );
    return { message: 'Đăng xuất thành công' };
  }

  /**
   * refresh() (AC5, E5) — Story 2.2.
   *
   * Đọc refresh_token (từ cookie ưu tiên, body fallback).
   * supabase.auth.refreshSession({ refresh_token }) → new session (rotated).
   * Refresh fail → 401 "Phiên hết hạn, vui lòng đăng nhập lại" + clear cookie.
   */
  async refresh(refreshToken: string | undefined): Promise<RefreshResponse> {
    if (!refreshToken) {
      // AC5a: KHÔNG có refresh_token → 401.
      throw new UnauthorizedException('Phiên hết hạn, vui lòng đăng nhập lại');
    }

    let newSession: { access_token: string; refresh_token: string };
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data.session) {
        throw new Error('Supabase refreshSession trả session null');
      }
      newSession = data.session;
    } catch (e) {
      // E5: refresh token hết hạn / revoked → 401 + clear cookie.
      this.logger.warn(
        { action: 'refresh', reason: 'refresh-fail', err: this.safeErr(e) },
        'Refresh token không hợp lệ — phiên hết hạn',
      );
      throw new UnauthorizedException('Phiên hết hạn, vui lòng đăng nhập lại');
    }

    this.logger.log(
      { action: 'refresh', reason: 'success' },
      'Refresh token thành công',
    );

    return {
      accessToken: newSession.access_token,
      refreshToken: newSession.refresh_token,
    };
  }

  /**
   * getMe() (AC7) — Story 2.2.
   *
   * Guard đã verify JWT + attach request.user.id.
   * Query public_users → return profile.
   * Orphan (no row) → 404.
   */
  async getMe(userId: string): Promise<MeResponse> {
    let userRow: typeof publicUsers.$inferSelect | undefined;
    try {
      const rows = await this.db
        .select()
        .from(publicUsers)
        .where(eq(publicUsers.id, userId));
      userRow = rows[0];
    } catch (e) {
      this.logger.error(
        { userId, action: 'me', reason: 'db-fail', err: this.safeErr(e) },
        'public_users query thất bại trong getMe',
      );
      throw new InternalServerErrorException('Lỗi truy vấn hồ sơ');
    }

    if (!userRow) {
      // AC7d: orphan → 404.
      this.logger.warn(
        { userId, action: 'me', reason: 'not-found' },
        'Hồ sơ người dùng không tồn tại (orphan)',
      );
      throw new NotFoundException('Hồ sơ người dùng không tồn tại');
    }

    return {
      id: userRow.id,
      email: userRow.email,
      phone: userRow.phone,
      phoneVerified: userRow.phoneVerified,
      role: userRow.role,
      banned: userRow.banned,
      createdAt: userRow.createdAt,
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

  /** Phát hiện email chưa verify (E3) — Supabase trả "Email not confirmed". */
  private isEmailNotConfirmed(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('email not confirmed') || lower.includes('email_not_confirmed');
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
