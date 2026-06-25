import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config (AC1, AC4, AC5) — Story 1.2.
 *
 * File CLI nằm NGOÀI DI nên đọc env trực tiếp qua dotenv được phép
 * (Consistency conventions: CLI script như drizzle.config dùng dotenv).
 *
 * - dialect postgresql, driver postgres.js (porsager) — Supabase-recommended.
 * - schema './src/db/schema/*' (story này RỖNG — AC4, KHÔNG bảng nghiệp vụ).
 * - out './src/db/migrations' (TÁCH khỏi supabase/migrations để Drizzle là
 *   nguồn chân lý duy nhất cho schema nghiệp vụ — tránh xung đột 2 hệ migration).
 */
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    '[drizzle.config] Thiếu DATABASE_URL. Tạo apps/api/.env từ .env.example trước khi chạy db:generate/db:migrate.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  // Migration metadata table mặc định: drizzle.__drizzle_migrations (AC1).
  verbose: true,
  strict: true,
});
