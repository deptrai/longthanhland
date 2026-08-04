-- Story 5.7: imported_listings table — Auto-Import Deduplication.
-- Tracks listings imported from external sources (CSV/JSON feeds) with dedup.
-- AD-8: sellerPhoneHash is sha256(phone + salt) — NEVER store plaintext phone.

CREATE TABLE IF NOT EXISTS "imported_listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_type" text NOT NULL,
  "source_url" text,
  "source_id" text,
  "dedup_hash" text NOT NULL,
  "seller_phone_hash" text,
  "raw_payload" jsonb NOT NULL,
  "listing_id" uuid REFERENCES "public_listings"("id") ON DELETE SET NULL,
  "status" text NOT NULL DEFAULT 'imported',
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Unique index on dedup_hash for fast exact-match dedup.
CREATE UNIQUE INDEX IF NOT EXISTS "imported_listings_dedup_hash_idx"
  ON "imported_listings" ("dedup_hash");

-- Index on listing_id for reverse lookup.
CREATE INDEX IF NOT EXISTS "imported_listings_listing_id_idx"
  ON "imported_listings" ("listing_id");

-- Index on source_type for filtering by source.
CREATE INDEX IF NOT EXISTS "imported_listings_source_type_idx"
  ON "imported_listings" ("source_type");
