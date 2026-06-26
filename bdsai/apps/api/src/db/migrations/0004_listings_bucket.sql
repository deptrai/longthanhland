-- Story 3.2 AC — Supabase Storage bucket `listings` (AD-7 Image Storage Convention).
--
-- Bucket PUBLIC (listing images hiển thị công khai trên marketplace).
-- RLS: public read (SELECT), service-role write (INSERT/UPDATE/DELETE).
-- Service-role bypass RLS (Drizzle direct PG / supabase-js service-role client).
--
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING + DO block cho policies.

INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('listings', 'listings', true)
ON CONFLICT ("id") DO NOTHING;

-- Public read: ai cũng xem được listing images (bucket public).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'listings_public_read'
  ) THEN
    CREATE POLICY "listings_public_read" ON "storage"."objects"
      FOR SELECT
      USING ("bucket_id" = 'listings');
  END IF;
END $$;

-- Service-role write: chỉ service-role (backend) upload/update/delete listing images.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'listings_service_write'
  ) THEN
    CREATE POLICY "listings_service_write" ON "storage"."objects"
      FOR ALL
      TO service_role
      USING ("bucket_id" = 'listings')
      WITH CHECK ("bucket_id" = 'listings');
  END IF;
END $$;
