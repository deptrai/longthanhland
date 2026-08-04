import { z } from 'zod';

/**
 * Env validation schema (AC2) — Story 1.2.
 *
 * Dùng Zod (nhất quán với @bdsai/shared FE/BE). Mọi biến Supabase bắt buộc;
 * thiếu → throw lúc bootstrap (fail-fast) với thông báo rõ ràng.
 *
 * AD-8 (PII/secret): KHÔNG log giá trị key. Khi validate fail chỉ in tên biến
 * + lý do, KHÔNG in value.
 */
export const envSchema = z.object({
  // Cổng API (default 3101 — khớp Story 1.1)
  API_PORT: z.coerce.number().int().positive().default(3101),

  // Chuỗi kết nối PostgreSQL (local trực tiếp 54352; prod = Supavisor 6543)
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL là bắt buộc (chuỗi kết nối PostgreSQL)')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL phải là chuỗi postgres:// hoặc postgresql://',
    }),

  // Supabase REST/Auth/Storage gateway (kong) — local http://127.0.0.1:54351
  SUPABASE_URL: z.string().url('SUPABASE_URL phải là URL hợp lệ'),

  // anon key (public, dùng cho FE) — server cũng giữ để tham chiếu
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY là bắt buộc'),

  // service-role key — CHỈ backend (apps/api). KHÔNG bao giờ lộ ra FE (AD-5).
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY là bắt buộc (chỉ backend)'),

  // Story 2.2 AC6: Supabase JWT secret — verify JWT local trong JwtAuthGuard.
  // Local: supabase status output (hoặc config.toml [auth] jwt_secret).
  // Demo local cố định (super-secret-jwt-token-with-at-least-32-characters-long).
  SUPABASE_JWT_SECRET: z
    .string()
    .min(32, 'SUPABASE_JWT_SECRET là bắt buộc (≥ 32 ký tự — xem supabase status)'),

  // Bucket lưu ảnh listing (Story sau dùng) — default 'listings'
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('listings'),

  // Connection pool (AC5) — giới hạn cho Supabase Free
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  // idle_timeout phải > 0: 0 = disabled → connection leak trên Supabase Free (LOW-6).
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(20),

  // --- Redis (Story 1.6 AC1) — BullMQ queue backend ---
  // Optional (default redis://localhost:6379). Supabase local KHÔNG có Redis —
  // chạy riêng: docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine.
  // E1 graceful degradation: QueueModule ping fail → log warn + queue disabled,
  // app vẫn boot (Redis là hạ tầng job nền, không bắt buộc healthcheck cơ bản).
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  // --- Sentry (Story 1.6 AC4) — error tracking ---
  // Optional (default empty = disabled). E2: DSN empty → Sentry.init skip,
  // captureException no-op (SDK handle tự). KHÔNG crash app khi thiếu DSN.
  SENTRY_DSN: z.string().default(''),

  // --- Monitoring thresholds (Story 1.6 AC7, NFR5) ---
  // Supabase Free: DB 500MB → cảnh báo 400MB (80%). Storage 1GB → 800MB (80%).
  DB_SIZE_ALERT_MB: z.coerce.number().int().positive().default(400),
  STORAGE_SIZE_ALERT_MB: z.coerce.number().int().positive().default(800),

  // --- Email (Story 6.2) — Resend API ---
  // Optional (default empty = dev log-only mode). Prod: set RESEND_API_KEY.
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('no-reply@bdsai.vn'),

  // --- Xaction (Story 5.1) — cross-post promotion providers ---
  // Optional (default empty = all providers disabled — graceful).
  // Comma-separated platform names: facebook,cho_tot,zalo.
  // Story 5.2: facebook → FacebookProvider (gọi XActions REST API thật).
  XACTION_ENABLED_PROVIDERS: z.string().default(''),

  // --- XActions REST API (Story 5.2) — FacebookProvider backend ---
  // XActions (Express.js self-hosted) base URL. Default local dev.
  XACTIONS_API_URL: z.string().url('XACTIONS_API_URL phải là URL hợp lệ').default('http://localhost:3000'),
  // JWT Bearer token cho XActions auth. Optional — required khi facebook enabled
  // (ProviderRegistry validate: token empty + facebook enabled → graceful skip, E5).
  // AD-8: KHÔNG log raw value (pino redact).
  XACTIONS_API_TOKEN: z.string().default(''),
  // FB account — preferred path: XActions stored account ID (server-side decrypt).
  XACTIONS_FB_ACCOUNT_ID: z.string().default(''),
  // FB account — raw cookie fallback (MVP): c_user + xs cookie values.
  // AD-8: secret — KHÔNG log raw value.
  XACTIONS_FB_C_USER: z.string().default(''),
  XACTIONS_FB_XS: z.string().default(''),

  // --- Web URL (Story 5.2) — ListingFormatter listing link base ---
  // Default https://bdsai.vn. ListingFormatter tạo link https://bdsai.vn/listings/[id].
  BDSAI_WEB_URL: z.string().url('BDSAI_WEB_URL phải là URL hợp lệ').default('https://bdsai.vn'),

  // --- Chợ Tốt (Story 5.3) — ChoTotProvider assisted posting ---
  // Chợ Tốt posting page URL (seller click link → manual post → PATCH confirm).
  CHOTOT_POSTING_URL: z.string().url('CHOTOT_POSTING_URL phải là URL hợp lệ').default('https://www.chotot.com/dang-tin'),

  // --- Zalo (Story 5.4) — ZaloProvider assisted posting ---
  // Zalo web client URL (seller click link → manual post → PATCH confirm).
  ZALO_POSTING_URL: z.string().url('ZALO_POSTING_URL phải là URL hợp lệ').default('https://chat.zalo.me/'),

  // --- Nowing engine (Story 7.1a) — bdsai calls Nowing engine ---
  // Base URL of Nowing API. Default local dev.
  NOWING_ENGINE_URL: z.string().url('NOWING_ENGINE_URL phải là URL hợp lệ').default('http://localhost:8000'),
  // API key for Nowing engine auth.
  // AD-8: KHÔNG log raw value, KHÔNG commit giá trị thật.
  NOWING_ENGINE_API_KEY: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Hàm validate truyền cho `ConfigModule.forRoot({ validate })`.
 * Trả về object đã parse (đã coerce kiểu) khi hợp lệ; throw Error khi thiếu/sai.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    // Chỉ in tên biến + lý do (AD-8) — KHÔNG in value (tránh lộ secret).
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `[bdsai-api] Cấu hình môi trường không hợp lệ. Kiểm tra .env (mẫu ở .env.example):\n${issues}`,
    );
  }

  return result.data;
}
