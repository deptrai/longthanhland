import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import IORedis from 'ioredis';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import { REDIS_CONNECTION } from '../queue/queue.tokens';

/** Trạng thái một thành phần hạ tầng. */
export interface ComponentHealth {
  status: 'up' | 'down';
  /** Lý do khi down — KHÔNG chứa secret/PII (AD-8). */
  error?: string;
}

/** Kết quả healthcheck tổng hợp 3 thành phần. */
export interface SupabaseHealth {
  status: 'ok' | 'degraded';
  db: ComponentHealth;
  auth: ComponentHealth;
  storage: ComponentHealth;
}

/** Kết quả healthcheck Redis (AC1 — Story 1.6). */
export interface RedisHealth {
  status: 'ok' | 'degraded';
  redis: ComponentHealth;
}

/**
 * HealthService (AC3, AC7, AC1) — Story 1.2 + 1.6.
 *
 * Ping độc lập các thành phần:
 *   - db:      Drizzle `SELECT 1` qua postgres.js.
 *   - auth:    Supabase Auth admin (server-side) — list users (giới hạn 1).
 *   - storage: Supabase Storage — list buckets.
 *   - redis:   ioredis ping (Story 1.6 AC1).
 *
 * Mỗi thành phần được bọc try/catch riêng → một thành phần down KHÔNG làm
 * cả endpoint crash (AC3). AD-8: chỉ trả message ngắn, KHÔNG lộ key/connection string.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly supabase: SupabaseService,
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
  ) {}

  async checkSupabase(): Promise<SupabaseHealth> {
    const [db, auth, storage] = await Promise.all([
      this.checkDb(),
      this.checkAuth(),
      this.checkStorage(),
    ]);

    const allUp = db.status === 'up' && auth.status === 'up' && storage.status === 'up';
    return { status: allUp ? 'ok' : 'degraded', db, auth, storage };
  }

  private async checkDb(): Promise<ComponentHealth> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return { status: 'up' };
    } catch (e) {
      this.logger.warn(`DB healthcheck down: ${this.safeMessage(e)}`);
      return { status: 'down', error: this.safeMessage(e) };
    }
  }

  private async checkAuth(): Promise<ComponentHealth> {
    try {
      // Auth admin API: list user (1) — xác nhận client + key hoạt động.
      const { error } = await this.supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        // AD-8: redact message (nhánh non-throw cũng phải qua safeMessage).
        const safe = this.safeMessage(new Error(error.message));
        this.logger.warn(`Auth healthcheck down: ${safe}`);
        return { status: 'down', error: safe };
      }
      return { status: 'up' };
    } catch (e) {
      this.logger.warn(`Auth healthcheck down: ${this.safeMessage(e)}`);
      return { status: 'down', error: this.safeMessage(e) };
    }
  }

  private async checkStorage(): Promise<ComponentHealth> {
    try {
      const { error } = await this.supabase.storage.listBuckets();
      if (error) {
        // AD-8: redact message (nhánh non-throw cũng phải qua safeMessage).
        const safe = this.safeMessage(new Error(error.message));
        this.logger.warn(`Storage healthcheck down: ${safe}`);
        return { status: 'down', error: safe };
      }
      return { status: 'up' };
    } catch (e) {
      this.logger.warn(`Storage healthcheck down: ${this.safeMessage(e)}`);
      return { status: 'down', error: this.safeMessage(e) };
    }
  }

  /** Trích message ngắn, an toàn — KHÔNG để lộ chuỗi kết nối/key (AD-8). */
  private safeMessage(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    // Cắt ngắn + loại bỏ chuỗi giống connection string nếu vô tình lọt vào.
    return msg.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[redacted-url]').slice(0, 200);
  }

  /**
   * checkRedis (AC1 — Story 1.6) — ping Redis qua ioredis.
   * E1: Redis down → status down + error ngắn (KHÔNG crash endpoint).
   */
  async checkRedis(): Promise<RedisHealth> {
    const redis = await this.pingRedis();
    return { status: redis.status === 'up' ? 'ok' : 'degraded', redis };
  }

  private async pingRedis(): Promise<ComponentHealth> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        return { status: 'down', error: `Redis ping trả '${pong}'` };
      }
      return { status: 'up' };
    } catch (e) {
      this.logger.warn(`Redis healthcheck down: ${this.safeMessage(e)}`);
      return { status: 'down', error: this.safeMessage(e) };
    }
  }
}
