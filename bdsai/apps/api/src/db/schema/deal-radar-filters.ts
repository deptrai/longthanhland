import { pgTable, uuid, text, varchar, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { publicUsers } from './public-users';

/**
 * Deal-Radar filters — Story 5.1.
 *
 * Seller tạo filter bằng lời, hệ thống parse thành fields.
 * Khi có tin mới khớp, tạo alert và gửi Zalo group qua Nowing automation.
 */
export const dealRadarFilters = pgTable('deal_radar_filters', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => publicUsers.id, { onDelete: 'cascade' }),

  // Raw query từ seller (e.g., "chung cư Bình Thạnh 3-4 tỷ 60-70m2").
  rawQuery: text('raw_query').notNull(),

  // Parsed fields.
  propertyType: varchar('property_type', { length: 50 }),
  location: varchar('location', { length: 255 }),
  minPrice: decimal('min_price', { precision: 15, scale: 2 }),
  maxPrice: decimal('max_price', { precision: 15, scale: 2 }),
  minArea: decimal('min_area', { precision: 10, scale: 2 }),
  maxArea: decimal('max_area', { precision: 10, scale: 2 }),
  keywords: text('keywords'),

  // Seller Zalo group id to receive alerts.
  zaloGroupId: varchar('zalo_group_id', { length: 255 }),

  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
