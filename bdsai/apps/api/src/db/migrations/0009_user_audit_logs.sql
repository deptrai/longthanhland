-- Story 2.4 + 2.5: user_audit_logs table — persistent audit log cho user actions (ban/unban/role-grant).
CREATE TABLE IF NOT EXISTS "user_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_id" uuid NOT NULL REFERENCES "public_users"("id") ON DELETE CASCADE,
  "target_id" uuid NOT NULL REFERENCES "public_users"("id") ON DELETE CASCADE,
  "action" text NOT NULL,
  "detail" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_user_audit_admin" ON "user_audit_logs" USING btree ("admin_id");
CREATE INDEX IF NOT EXISTS "idx_user_audit_target" ON "user_audit_logs" USING btree ("target_id");
CREATE INDEX IF NOT EXISTS "idx_user_audit_created" ON "user_audit_logs" USING btree ("created_at");
