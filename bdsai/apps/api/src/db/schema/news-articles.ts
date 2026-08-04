import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

/**
 * news_articles table — Story 5.8.
 *
 * Admin-curated BĐS news articles. MVP: admin manually adds articles
 * (URL + title + summary + source + category). When auto-scrape from FB
 * is unblocked, this table will track scraped articles too.
 *
 * Status flow:
 *   draft     → not visible on public feed
 *   published → visible on public feed
 *   archived  → soft-deleted (not visible)
 */
export const newsStatus = pgEnum('news_status', ['draft', 'published', 'archived']);

export const newsArticles = pgTable('news_articles', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Content.
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  sourceUrl: text('source_url').notNull(),
  sourceName: text('source_name').notNull(),
  category: text('category').notNull(), // thi-truong | phap-ly | du-an | tai-chinh
  imageUrl: text('image_url'), // nullable — optional cover image

  // Publishing.
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  status: newsStatus('status').notNull().default('published'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
