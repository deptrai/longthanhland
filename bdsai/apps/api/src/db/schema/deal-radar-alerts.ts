import { pgTable, uuid, varchar, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { dealRadarFilters } from './deal-radar-filters';

/**
 * Deal-Radar alerts — Story 5.1.
 *
 * Mỗi khi có tin khớp filter, tạo alert và gửi Zalo group qua Nowing automation.
 */
export const dealRadarAlerts = pgTable('deal_radar_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  filterId: uuid('filter_id')
    .notNull()
    .references(() => dealRadarFilters.id, { onDelete: 'cascade' }),

  // Source of matched listing.
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'first_party' | 'aggregated'
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  sourceUrl: varchar('source_url', { length: 1000 }),

  // Snapshot of matched listing.
  title: varchar('title', { length: 500 }),
  price: decimal('price', { precision: 15, scale: 2 }),
  area: decimal('area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }),

  isRead: boolean('is_read').default(false).notNull(),
  sentToZalo: boolean('sent_to_zalo').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
