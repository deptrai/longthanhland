import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { publicUsers } from './public-users';
import { publicListings } from './public-listings';

// Story 3.5 — moderation audit log table.
export const moderationAuditLogs = pgTable(
  'moderation_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => publicUsers.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    action: text('action').notNull(),
    reason: text('reason'),
    spamFlagged: boolean('spam_flagged').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_admin').on(table.adminId),
    index('idx_audit_listing').on(table.listingId),
    index('idx_audit_created').on(table.createdAt),
  ],
);
