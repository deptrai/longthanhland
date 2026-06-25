ALTER TABLE "public_users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "public_users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "public_users" ADD COLUMN "display_name" text;--> statement-breakpoint

-- Story 2.3 AC1 — Supabase Storage bucket `avatars` (AD-7 Image Storage Convention).
--
-- Bucket PUBLIC (avatar hiển thị công khai trên profile/listing).
-- RLS: public read (SELECT), service-role write (INSERT/UPDATE/DELETE).
-- Service-role bypass RLS (Drizzle direct PG / supabase-js service-role client).
--
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING (re-run migration safe — AD-1).
-- Policies ON CONFLICT DO NOTHING tránh duplicate policy error khi re-run.
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('avatars', 'avatars', true)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

-- Public read: ai cũng xem được avatar (bucket public).
-- Supabase Storage RLS policy trên storage.objects (KHÔNG phải storage.policies).
CREATE POLICY "avatars_public_read" ON "storage"."objects"
  FOR SELECT
  USING ("bucket_id" = 'avatars');--> statement-breakpoint

-- Service-role write: chỉ service-role (backend) upload/update/delete avatar.
-- auth.role() = 'service_role' — anon/auth user KHÔNG write trực tiếp (AD-2).
CREATE POLICY "avatars_service_write" ON "storage"."objects"
  FOR ALL
  TO service_role
  USING ("bucket_id" = 'avatars')
  WITH CHECK ("bucket_id" = 'avatars');
