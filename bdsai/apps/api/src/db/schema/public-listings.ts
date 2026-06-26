import { pgTable, uuid, text, integer, numeric, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { publicUsers } from './public-users';

/**
 * Listing status enum (AC1) — Story 3.1.
 *
 * Workflow hợp lệ (AC4):
 *   DRAFT → PENDING (seller submit)
 *   PENDING → PUBLISHED (admin approve — Story 3.5)
 *   PENDING → REJECTED (admin reject — Story 3.5)
 *   PUBLISHED → EXPIRED (cron — Story 3.6)
 *   PUBLISHED → SOLD (seller mark — Story 3.6)
 *   EXPIRED → PUBLISHED (seller gia hạn — Story 3.6)
 *   REJECTED → PENDING (seller sửa + resubmit)
 *
 * KHÔNG cho phép: DRAFT→SOLD, DRAFT→PUBLISHED, SOLD→* (terminal).
 */
export const listingStatus = pgEnum('listing_status', [
  'DRAFT',
  'PENDING',
  'PUBLISHED',
  'REJECTED',
  'EXPIRED',
  'SOLD',
]);

/**
 * Listing type — bán hoặc cho thuê.
 */
export const listingType = pgEnum('listing_type', ['sell', 'rent']);

/**
 * Property type — loại BĐS.
 */
export const propertyType = pgEnum('property_type', [
  'land',          // đất
  'house',         // nhà phố
  'apartment',     // chung cư
  'commercial',    // thương mại
  'project',       // dự án
]);

/**
 * Bảng public_listings (AC1, AD-2) — Story 3.1.
 *
 * Core marketplace entity — seller đăng tin BĐS.
 * AD-2: mutation qua NestJS MarketplaceService → Drizzle (KHÔNG frontend direct).
 * AD-9: status workflow enforce qua service (KHÔNG DB-level check — service validate).
 *
 * FK sellerId → public_users.id (ON DELETE CASCADE — user xóa → listing xóa).
 * Images: jsonb array of { url, isCover } — Supabase Storage URL (AD-7).
 */
export const publicListings = pgTable('public_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id')
    .notNull()
    .references(() => publicUsers.id, { onDelete: 'cascade' }),

  // Status workflow (AC1, AC4).
  status: listingStatus('status').notNull().default('DRAFT'),
  listingType: listingType('listing_type').notNull().default('sell'),

  // Core content.
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: integer('price').notNull(), // VND — không dùng numeric (integer đủ cho VND)
  area: numeric('area', { precision: 10, scale: 2 }).notNull(), // m2
  propertyType: propertyType('property_type').notNull(),

  // Location (Vietnam admin hierarchy).
  province: text('province').notNull(), // tỉnh/thành phố
  district: text('district').notNull(), // quận/huyện
  ward: text('ward'), // phường/xã (nullable — có thể không rõ)
  street: text('street'), // đường (nullable)
  address: text('address').notNull(), // địa chỉ đầy đủ
  lat: numeric('lat', { precision: 10, scale: 7 }), // nullable
  lng: numeric('lng', { precision: 10, scale: 7 }), // nullable

  // Property details (nullable — không phải loại nào cũng có).
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  floorCount: integer('floor_count'),
  legalStatus: text('legal_status'), // so_do, so_hong, giay_to_khac

  // Images — jsonb array of { url, isCover } (AD-7 — Storage URL).
  // Story 3.2 sẽ implement upload; Story 3.1 chỉ define column.
  images: jsonb('images').$type<Array<{ url: string; isCover: boolean }>>().notNull().default([]),

  // Workflow metadata.
  expiresAt: timestamp('expires_at', { withTimezone: true }), // PUBLISHED + expiry (Story 3.6)
  publishedAt: timestamp('published_at', { withTimezone: true }),
  rejectedReason: text('rejected_reason'), // REJECTED reason (Story 3.5)

  // FTS search vector (Story 1.5 — tsvector column, populated by trigger).
  // Story 3.3 sẽ dùng cho search; Story 3.1 chỉ define column.
  searchVector: text('search_vector'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
