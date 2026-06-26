import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';
import { publicUsers } from './public-users';

// Story 4.4 — appeal_requests table.
export const appealRequests = pgTable(
  'appeal_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => publicUsers.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    status: text('status').notNull().default('pending'),
    adminNote: text('admin_note'),
    reviewedBy: uuid('reviewed_by').references(() => publicUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_appeal_seller').on(table.sellerId),
    index('idx_appeal_status').on(table.status),
    index('idx_appeal_created').on(table.createdAt),
  ],
);
