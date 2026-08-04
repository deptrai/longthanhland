---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - docs/bdsai/planning/prd-mvp-v2.md
  - docs/bdsai/architecture/ARCHITECTURE-SPINE.md
  - docs/bdsai/ux-design/wireframe-listing-form.md
  - _bmad-output/planning-artifacts/vision-lock-and-this-week-2026-08-04.md
  - _bmad-output/planning-artifacts/task-list-2weeks-2026-08-04.md
---

# bdsai.vn - Epic Breakdown (Vision Pivot 2026-08-04)

## Overview

Tài liệu này phân tách requirements cho bdsai.vn theo vision mới: **bdsai.vn = sàn rao vặt BĐS Việt Nam có AI; Nowing = engine AI chạy sau lưng**. Pivot này loại bỏ Xaction proxy auto-post (rủi ro ToS/pháp lý), thay bằng Deal-Radar + browser extension + assisted post. Pilot 2 tuần tập trung Bình Thạnh 3-4 tỷ.

## Requirements Inventory

### Functional Requirements

FR1: User đăng ký bằng email + phone, xác thực qua Supabase Auth
FR2: User đăng nhập, quản lý profile (avatar, bio, phone verified, role seller/buyer/admin)
FR3: Seller tạo listing (multi-step form, image upload, draft/publish) với AI gợi ý mô tả
FR4: Admin approve/reject listings từ moderation queue
FR5: Buyer browse + search listings (filters: location, price, type, area; default pilot Bình Thạnh 3-4 tỷ)
FR6: Listing detail page SSR với dynamic meta tags + structured data
FR7: AI Summary: phân tích mỗi listing (highlights, neighborhood, investment, ưu/nhược điểm)
FR8: Trust Score: algorithm chấm điểm uy tín (0-100) Phase 1 — seller verify + listing quality
FR9: Smart Spam Filter: rule-based + keyword blacklist
FR10: Inquiry form: buyer gửi liên hệ cho seller
FR11: Notification: email cho seller khi có inquiry
FR12: Listing auto-expire + renew + mark sold
FR13: Dynamic sitemap.xml + robots.txt
FR14: Admin: user list, ban/unban
FR15: **Deal-Radar: seller tạo filter bằng lời, hệ thống gửi alert khi có tin khớp**
FR16: **Lead management: seller quản lý người mua liên hệ, trạng thái, gán listing, notes**
FR17: **AI viết tin đăng: seller nhập thông tin cơ bản, AI viết lại mô tả chuẩn SEO**
FR18: **Nowing engine integration: bdsai gọi Nowing API cho AI summary, viết tin, market summary, Deal-Radar matching**
FR19: **Browser extension MVP: đọc listing từ Batdongsan/Chợ Tốt trong session user, lưu vào bdsai workspace**
FR20: **Seller workspace: mỗi seller có dashboard CRM riêng (listings, leads, Deal-Radar, AI tools)**
FR21: News feed: tin tức BĐS từ admin-curated articles
FR22: Assisted post: hỗ trợ seller đăng lên Chợ Tốt/Zalo bằng tay (không proxy account)
FR23: **Nowing automation trigger: bdsai gọi Nowing automation khi có Deal-Radar match; Nowing gửi tin vào group Zalo**

### NonFunctional Requirements

NFR1: SSR render < 500ms (P95)
NFR2: API response < 200ms (P95)
NFR3: Lighthouse SEO > 90
NFR4: Page load < 2s (P75)
NFR5: Supabase Free tier limits: 500MB DB, 1GB storage
NFR6: AI rate limit: max 100 calls/hour
NFR7: Deal-Radar alert latency < 5 phút kể từ khi tin xuất hiện
NFR8: Vietnamese full-text search support
NFR9: Image max 10MB, auto-convert WebP
NFR10: Domain: bdsai.vn
NFR11: Không lưu sellerPhone raw từ nguồn crawl/extension (hash hoặc user-consent)
NFR12: Browser extension MV3 tuân thủ Chrome Web Store policy

### Additional Requirements

- Monorepo: apps/web + apps/api + packages/shared (Turborepo)
- Deploy: Vercel (FE) + Dokploy Docker (BE)
- CI/CD: GitHub Actions
- All mutations through NestJS API (AD-2)
- Auth: Supabase Auth (public) + NestJS guards (admin) (AD-5)
- Error tracking: Sentry
- Module isolation: marketplace, auth, ai, admin, queue, deal-radar, leads, nowing-engine (AD-1)
- Next.js API routes chỉ là thin proxy (AD-10)
- Nowing engine calls qua REST API với service API key
- Browser extension không tự động bấm "hiện số", không kho PII tập trung

### UX Design Requirements

UX-DR1: Dashboard CRM chuyển từ marketplace sang workspace cho môi giới (sidebar: Tổng quan, Tin đăng, Deal-Radar, Lead, AI viết tin, Tin tức, Cài đặt)
UX-DR2: Public marketplace mở rộng khắp Việt Nam, default filter pilot ở Bình Thạnh 3-4 tỷ (căn hộ, nhà phố)
UX-DR3: Listing card hiển thị Trust Score badge + AI summary 1 dòng
UX-DR4: Deal-Radar page: form tạo filter bằng lời, danh sách alert, badge nguồn + link
UX-DR5: Lead management page: bảng leads, trạng thái, gán listing, notes
UX-DR6: Rebrand bdsai.vn: logo, màu indigo/slate, typography Geist
UX-DR7: Mobile-first responsive, touch target tối thiểu 44px

### FR Coverage Map

| FR | Epic | Stories | Mô tả |
|---|---|---|---|
| FR1 | Epic 2 | 2.1 | Đăng ký email + phone |
| FR2 | Epic 2 | 2.1 | Đăng nhập, profile |
| FR3 | Epic 3 | 3.1 | Tạo listing + AI viết tin |
| FR4 | Epic 3 | 3.1 | Admin approve/reject |
| FR5 | Epic 3 | 3.6 | Browse + search |
| FR6 | Epic 3 | 3.6 | Listing detail SSR |
| FR7 | Epic 4 | 4.1 | AI Summary |
| FR8 | Epic 4 | 4.1 | Trust Score |
| FR9 | Epic 3 | 3.1 | Spam Filter |
| FR10 | Epic 6 | 6.1 | Inquiry form |
| FR11 | Epic 6 | 6.1 | Notifications |
| FR12 | Epic 3 | 3.1 | Auto-expire/renew/sold |
| FR13 | Epic 6 | 6.4 | Sitemap + robots |
| FR14 | Epic 2 | 2.1 | Admin user management |
| FR15 | Epic 5 | 5.1, 7.1d | Deal-Radar |
| FR16 | Epic 5 | 5.2 | Lead management |
| FR17 | Epic 4 | 4.3, 7.1b | AI viết tin |
| FR18 | Epic 7 | 7.1a-7.1e | Nowing engine integration |
| FR19 | Epic 7 | 7.2a, 7.2b | Browser extension |
| FR20 | Epic 5 | 5.3 | Seller workspace CRM |
| FR21 | Epic 6 | 6.4 | News feed |
| FR22 | Epic 8 | 8.1 | Assisted post (hoãn) |
| FR23 | Epic 7 | 5.1, 7.1e | Nowing automation trigger (Zalo notification) |

## Epic List

> **Track A (build ngay):** Epic 1, 2, 3 (tinh chỉnh), 4 (mở rộng AI), 5 (mới), 6, 7.
> **Track B (hoãn):** Epic 8 (Multi-Channel Distribution full auto-post).

### Epic 1: Foundation & Infrastructure
Hệ thống chạy được, deploy tự động, có base UI + Vietnamese FTS + monitoring.
**FRs covered:** — (enables all)

### Epic 2: User Authentication & Profiles
User đăng ký, đăng nhập, quản lý profile, admin quản lý users.
**FRs covered:** FR1, FR2, FR14

### Epic 3: Public Marketplace
Người mua tìm kiếm, xem tin đăng BĐS Việt Nam; seller tạo và quản lý tin đăng; admin duyệt tin.
**FRs covered:** FR3, FR4, FR5, FR6, FR9, FR12

### Epic 4: AI Intelligence
AI phân tích tin đăng (summary, trust score), hỗ trợ seller viết tin chuẩn SEO.
**FRs covered:** FR7, FR8, FR17

### Epic 5: Seller CRM Workspace
Môi giới có workspace riêng: Deal-Radar theo dõi tin khớp, quản lý lead, xem tổng quan.
**FRs covered:** FR15, FR16, FR20

### Epic 6: Inquiry & Engagement
Người mua liên hệ seller, seller nhận thông báo, news feed, SEO/sitemap.
**FRs covered:** FR10, FR11, FR13, FR21

### Epic 7: Nowing Engine Integration
Bdsai kết nối Nowing engine qua API; browser extension MVP để môi giới lưu tin từ các sàn vào workspace.
**FRs covered:** FR18, FR19, FR23 (across 7.1a-7.1e, 7.2a, 7.2b)

### Epic 8: Multi-Channel Distribution (Track B — hoãn)
Hỗ trợ seller đăng lên Chợ Tốt/Zalo bằng tay (assisted); full auto-post hoãn sau khi có quyết định pháp lý.
**FRs covered:** FR22

## Requirements Coverage Map

| FR | Epic | Stories | Mô tả |
|---|---|---|---|
| FR1 | Epic 2 | 2.1 | Đăng ký email + phone |
| FR2 | Epic 2 | 2.1 | Đăng nhập, profile |
| FR3 | Epic 3 | 3.1 | Tạo listing |
| FR4 | Epic 3 | 3.1 | Admin approve/reject |
| FR5 | Epic 3 | 3.6 | Browse + search |
| FR6 | Epic 3 | 3.6 | Listing detail SSR |
| FR7 | Epic 4 | 4.1 | AI Summary |
| FR8 | Epic 4 | 4.1 | Trust Score |
| FR9 | Epic 3 | 3.1 | Spam Filter |
| FR10 | Epic 6 | 6.1 | Inquiry form |
| FR11 | Epic 6 | 6.1 | Notifications |
| FR12 | Epic 3 | 3.1 | Auto-expire/renew/sold |
| FR13 | Epic 6 | 6.4 | Sitemap + robots |
| FR14 | Epic 2 | 2.1 | Admin user management |
| FR15 | Epic 5 | 5.1, 7.1d | Deal-Radar |
| FR16 | Epic 5 | 5.2 | Lead management |
| FR17 | Epic 4 | 4.3, 7.1b | AI viết tin |
| FR18 | Epic 7 | 7.1a-7.1e | Nowing engine integration |
| FR19 | Epic 7 | 7.2a, 7.2b | Browser extension |
| FR20 | Epic 5 | 5.3 | Seller workspace CRM |
| FR21 | Epic 6 | 6.4 | News feed |
| FR22 | Epic 8 | 8.1 | Assisted post (hoãn) |
| FR23 | Epic 7 | 5.1, 7.1e | Nowing automation trigger (Zalo notification) |

## Epic 1: Foundation & Infrastructure

Hệ thống chạy được, deploy tự động, base UI + Vietnamese FTS + monitoring. Phần lớn đã implement theo Story 1.1–1.6 của PRD v2.0.

### Story 1.1: Project setup baseline (DONE)

As a team dev, I want monorepo chạy được với web + api + shared, so that tôi có môi trường phát triển ổn định.

**Acceptance Criteria:**

**Given** môi trường dev
**When** chạy `yarn install && yarn dev`
**Then** web chạy ở 3100, api chạy ở 3101

---

## Epic 2: User Authentication & Profiles

User đăng ký, đăng nhập, quản lý profile, admin quản lý users. Phần lớn đã implement.

### Story 2.1: Registration with email + phone (DONE)

As a user, I want đăng ký bằng email và phone, so that tôi có tài khoản trên bdsai.

**Acceptance Criteria:**

**Given** user chưa có tài khoản
**When** họ điền email, phone, password và bấm đăng ký
**Then** Supabase Auth tạo user, public_users insert row, email xác nhận gửi đi

---

## Epic 3: Public Marketplace

Người mua tìm kiếm, xem tin đăng BĐS Việt Nam; seller tạo và quản lý tin đăng; admin duyệt tin. Phần lớn đã implement, cần tinh chỉnh theo vision mới.

### Story 3.1: Listing CRUD + workflow (DONE)

As a seller, I want tạo/edit/submit/renew/mark-sold listing, so that tôi quản lý tin đăng của mình.

**Acceptance Criteria:**

**Given** seller đăng nhập
**When** họ tạo listing mới
**Then** listing ở trạng thái DRAFT, seller có thể edit và submit để chờ duyệt

### Story 3.6: Rebrand marketplace to bdsai.vn (Việt Nam)

As a buyer, I want tìm kiếm BĐS trên bdsai.vn, so that tôi thấy tin phù hợp với khu vực mục tiêu.

**Acceptance Criteria:**

**Given** user vào `/listings`
**When** trang load
**Then** title, hero, filter mặc định đều hiển thị "bdsai.vn" và "Việt Nam" (pilot default: Bình Thạnh 3-4 tỷ)

**Given** admin duyệt listing
**When** listing publish
**Then** SEO meta tag và JSON-LD dùng location do seller nhập (không hard-code Bình Thạnh)

---

## Epic 4: AI Intelligence

AI phân tích tin đăng (summary, trust score), hỗ trợ seller viết tin chuẩn SEO. Phần summary/trust score đã implement, cần thêm AI viết tin.

### Story 4.1: AI Summary (DONE)

As a buyer, I want xem AI summary cho mỗi listing, so that tôi hiểu nhanh ưu/nhược điểm.

**Acceptance Criteria:**

**Given** listing đã được publish
**When** AI processor chạy
**Then** `ai_results` có `summary` hiển thị trên listing detail

### Story 4.3: AI viết tin đăng

As a seller, I want AI viết lại mô tả tin đăng từ thông tin cơ bản, so that tin chuẩn SEO và hấp dẫn hơn.

**Acceptance Criteria:**

**Given** seller đang tạo listing
**When** họ nhập tiêu đề, giá, diện tích, khu vực, loại BĐS và bấm "Viết bằng AI"
**Then** hệ thống gọi Nowing engine `POST /agent/rewrite-listing` và điền mô tả vào form

**Given** Nowing engine trả lỗi
**When** seller bấm "Viết bằng AI"
**Then** hiển thị thông báo lỗi rõ ràng, giữ nguyên dữ liệu seller đã nhập

---

## Epic 5: Seller CRM Workspace

Môi giới có workspace riêng trên bdsai.vn để theo dõi tin khớp (Deal-Radar), quản lý người mua (leads), và truy cập AI tools.

### Story 5.1: Deal-Radar — tạo filter và nhận alert

As a môi giới,
I want tạo filter bằng lời và nhận alert khi có tin BĐS khớp,
So that tôi không bỏ lỡ cơ hội mua/bán cho khách hàng.

**Acceptance Criteria:**

**Given** môi giới đã đăng nhập và đang ở trang Deal-Radar
**When** họ nhập filter dạng "căn hộ Bình Thạnh 3-4 tỷ, 60-80m2" (hoặc bất kỳ khu vực Việt Nam nào) và bấm "Lưu filter"
**Then** hệ thống parse filter thành các trường (propertyType, location, priceRange, areaRange) và lưu vào `deal_radar_filters`
**And** trả về danh sách tin hiện có khớp filter (tối đa 20)

**Given** filter đã được lưu
**When** có tin mới được publish hoặc imported khớp filter
**Then** hệ thống tạo `deal_radar_alerts`
**And** gọi Nowing automation đã cấu hình sẵn (tay) để gửi tin nhắn vào group Zalo riêng của môi giới kèm link về nguồn

**Given** môi giới mở lại Deal-Radar sau 1 ngày
**When** trang load
**Then** họ thấy danh sách alert chưa đọc, đã đọc, và có nút "Mark as read" / "Xóa"

**Given** tin mới khớp filter được publish
**When** hệ thống gọi Nowing automation để gửi Zalo
**Then** tổng thời gian từ publish → Zalo group message < 5 phút (NFR7)

### Story 5.2: Lead Management

As a môi giới,
I want quản lý danh sách người mua liên hệ và trạng thái của họ,
So that tôi theo dõi được ai đang cần gì và gán tin phù hợp.

**Acceptance Criteria:**

**Given** môi giới đăng nhập
**When** họ vào trang "Lead" và bấm "Thêm lead"
**Then** form mở ra với fields: tên, số điện thoại (tùy chọn), nhu cầu (text), ngân sách, khu vực, loại BĐS
**And** sau khi lưu, lead xuất hiện trong bảng

**Given** môi giới đang xem lead detail
**When** họ chọn 1 listing từ dropdown và bấm "Gán tin"
**Then** lead được cập nhật `assignedListingId` và hiển thị link tin

**Given** môi giới cập nhật trạng thái lead
**When** họ chọn trạng thái từ "Mới" → "Đang tư vấn" → "Deal" → "Lost"
**Then** trạng thái được lưu kèm `updatedAt` và audit log

**Given** có inquiry từ public marketplace gửi đến listing của môi giới
**When** inquiry được tạo
**Then** hệ thống tự động tạo lead từ inquiry (nếu chưa tồn tại) và gán `source = inquiry`

### Story 5.3: Seller Workspace Dashboard

As a môi giới,
I want có một dashboard tổng quan workspace,
So that tôi thấy nhanh tin đăng, lead mới, alert Deal-Radar, và AI tools.

**Acceptance Criteria:**

**Given** môi giới đăng nhập
**When** họ vào `/dashboard`
**Then** họ thấy sidebar với các mục: Tổng quan, Tin đăng, Deal-Radar, Lead, AI viết tin, Tin tức, Cài đặt

**Given** môi giới ở trang Tổng quan
**When** trang load
**Then** họ thấy cards: số tin đang hiển thị, số lead mới (24h), số alert chưa đọc, tin sắp hết hạn

**Given** môi giới bấm "AI viết tin" từ sidebar
**When** họ vào trang
**Then** họ thấy form nhập thông tin cơ bản + nút "Viết lại bằng AI"

---

## Epic 7: Nowing Engine Integration

Bdsai kết nối Nowing engine qua REST API để dùng AI cho summary, viết tin, market summary, và matching. Browser extension MVP giúp môi giới lưu tin từ các sàn BĐS vào workspace.

### Story 7.1a: Nowing Engine Client — Base Client & Health Check

As a bdsai backend,
I want có một HTTP client để gọi Nowing engine API một cách đáng tin cậy,
So that tôi có thể kiểm tra kết nối và gọi các endpoint AI sau này.

**Acceptance Criteria:**

**Given** bdsai đã cấu hình `NOWING_ENGINE_API_KEY` và `NOWING_ENGINE_URL`
**When** service gọi `GET /health`
**Then** client trả về trạng thái health của Nowing (up/down)

**Given** Nowing engine trả lỗi mạng hoặc 5xx
**When** client gọi bất kỳ endpoint
**Then** client throw typed error (`NowingEngineError`) với status code và message, không crash process

### Story 7.1b: Nowing Engine Client — AI Viết Tin

As a bdsai backend,
I want gọi Nowing engine để viết lại mô tả tin đăng,
So that seller có mô tả chuẩn SEO từ thông tin cơ bản.

**Acceptance Criteria:**

**Given** service gọi `POST /agent/rewrite-listing` với payload `{title, price, area, location, propertyType}`
**When** request thành công
**Then** Nowing trả về mô tả được viết lại (SEO-friendly, tiếng Việt, 150-300 từ)

**Given** Nowing engine trả lỗi hoặc timeout
**When** service gọi `POST /agent/rewrite-listing`
**Then** service trả fallback `{description: null, error: "AI không khả dụng"}` và log lỗi, không crash user flow

### Story 7.1c: Nowing Engine Client — Market Summary

As a bdsai backend,
I want gọi Nowing engine để lấy tóm tắt thị trường,
So that Deal-Radar có context khi cần.

**Acceptance Criteria:**

**Given** service gọi `POST /agent/market-summary` với `{location, propertyType, priceRange}`
**When** request thành công
**Then** Nowing trả về tóm tắt thị trường 3-5 dòng

**Given** Nowing engine trả lỗi hoặc timeout
**When** service gọi `POST /agent/market-summary`
**Then** service trả fallback `{summary: null, error: "AI không khả dụng"}` và log lỗi

### Story 7.1d: Nowing Engine Client — Deal-Radar Matching

As a bdsai backend,
I want gọi Nowing engine để match filter với danh sách tin,
So that Deal-Radar tìm được tin khớp.

**Acceptance Criteria:**

**Given** service gọi `POST /agent/match-listings` với `{filter, listings}`
**When** request thành công
**Then** Nowing trả về danh sách `{matches[]}` với score và lý do khớp

**Given** Nowing engine trả lỗi hoặc timeout
**When** service gọi `POST /agent/match-listings`
**Then** service trả fallback `{matches: [], error: "AI không khả dụng"}` và log lỗi

### Story 7.1e: Nowing Engine Client — Cache & Resilience

As a bdsai backend,
I want cache kết quả Nowing engine và có fallback đồng nhất,
So that tôi giảm chi phí AI và không vỡ flow khi engine lỗi.

**Acceptance Criteria:**

**Given** service gọi AI cho 1 listing
**When** kết quả trả về
**Then** bdsai cache kết quả theo `contentHash` để tránh gọi lại

**Given** service gọi AI với `contentHash` đã cache
**When** request đến
**Then** client trả kết quả từ cache, không gọi Nowing

**Given** Nowing engine trả lỗi hoặc timeout
**When** bất kỳ endpoint AI (rewrite, market-summary, match) được gọi
**Then** client trả fallback đồng nhất, log lỗi, và không crash user flow

### Story 7.2a: Browser Extension Scaffold + Side Panel Auth

As a môi giới,
I want cài extension bdsai và đăng nhập qua side panel,
So that tôi có thể sử dụng các tính năng extension.

**Acceptance Criteria:**

**Given** môi giới cài extension từ Chrome Web Store
**When** họ bấm icon extension trên bất kỳ trang nào
**Then** side panel mở ra với trạng thái: chưa đăng nhập / đã đăng nhập

**Given** môi giới chưa đăng nhập
**When** họ nhập email/password (hoặc dùng JWT token từ web app)
**Then** extension lưu JWT an toàn và hiển thị tên user

### Story 7.2b: Browser Extension Content Script + Save to Workspace

As a môi giới,
I want trích thông tin tin BĐS từ Batdongsan/Chợ Tốt và lưu vào bdsai workspace bằng 1 click,
So that tôi không phải copy-paste thủ công.

**Acceptance Criteria:**

**Given** môi giới đã đăng nhập extension và mở tab Batdongsan/Chợ Tốt
**When** họ bấm icon extension
**Then** side panel mở và hiển thị thông tin tin đã trích: tiêu đề, giá, diện tích, khu vực, nguồn link

**Given** môi giới bấm "Lưu vào bdsai" trong side panel
**When** extension gửi dữ liệu về bdsai API
**Then** tin được lưu vào workspace của họ dưới dạng draft listing hoặc deal-radar source, không lưu phone raw

**Given** môi giới muốn xem số điện thoại trên portal
**When** họ bấm "Hiện số" trên trang portal
**Then** họ tự bấm theo luồng của portal; extension KHÔNG tự động gọi API hiện số

**Given** extension gửi dữ liệu thất bại
**When** mất kết nối hoặc lỗi 401
**Then** extension hiển thị lỗi rõ ràng và không cache PII tại máy user

---

## Epic 6: Inquiry & Engagement

Người mua liên hệ seller, seller nhận thông báo, news feed, SEO/sitemap. Phần lớn đã implement.

### Story 6.1: Inquiry form (DONE)

As a buyer, I want gửi liên hệ cho seller qua form, so that tôi hỏi thêm về tin đăng.

**Acceptance Criteria:**

**Given** buyer xem listing detail
**When** họ điền tên, phone, email, message và bấm gửi
**Then** inquiry được lưu, seller nhận email thông báo

### Story 6.4: News feed cải thiện UI

As a user, I want xem tin tức BĐS trên trang `/news`, so that tôi cập nhật thị trường.

**Acceptance Criteria:**

**Given** user vào `/news`
**When** trang load
**Then** hiển thị danh sách bài viết admin-curated với ảnh, tiêu đề, tóm tắt, ngày publish

---

## Epic 8: Multi-Channel Distribution (Track B — hoãn)

Hỗ trợ seller đăng lên Chợ Tốt/Zalo bằng tay (assisted); full auto-post hoãn sau khi có quyết định pháp lý.

### Story 8.1: Assisted post Chợ Tốt / Zalo

As a seller, I want được hướng dẫn đăng tin lên Chợ Tốt/Zalo nhanh, so that tôi tự đăng dưới tên mình.

**Acceptance Criteria:**

**Given** seller đã publish 1 listing
**When** họ bấm "Quảng bá" → chọn "Chợ Tốt" hoặc "Zalo"
**Then** hệ thống hiển thị nội dung đã định dạng sẵn + nút copy + link đến trang đăng của platform

**Given** seller chọn Zalo
**When** họ bấm "Gửi vào group Zalo"
**Then** hệ thống gửi tin nhắn có nội dung + link listing vào group Zalo riêng của seller

---

## Validation Notes

### FR Coverage
- 23/23 FRs được cover bởi ít nhất 1 story.
- FR mới theo vision (FR15-20, FR23) nằm ở Epic 5 và Epic 7.

### NFR Coverage
- NFR1-4: Public marketplace + SSR stories.
- NFR5: Supabase free tier — documented in Epic 1.
- NFR6: AI rate limit — Epic 4 + Epic 7.
- NFR7: Deal-Radar alert latency — Epic 5 Story 5.1.
- NFR8-9: Existing foundation + upload stories.
- NFR10: Domain bdsai.vn — Epic 3 rebrand.
- NFR11-12: Browser extension constraints — Epic 7 Story 7.2.

### UX-DR Coverage
- UX-DR1: Epic 5 Story 5.3 (workspace sidebar).
- UX-DR2: Epic 3 Story 3.6 (Việt Nam, pilot default Bình Thạnh 3-4 tỷ).
- UX-DR3: Epic 4 Story 4.1 (AI summary + trust badge).
- UX-DR4: Epic 5 Story 5.1 (Deal-Radar page).
- UX-DR5: Epic 5 Story 5.2 (Lead page).
- UX-DR6: Epic 3 Story 3.6 (rebrand).
- UX-DR7: Mobile-first — applies to all new UI stories.

### Dependency Check
- Epics 1-4 là foundation không phụ thuộc future epics.
- Epic 5 phụ thuộc Epic 2 (auth) + Epic 3 (listings) + Epic 4 (AI) — đúng thứ tự.
- Epic 7 phụ thuộc Epic 5 (workspace) + Epic 4 (AI) — đúng thứ tự.
- Epic 8 hoãn, không chặn Track A.
- **Story 5.1 cần Story 7.1a (base client) và 7.1e (resilience) để gọi Nowing automation.**
- **Story 4.3 cần Story 7.1b (AI viết tin) để gọi Nowing `rewrite-listing`.**
- **Story 5.1 cần Story 7.1d (match-listings) nếu dùng Nowing để match thay vì local matching.**

### Story Readiness
- Tất cả stories có Given/When/Then.
- Không có forward dependencies trong cùng epic.
- Các stories mới (5.1, 5.2, 5.3, 7.1a-7.1e, 7.2a, 7.2b, 4.3, 3.6) đủ nhỏ để 1 dev agent làm.
