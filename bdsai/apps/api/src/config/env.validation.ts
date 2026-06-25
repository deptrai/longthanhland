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

  // Bucket lưu ảnh listing (Story sau dùng) — default 'listings'
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('listings'),

  // Connection pool (AC5) — giới hạn cho Supabase Free
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().int().nonnegative().default(20),
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
