import { pgTable, uuid, text, timestamp, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';

/**
 * Cross-post platform enum (AC1) — Story 5.1.
 * Mỗi platform = 1 provider implement IPromotionProvider.
 */
export const crossPostPlatform = pgEnum('cross_post_platform', ['facebook', 'cho_tot', 'zalo']);

/**
 * Cross-post status enum (AC2, AD-9) — Story 5.1 / Story 5.3.
 *   pending         — row tạo, job enqueue chờ processor.
 *   posted          — provider post thành công (có externalUrl).
 *   assisted        — provider yêu cầu seller tự đăng (Story 5.3 Chợ Tốt MVP).
 *                     Seller click link → manual post → PATCH confirm với ad URL.
 *   failed          — post fail hết retry (errorMessage).
 *   removed         — remove thành công (listing hết hiệu lực).
 *   removal_failed  — remove fail hết retry (AD-9 best-effort, UI gỡ thủ công).
 */
export const crossPostStatus = pgEnum('cross_post_status', [
  'pending',
  'posted',
  'assisted',
  'failed',
  'removed',
  'removal_failed',
]);

/**
 * Bảng cross_posts (AC2, AD-2, AD-9) — Story 5.1.
 *
 * Persist trạng thái cross-post cho mỗi listing × platform.
 * AD-2: mutation qua PromotionService → Drizzle (KHÔNG frontend direct).
 * AD-9: lifecycle removal khi listing REJECTED/DELETED/SOLD/EXPIRED.
 *
 * FK listingId → public_listings.id (ON DELETE CASCADE — E7: listing xóa
 * → cross_posts cascade delete, BullMQ job processor graceful skip).
 *
 * Unique index (listingId, platform) — E1 duplicate prevention (DB-level).
 * Cho promote lại: reuse existing row (update status pending) thay vì insert mới.
 */
export const crossPosts = pgTable(
  'cross_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    platform: crossPostPlatform('platform').notNull(),
    externalUrl: text('external_url'),
    providerJobId: text('provider_job_id'),
    status: crossPostStatus('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cross_posts_listing').on(table.listingId),
    uniqueIndex('idx_cross_posts_listing_platform').on(table.listingId, table.platform),
  ],
);

export type CrossPost = typeof crossPosts.$inferSelect;
export type CrossPostInsert = typeof crossPosts.$inferInsert;
