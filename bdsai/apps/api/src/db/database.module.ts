import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../config/env.validation';
import { DRIZZLE, PG_CLIENT, type DrizzleDB } from './database.tokens';

/**
 * DatabaseModule (AC1, AC5, AD-1) — Story 1.2.
 *
 * Khởi tạo postgres.js client + Drizzle ORM, expose qua DI token DRIZZLE / PG_CLIENT.
 * Module khác inject token — KHÔNG tạo connection riêng (AD-1 Module Isolation).
 *
 * @Global: DB là hạ tầng dùng chung; tránh import lặp ở mọi module nghiệp vụ.
 *
 * AC5 — Connection pooling Supabase Free:
 *   - prepare: false  → BẮT BUỘC cho Supavisor transaction pool mode (prod 6543).
 *     Local 54352 cũng để false cho nhất quán an toàn.
 *   - max             → giới hạn số connection (Free tier rất thấp); default 10.
 *   - idle_timeout    → giải phóng connection rảnh (giây); default 20.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = config.get('DATABASE_URL', { infer: true });
        const max = config.get('DB_POOL_MAX', { infer: true });
        const idleTimeout = config.get('DB_IDLE_TIMEOUT', { infer: true });

        // postgres.js — driver Supabase-recommended.
        return postgres(url, {
          prepare: false,
          max,
          idle_timeout: idleTimeout,
        });
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_CLIENT],
      useFactory: (client: ReturnType<typeof postgres>): DrizzleDB =>
        drizzle({ client }) as DrizzleDB,
    },
  ],
  exports: [DRIZZLE, PG_CLIENT],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_CLIENT) private readonly client: ReturnType<typeof postgres>) {}

  /** Đóng pool khi app shutdown (enableShutdownHooks) — tránh connection leak (AC5). */
  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
