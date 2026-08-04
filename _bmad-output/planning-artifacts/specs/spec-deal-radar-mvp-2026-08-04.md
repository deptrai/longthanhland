---
story: 5.1
epic: 5
status: draft
created: 2026-08-04
---

# Spec — Story 5.1: Deal-Radar MVP

## Overview

Cho phép môi giới tạo filter bằng lời, lưu filter, xem kết quả khớp hiện có, và nhận alert khi có tin mới khớp.

## Dependencies

- **Story 7.1a** (Nowing Engine Client — Base Client & Health Check): cần để gọi Nowing automation.
- **Story 7.1e** (Nowing Engine Client — Cache & Resilience): cần để có fallback đồng nhất khi Nowing lỗi.
- **Story 7.1d** (Nowing Engine Client — Deal-Radar Matching): optional nếu dùng Nowing để match; nếu chưa có thì dùng local rule-based matching.

## User Story

As a môi giới,
I want tạo filter bằng lời và nhận alert khi có tin BĐS khớp,
So that tôi không bỏ lỡ cơ hội mua/bán cho khách hàng.

## Acceptance Criteria

1. Môi giới nhập filter bằng lời, hệ thống parse thành fields.
2. Môi giới lưu filter, filter xuất hiện trong danh sách.
3. Hệ thống trả về danh sách tin khớp hiện có.
4. Khi có tin mới khớp, tạo alert và gửi Zalo group.
5. Môi giới xem alert chưa đọc/đã đọc, mark as read.
6. Tổng thời gian từ tin mới publish → Zalo group message < 5 phút (NFR7).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/deal-radar/filters` | Tạo filter |
| GET | `/deal-radar/filters` | List filters của seller |
| GET | `/deal-radar/filters/:id/matches` | Lấy tin khớp cho filter |
| GET | `/deal-radar/alerts` | List alerts |
| POST | `/deal-radar/alerts/:id/read` | Mark alert as read |

## Database Schema

```typescript
// deal_radar_filters
export const dealRadarFilters = pgTable('deal_radar_filters', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerId: uuid('seller_id').notNull().references(() => publicUsers.id),
  rawQuery: text('raw_query').notNull(),
  propertyType: varchar('property_type', { length: 50 }),
  location: varchar('location', { length: 255 }),
  minPrice: decimal('min_price', { precision: 15, scale: 2 }),
  maxPrice: decimal('max_price', { precision: 15, scale: 2 }),
  minArea: decimal('min_area', { precision: 10, scale: 2 }),
  maxArea: decimal('max_area', { precision: 10, scale: 2 }),
  keywords: text('keywords'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// deal_radar_alerts
export const dealRadarAlerts = pgTable('deal_radar_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  filterId: uuid('filter_id').notNull().references(() => dealRadarFilters.id),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'first_party' | 'aggregated'
  sourceId: varchar('source_id', { length: 255 }).notNull(),
  sourceUrl: varchar('source_url', { length: 1000 }),
  title: varchar('title', { length: 500 }),
  price: decimal('price', { precision: 15, scale: 2 }),
  area: decimal('area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 255 }),
  isRead: boolean('is_read').default(false).notNull(),
  sentToZalo: boolean('sent_to_zalo').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Matching Logic (MVP)

1. Parse raw query bằng rule-based / lightweight LLM.
2. Query `public_listings` + `deal_radar_sources` với filters.
3. Điều kiện khớp:
   - `propertyType` khớp (fuzzy)
   - `location` khớp (fuzzy, quận/phường)
   - `price` nằm trong range ±10%
   - `area` nằm trong range ±10%
   - `keywords` xuất hiện trong title/description

## Zalo Notification via Nowing Automation

- Bdsai **KHÔNG** tự gửi Zalo trực tiếp.
- Khi có match, `DealRadarMatchingService` gọi Nowing automation qua REST API (hoặc shared queue) đã được seller cấu hình sẵn trên Nowing.
- Nowing automation khi hoàn thành sẽ gửi tin nhắn vào group Zalo riêng của seller.
- Nội dung tin nhắn: title + giá + diện tích + link nguồn.
- Bdsai lưu trạng thái `sentToZalo=true` khi nhận callback/thành công từ Nowing.

### Nowing Automation Trigger Contract

Bdsai gọi Nowing qua endpoint đã có:

```
POST /api/v1/automations/{automation_id}/invoke
Authorization: Bearer <NOWING_PAT>
Content-Type: application/json

{
  "inputs": {
    "title": "...",
    "price": 3500000000,
    "area": 65,
    "location": "Bình Thạnh, TP.HCM",
    "sourceUrl": "https://bdsai.vn/listings/...",
    "sellerZaloGroupId": "..."
  }
}
```

Nowing tạo `AutomationRun` PENDING, enqueue Celery, automation đã cấu hình sẵn gửi tin nhắn vào group Zalo.

Bdsai lưu `nowing_pat_encrypted` (AES-256-GCM) + `nowing_automation_id` trên `public_users`; `zalo_group_id` trên `deal_radar_filters`. `DealRadarService.matchListing()` tự động gọi `NowingAutomationClient.invoke()` khi match.

| Trường | Mô tả |
|---|---|
| `automation_id` | ID automation đã tạo tay trên Nowing |
| `inputs` | `{ title, price, area, location, sourceUrl, sellerZaloGroupId }` |
| `auth` | `Authorization: Bearer <NOWING_PAT>` (PAT prefix `nw_pat_`) |
| `bdsai env` | `NOWING_ENGINE_URL`, `PAT_ENCRYPTION_KEY` |
| `Nowing action` | `write_back_zalo` (Zalo OA group message) |

## UI

- Xem `ux-designs/ux-bdsai-crm-2026-08-04/DESIGN.md`.

## Open Questions

- Parse filter bằng rule-based hay Nowing engine?
- Nguồn aggregated data từ đâu trong pilot? (manual import / extension / scrape?)
