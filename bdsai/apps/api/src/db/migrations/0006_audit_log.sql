-- Story 3.5 — Audit log table cho admin moderation actions.
-- Ghi log mọi hành động duyệt/từ chối (AC: "hành động duyệt ghi audit log").

CREATE TABLE IF NOT EXISTS "public"."moderation_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id" uuid NOT NULL REFERENCES "public"."public_users"("id") ON DELETE CASCADE,
  "listing_id" uuid NOT NULL REFERENCES "public"."public_listings"("id") ON DELETE CASCADE,
  "action" text NOT NULL CHECK (action IN ('approve', 'reject', 'bulk_approve')),
  "reason" text,
  "spam_flagged" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON "moderation_audit_logs" (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_listing ON "moderation_audit_logs" (listing_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON "moderation_audit_logs" (created_at DESC);

-- RLS: chỉ service-role (backend) read/write audit logs.
ALTER TABLE "moderation_audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_service_all" ON "moderation_audit_logs"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
