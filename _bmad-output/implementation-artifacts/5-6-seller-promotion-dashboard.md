# Story 5.6: Seller Promotion Dashboard

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-6-seller-promotion-dashboard
- epic: 5
- track: B

## User Story
**As a** seller on bdsai.vn
**I want** to promote my listings to Facebook/Chợ Tốt/Zalo and manage cross-posts
**So that** I can reach more buyers across multiple platforms

## Context
Backend xaction API đã xong (Stories 5.1-5.5). Story này là frontend UI cho seller:
- Promote dialog (chọn platforms → POST /api/xaction/promote)
- Cross-posts list page (GET /api/xaction/cross-posts?listingId=)
- Confirm assisted post (PATCH /api/xaction/cross-posts/:id)
- Remove cross-post (DELETE /api/xaction/cross-posts/:id)

## Acceptance Criteria

### AC1: API proxy routes for xaction
- GIVEN Next.js API routes exist
- THEN /api/xaction/promote (POST), /api/xaction/cross-posts (GET), /api/xaction/cross-posts/[id] (PATCH, DELETE) exist as thin proxies

### AC2: Dashboard sidebar has "Quảng bá" nav item
- GIVEN seller views dashboard
- THEN sidebar includes "Quảng bá đa kênh" link to /dashboard/cross-posts

### AC3: Cross-posts page lists all cross-posts
- GIVEN seller navigates to /dashboard/cross-posts
- THEN page fetches listings (GET /api/marketplace/my-listings) + cross-posts for each
- AND displays cards: listing title, platform badge, status badge, externalUrl link, actions

### AC4: Promote dialog on my-listings page
- GIVEN seller views my-listings page
- WHEN clicking "Quảng bá" button on a PUBLISHED listing
- THEN dialog opens with platform checkboxes (Facebook, Chợ Tốt, Zalo)
- AND submit → POST /api/xaction/promote → 202 → success message

### AC5: Status badges with Vietnamese labels
- pending → "Đang xử lý" (yellow)
- posted → "Đã đăng" (green)
- assisted → "Chờ xác nhận" (blue)
- failed → "Lỗi" (red)
- removed → "Đã gỡ" (gray)
- removal_failed → "Gỡ lỗi" (orange)

### AC6: Assisted cross-post confirm flow
- GIVEN a cross_post with status='assisted'
- WHEN seller clicks "Xác nhận đã đăng" button
- THEN prompt for ad URL → PATCH /api/xaction/cross-posts/:id → status='posted'

### AC7: Remove cross-post
- GIVEN a cross_post with status pending/posted/assisted
- WHEN seller clicks "Gỡ" button
- THEN confirm dialog → DELETE /api/xaction/cross-posts/:id → 202

### AC8: Platform badges
- facebook → "Facebook" (blue badge)
- cho_tot → "Chợ Tốt" (orange badge)
- zalo → "Zalo" (sky-blue badge)

### AC9: Error handling
- API error → error message banner
- Network error → "Lỗi mạng, thử lại sau"
- 403 → "Không có quyền"

### AC10: Loading states
- Initial load → "Đang tải..."
- Action in progress → button disabled + "Đang xử lý..."

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-1 Module Isolation | UI gọi qua API proxy → NestJS XactionModule |
| AD-2 Single Mutation Path | All mutations qua /api/xaction/* proxy |

## Edge Cases
- E1: No listings → empty state "Bạn chưa có tin nào"
- E2: No cross-posts → empty state "Chưa có tin nào được quảng bá"
- E3: Non-PUBLISHED listing → no "Quảng bá" button
- E4: Promote dialog: no platform selected → submit disabled
- E5: Confirm assisted: invalid URL → error message

## Dev Notes
- Use existing patterns: useAuthFetch, useAuth, card-based layout (like my-listings)
- No new UI components needed — use native HTML + Tailwind (like my-listings page)
- API proxy: copy pattern from /api/marketplace/* routes
- Promote dialog: simple modal with checkboxes (no shadcn Dialog needed — use fixed overlay)
