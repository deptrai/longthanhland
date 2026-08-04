-- Story 5.1 AC2 — cross_posts table + enums + indexes + RLS.
--
-- AD-2 (Single Data Mutation Path): anon KHÔNG INSERT/UPDATE/DELETE —
--   mutation qua NestJS PromotionService → Drizzle.
-- AD-9 (Cross-Post Lifecycle Integrity): status phản ánh trạng thái thực.
--   listing transition REJECTED/DELETED/SOLD/EXPIRED → enqueue best-effort removal.
-- E1 (Duplicate prevention): unique index (listing_id, platform).
-- E7 (ON DELETE CASCADE): listing delete → cross_posts cascade delete.
-- AD-8 (PII): cross_posts KHÔNG lưu PII raw — chỉ listingId + platform + externalUrl.

-- Enum types (idempotent — DO $$ ... IF NOT EXISTS).
DO $$ BEGIN
  CREATE TYPE "cross_post_platform" AS ENUM ('facebook', 'cho_tot', 'zalo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "cross_post_status" AS ENUM ('pending', 'posted', 'failed', 'removed', 'removal_failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."cross_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "public"."public_listings"("id") ON DELETE CASCADE,
  "platform" "cross_post_platform" NOT NULL,
  "external_url" text,
  "provider_job_id" text,
  "status" "cross_post_status" NOT NULL DEFAULT 'pending',
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Index: list cross-posts by listing (seller dashboard FR12).
CREATE INDEX IF NOT EXISTS "idx_cross_posts_listing" ON "cross_posts" (listing_id);

-- Unique index: 1 listing × 1 platform = 1 row (E1 duplicate prevention, DB-level).
-- Cho promote lại: reuse existing row (update status pending) thay vì insert mới.
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cross_posts_listing_platform"
  ON "cross_posts" (listing_id, platform);

-- RLS: service_role full access (backend Drizzle). Seller read own via listing ownership.
ALTER TABLE "cross_posts" ENABLE ROW LEVEL SECURITY;

-- M3 fix: CREATE POLICY bọc trong DO $$ ... IF NOT EXISTS (idempotent — chạy 2x không lỗi).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cross_posts' AND policyname = 'cross_posts_service_all') THEN
    CREATE POLICY "cross_posts_service_all" ON "cross_posts"
      FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cross_posts' AND policyname = 'cross_posts_seller_read') THEN
    CREATE POLICY "cross_posts_seller_read" ON "cross_posts"
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public_listings pl
        WHERE pl.id = cross_posts.listing_id AND pl.seller_id = auth.uid()
      ));
  END IF;
END $$;
