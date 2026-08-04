import { pgTable, uuid, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';

/**
 * imported_listings table — Story 5.7.
 *
 * Tracks listings imported from external sources (CSV/JSON feeds) with
 * deduplication. When auto-scrape from FB is unblocked, this table will
 * track those imports too.
 *
 * AD-8: sellerPhoneHash is sha256(phone + salt) — NEVER store plaintext phone.
 * dedupHash = sha256(normalized_title + '|' + province + '|' + district + '|' + price + '|' + phoneHash)
 *
 * Status flow:
 *   imported  → new listing created (PENDING in public_listings)
 *   duplicate → dedup hit, listingId points to existing listing
 */
export const importStatus = pgEnum('import_status', ['imported', 'duplicate', 'failed']);

export const importedListings = pgTable('imported_listings', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Source tracking.
  sourceType: text('source_type').notNull(), // 'csv' | 'json' | 'facebook' | 'cho_tot' | 'zalo'
  sourceUrl: text('source_url'), // nullable — URL of feed (if applicable)
  sourceId: text('source_id'), // nullable — external ID within source

  // Dedup — unique hash for exact match detection.
  dedupHash: text('dedup_hash').notNull(),

  // AD-8: phone hashed (sha256 with salt) — NEVER plaintext.
  sellerPhoneHash: text('seller_phone_hash'),

  // Raw payload from import (jsonb — full row data).
  rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>().notNull(),

  // Link to public_listings (nullable until listing created).
  listingId: uuid('listing_id').references(() => publicListings.id, { onDelete: 'set null' }),

  // Import status.
  status: importStatus('status').notNull().default('imported'),
  errorMessage: text('error_message'), // if status='failed'

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
