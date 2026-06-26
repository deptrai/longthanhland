import { pgTable, uuid, text, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';

// Story 4.1 — AI results table (summary + trust score).
export const aiResults = pgTable(
  'ai_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .unique()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    summary: text('summary'),
    summaryModel: text('summary_model'),
    trustScore: integer('trust_score'),
    trustScoreFactors: jsonb('trust_score_factors'),
    contentHash: text('content_hash').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_ai_results_listing').on(table.listingId),
    index('idx_ai_results_hash').on(table.contentHash),
  ],
);
