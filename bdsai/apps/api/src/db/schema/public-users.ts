import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

/**
 * Bảng public_users (AC1, AD-5) — Story 2.1.
 *
 * Business entity cho user profile (song song với Supabase Auth `auth.users`).
 * AD-5 (Auth Separation): Supabase Auth quản lý auth (signup, email verify,
 * session), NestJS quản lý business (role discriminator, banned flag).
 *
 * `id` = `auth.users.id` (uuid) — KHÔNG auto-generate, dùng id từ
 * `supabase.auth.admin.createUser` (AC4). Drizzle KHÔNG define `.references()`
 * vì `auth.users` nằm NGOÀI schema Drizzle (Supabase Auth quản lý). FK
 * ON DELETE CASCADE được tạo thủ công trong migration 0001 (sau RLS section) —
 * khi Supabase Auth user bị xóa → public_users row tự xóa.
 *
 * RLS (xem migration 0001):
 *   - User SELECT row của chính mình (id = auth.uid()).
 *   - Service-role full access (bypass RLS — service-role key).
 *   - Anon KHÔNG INSERT/UPDATE/DELETE (AD-2 — mutation qua NestJS API).
 *   - Drizzle direct PG (DATABASE_URL) bypass RLS (superuser role).
 */
export const publicUsers = pgTable('public_users', {
  // FK → auth.users.id (KHÔNG .references() — auth.users ngoài schema Drizzle).
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  // Đã chuẩn hóa format 0xxxxxxxxx (AC5 — normalizePhone trước insert).
  phone: text('phone').notNull(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  // AD-5 role discriminator: 'user' | 'admin'.
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
