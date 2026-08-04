-- Story 5.8: news_articles table — News Feed BĐS (admin curated MVP).
-- Tracks BĐS news articles curated by admin. When auto-scrape from FB
-- is unblocked, this table will track scraped articles too.

CREATE TABLE IF NOT EXISTS "news_articles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "source_url" text NOT NULL,
  "source_name" text NOT NULL,
  "category" text NOT NULL,
  "image_url" text,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'published',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Index on status for public feed filtering.
CREATE INDEX IF NOT EXISTS "news_articles_status_idx"
  ON "news_articles" ("status");

-- Index on published_at for DESC sorting.
CREATE INDEX IF NOT EXISTS "news_articles_published_at_idx"
  ON "news_articles" ("published_at" DESC);

-- Index on category for filtering.
CREATE INDEX IF NOT EXISTS "news_articles_category_idx"
  ON "news_articles" ("category");

-- Composite index for public feed: status + publishedAt DESC.
CREATE INDEX IF NOT EXISTS "news_articles_status_published_idx"
  ON "news_articles" ("status", "published_at" DESC);
