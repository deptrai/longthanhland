---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments: [_bmad-output/planning-artifacts/PRD-marketplace-mvp-v2.md, _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md, docs/bdsai/ux-design/wireframe-listing-form.md]
storiesGenerated: Track A — 27 stories (Epic 1,2,3,4-Phase1,6). Track B (Epic 5 + M4.2b) deferred pending Xaction API docs + ToS compliance.
validatedOn: 2026-06-24
---

# bdsai.vn - Epic Breakdown

## Overview

Tài liệu này phân tách requirements từ PRD v2.0 và Architecture Spine thành 6 epics với stories chi tiết cho dự án bdsai.vn — Sàn Rao Vặt Bất Động Sản AI MVP.

## Requirements Inventory

### Functional Requirements

FR1: User đăng ký bằng email + phone, xác thực qua Supabase Auth
FR2: User đăng nhập, quản lý profile (avatar, bio, phone verified)
FR3: Seller tạo listing (multi-step form, image upload, draft/publish)
FR4: Admin approve/reject listings từ moderation queue
FR5: Buyer browse + search listings (filters: location, price, type, area)
FR6: Listing detail page SSR với dynamic meta tags + structured data
FR7: AI Summary: GPT-4 phân tích mỗi listing (highlights, neighborhood, investment)
FR8: Trust Score: algorithm chấm điểm uy tín (0-100)
FR9: Smart Spam Filter: rule-based + keyword blacklist
FR10: Xaction Auto-Post: seller chọn platforms → BullMQ job → Xaction API post dưới proxy
FR11: Xaction Auto-Import: crawl listings từ BDS/Chợ Tốt/FB → imported_listings DB
FR12: Seller dashboard: xem link bài đã quảng bá, trạng thái cross-posts
FR13: Import dashboard (admin): review/approve/reject crawled listings
FR14: Inquiry form: buyer gửi liên hệ cho seller
FR15: Notification: email + SMS cho seller khi có inquiry
FR16: Listing auto-expire + renew + mark sold
FR17: News feed: tin tức BĐS từ Facebook pages/groups (via Xaction)
FR18: Dynamic sitemap.xml + robots.txt
FR19: Admin: user list, ban/unban

### NonFunctional Requirements

NFR1: SSR render < 500ms (P95)
NFR2: API response < 200ms (P95)
NFR3: Lighthouse SEO > 90
NFR4: Page load < 2s (P75)
NFR5: Supabase Free tier limits: 500MB DB, 1GB storage
NFR6: AI rate limit: max 100 calls/hour
NFR7: Xaction retry: 3x exponential backoff, never block user
NFR8: Vietnamese full-text search support
NFR9: Image max 10MB, auto-convert WebP
NFR10: Domain: bdsai.vn

### Additional Requirements

- Monorepo: apps/web + apps/api + packages/shared (Turborepo)
- Deploy: Vercel (FE) + Dokploy Docker (BE)
- CI/CD: GitHub Actions
- All mutations through NestJS API (AD-2)
- Xaction calls always async via BullMQ (AD-3)
- Auth: Supabase Auth (public) + NestJS guards (admin) (AD-5)
- Error tracking: Sentry
- Module isolation: marketplace, auth, ai, xaction, admin, queue (AD-1)

### UX Design Requirements

Không có UX spec riêng. UI sẽ sử dụng shadcn/ui + Tailwind CSS, responsive mobile-first.

### FR Coverage Map

| FR | Epic | Mô tả |
|---|---|---|
| FR1 | Epic 2 | Đăng ký email + phone |
| FR2 | Epic 2 | Đăng nhập, profile |
| FR3 | Epic 3 | Tạo listing |
| FR4 | Epic 3 | Admin approve/reject |
| FR5 | Epic 3 | Browse + search |
| FR6 | Epic 3 | Listing detail SSR |
| FR7 | Epic 4 | AI Summary |
| FR8 | Epic 4 | Trust Score |
| FR9 | Epic 3 | Spam Filter |
| FR10 | Epic 5 | Xaction Auto-Post |
| FR11 | Epic 5 | Xaction Auto-Import |
| FR12 | Epic 5 | Seller promotion dashboard |
| FR13 | Epic 5 | Import dashboard admin |
| FR14 | Epic 6 | Inquiry form |
| FR15 | Epic 6 | Notifications |
| FR16 | Epic 3 | Auto-expire/renew/sold |
| FR17 | Epic 5 | News feed BĐS |
| FR18 | Epic 6 | Sitemap + robots.txt |
| FR19 | Epic 2 | Admin user management |

## Epic List

> **Track A (build ngay — không phụ thuộc Xaction):** Epic 1, 2, 3, 4 (Trust Score Phase 1), 6
> **Track B (BLOCKED — chờ Xaction API docs + quyết định compliance):** Epic 5, Epic 4 Phase 2 (market alignment)
> Xem `sprint-change-proposal-2026-06-24.md` để biết chi tiết điều kiện mở khóa.

### Epic 1: Foundation & Infrastructure  `[Track A]`
Team dev có môi trường làm việc, app chạy được, deploy tự động.
**FRs covered:** Infrastructure (enables all)
**Stories bắt buộc (tường minh):**
- M1.1-M1.4 (như cũ): monorepo, Supabase, CI/CD, base UI
- **M1.5 — Vietnamese FTS:** `unaccent` + `pg_trgm` extension + custom `to_tsvector` config (NFR8) | ~4-6h
- Infra phải có story rõ ràng: Redis/BullMQ setup, Turborepo config, Drizzle migration management, Sentry integration
- **Re-estimate Epic 1: 24h → ~50-70h** (estimate cũ thiếu infra)

### Epic 2: User Authentication & Profiles  `[Track A]`
Users đăng ký, đăng nhập, quản lý profile — cả public và admin.
**FRs covered:** FR1, FR2, FR19
**Story bổ sung:**
- **M2.5 — Admin role grant:** quy trình cấp/thu quyền admin (seed super-admin + audit log, KHÔNG self-promote — chặn privilege escalation) | ~4h

### Epic 3: Listing Management & Search  `[Track A]`
Sellers đăng tin, buyers tìm kiếm và xem chi tiết, admin duyệt tin.
**FRs covered:** FR3, FR4, FR5, FR6, FR9, FR16
**Lưu ý:** FR9 (Spam Filter) giữ ở Epic 3 nhưng **tách rule-engine** để Epic 5 (crawl) tái dùng — giảm coupling. Xử lý edge case lifecycle: race expire-vs-edit, renew tin đã sold, expire khi đang có inquiry (AD-9).

### Epic 4: AI Intelligence  `[Track A — Phase 1 / Track B — Phase 2]`
Mỗi listing có AI summary + trust score, giúp buyer đánh giá nhanh.
**FRs covered:** FR7, FR8
**Tách phase:**
- **M4.2a Trust Score Phase 1** `[Track A]`: seller verify + listing quality (không cần market data)
- **M4.2b Trust Score Phase 2** `[Track B]`: + market alignment (sau khi có Auto-Import M5)
- AI insights kèm disclaimer + nút appeal (Section 11.3 PRD); AI summary cache invalidate khi seller sửa nội dung (AD-6)

### Epic 5: Xaction — Quảng bá & Import đa kênh  `[Track B — BLOCKED]`
Seller quảng bá tin lên FB/BDS/Chợ Tốt 1-click. Admin xem listings được import tự động.
**FRs covered:** FR10, FR11, FR12, FR13, FR17
**⚠️ BLOCKED — điều kiện mở khóa:** (1) Xaction API docs; (2) quyết định compliance ToS (PRD Section 11.1); (3) schema phone đã hash (AD-8).
**Stories bổ sung:**
- **M5.x — Deduplication:** hash(URL+title+phoneHash); xử lý tin trùng đổi giá; tin trùng với listing của chính seller | ~4h
- **M5.x — News feed FE rendering** (FR17 hiện thiếu story frontend) | ~4h
- XactionModule theo provider pattern (AD-3 mở rộng); cross-post lifecycle integrity (AD-9)

### Epic 6: Inquiry System & SEO  `[Track A]`
Buyer liên hệ seller trực tiếp. Google index tốt, traffic organic.
**FRs covered:** FR14, FR15, FR18
**Lưu ý:** **FR15 — email-first cho MVP, hoãn SMS sang post-MVP** (quyết định Luis 24/06: giảm phụ thuộc + tránh chờ duyệt brandname). Lighthouse CI gate cho NFR3 (AD-4); edge case inquiry khi listing expire.

---

# Story Details — Track A

> Story chi tiết với AC Given/When/Then cho Track A (Epic 1, 2, 3, 4 Phase 1, 6). Track B (Epic 5 + M4.2b) sinh sau khi gỡ 2 gate (Xaction API docs + ToS compliance).
> Quy ước: mỗi story độc lập trong epic (không forward dependency); DB table tạo theo story (không upfront); AC tham chiếu invariant AD-x khi liên quan.
> **Quy ước test (áp dụng cho MỌI story):** mỗi story phải kèm test tự động trước khi coi là Done — unit test cho business logic (NestJS service), integration test cho API/DB, E2E cho luồng user chính (Playwright). Story chỉ Done khi test pass trong CI (Story 1.3 gate). Edge case nêu trong AC phải có test tương ứng.

## Epic 1: Foundation & Infrastructure

**Goal:** Team dev có monorepo chạy được, deploy tự động, và nền tảng kỹ thuật (DB, queue, search, error tracking) sẵn sàng cho các epic sau. Đây là greenfield infra epic — hợp lệ vì mọi epic sau phụ thuộc nó.

### Story 1.1: Khởi tạo monorepo Turborepo

As a **developer**,
I want **một monorepo Turborepo với apps/web (Next.js 16) + apps/api (NestJS 11) + packages/shared**,
So that **cả team làm việc trên một cấu trúc thống nhất, chia sẻ type/schema giữa FE và BE**.

**Acceptance Criteria:**

**Given** một thư mục dự án sạch cho bdsai.vn (greenfield — KHÔNG dùng lại code Twenty CRM tham khảo)
**When** chạy lệnh setup monorepo
**Then** có `apps/web` chạy được Next.js 16 (React 19), `apps/api` chạy được NestJS 11, `packages/shared` export được type chung
**And** `turbo.json` cấu hình task `dev`/`build`/`lint`/`typecheck` cho cả 2 app
**And** naming convention theo AD: files kebab-case, entities PascalCase
**And** `yarn dev` chạy đồng thời cả web + api không lỗi

### Story 1.2: Kết nối Supabase (DB + Auth + Storage)

As a **developer**,
I want **apps/api kết nối Supabase PostgreSQL qua Drizzle ORM, cùng Auth và Storage client cấu hình sẵn**,
So that **các story sau có thể tạo bảng, xác thực user, và lưu ảnh**.

**Acceptance Criteria:**

**Given** monorepo từ Story 1.1 và một Supabase project (Free tier)
**When** cấu hình biến môi trường qua NestJS ConfigModule (AD: config qua .env)
**Then** Drizzle kết nối được PostgreSQL 15, chạy được migration rỗng đầu tiên
**And** Supabase Auth client + Storage client khởi tạo được, healthcheck pass
**And** KHÔNG tạo bảng nghiệp vụ nào ở story này (table tạo theo story cần)
**And** kết nối dùng connection pooling phù hợp giới hạn Supabase Free

### Story 1.3: CI/CD GitHub Actions → Vercel + Dokploy

As a **developer**,
I want **pipeline CI/CD tự động deploy web lên Vercel và api lên Dokploy khi merge**,
So that **mỗi thay đổi được build, test, và deploy không cần thao tác thủ công**.

**Acceptance Criteria:**

**Given** monorepo có cả 2 app
**When** push/merge vào nhánh chính
**Then** GitHub Actions chạy lint + typecheck + build cho cả 2 app
**And** web tự deploy lên Vercel, api build Docker image deploy lên Dokploy
**And** pipeline fail nếu lint/typecheck/build lỗi (gate)
**And** có job chạy Lighthouse CI trên public pages, fail nếu SEO < 90 (AD-4, NFR3)
**And** secrets (Supabase keys, OpenAI) quản lý qua GitHub Secrets, không hardcode

### Story 1.4: Base UI — layout, navigation, responsive

As a **buyer hoặc seller**,
I want **một giao diện nền với header, navigation, footer responsive**,
So that **tôi có khung điều hướng nhất quán trên mọi trang, cả desktop lẫn mobile**.

**Acceptance Criteria:**

**Given** apps/web với shadcn/ui + Tailwind CSS cài đặt
**When** truy cập bất kỳ trang nào
**Then** thấy header (logo bdsai.vn, nav, nút đăng nhập/đăng tin), footer
**And** layout responsive mobile-first, không vỡ ở viewport 360px → 1440px
**And** dùng route groups: `(public)`, `(dashboard)`, `(admin)` theo Structural Seed
**And** trạng thái loading/skeleton có sẵn cho các page sẽ SSR

### Story 1.5: Vietnamese Full-Text Search setup

As a **buyer**,
I want **hệ thống search hỗ trợ tiếng Việt có dấu và không dấu**,
So that **gõ "long thanh" vẫn tìm ra tin "Long Thành" (NFR8)**.

**Acceptance Criteria:**

**Given** Supabase PostgreSQL từ Story 1.2
**When** chạy migration bật search tiếng Việt
**Then** extension `unaccent` và `pg_trgm` được bật trên database
**And** có hàm/config `to_tsvector` xử lý tiếng Việt (bỏ dấu khi index)
**And** truy vấn thử "long thanh" khớp được "Long Thành", "căn hộ" khớp "can ho"
**And** ghi nhận giới hạn: ranking từ ghép có thể yếu (tham chiếu Deferred — trigger migrate ES là complaint về relevance)

### Story 1.6: Hạ tầng nền — Redis/BullMQ, Drizzle migration, Sentry

As a **developer**,
I want **Redis + BullMQ queue, quy trình migration Drizzle, và Sentry error tracking cấu hình sẵn**,
So that **các epic sau (AI, notification) có hạ tầng job nền và lỗi được theo dõi**.

**Acceptance Criteria:**

**Given** apps/api kết nối được Supabase
**When** cấu hình hạ tầng nền
**Then** Redis 7 kết nối được, BullMQ tạo/chạy được một test job
**And** quy trình `drizzle migration:generate` + `migrate` hoạt động, có tài liệu cách thêm migration
**And** Sentry bắt được lỗi từ cả web và api (structured JSON logging, AD: NestJS Logger)
**And** error shape chuẩn `{ statusCode, message, error?, details? }` qua NestJS exception filter (AD consistency)
**And** có monitoring cảnh báo khi Supabase DB > 400MB hoặc Storage > 800MB (NFR5 — trigger nâng Pro trước khi đầy, theo readiness report)

## Epic 2: User Authentication & Profiles

**Goal:** Users đăng ký, đăng nhập, quản lý profile (public qua Supabase Auth); admin có luồng auth riêng và quy trình cấp quyền an toàn (AD-5). Chống privilege escalation.

### Story 2.1: Đăng ký bằng email + phone

As a **người dùng mới (buyer/seller)**,
I want **đăng ký tài khoản bằng email và số điện thoại**,
So that **tôi có tài khoản để đăng tin hoặc liên hệ seller**.

**Acceptance Criteria:**

**Given** trang đăng ký và Supabase Auth (Story 1.2)
**When** nhập email + phone + mật khẩu hợp lệ và submit
**Then** tài khoản tạo qua Supabase Auth, bản ghi `public_users` tạo với `role = 'user'` (story này tạo bảng `public_users`)
**And** email xác thực được gửi; tài khoản ở trạng thái chưa verify đến khi xác nhận
**And** validation: email đúng định dạng, phone VN hợp lệ, mật khẩu ≥ 8 ký tự
**And** đăng ký trùng email → báo lỗi rõ ràng, không tạo trùng
**And** phone lưu chuẩn hóa; không lộ PII trong log (AD-8)

### Story 2.2: Đăng nhập / đăng xuất với JWT session

As a **người dùng đã đăng ký**,
I want **đăng nhập và đăng xuất an toàn**,
So that **tôi truy cập được tính năng cần xác thực và bảo vệ phiên của mình**.

**Acceptance Criteria:**

**Given** tài khoản đã tạo từ Story 2.1
**When** đăng nhập bằng email + mật khẩu đúng
**Then** nhận JWT Supabase, lưu phiên; request tới NestJS xác thực qua `Authorization: Bearer` (AD-5)
**And** sai mật khẩu → báo lỗi, không tiết lộ email tồn tại hay không
**And** đăng xuất xóa phiên client + server
**And** JWT hết hạn → tự refresh im lặng; nếu refresh fail → chuyển về trang đăng nhập (xử lý edge case JWT expire)

### Story 2.3: Quản lý profile (avatar, bio, phone verified)

As a **người dùng đã đăng nhập**,
I want **cập nhật profile gồm avatar, bio và xác thực số điện thoại**,
So that **tôi tăng độ tin cậy và người khác liên hệ được**.

**Acceptance Criteria:**

**Given** user đã đăng nhập
**When** cập nhật profile và upload avatar
**Then** thay đổi lưu qua NestJS API (AD-2); avatar upload trực tiếp Supabase Storage (AD-7, exception AD-2)
**And** xác thực phone qua OTP → đánh dấu `phone_verified = true`
**And** avatar auto-convert WebP, ≤ 10MB (AD-7)
**And** bio giới hạn độ dài, sanitize chống XSS

### Story 2.4: Admin — danh sách user, ban/unban

As an **admin**,
I want **xem danh sách user và ban/unban**,
So that **tôi kiểm soát người dùng vi phạm trên nền tảng (FR19)**.

**Acceptance Criteria:**

**Given** một admin đã đăng nhập (role = 'admin')
**When** truy cập trang quản lý user trong `(admin)`
**Then** thấy danh sách user (phân trang, tìm kiếm theo email/phone)
**And** ban một user → user đó không đăng nhập/đăng tin được, tin đang hiển thị bị ẩn
**And** unban khôi phục quyền
**And** route `(admin)` chặn user thường qua NestJS guard role check (AD-5)
**And** mọi hành động ban/unban ghi audit log

### Story 2.5: Admin role grant — quy trình cấp quyền an toàn

As a **super-admin**,
I want **một quy trình cấp/thu quyền admin có kiểm soát, không cho tự nâng quyền**,
So that **ngăn privilege escalation — không user thường nào tự biến mình thành admin**.

**Acceptance Criteria:**

**Given** hệ thống cần ít nhất một admin
**When** khởi tạo hệ thống
**Then** super-admin đầu tiên được seed qua migration/command (KHÔNG qua UI công khai)
**And** chỉ super-admin cấp/thu quyền admin cho user khác; user thường KHÔNG có endpoint tự nâng quyền
**And** mọi thay đổi role ghi audit log (ai cấp, cho ai, khi nào)
**And** thử gọi API đổi role bằng token user thường → 403 Forbidden
**And** thu quyền admin có hiệu lực ngay (phiên admin cũ mất quyền ở request kế tiếp)

## Epic 3: Listing Management & Search

**Goal:** Seller đăng và quản lý tin; buyer duyệt, tìm kiếm, xem chi tiết; admin duyệt tin. Đây là core marketplace. Bám wireframe `wireframe-listing-form.md` cho luồng đăng tin. Governed bởi AD-2, AD-4, AD-7, AD-9.

### Story 3.1: Listing entity + CRUD + status workflow

As a **seller**,
I want **một thực thể listing với vòng đời trạng thái rõ ràng**,
So that **tin của tôi đi qua draft → chờ duyệt → hiển thị → hết hạn/đã bán một cách nhất quán**.

**Acceptance Criteria:**

**Given** apps/api kết nối DB
**When** tạo schema listing
**Then** bảng `public_listings` tạo (story này) với các trạng thái: `DRAFT`, `PENDING`, `PUBLISHED`, `REJECTED`, `EXPIRED`, `SOLD`
**And** CRUD listing chỉ qua NestJS marketplace module → Service → Drizzle (AD-2)
**And** mỗi listing thuộc về một user (FK `public_users`); chỉ chủ sở hữu hoặc admin sửa được
**And** chuyển trạng thái tuân theo workflow hợp lệ (vd DRAFT→PENDING, không DRAFT→SOLD)
**And** IDs dùng UUID v4, dates ISO 8601 UTC (AD consistency)

### Story 3.2: Đăng tin — form nhiều bước + upload ảnh

As a **seller**,
I want **một form nhiều bước để đăng tin kèm ảnh**,
So that **tôi tạo tin đầy đủ thông tin mà không bị quá tải, không mất dữ liệu giữa chừng**.

**Acceptance Criteria:**

**Given** seller đã đăng nhập và wireframe `wireframe-listing-form.md`
**When** đi qua 4 bước (Thông tin → Vị trí → Hình ảnh → Xem lại)
**Then** mỗi bước validate field bắt buộc trước khi cho qua (theo wireframe)
**And** draft tự lưu sau mỗi bước; thoát rồi vào lại được hỏi "Tiếp tục tin nháp?"
**And** ảnh upload trực tiếp Supabase Storage, ≤10 ảnh, mỗi ảnh ≤10MB, auto WebP (AD-7); ảnh đầu = ảnh bìa
**And** submit → POST qua NestJS, listing chuyển `PENDING` (chờ duyệt)
**And** JWT expire giữa form → draft giữ nguyên, refresh token im lặng rồi retry; fail thì modal đăng nhập lại, KHÔNG mất data
**And** double-click "Đăng tin" không tạo tin trùng (idempotency)
**And** file upload validate magic bytes (không chỉ extension) — reject file giả dạng ảnh; quét kích thước thực tế server-side (AD-7)
**And** seller nhân bản (duplicate) một tin đã có làm nháp mới — giảm thời gian đăng cho môi giới nhiều lô (persona anh Minh); tin nhân bản phải sửa trước khi submit
**And** KHÔNG có nút "Quảng bá" (Track B, BLOCKED)

### Story 3.3: Duyệt & tìm kiếm — filter, sort, phân trang

As a **buyer**,
I want **duyệt và tìm kiếm tin theo bộ lọc**,
So that **tôi nhanh chóng tìm BĐS phù hợp nhu cầu**.

**Acceptance Criteria:**

**Given** có listing `PUBLISHED` và FTS tiếng Việt (Story 1.5)
**When** tìm kiếm với từ khóa + filter (location, price range, type, area)
**Then** kết quả chỉ gồm tin `PUBLISHED`, khớp filter, hỗ trợ tiếng Việt có/không dấu (NFR8)
**And** sort theo: mới nhất, giá tăng/giảm; phân trang ổn định
**And** tìm "long thanh" trả về tin "Long Thành"
**And** không có kết quả → empty state rõ ràng
**And** API response < 200ms P95 cho truy vấn thông thường (NFR2)

### Story 3.4: Trang chi tiết listing — SSR + SEO meta

As a **buyer hoặc search bot**,
I want **trang chi tiết tin render server-side với meta tags động**,
So that **trang tải nhanh, hiển thị đầy đủ, và Google index tốt (FR6)**.

**Acceptance Criteria:**

**Given** một listing `PUBLISHED`
**When** truy cập `/listings/[id]`
**Then** trang server-render (Next.js generateMetadata + server component, AD-4)
**And** meta tags động (title, description, og:image) theo nội dung tin
**And** chỉ tin `PUBLISHED` truy cập công khai; tin khác → 404 hoặc chặn theo quyền
**And** SSR render < 500ms P95 (NFR1), Lighthouse SEO > 90 (NFR3)
**And** Next.js API route chỉ proxy data-fetch, ZERO business logic (AD-10)

### Story 3.5: Admin — hàng đợi duyệt + cờ spam

As an **admin**,
I want **hàng đợi duyệt tin với cờ spam tự động**,
So that **tôi duyệt/từ chối tin hiệu quả, lọc spam (FR4)**.

**Acceptance Criteria:**

**Given** có tin `PENDING` và bộ lọc spam rule-based cơ bản (keyword blacklist — **xây ngay trong story này** để moderation dùng được, KHÔNG phụ thuộc Epic 4)
**When** admin mở hàng đợi moderation trong `(admin)`
**Then** thấy danh sách tin `PENDING`, tin nghi spam được gắn cờ (keyword blacklist + rule cơ bản)
**And** approve → tin chuyển `PUBLISHED`; reject → `REJECTED` kèm lý do gửi seller
**And** hỗ trợ bulk approve nhiều tin cùng lúc + lý do reject chọn từ mẫu (giảm tải admin khi nhiều tin/ngày)
**And** khi tin bị reject, nếu đã có cross_post (tương lai Track B) thì enqueue gỡ best-effort (AD-9 — hook sẵn, no-op khi chưa có Track B)
**And** hành động duyệt ghi audit log

### Story 3.6: Vòng đời tin — hết hạn, gia hạn, đánh dấu đã bán

As a **seller**,
I want **tin tự hết hạn, gia hạn được, và đánh dấu đã bán**,
So that **danh sách tin luôn cập nhật, không hiển thị tin cũ/đã bán (FR16)**.

**Acceptance Criteria:**

**Given** tin `PUBLISHED` có ngày hết hạn
**When** đến hạn (cron job)
**Then** tin chuyển `EXPIRED`, ẩn khỏi search; seller nhận thông báo gia hạn
**And** seller gia hạn tin `EXPIRED` → về `PUBLISHED` với hạn mới; KHÔNG gia hạn được tin `SOLD`
**And** đánh dấu `SOLD` → ẩn khỏi search, giữ lại cho thống kê
**And** race condition expire-vs-edit: cron và user edit không ghi đè nhau (optimistic lock hoặc transaction)
**And** tin `EXPIRED`/`SOLD` đang có inquiry mở → inquiry vẫn xem được, chặn inquiry mới (AD-9)

### Story 3.7: Seed dữ liệu listing mẫu

As a **developer / product owner**,
I want **một bộ seed listing mẫu (Long Thành area) nạp được vào DB**,
So that **đạt launch criteria "50+ listings" và demo/test marketplace có nội dung thật (PRD §8.1)**.

**Acceptance Criteria:**

**Given** schema listing (Story 3.1) và FTS (Story 1.5)
**When** chạy command seed
**Then** ≥ 50 listing mẫu khu vực Long Thành/Đồng Nai nạp vào DB ở trạng thái `PUBLISHED`
**And** dữ liệu seed thực tế (giá/diện tích/vị trí hợp lý), có ảnh placeholder hợp lệ
**And** seed idempotent (chạy lại không tạo trùng); tách biệt môi trường dev/prod
**And** seed KHÔNG chứa PII thật của người khác (AD-8) — dùng dữ liệu giả/ẩn danh

## Epic 4: AI Intelligence (Phase 1 — Track A)

**Goal:** Mỗi listing có AI summary và trust score (phần không cần market data), giúp buyer đánh giá nhanh. Governed bởi AD-6 (AI cost control). **M4.2b (Trust Score Phase 2 — market alignment) thuộc Track B, KHÔNG sinh story ở đây** — chờ Auto-Import (Epic 5).

### Story 4.1: AI Summary — GPT-4 phân tích tin đăng

As a **buyer**,
I want **một bản tóm tắt AI cho mỗi tin (highlights, khu vực, tiềm năng đầu tư)**,
So that **tôi hiểu nhanh ưu/nhược điểm mà không đọc hết mô tả dài (FR7)**.

**Acceptance Criteria:**

**Given** một listing `PUBLISHED` và hạ tầng BullMQ (Story 1.6)
**When** tin được duyệt hoặc nội dung thay đổi
**Then** một background job (KHÔNG đồng bộ trong request, AD-6) gọi GPT-4 tạo summary
**And** kết quả lưu bảng `ai_results` (story này tạo bảng), KHÔNG re-generate nếu nội dung không đổi (cache theo AD-6)
**And** rate limit toàn cục ≤ 100 AI calls/giờ (NFR6); vượt quota → fallback GPT-3.5-turbo
**And** GPT timeout/lỗi → job retry theo backoff; fail cuối → tin vẫn hiển thị bình thường, summary để trống (không block)
**And** seller sửa nội dung → cache summary cũ invalidate, regenerate

### Story 4.2a: Trust Score Phase 1 — seller verify + listing quality

As a **buyer**,
I want **điểm uy tín (0-100) dựa trên mức xác thực seller và chất lượng tin**,
So that **tôi phân biệt tin đáng tin với tin sơ sài (FR8, phần không cần market data)**.

**Acceptance Criteria:**

**Given** listing có dữ liệu seller (phone_verified từ Story 2.3) và độ đầy đủ thông tin
**When** tính Trust Score Phase 1
**Then** điểm 0-100 tính từ: seller verified, độ đầy đủ tin (ảnh, mô tả, pháp lý), KHÔNG dùng market alignment
**And** điểm lưu `ai_results`, tính async qua BullMQ (AD-6)
**And** ghi rõ đây là Phase 1; phần market alignment (Phase 2) để placeholder, kích hoạt ở Track B
**And** tin mới chưa đủ data → điểm "đang đánh giá" thay vì 0, kèm tooltip giải thích (tránh seller mới hiểu nhầm bị phân biệt → bỏ nền tảng)

### Story 4.3: Smart Spam Filter — nâng cao rule-engine + heuristic

As an **admin**,
I want **nâng cấp bộ lọc spam cơ bản (từ Story 3.5) thành rule-engine có heuristic thông minh**,
So that **phát hiện spam/lừa đảo tinh vi hơn, không chỉ dựa keyword (FR9)**.

**Acceptance Criteria:**

**Given** spam filter cơ bản đã có từ Story 3.5 (keyword blacklist)
**When** chạy spam filter nâng cao
**Then** rule-engine bổ sung heuristic: giá bất thường so mặt bằng, lặp text, link lạ, phone đáng ngờ
**And** rule-engine đóng gói thành module độc lập để Epic 5 (crawl, Track B) tái dùng sau
**And** tin nghi spam gắn cờ trong hàng đợi moderation (Story 3.5), KHÔNG auto-reject
**And** admin cấu hình được blacklist + ngưỡng heuristic (thêm/xóa keyword, chỉnh threshold)
**And** false positive: admin override cờ được

### Story 4.4: Hiển thị AI insights + disclaimer + appeal

As a **buyer**,
I want **xem AI summary và Trust Score trên trang chi tiết, kèm ghi chú minh bạch**,
So that **tôi tham khảo AI một cách có hiểu biết, và seller có quyền khiếu nại (FR8, Section 11.3)**.

**Acceptance Criteria:**

**Given** listing có `ai_results` (summary + trust score)
**When** xem trang chi tiết tin
**Then** hiển thị AI summary và Trust Score với disclaimer "Điểm tham khảo do AI tạo, không phải xác nhận pháp lý"
**And** seller thấy nút "Khiếu nại điểm" → tạo request review cho admin (Section 11.3)
**And** nếu chưa có AI result (job chưa chạy/lỗi) → ẩn block AI gọn gàng, không vỡ layout
**And** insights render trong SSR page nhưng không chặn render nếu thiếu (AD-4)

## Epic 6: Inquiry System & SEO

**Goal:** Buyer liên hệ seller trực tiếp qua nền tảng; Google index tốt để thu traffic organic. Notification email-first (SMS hoãn post-MVP). Governed bởi AD-4 (SSR/SEO).

### Story 6.1: Form liên hệ — buyer gửi inquiry cho seller

As a **buyer**,
I want **gửi liên hệ cho seller từ trang chi tiết tin**,
So that **tôi hỏi thông tin hoặc hẹn xem mà không cần rời nền tảng (FR14)**.

**Acceptance Criteria:**

**Given** một listing `PUBLISHED`
**When** buyer điền form inquiry (tên, phone/email, lời nhắn) và gửi
**Then** inquiry lưu qua NestJS (bảng `inquiries` tạo ở story này, FK tới listing + buyer)
**And** validation field bắt buộc; chống spam (rate limit theo IP/user)
**And** chặn gửi inquiry tới tin `EXPIRED`/`SOLD` (nhất quán AD-9, Story 3.6)
**And** buyer chưa đăng nhập vẫn gửi được (lưu thông tin liên hệ) HOẶC yêu cầu đăng nhập — theo quyết định, mặc định cho khách gửi

### Story 6.2: Notification email cho seller khi có inquiry

As a **seller**,
I want **nhận email khi có người liên hệ tin của tôi**,
So that **tôi phản hồi lead kịp thời (FR15 — email-first)**.

**Acceptance Criteria:**

**Given** một inquiry mới tạo từ Story 6.1
**When** inquiry được lưu
**Then** background job (BullMQ) gửi email cho seller qua provider email (Supabase/Resend)
**And** email chứa nội dung inquiry + thông tin liên hệ buyer + link tới tin
**And** gửi lỗi → retry theo backoff; không block luồng tạo inquiry
**And** SMS KHÔNG triển khai ở MVP (hoãn post-MVP, theo Deferred) — kiến trúc notification để mở thêm kênh sau
**And** ngoài email, có in-app notification + badge "inquiry mới" trong dashboard (seller VN ít check email → tránh bỏ lỡ lead nóng, giảm rủi ro buyer nghĩ tin "ma")
**And** seller xem được danh sách inquiry trong `(dashboard)`

### Story 6.3: Dynamic sitemap.xml + robots.txt

As a **search bot**,
I want **sitemap.xml động và robots.txt hợp lệ**,
So that **tôi crawl và index mọi tin công khai hiệu quả (FR18)**.

**Acceptance Criteria:**

**Given** có listing `PUBLISHED`
**When** truy cập `/sitemap.xml` và `/robots.txt`
**Then** sitemap liệt kê mọi URL tin `PUBLISHED` + trang tĩnh, cập nhật động khi có tin mới
**And** sitemap server-render (AD-4), cache hợp lý để không truy vấn DB mỗi request
**And** robots.txt cho phép index public pages, chặn `(dashboard)`/`(admin)`
**And** sitemap chỉ chứa tin `PUBLISHED` (không lộ DRAFT/PENDING/REJECTED)

### Story 6.4: Structured data — JSON-LD Schema.org

As a **search bot**,
I want **dữ liệu có cấu trúc JSON-LD trên trang tin**,
So that **kết quả tìm kiếm Google hiển thị rich result (giá, diện tích, ảnh) (FR18, NFR3)**.

**Acceptance Criteria:**

**Given** trang chi tiết tin (Story 3.4)
**When** render SSR
**Then** nhúng JSON-LD Schema.org phù hợp (RealEstateListing/Product) với giá, diện tích, vị trí, ảnh
**And** JSON-LD validate qua Google Rich Results Test không lỗi
**And** dữ liệu JSON-LD khớp nội dung hiển thị (không cloaking)

### Story 6.5: Tối ưu hiệu năng — caching, lazy load

As a **buyer**,
I want **trang tải nhanh kể cả khi nhiều ảnh**,
So that **trải nghiệm mượt và đạt mục tiêu hiệu năng (NFR1, NFR4)**.

**Acceptance Criteria:**

**Given** các public page (home, browse, detail)
**When** đo hiệu năng
**Then** ảnh lazy-load, dùng WebP + responsive sizes; page load < 2s P75 (NFR4)
**And** caching hợp lý: search results, listing detail (Redis hoặc Next cache)
**And** Lighthouse SEO > 90 và Performance đạt ngưỡng chấp nhận (gate CI từ Story 1.3)
**And** SSR render < 500ms P95 (NFR1)





