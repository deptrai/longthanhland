# Epic 6 Gap Review

Review gaps cho Story 6.1–6.5 (Epic 6 — Inquiry System & SEO) trên repo `bdsai.vn`
(longthanhland). Method: đọc AC trong `_bmad-output/planning-artifacts/epics.md`
(Epic 6, dòng 509–588), đối chiếu implementation trong
`bdsai/apps/api/src/inquiry`, `bdsai/apps/api/src/marketplace`, `bdsai/apps/web/app`,
verify runtime qua `http://localhost:3100` (web) và `http://localhost:3101` (api).

KHÔNG sửa code — chỉ report.

---

## Story 6.1: Form liên hệ — buyer gửi inquiry cho seller

- **Status: MAJOR GAP**

### Gaps

1. **[MAJOR] Không có form inquiry UI trên web — CTA link hỏng (404).**
   Trang detail `bdsai/apps/web/app/listings/[id]/page.tsx:199-207` chỉ render một
   `<a href="/api/marketplace/listings/${listing.id}/inquiry">Liên hệ người bán</a>`.
   Endpoint này KHÔNG tồn tại (verify: `GET .../inquiry` → 404 cả trên API 3101 và
   web proxy 3100). Marketplace controller
   (`bdsai/apps/api/src/marketplace/marketplace.controller.ts`) không có route
   `inquiry` — inquiry endpoint thật nằm ở `POST /inquiries`
   (`bdsai/apps/api/src/inquiry/inquiry.controller.ts:26`). AC yêu cầu "buyer điền
   form inquiry (tên, phone/email, lời nhắn) và gửi" — hiện buyer không có form nào
   để nhập liệu, click CTA chỉ ra 404.
   - Suggested fix: Tạo client component `InquiryForm` (fields: `buyerName`,
     `buyerPhone`, `buyerEmail?`, `message`) submit `POST /inquiries` (API base
     3101) với listingId đã biết; thay `<a>` bằng `<InquiryForm listingId={...} />`.
     Xóa/sửa CTA link cũ.

2. **[MINOR] Validation error không trả HTTP 400 chuẩn.**
   `inquiry.controller.ts:33` ném `throw new Error(JSON.stringify(...))` khi zod
   parse fail → NestJS trả 500 thay vì 400 BadRequest. Service đã có
   `BadRequestException` riêng (dòng 32-40) nhưng controller throw raw Error cho
   zod layer.
   - Suggested fix: Dùng `new BadRequestException(result.error.issues)` thay vì
     `throw new Error(...)`.

3. **[MINOR] Rate limit chỉ theo IP, không theo user.**
   AC: "chống spam (rate limit theo IP/user)". `inquiry.controller.ts:21`
   `@Throttle({ default: { limit: 10, ttl: 60_000 } })` chỉ throttle per-IP
   (default throttler key). Buyer đăng nhập vẫn có thể spam từ nhiều IP.
   - Suggested fix: Thêm throttle key theo `user.id` khi có JWT, hoặc bổ sung
     service-level check (max N inquiries/user/listing/day).

### Implemented
- API `POST /inquiries` public (no auth) — `inquiry.controller.ts:26-43`. Verify
  runtime: POST với listing PUBLISHED → 201 trả inquiry object (`buyerId:null`,
  guest OK).
- Bảng `inquiries` với FK → `publicListings` (cascade) + FK `buyerId` →
  `publicUsers` (set null), index listing/buyer —
  `bdsai/apps/api/src/db/schema/inquiries.ts`.
- Validation zod (buyerName 2-100, phone `0\d{9,10}`, email optional, message
  10-2000) + service-level revalidate — `inquiry.controller.ts:12-18`,
  `inquiry.service.ts:32-40`.
- Chặn inquiry tới tin không PUBLISHED — `inquiry.service.ts:51-53` (verify:
  POST với listing không tồn tại → 404 "Tin không tồn tại").
- Lưu ipAddress + buyerId (nếu JWT) — `inquiry.service.ts:56-67`.
- Rate limit 10 req/min/IP via `@nestjs/throttler` — `inquiry.controller.ts:21`.

---

## Story 6.2: Notification email cho seller khi có inquiry (+ khi listing duyệt/reject)

- **Status: MAJOR GAP**

### Gaps

1. **[MAJOR] Email seller chỉ là PLACEHOLDER — không gửi email thật.**
   `bdsai/apps/api/src/inquiry/inquiry.processor.ts:62-84` chỉ `logger.log` nội
   dung email, có comment `// TODO: Call actual email provider (Resend/Supabase)
   in production` và dòng `// await emailProvider.send(emailContent)` bị comment.
   AC: "background job (BullMQ) gửi email cho seller qua provider email
   (Supabase/Resend)". Không có integration Resend/Supabase email nào được gọi.
   - Suggested fix: Wire `emailProvider.send(emailContent)` (Resend SDK hoặc
     Supabase auth.admin.sendEmail) vào processor; load API key từ env; xử lý
     failure → BullMQ retry (đã có `attempts:3, backoff exponential`).

2. **[MAJOR] Không có email notification khi listing được duyệt (PENDING→PUBLISHED)
   hoặc bị reject.**
   AC Story 6.2 (tiêu đề + FR15) yêu cầu notification "khi có inquiry + khi listing
   được duyệt/bị reject". `moderation.service.ts:122-133`
   (`approveWithAudit`/`rejectWithAudit`) và `marketplace.service.ts:240-285`
   (`transitionStatus`) chỉ update DB + audit log, KHÔNG enqueue email cho seller.
   Không có queue/job nào cho approval/rejection notification.
   - Suggested fix: Inject notification queue vào `MarketplaceService` (hoặc
     `ModerationService`), `queue.add('listing-approved', { sellerId, listingId })`
     trong `transitionStatus` khi `toStatus==='PUBLISHED'`/`'REJECTED'`; thêm
     processor gửi email "Tin của bạn đã được duyệt / bị từ chối (lý do: ...)".

3. **[MAJOR] Không có in-app notification + badge "inquiry mới" trong dashboard.**
   AC: "ngoài email, có in-app notification + badge 'inquiry mới' trong dashboard
   (seller VN ít check email → tránh bỏ lỡ lead nóng)". Verify:
   - Không có notification entity/API (`find apps/api/src -iname "*notif*"` rỗng).
   - Dashboard layout `bdsai/apps/web/app/(dashboard)/layout.tsx` không có nav
     inquiry, không có badge, sidebar chỉ có placeholder "TODO story 2.x".
   - Không có component badge/inquiry nào trên web
     (`grep inquiry apps/web --include=*.tsx` chỉ match trang detail).
   - Suggested fix: Thêm bảng `notifications` (hoặc query count inquiries status
     `new`), API `GET /inquiries/unread-count`; thêm badge trong `SiteHeader` /
     dashboard sidebar; đánh dấu `read` khi seller xem.

4. **[MAJOR] Seller không xem được danh sách inquiry trong dashboard (UI).**
   AC: "seller xem được danh sách inquiry trong `(dashboard)`". API
   `GET /inquiries` (JWT, `inquiry.controller.ts:46-51` +
   `inquiry.service.ts:90-103`) đã tồn tại, nhưng KHÔNG có page web nào trong
   `app/(dashboard)/` render danh sách inquiry (chỉ có `dashboard/dang-tin/page.tsx`
   — form đăng tin). Verify: `find app/(dashboard)` không có route inquiry.
   - Suggested fix: Tạo `app/(dashboard)/dashboard/inquiries/page.tsx` gọi
     `GET /inquiries`, render bảng (tiêu đề tin, buyer, phone, message, thời gian,
     status).

5. **[MINOR] Email content hardcode domain `https://bdsai.vn` thay vì dùng env.**
   `inquiry.processor.ts:74` hardcode link. Suggested fix: dùng `process.env.PUBLIC_WEB_URL`.

### Implemented
- BullMQ queue `inquiry-notification` + processor
  (`inquiry.module.ts:9`, `inquiry.processor.ts:14`) — job enqueue trong
  `inquiry.service.ts:75-79` với `attempts:3, backoff exponential 5s` (retry theo
  backoff, không block luồng tạo inquiry — đúng AC).
- Email content build đầy đủ: subject, buyer name/phone/email, lời nhắn, link tin
  — `inquiry.processor.ts:64-76`.
- API `GET /inquiries` (JWT) list inquiry của seller join listing —
  `inquiry.controller.ts:46-51`, `inquiry.service.ts:90-103`.
- SMS hoãn post-MVP — đúng AC (không có code SMS).

---

## Story 6.3: Dynamic sitemap.xml + robots.txt

- **Status: MINOR GAP**

### Gaps

1. **[MINOR] Sitemap giới hạn `limit=1000`, không phân trang — tràn sitemap khi
   > 1000 tin.**
   `bdsai/apps/web/app/sitemap.xml/route.ts:13` fetch
   `/marketplace/search?limit=1000`. Khi số tin PUBLISHED > 1000, sitemap bỏ sót
   tin cũ. AC: "liệt kê mọi URL tin PUBLISHED". Suggested fix: phân trang
   (sitemap index → nhiều sitemap.xml?page=N) hoặc loop fetch cho đến khi hết.

2. **[MINOR] Thiếu trang tĩnh quan trọng (profile, auth) trong sitemap.**
   `sitemap.xml/route.ts:24-27` chỉ có `/` và `/marketplace`. AC: "trang tĩnh".
   Có thể bỏ qua auth/profile (noindex) nhưng nên có các public static page khác
   nếu có (vd `/about`, `/lien-he`). Ảnh hưởng nhỏ nếu chưa có page đó.

3. **[MINOR] `lastmod` cho static URL dùng `new Date()` (thời điểm render) thay vì
   fixed/build time.**
   `sitemap.xml/route.ts:25-26` — mỗi lần revalidate sinh lastmod = now, khiến bot
   tưởng trang home thay đổi liên tục. Suggested fix: dùng build timestamp cố định
   hoặc omit lastmod cho static.

4. **[LOW] Sitemap dựa vào search endpoint trả PUBLISHED — đúng nhưng gián tiếp.**
   Verify: `marketplace.service.ts:306` `eq(publicListings.status, 'PUBLISHED')`
   → search chỉ trả PUBLISHED → sitemap chỉ chứa PUBLISHED (đúng AC "không lộ
   DRAFT/PENDING/REJECTED"). Không gap, chỉ note phụ thuộc.

### Implemented
- Route `app/sitemap.xml/route.ts` + `app/robots.txt/route.ts` (Next route
  handler). Verify runtime: `GET /sitemap.xml` trả XML hợp lệ với urlset +
  listing URLs PUBLISHED; `GET /robots.txt` trả text đúng.
- Sitemap động fetch listings từ API, cache 1h (`revalidate=3600` +
  `Cache-Control: s-maxage=3600, stale-while-revalidate=86400`) — đúng AC "cache
  hợp lý để không truy vấn DB mỗi request".
- robots.txt: `Allow: /`, `Disallow: /dashboard`, `/admin`, `/api/`, có
  `Sitemap: https://bdsai.vn/sitemap.xml` — đúng AC "chặn (dashboard)/(admin),
  cho phép index public".
- Sitemap chỉ chứa tin PUBLISHED (qua search endpoint filter).

---

## Story 6.4: Structured data — JSON-LD Schema.org

- **Status: MINOR GAP**

### Gaps

1. **[MINOR] `price` là number, Schema.org/Google yêu cầu string.**
   `bdsai/apps/web/app/listings/[id]/page.tsx:116` `price: listing.price` (number).
   Google Rich Results expects `price` as string (vd `"5000000000"`). Có thể gây
   warning trong Rich Results Test. Suggested fix: `price: String(listing.price)`.

2. **[MINOR] `image` là string đơn, nên là mảng (ImageObject | string[]).**
   `page.tsx:115` `image: coverImage?.url`. Schema.org `RealEstateListing.image`
   khuyến nghị array. Suggested fix: `image: listing.images.map(i => i.url)`.

3. **[MINOR] Tham chiếu `expiresAt` không có trong `Listing` interface.**
   `page.tsx:129` `...('expiresAt' in listing && listing.expiresAt ? ...)`.
   Interface `Listing` (dòng 17-38) không khai báo `expiresAt` → JSON-LD
   `availabilityEnds` sẽ luôn bị omit (TS guard `'expiresAt' in listing` runtime
   có thể true nếu API trả, nhưng type không match → không có trong output an toàn).
   Suggested fix: thêm `expiresAt?: string | null` vào interface.

4. **[LOW] Chưa verify Google Rich Results Test (cần URL public).**
   AC: "JSON-LD validate qua Google Rich Results Test không lỗi". Local verify chỉ
   confirm JSON-LD render đúng cú pháp (curl thấy `@type:RealEstateListing` với
   name/description/url/image/price/priceCurrency/address/floorSize/bedrooms/
   bathrooms/datePublished). Cần chạy RRT trên production URL để chốt.

### Implemented
- JSON-LD `RealEstateListing` nhúng SSR trong trang detail —
  `page.tsx:105-132`. Verify runtime: HTML chứa
  `<script type="application/ld+json">{"@context":"https://schema.org",
  "@type":"RealEstateListing",...}`.
- Đầy đủ field: name, description, url, image, price, priceCurrency=VND,
  PostalAddress (streetAddress, addressLocality, addressRegion, addressCountry),
  floorSize (QuantitativeValue m²), numberOfBedrooms, numberOfBathroomsTotal,
  datePublished.
- Dữ liệu JSON-LD khớp nội dung hiển thị (cùng `listing` object) — đúng AC
  "không cloaking".

---

## Story 6.5: Tối ưu hiệu năng — caching, lazy load

- **Status: MAJOR GAP**

### Gaps

1. **[MAJOR] Ảnh dùng `unoptimized` — không có WebP, không responsive sizes.**
   AC: "ảnh lazy-load, dùng WebP + responsive sizes". Tất cả `next/image` trong:
   - `app/listings/[id]/page.tsx:158` (cover), `:174` (gallery)
   - `app/listings/page.tsx:194`
   - `app/(dashboard)/dashboard/dang-tin/page.tsx:517`
   đều set `unoptimized` → Next.js Image Optimization tắt hoàn toàn: KHÔNG convert
   WebP, KHÔNG generate responsive `srcset`, phục vụ ảnh nguyên kích thước.
   `next.config.ts` không cấu hình `images.formats: ['image/webp']` hay
   `images.deviceSizes`/`remotePatterns`. Suggested fix: bỏ `unoptimized`, cấu
   hình `images.remotePatterns` cho image host, set `sizes` prop hợp lý per
   breakpoint; đảm bảo cover `priority` + gallery lazy (mặc định Next lazy).

2. **[MAJOR] Không có caching Redis cho search results / listing detail (API).**
   AC: "caching hợp lý: search results, listing detail (Redis hoặc Next cache)".
   Verify:
   - API chỉ có HTTP `Cache-Control` header
     (`marketplace.controller.ts:247,280` `s-maxage=300, stale-while-revalidate`)
     — CDN/Next fetch cache, KHÔNG có Redis cache layer trong service.
   - Listing detail (web) dùng ISR `next: { revalidate: 300 }`
     (`page.tsx:46`) — OK cho Next cache nhưng API side không cache.
   - Không tìm thấy module Redis cache nào (`grep cache/redis apps/api/src` chỉ
     trả header). Suggested fix: thêm Redis cache (vd `@nestjs/cache-manager` +
     `cache-manager-redis-store`) wrap `searchListings` + `getListingDetail`,
     invalidate khi listing update/approve.

3. **[MAJOR] Lighthouse CI gate chỉ chạy trên `/`, không gate `/listings` và
   `/listings/[id]`.**
   AC: "Lighthouse SEO > 90 và Performance đạt ngưỡng chấp nhận (gate CI từ Story
   1.3)". `.lighthouserc.js:22` `url: ['https://bdsai.vn/']` chỉ gate home;
   `:8-9` comment TODO(story 3.3/3.4) thêm 2 page còn lại — vẫn chưa thêm dù
   story 3.3/3.4 đã done. Suggested fix: thêm `/listings` và 1 URL
   `/listings/[id]` cụ thể vào `ci.collect.url`.

4. **[MINOR] Không có đo lường/gate cho "page load < 2s P75" và "SSR render < 500ms P95".**
   AC: NFR4 (<2s P75) + NFR1 (SSR <500ms P95). Không có instrumentation/gate tự
   động (chỉ Lighthouse performance warn ở `:33` `minScore:0.5` — ngưỡng rất thấp,
   non-blocking). Suggested fix: thêm assertion performance `minScore` phù hợp +
   monitor Sentry performance / custom metric.

### Implemented
- ISR caching listing detail: `next: { revalidate: 300 }` — `page.tsx:46`.
- HTTP `Cache-Control` trên search + detail API endpoint —
  `marketplace.controller.ts:247,280`.
- Cover image `priority` (LCP ưu tiên) — `page.tsx:157`; gallery image mặc định
  lazy-load của Next (nhưng bị `unoptimized` vô hiệu hóa optimization).
- Lighthouse CI config tồn tại (`.lighthouserc.js`) với SEO ≥ 90 gate (error) —
  nhưng chỉ cho `/`.

---

## Summary table

| Story | Status | # Gaps | Priority |
|-------|--------|--------|----------|
| 6.1 — Form liên hệ inquiry | MAJOR GAP | 3 (1 major, 2 minor) | P0 — buyer không gửi được inquiry qua UI (CTA 404) |
| 6.2 — Notification email seller | MAJOR GAP | 5 (4 major, 1 minor) | P0 — email chỉ placeholder, thiếu notify duyệt/reject + in-app badge + dashboard inquiry list |
| 6.3 — Sitemap + robots.txt | MINOR GAP | 4 (3 minor, 1 low) | P2 — hoạt động, chỉ cần phân trang + lastmod |
| 6.4 — JSON-LD Schema.org | MINOR GAP | 4 (3 minor, 1 low) | P2 — render đúng, cần fix type price/image + verify RRT |
| 6.5 — Caching + lazy load | MAJOR GAP | 4 (3 major, 1 minor) | P0 — ảnh unoptimized (no WebP/responsive), không Redis cache, Lighthouse gate thiếu |

### Top priorities (P0)
1. **6.1**: Tạo `InquiryForm` component thật, thay CTA link 404 → form submit
   `POST /inquiries`.
2. **6.2**: Wire email provider thật vào `inquiry.processor`; thêm email
   approve/reject; thêm in-app notification + badge + dashboard inquiry list page.
3. **6.5**: Bỏ `unoptimized` + cấu hình Next Image (WebP, responsive `sizes`);
   thêm Redis cache cho search/detail API; mở rộng Lighthouse gate cho
   `/listings` + `/listings/[id]`.

### Verification runtime (đã thực hiện)
- `GET http://localhost:3100/robots.txt` → 200, nội dung đúng.
- `GET http://localhost:3100/sitemap.xml` → 200, XML urlset với listing PUBLISHED.
- `POST http://localhost:3101/inquiries` (listing PUBLISHED) → 201, trả inquiry
  object (guest OK, `buyerId:null`).
- `POST /inquiries` (listing không tồn tại) → 404 "Tin không tồn tại".
- `GET /listings/:id` → 200, HTML chứa JSON-LD `RealEstateListing`.
- CTA `/api/marketplace/listings/:id/inquiry` → 404 (xác nhận gap 6.1).
