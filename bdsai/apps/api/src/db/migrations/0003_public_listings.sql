-- Story 3.1 AC1 — public_listings table + enums + RLS.
--
-- AD-2 (Single Data Mutation Path): anon KHÔNG INSERT/UPDATE/DELETE —
--   mutation qua NestJS MarketplaceService → Drizzle.
-- AD-9 (Status Workflow): workflow enforce trong service (KHÔNG DB-level check).
--
-- Enum types (idempotent — DO $$ ... IF NOT EXISTS).
DO $$ BEGIN
  CREATE TYPE "listing_status" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'SOLD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "listing_type" AS ENUM ('sell', 'rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "property_type" AS ENUM ('land', 'house', 'apartment', 'commercial', 'project');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE "public_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"seller_id" uuid NOT NULL REFERENCES "public_users"("id") ON DELETE CASCADE,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"listing_type" "listing_type" DEFAULT 'sell' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"area" numeric(10, 2) NOT NULL,
	"property_type" "property_type" NOT NULL,
	"province" text NOT NULL,
	"district" text NOT NULL,
	"ward" text,
	"street" text,
	"address" text NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"bedrooms" integer,
	"bathrooms" integer,
	"floor_count" integer,
	"legal_status" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"rejected_reason" text,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Index cho search/filter (Story 3.3 sẽ dùng).
CREATE INDEX "idx_listings_seller" ON "public_listings" ("seller_id");
CREATE INDEX "idx_listings_status" ON "public_listings" ("status");
CREATE INDEX "idx_listings_type" ON "public_listings" ("listing_type");
CREATE INDEX "idx_listings_property_type" ON "public_listings" ("property_type");
CREATE INDEX "idx_listings_province" ON "public_listings" ("province");
CREATE INDEX "idx_listings_price" ON "public_listings" ("price");
CREATE INDEX "idx_listings_created" ON "public_listings" ("created_at" DESC);

-- RLS (AD-2 — mutation qua NestJS API, KHÔNG frontend direct).
ALTER TABLE "public_listings" ENABLE ROW LEVEL SECURITY;

-- Public read: ai cũng xem được listing PUBLISHED (buyer duyệt tin).
-- Draft/Pending/Rejected/Expired/Sold chỉ owner + admin xem.
CREATE POLICY "listings_public_read_published" ON "public_listings"
  FOR SELECT
  USING ("status" = 'PUBLISHED');

-- Owner read: seller xem được listing của chính mình (mọi status).
CREATE POLICY "listings_owner_read" ON "public_listings"
  FOR SELECT
  USING ("seller_id" = auth.uid());

-- Service-role full access (bypass RLS — NestJS Drizzle direct PG).
CREATE POLICY "listings_service_role_all" ON "public_listings"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- KHÔNG policy INSERT/UPDATE/DELETE cho anon (AD-2 — mutation qua NestJS API).
