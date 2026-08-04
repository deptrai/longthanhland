---
name: bdsai.vn
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Architecture Spine Update — bdsai.vn (2026-08-04)

> Bổ sung Architecture Decisions (AD) và module design cho vision pivot: Nowing = engine, bdsai = sản phẩm, Seller CRM Workspace, Deal-Radar, Browser Extension.

## AD-11 — Nowing Engine as External AI Service [ADOPTED]

- **Binds:** Epic 4 (AI viết tin), Epic 7 (Nowing integration)
- **Prevents:** Logic AI bị nhét vào bdsai; vendor lock-in; AI compute làm chậm API
- **Rule:** Bdsai GỌI Nowing engine qua REST API với service API key. Nowing chạy như external service. Bdsai KHÔNG chứa model weights, prompt templates, hoặc AI orchestration logic. Mọi kết quả AI được cache theo `contentHash` trong bdsai DB.

### API Contract (proposed)

| Endpoint | Method | Input | Output | Use case |
|---|---|---|---|---|
| `/agent/rewrite-listing` | POST | `{title, price, area, location, propertyType}` | `{description, seoScore}` | AI viết tin |
| `/agent/market-summary` | POST | `{location, propertyType, priceRange}` | `{summary, highlights}` | Deal-Radar context |
| `/agent/match-listings` | POST | `{filter, listings}` | `{matches[]}` | Deal-Radar matching |
| `/health` | GET | — | `{status}` | Health check |

- Auth: `Authorization: Bearer <NOWING_ENGINE_API_KEY>`
- Timeout: 30s
- Fallback: nếu Nowing lỗi, trả về thông báo "AI không khả dụng", không crash user flow.

## AD-12 — Deal-Radar Matching Engine [ADOPTED]

- **Binds:** Epic 5 (Deal-Radar)
- **Prevents:** Matching logic rải rác; alert latency cao; sai nguồn
- **Rule:**
  - `deal_radar_filters` lưu parsed filter (propertyType, location, priceRange, areaRange, keywords).
  - Khi listing mới publish/import hoặc người dùng tạo filter, gọi `DealRadarMatchingService`.
  - Matching engine so sánh filter với `public_listings` và `deal_radar_sources` (aggregated data).
  - Kết quả lưu vào `deal_radar_alerts`.
  - Alert gửi qua **Nowing automation** (`POST /api/v1/automations/{automation_id}/invoke` từ bdsai; Nowing gửi tin vào group Zalo).
  - Aggregated data chỉ lưu facts (giá, diện tích, quận, link nguồn), KHÔNG lưu SĐT raw, KHÔNG rehost ảnh.

### Data Flow

```
Seller tạo filter
   │
   ▼
POST /deal-radar/filters
   │
   ▼
FilterParserService → parsed fields
   │
   ▼
DealRadarMatchingService → query public_listings + deal_radar_sources
   │
   ▼
Trả về matches hiện tại

─────────────────────

Listing mới publish/import
   │
   ▼
ListingEventHandler
   │
   ▼
DealRadarMatchingService → tìm filters khớp
   │
   ▼
Tạo deal_radar_alerts
   │
   ▼
Gọi Nowing automation trigger
   │
   ▼
Nowing automation hoàn thành → gửi tin nhắn vào group Zalo của seller
```

## AD-13 — Lead Management Module [ADOPTED]

- **Binds:** Epic 5 (Lead management)
- **Prevents:** Lead bị trộn lẫn với user/inquiry; PII rò rỉ
- **Rule:**
  - `leads` table thuộc seller (sellerId foreign key).
  - Lead có thể được tạo thủ công hoặc tự động từ inquiry.
  - Phone/email lưu raw (do user nhập hoặc inquiry gửi — có consent), nhưng ẩn 3 số cuối trong UI public.
  - Trạng thái lead: `NEW`, `CONTACTING`, `DEAL`, `LOST`.
  - Mỗi thay đổi trạng thái ghi `lead_status_history`.

## AD-14 — Browser Extension MV3 [ADOPTED]

- **Binds:** Epic 7 (Browser extension)
- **Prevents:** Violate Chrome Web Store policy; PII rò rỉ; phụ thuộc platform specific
- **Rule:**
  - Extension dùng Manifest V3.
  - Content script chỉ đọc DOM khi user bấm icon (không auto-run).
  - Side panel dùng `chrome.sidePanel` API.
  - Auth: nhận JWT từ web app qua message hoặc user paste token.
  - KHÔNG tự động bấm "Hiện số", KHÔNG gọi API portal để lấy phone, KHÔNG cache PII ở local storage.
  - Dữ liệu trích chỉ giữ trong memory cho đến khi user bấm "Lưu".
  - Save data qua bdsai API `/api/extension/save-listing`.

## AD-15 — Seller Workspace Layout [ADOPTED]

- **Binds:** Epic 5 (Seller workspace)
- **Prevents:** Dashboard marketplace cũ không phục vụ CRM
- **Rule:**
  - `/dashboard` chuyển thành workspace với sidebar.
  - Public routes (`/listings`, `/listings/[id]`) giữ nguyên.
  - Dashboard routes đổi:
    - `/my-listings` → `/dashboard/listings`
    - `/my-listings/new` → `/dashboard/listings/new`
    - `/inquiries` → `/dashboard/inquiries`
    - `/dashboard/deal-radar` (mới)
    - `/dashboard/leads` (mới)
    - `/dashboard/ai-tools` (mới)

## Module Isolation Update

Các NestJS modules mới:
- `deal-radar` (filter, matching, alert)
- `leads` (lead CRUD, status history)
- `nowing-engine` (client service — gọi Nowing REST API)
- `extension` (API cho browser extension)

> **Note:** Zalo group notification được xử lý bởi Nowing automation (`write_back_zalo` action), không cần module `zalo` riêng trong bdsai. Bdsai chỉ gọi `POST /api/v1/automations/{automation_id}/invoke`.

## Dependency Direction

```
FE (Next.js)
  ├── /dashboard/* (workspace)
  │   ├── deal-radar → /api/deal-radar
  │   ├── leads → /api/leads
  │   └── ai-tools → /api/ai/rewrite
  └── /listings (public) → /api/marketplace

Next.js API routes (thin proxy)
  └── forward to NestJS

NestJS Modules
  ├── marketplace (existing)
  ├── auth (existing)
  ├── ai (existing + nowing-engine client)
  ├── deal-radar (new)
  ├── leads (new)
  └── extension (new)

External
  ├── Supabase (Auth, DB, Storage)
  ├── Nowing Engine (AI + automation trigger → Zalo notification)
```
