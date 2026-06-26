import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';
import { publicUsers } from './public-users';

// Story 6.1 — inquiries table (buyer liên hệ seller).
export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id').references(() => publicUsers.id, { onDelete: 'set null' }),
    buyerName: text('buyer_name').notNull(),
    buyerPhone: text('buyer_phone').notNull(),
    buyerEmail: text('buyer_email'),
    message: text('message').notNull(),
    status: text('status').notNull().default('new'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inquiries_listing').on(table.listingId),
    index('idx_inquiries_buyer').on(table.buyerId),
  ],
);
