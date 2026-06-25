CREATE TABLE "public_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Story 2.1 AC1 — RLS policy cho public_users (thêm thủ công, Drizzle không generate RLS).
--
-- AD-2 (Single Data Mutation Path): anon KHÔNG INSERT/UPDATE/DELETE —
--   mutation qua NestJS API → Service → Drizzle (service-role / direct PG).
-- AD-5 (Auth Separation): public_users.id = auth.users.id (Supabase Auth quản lý).
--   Drizzle KHÔNG define FK vì auth.users ngoài schema — FK logic quản lý bởi
--   Supabase Auth (ON DELETE CASCADE khi admin.deleteUser).
--
-- RLS áp dụng khi connect qua Supabase client (anon/auth key).
-- Drizzle direct PG (DATABASE_URL, postgres.js) bypass RLS (superuser role) —
--   NestJS insert KHÔNG bị block. RLS protect frontend direct Supabase access.

ALTER TABLE "public_users" ENABLE ROW LEVEL SECURITY;

-- User chỉ SELECT row của chính mình (id = auth.uid()).
CREATE POLICY "users_select_own" ON "public_users"
  FOR SELECT
  USING ("id" = auth.uid());

-- Service-role full access (bypass RLS — service-role key).
-- Drizzle direct PG cũng bypass (superuser). Policy này cho Supabase client service-role.
CREATE POLICY "service_role_all" ON "public_users"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- KHÔNG policy INSERT/UPDATE/DELETE cho anon (AD-2 — mutation qua NestJS API).

-- Story 2.1 AC1 — FK public_users.id → auth.users.id ON DELETE CASCADE.
-- Supabase Auth quản lý auth.users (ngoài schema Drizzle) → FK tạo thủ công
-- (drizzle-kit không generate FK tới bảng ngoài schema). Khi admin.deleteUser
-- hoặc user bị xóa khỏi auth.users → public_users row tự xóa (no orphan).
ALTER TABLE "public_users"
  ADD CONSTRAINT "public_users_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
