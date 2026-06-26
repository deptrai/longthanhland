-- Story 4.3: spam_keywords + spam_config tables — admin configurable.
CREATE TABLE IF NOT EXISTS "spam_keywords" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "keyword" text NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "public_users"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "spam_config" (
  "key" text PRIMARY KEY,
  "value" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "public_users"("id") ON DELETE SET NULL
);

-- Seed default thresholds.
INSERT INTO "spam_config" ("key", "value") VALUES
  ('min_price', '1000000'),
  ('repeat_threshold', '3'),
  ('max_phones', '2'),
  ('min_images_high_price', '1'),
  ('high_price_threshold', '5000000000')
ON CONFLICT ("key") DO NOTHING;
