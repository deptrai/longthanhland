-- Story 5.1: deal_radar_filters + deal_radar_alerts tables — Deal-Radar MVP.
-- Seller creates filters by natural language; alerts fire on matched listings.

CREATE TABLE IF NOT EXISTS "deal_radar_filters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" uuid NOT NULL REFERENCES "public_users"("id") ON DELETE CASCADE,
  "raw_query" text NOT NULL,
  "property_type" varchar(50),
  "location" varchar(255),
  "min_price" decimal(15, 2),
  "max_price" decimal(15, 2),
  "min_area" decimal(10, 2),
  "max_area" decimal(10, 2),
  "keywords" text,
  "zalo_group_id" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "deal_radar_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "filter_id" uuid NOT NULL REFERENCES "deal_radar_filters"("id") ON DELETE CASCADE,
  "source_type" varchar(50) NOT NULL,
  "source_id" varchar(255) NOT NULL,
  "source_url" varchar(1000),
  "title" varchar(500),
  "price" decimal(15, 2),
  "area" decimal(10, 2),
  "location" varchar(255),
  "is_read" boolean NOT NULL DEFAULT false,
  "sent_to_zalo" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Indexes for filter lookups by seller and active status.
CREATE INDEX IF NOT EXISTS "deal_radar_filters_seller_id_idx" ON "deal_radar_filters"("seller_id");
CREATE INDEX IF NOT EXISTS "deal_radar_filters_is_active_idx" ON "deal_radar_filters"("is_active");

-- Indexes for alert lookups by filter and read status.
CREATE INDEX IF NOT EXISTS "deal_radar_alerts_filter_id_idx" ON "deal_radar_alerts"("filter_id");
CREATE INDEX IF NOT EXISTS "deal_radar_alerts_is_read_idx" ON "deal_radar_alerts"("is_read");
CREATE INDEX IF NOT EXISTS "deal_radar_alerts_created_at_idx" ON "deal_radar_alerts"("created_at" DESC);
