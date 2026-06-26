-- Story 6.1 — inquiries table (buyer liên hệ seller).
-- Story 6.2 — notification email via BullMQ.

CREATE TABLE IF NOT EXISTS "public"."inquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL REFERENCES "public"."public_listings"("id") ON DELETE CASCADE,
  "buyer_id" uuid REFERENCES "public"."public_users"("id") ON DELETE SET NULL,
  "buyer_name" text NOT NULL,
  "buyer_phone" text NOT NULL,
  "buyer_email" text,
  "message" text NOT NULL,
  "status" text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'closed')),
  "ip_address" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON "inquiries" (listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON "inquiries" (buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_seller ON "inquiries" (listing_id, created_at DESC);

ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inquiries_service_all" ON "inquiries"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "inquiries_seller_read" ON "inquiries"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public_listings pl
    WHERE pl.id = inquiries.listing_id AND pl.seller_id = auth.uid()
  ));
