# Epic 3 Gap Review

Review gaps Story 3.1–3.7 (Epic 3 — Listing Management & Search) cho bdsai.vn.
Method: đọc AC trong `_bmad-output/planning-artifacts/epics.md` (lines 326–441), so sánh với
implementation trong `bdsai/apps/api/src/marketplace`, `bdsai/apps/api/src/upload`,
`bdsai/apps/api/src/db`, `bdsai/apps/web/app`. Verify browser/API thật tại localhost:3100 + :3101.
KHÔNG sửa code, chỉ report.

---

## Story 3.1: Listing entity + CRUD + status workflow

- **Status:** MINOR GAP
- **Gaps:**
  - [MINOR] `getListing` không cho admin xem tin non-PUBLISHED qua endpoint chuẩn —
    controller hardcode `isAdmin = false` ở `GET /marketplace/listings/:id`
    (`bdsai/apps/api/src/marketplace/marketplace.controller.ts:83`).
    Admin phải dùng `GET /marketplace/admin/pending` để xem PENDING, không có cách xem
    DRAFT/REJECTED/EXPIRED/SOLD của seller khác. Suggested fix: đọc `user.role` từ JwtUser
    và truyền `isAdmin = (role === 'admin')`.
  - [MINOR] Không có test cho `deleteListing` (service spec chỉ cover create/update/submit/
    duplicate/transition/renew/sold, không có delete case). File:
    `bdsai/apps/api/src/marketplace/marketplace.service.spec.ts`.
- **Implemented:**
  - Bảng `public_listings` đầy đủ 6 status (DRAFT/PENDING/PUBLISHED/REJECTED/EXPIRED/SOLD),
    UUID v4 PK, FK `seller_id → public_users` (ON DELETE CASCADE), timestamps UTC
    (`bdsai/apps/api/src/db/schema/public-listings.ts`, migration `0003_public_listings.sql`).
  - CRUD qua NestJS MarketplaceService → Drizzle (AD-2): create, listMy, get, update, delete
    (`marketplace.service.ts:52–178`).
  - Ownership check trong update/delete (`marketplace.service.ts:123,162`).
  - Status workflow enforce qua `VALID_TRANSITIONS` map — DRAFT→SOLD, DRAFT→PUBLISHED bị
    reject (`marketplace.service.ts:33–40`, test `transitionStatus: DRAFT → PUBLISHED (invalid)`).
  - RLS: anon chỉ SELECT PUBLISHED, owner SELECT own, service_role full
    (`0003_public_listings.sql:60–78`).
  - 27 unit tests (workflow, ownership, duplicate, search note).

---

## Story 3.2: Đăng tin — form nhiều bước + upload ảnh + duplicate guard

- **Status:** MINOR GAP
- **Gaps:**
  - [MINOR] "tin nhân bản phải sửa trước khi submit" KHÔNG enforce — `duplicateListing` tạo
    DRAFT, `submitListing` cho phép DRAFT→PENDING mà không kiểm tra listing đã được chỉnh
    sau khi nhân bản. File: `marketplace.service.ts:232–238` (submitListing không check
    `updatedAt > duplicatedAt`). Suggested fix: thêm cờ `requiresEditAfterDuplicate` hoặc
    check `updatedAt` thay đổi so với lúc duplicate.
  - [MINOR] Idempotency chỉ client-side (`submitLockRef` useRef,
    `dang-tin/page.tsx:62,181`) — KHÔNG có idempotency key server-side. Nếu request bị
    replay (network retry, proxy) sẽ tạo 2 tin. AC yêu cầu "double-click không tạo tin trùng
    (idempotency)". Suggested fix: nhận `Idempotency-Key` header ở POST /listings, dedup
    trong service.
  - [MINOR] "fail thì modal đăng nhập lại" — hiện chỉ `setSubmitError` text, không phải
    modal (`dang-tin/page.tsx:237`). Draft vẫn giữ (localStorage) nên KHÔNG mất data ✓.
  - [MINOR] Không có test web cho form (0 file test `*.test.*` trong apps/web cho
    dang-tin/listing).
- **Implemented:**
  - Form 4 bước (Thông tin → Vị trí → Hình ảnh → Xem lại) với validate từng bước
    (`dang-tin/page.tsx:97–111`).
  - Draft autosave localStorage + restore prompt "Bạn có tin nháp chưa hoàn thành. Tiếp tục?"
    (`dang-tin/page.tsx:67–90`).
  - Upload ≤10 ảnh, ≤10MB, WebP auto, magic bytes validation server-side, first=cover
    (`upload.service.ts:137–211`, `upload.controller.ts:54–72`, proxy
    `app/api/upload/listing-image/route.ts`).
  - Submit → POST /listings (DRAFT) + POST /:id/submit (PENDING) (`dang-tin/page.tsx:196–232`).
  - JWT expire → `authFetch` auto-refresh im lặng + retry; draft localStorage giữ nguyên.
  - Duplicate API + proxy (`marketplace.service.ts:181–229`, `app/api/marketplace/listings/[id]/duplicate/route.ts`).
  - KHÔNG có nút "Quảng bá" ✓.

---

## Story 3.3: Duyệt & tìm kiếm — filter, sort, phân trang

- **Status:** MINOR GAP
- **Gaps:**
  - [MINOR] UI search (`app/listings/page.tsx`) KHÔNG expose filter price range (minPrice/
    maxPrice) và area range (minArea/maxArea) — API hỗ trợ đầy đủ
    (`marketplace.service.ts:326–329`) nhưng UI chỉ có q, province, district, propertyType,
    listingType, sort. Suggested fix: thêm 4 input minPrice/maxPrice/minArea/maxArea vào form.
  - [MINOR] Trang `/listings` là `'use client'` fetch trực tiếp NestJS (`API_BASE_URL`), bypass
    Next.js proxy — không vi phạm AC (public, no auth) nhưng lệch AD-10. Detail page cũng
    fetch trực tiếp NestJS (`listings/[id]/page.tsx:42`) dù proxy `/api/marketplace/listings/[id]/detail` tồn tại.
  - [MINOR] Không có test unit cho `searchListings` (spec ghi "covered by e2e" —
    `marketplace.service.spec.ts:263`). Không có e2e test file cho search trong repo.
  - [LOW] P95 < 200ms chưa đo (có index price/status/province/created, nên đạt).
- **Implemented:**
  - Search PUBLISHED-only, FTS tiếng Việt không dấu `f_unaccent_query` — verify thật:
    `q=long thanh` → 45 kết quả "Long Thành" (`curl /marketplace/search?q=long%20thanh`).
  - Filter province/district/listingType/propertyType/minPrice/maxPrice/minArea/maxArea.
  - Sort newest/price_asc/price_desc, pagination stable (limit cap 50, offset).
  - Empty state "Không tìm thấy tin nào" (`listings/page.tsx:175`).
  - Cache-Control `s-maxage=300` trên API search/detail.

---

## Story 3.4: Trang chi tiết listing — SSR + SEO meta

- **Status:** NO GAP
- **Gaps:**
  - [LOW] Detail page fetch trực tiếp NestJS thay vì Next proxy (proxy tồn tại nhưng unused).
    Không vi phạm AC (proxy vẫn zero business logic, SSR page chỉ data-fetch).
- **Implemented:**
  - Server component + `generateMetadata` động (`listings/[id]/page.tsx:55–84,86–95`).
  - Meta tags: `<title>`, `og:title`, `og:description`, `og:image`, twitter card — verify
    thật: `<title>Đất nền sổ đỏ khu đô thị Long Thành — 591.093.992 VND | bdsai.vn</title>`,
    `property="og:title"` present.
  - JSON-LD `RealEstateListing` (`listings/[id]/page.tsx:106–132`) — verify `application/ld+json`
    present in HTML.
  - Non-PUBLISHED → fetchListing trả null → `notFound()` 404 (`page.tsx:93–95`).
  - ISR `revalidate: 300` (`page.tsx:46`).

---

## Story 3.5: Admin — hàng đợi duyệt + cờ spam

- **Status:** MINOR GAP
- **Gaps:**
  - [MINOR] "lý do reject gửi seller" — KHÔNG có email/notification tới seller khi reject.
    `rejectedReason` chỉ lưu DB (`marketplace.service.ts:263–265`), seller không nhận thông báo.
    AC: "reject → REJECTED kèm lý do gửi seller". Suggested fix: enqueue email/notification
    trong `rejectWithAudit` (Story 6.2 notification infra có thể reuse).
  - [MINOR] Hook cross_post gỡ best-effort (AD-9) khi reject — KHÔNG có stub/hook nào trong
    `rejectListing`/`rejectWithAudit`. AC nói "hook sẵn, no-op khi chưa có Track B" — hiện
    không có hook chỗ nào. Suggested fix: thêm `await this.crossPostHook.onReject(listingId)`
    no-op interface.
  - [LOW] Spam flag chỉ hiển thị, KHÔNG có action "đánh dấu spam" riêng (auto-hide) — admin
    vẫn phải approve/reject thủ công. AC không yêu cầu auto-hide nên OK.
- **Implemented:**
  - UI `/admin/listings` mới (commit b534547895) — `PendingListingsTable` client island với
    table, checkbox bulk, pagination, reject dialog, spam badge "Nghi spam" + tooltip reasons
    (`app/(admin)/admin/listings/listings-table.tsx`). Verify browser: HTTP 200, render
    "Hàng đợi duyệt tin".
  - Spam filter rule-based: keyword blacklist (13 từ) + 6 heuristic (low_price, all_caps,
    repeated_text, suspicious_link, multiple_phones, no_images_high_price)
    (`moderation.service.ts:8–95`). 11 unit tests cho checkSpam.
  - Approve → PUBLISHED + enqueue AI summary; Reject → REJECTED + reason (min 3 ký tự).
  - Bulk approve (`moderation.service.ts:99–119`) + reject reason templates (6 mẫu,
    `REJECT_REASONS`).
  - Audit log `moderation_audit_logs` (approve/reject/bulk_approve + spamFlagged)
    (`moderation.service.ts:161–176`, migration `0006_audit_log.sql`). Test approveWithAudit/
    rejectWithAudit verify audit insert.
  - AdminGuard protect endpoints (`marketplace.controller.ts:142,156,169,183,194`).

---

## Story 3.6: Vòng đời tin — hết hạn, gia hạn, đánh dấu đã bán

- **Status:** MAJOR GAP
- **Gaps:**
  - [HIGH] KHÔNG có cron job tự động hết hạn — `expireListings` chỉ gọi qua manual admin
    endpoint `POST /marketplace/admin/expire` (`marketplace.controller.ts:224–229`). AC:
    "đến hạn (cron job)". `ScheduleModule` đã import (`app.module.ts:47`) nhưng KHÔNG có
    `@Cron` decorator nào gọi `expireListings` (chỉ `monitoring.service.ts` có @Cron).
    Suggested fix: thêm `@Cron(CronExpression.EVERY_HOUR)` method trong MarketplaceService
    gọi `this.expireListings()`.
  - [HIGH] Race condition expire-vs-edit KHÔNG xử lý — không có optimistic lock (version
    column), không transaction, không `WHERE status = 'PUBLISHED'` guard trong updateListing.
    `expireListings` bulk update `WHERE status=PUBLISHED AND expiresAt<=now`
    (`marketplace.service.ts:437–446`), `updateListing` update `WHERE id` không check status
    (`marketplace.service.ts:138–143`). Có thể cron set EXPIRED rồi user edit ghi đè lại
    PUBLISHED. AC: "optimistic lock hoặc transaction". Suggested fix: thêm cột `version int`
    hoặc check `WHERE id AND status='PUBLISHED'` trong updateListing + reject nếu mismatch.
  - [HIGH] KHÔNG có seller UI để gia hạn/đánh dấu đã bán — không có trang "tin của tôi" trong
    `(dashboard)` (chỉ có `dang-tin`), không có proxy route `/api/marketplace/listings/[id]/renew`
    hay `/sold` (chỉ có submit/approve/reject/duplicate/detail proxies). API endpoint tồn tại
    (`marketplace.controller.ts:200–221`) nhưng seller không thể dùng qua web. Suggested fix:
    thêm `/dashboard/tin-cua-toi` page + 2 proxy route renew/sold.
  - [MEDIUM] "seller nhận thông báo gia hạn" — KHÔNG có notification khi tin hết hạn. Không
    có module notification/email cho expiry (chỉ inquiry processor có email). AC: "seller
    nhận thông báo gia hạn".
  - [MEDIUM] Không có test cho `expireListings` (grep spec: 0 match `expireListings`). Không
    có test race condition.
- **Implemented:**
  - `renewListing` EXPIRED→PUBLISHED + new expiry 90 days, wrong seller → 403, non-EXPIRED →
    400 (`marketplace.service.ts:390–419`, 3 tests).
  - `markAsSold` PUBLISHED→SOLD, non-PUBLISHED → 400 (`marketplace.service.ts:422–431`, 2 tests).
  - `expireListings` service logic đúng (PUBLISHED + expiresAt<=now → EXPIRED).
  - Expiry set 90 ngày khi approve (`setExpiryOnPublish`, `marketplace.service.ts:462–476`).
  - Inquiry block trên EXPIRED/SOLD: `inquiry.service.ts:51` reject non-PUBLISHED. Existing
    inquiries vẫn xem được (không xóa) ✓.

---

## Story 3.7: Seed dữ liệu listing mẫu

- **Status:** NO GAP
- **Gaps:**
  - [LOW] Data generation dùng `Math.random()` cho giá/diện tích/vị trí — giá trị không
    deterministic (chỉ ID deterministic). Idempotency vẫn hold (upsert onConflict id) nhưng
    dữ liệu đổi mỗi lần chạy. AC: "seed idempotent (chạy lại không tạo trùng)" — đạt về số
    lượng, nhưng giá trị không ổn định. Suggested fix: dùng seeded PRNG.
  - [LOW] Seed insert trực tiếp qua Supabase service-role (bypass NestJS/Drizzle) — lệch AD-2
    nhẹ, nhưng seed là script admin một-shot nên chấp nhận được.
- **Implemented:**
  - 55 listing mẫu, deterministic UUIDs `00000000-0000-4000-8000-{1000+i}`, upsert idempotent
    (`db/seed-listings.ts:119,200–204`). Verify DB: 55 seed listing PUBLISHED present (total
    57 = 55 seed + 2 test).
  - Khu vực Long Thành/Đồng Nai/BRVT/TP.HCM, giá/diện tích thực tế (sell 500M–2B, rent 5–30M,
    area 60–500m²) (`seed-listings.ts:106–108,102`).
  - Ảnh placeholder `placehold.co/1200x630` (`seed-listings.ts:140`).
  - PUBLISHED + expiresAt 90 ngày + publishedAt random 1–60 ngày trước.
  - Không PII thật — `seed-seller@bdsai.vn` demo account (`seed-listings.ts:11`).
  - Chạy: `npx tsx src/db/seed-listings.ts`.

---

## Summary table

| Story | Status | # Gaps | Priority |
|-------|--------|--------|----------|
| 3.1 | MINOR GAP | 2 | LOW |
| 3.2 | MINOR GAP | 4 | LOW–MEDIUM |
| 3.3 | MINOR GAP | 4 | LOW |
| 3.4 | NO GAP | 1 (LOW) | LOW |
| 3.5 | MINOR GAP | 3 | LOW–MEDIUM |
| 3.6 | MAJOR GAP | 5 (3 HIGH) | HIGH |
| 3.7 | NO GAP | 2 (LOW) | LOW |

**Top priority fixes (Story 3.6):**
1. Thêm `@Cron` cho `expireListings` (HIGH) — `bdsai/apps/api/src/marketplace/marketplace.service.ts`.
2. Optimistic lock / status guard cho updateListing vs expire (HIGH) — same file.
3. Seller UI "tin của tôi" + proxy renew/sold (HIGH) — `bdsai/apps/web/app/(dashboard)`.
4. Notification gia hạn cho seller (MEDIUM).
5. Test `expireListings` + race condition (MEDIUM).

**Minor fixes (Story 3.1/3.2/3.3/3.5):**
- 3.1: admin `isAdmin` flag cho GET /listings/:id; test deleteListing.
- 3.2: enforce "duplicate phải sửa trước submit"; server idempotency key; modal đăng nhập lại.
- 3.3: UI filter price/area range; test searchListings.
- 3.5: email seller khi reject; cross_post hook stub no-op.
