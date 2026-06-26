-- Story 4.1 — ai_results table cho AI summary + trust score (Epic 4).
-- Mỗi listing có 1 row ai_results (1-1 relationship), lưu summary + trust_score.
-- Cache: KHÔNG re-generate nếu content_hash không đổi (AD-6 AI cost control).

CREATE TABLE IF NOT EXISTS "public"."ai_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "listing_id" uuid NOT NULL UNIQUE REFERENCES "public"."public_listings"("id") ON DELETE CASCADE,
  "summary" text,
  "summary_model" text,
  "trust_score" integer CHECK (trust_score >= 0 AND trust_score <= 100),
  "trust_score_factors" jsonb,
  "content_hash" text NOT NULL,
  "generated_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_results_listing ON "ai_results" (listing_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_hash ON "ai_results" (content_hash);

ALTER TABLE "ai_results" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_results_public_read" ON "ai_results"
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "ai_results_service_all" ON "ai_results"
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
