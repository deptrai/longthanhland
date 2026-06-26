-- Story 4.4: appeal_requests table — seller khiếu nại điểm trust score.
CREATE TABLE IF NOT EXISTS "appeal_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "public_listings"("id") ON DELETE CASCADE,
  "seller_id" uuid NOT NULL REFERENCES "public_users"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending', -- 'pending' | 'reviewed' | 'resolved'
  "admin_note" text,
  "reviewed_by" uuid REFERENCES "public_users"("id") ON DELETE SET NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "idx_appeal_seller" ON "appeal_requests" USING btree ("seller_id");
CREATE INDEX IF NOT EXISTS "idx_appeal_status" ON "appeal_requests" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_appeal_created" ON "appeal_requests" USING btree ("created_at");
