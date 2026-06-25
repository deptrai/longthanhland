---
stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]
date: 2026-06-24
project: bdsai.vn
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-24
**Project:** bdsai.vn — AI-Powered Real Estate Marketplace

---

## Document Discovery

### Tài liệu tìm thấy

| Loại | File | Vị trí |
|------|------|--------|
| PRD | PRD-marketplace-mvp-v2.md | `_bmad-output/planning-artifacts/` |
| PRD (mirror) | prd-mvp-v2.md | `docs/bdsai/planning/` |
| Architecture | ARCHITECTURE-SPINE.md | `_bmad-output/planning-artifacts/architecture/` |
| Architecture (mirror) | ARCHITECTURE-SPINE.md | `docs/bdsai/architecture/` |
| Epics | epics.md | `_bmad-output/planning-artifacts/` |
| UX Spec | **KHÔNG TÌM THẤY** | — |
| Stories chi tiết | **KHÔNG TÌM THẤY** | — |

**Nhận xét:** PRD và Architecture tồn tại ở 2 nơi (planning-artifacts + docs/bdsai). Nội dung giống nhau — không conflict, nhưng cần dọn dẹp sau.

---

## PRD Analysis

### Functional Requirements (19 FR)

| # | FR | Mô tả |
|---|-----|-------|
| FR1 | Đăng ký | User đăng ký bằng email + phone, xác thực qua Supabase Auth |
| FR2 | Profile | User đăng nhập, quản lý profile (avatar, bio, phone verified) |
| FR3 | Tạo listing | Seller tạo listing (multi-step form, image upload, draft/publish) |
| FR4 | Moderation | Admin approve/reject listings từ moderation queue |
| FR5 | Search/Browse | Buyer browse + search listings (filters: location, price, type, area) |
| FR6 | Listing detail SSR | Listing detail page SSR với dynamic meta tags + structured data |
| FR7 | AI Summary | GPT-4 phân tích mỗi listing (highlights, neighborhood, investment) |
| FR8 | Trust Score | Algorithm chấm điểm uy tín (0-100) |
| FR9 | Spam Filter | Smart spam filter rule-based + keyword blacklist |
| FR10 | Auto-Post | Seller chọn platforms → BullMQ job → Xaction API post dưới proxy |
| FR11 | Auto-Import | Crawl listings từ BDS/Chợ Tốt/FB → imported_listings DB |
| FR12 | Promotion dashboard | Seller xem link bài đã quảng bá, trạng thái cross-posts |
| FR13 | Import dashboard | Admin review/approve/reject crawled listings |
| FR14 | Inquiry form | Buyer gửi liên hệ cho seller |
| FR15 | Notifications | Email + SMS cho seller khi có inquiry |
| FR16 | Listing lifecycle | Auto-expire + renew + mark sold |
| FR17 | News feed | Tin tức BĐS từ Facebook pages/groups (via Xaction) |
| FR18 | SEO | Dynamic sitemap.xml + robots.txt |
| FR19 | Admin users | Admin: user list, ban/unban |

**Tổng: 19 FR**

### Non-Functional Requirements (10 NFR)

| # | NFR | Đo lường |
|---|-----|---------|
| NFR1 | SSR render < 500ms P95 | Có — Vercel analytics |
| NFR2 | API response < 200ms P95 | Có — Sentry + logging |
| NFR3 | Lighthouse SEO > 90 | Có — CI lighthouse audit |
| NFR4 | Page load < 2s P75 | Có — Vercel analytics |
| NFR5 | Supabase Free: 500MB DB, 1GB storage | Có — cần monitor |
| NFR6 | AI rate limit max 100 calls/hour | Có — AD-6 |
| NFR7 | Xaction retry 3x backoff, không block user | Có — AD-3 |
| NFR8 | Vietnamese full-text search | Cần pg_trgm hoặc unaccent extension |
| NFR9 | Image max 10MB, auto-convert WebP | Có — AD-7, Sharp |
| NFR10 | Domain bdsai.vn | Có |

### Additional Requirements (từ Architecture)

- Monorepo Turborepo: apps/web + apps/api + packages/shared
- All mutations qua NestJS API (AD-2)
- Xaction luôn async via BullMQ (AD-3)
- Auth dual-track: Supabase Auth (public) + NestJS guards (admin) (AD-5)
- Module isolation: marketplace, auth, ai, xaction, admin, queue (AD-1)
- Error tracking: Sentry
- State frontend: Zustand + TanStack Query

---

## Epic Coverage Validation

### FR Coverage Matrix

| FR | PRD Requirement | Epic Coverage | Status |
|----|----------------|---------------|--------|
| FR1 | Đăng ký email + phone | Epic 2 | ✓ Covered |
| FR2 | Đăng nhập, profile | Epic 2 | ✓ Covered |
| FR3 | Tạo listing | Epic 3 | ✓ Covered |
| FR4 | Admin approve/reject | Epic 3 | ✓ Covered |
| FR5 | Browse + search | Epic 3 | ✓ Covered |
| FR6 | Listing detail SSR | Epic 3 | ✓ Covered |
| FR7 | AI Summary | Epic 4 | ✓ Covered |
| FR8 | Trust Score | Epic 4 | ✓ Covered |
| FR9 | Spam Filter | Epic 3 | ✓ Covered |
| FR10 | Auto-Post | Epic 5 | ✓ Covered |
| FR11 | Auto-Import | Epic 5 | ✓ Covered |
| FR12 | Promotion dashboard | Epic 5 | ✓ Covered |
| FR13 | Import dashboard admin | Epic 5 | ✓ Covered |
| FR14 | Inquiry form | Epic 6 | ✓ Covered |
| FR15 | Notifications | Epic 6 | ✓ Covered |
| FR16 | Auto-expire/renew/sold | Epic 3 | ✓ Covered |
| FR17 | News feed BĐS | Epic 5 | ✓ Covered |
| FR18 | Sitemap + robots.txt | Epic 6 | ✓ Covered |
| FR19 | Admin user management | Epic 2 | ✓ Covered |

**Coverage: 19/19 FR = 100%**

### Vấn đề trong FR Coverage

1. **FR9 (Spam Filter) đặt ở Epic 3 — không hợp lý**: Spam filter là AI/ML feature, liên quan chặt chẽ đến Epic 4 (AI Intelligence). Đặt ở Epic 3 gây coupling không cần thiết giữa Listing Management và AI logic.

2. **FR11 (Auto-Import) không có cơ chế dedup rõ ràng trong epics**: PRD mô tả dedup bằng hash URL+title+phone, nhưng epics.md không có story nào cho deduplication engine.

3. **FR17 (News feed) là FR mỏng**: PRD mô tả "thu thập tin tức từ FB pages/groups" nhưng không có story nào trong epics về rendering news feed trên frontend.

---

## UX Alignment Assessment

### UX Document Status: KHÔNG TÌM THẤY

### Đánh giá

Đây là ứng dụng user-facing với nhiều màn hình phức tạp:
- Multi-step listing form (FR3)
- Search/filter UI với nhiều tham số (FR5)
- Promotion flow với platform selection (FR10)
- Admin moderation queue (FR4, FR13)
- Inquiry + notification flow (FR14, FR15)

### Cảnh báo

**CẢNH BÁO — UX spec bị thiếu hoàn toàn.** epics.md có ghi nhận: "Không có UX spec riêng. UI sẽ sử dụng shadcn/ui + Tailwind CSS, responsive mobile-first." Điều này là quyết định có chủ đích nhưng tạo ra rủi ro:

- Dev phải tự quyết định UX trong khi code → tốn thời gian, không nhất quán
- Multi-step listing form (FR3, 10h estimate) không có wireframe → estimate dễ sai lệch
- Promotion flow (FR10, FR12) phụ thuộc vào Xaction API docs chưa có → double unknown
- Mobile-first không được validate

**Mức độ rủi ro: MEDIUM** — shadcn/ui giảm nhẹ rủi ro nhờ component library sẵn có, nhưng không thay thế được UX decisions.

---

## Epic Quality Review

### Epic 1: Foundation & Infrastructure

**Nhận xét**: Đây là technical epic — không deliver user value trực tiếp. Tuy nhiên đây là greenfield project nên Foundation epic là cần thiết và chấp nhận được theo convention.

- Stories M1.1–M1.4 logic, phù hợp
- **Vấn đề**: Không có story nào cho Turborepo monorepo setup (epics.md nói monorepo nhưng PRD dùng `bdsai/apps/` structure không có turborepo config story)
- **Vấn đề**: Không có story cho Redis setup (Redis cần cho BullMQ ở Epic 5, nhưng không có story setup Redis ở Epic 1)

### Epic 2: User Authentication & Profiles

- FR1, FR2, FR19 được cover
- Stories M2.1–M2.4 hợp lý, độc lập
- **Vấn đề nhỏ**: Phone verification (FR1 nói "phone verified") nhưng M2.1 chỉ mention "email + phone" — không rõ có OTP SMS verification hay không, và cost SMS không được estimate

### Epic 3: Listing Management & Search

- FR3, FR4, FR5, FR6, FR9, FR16 được cover
- **Vấn đề lớn — FR9 Spam Filter đặt sai chỗ**: M3.5 gộp "Admin approve/reject queue + spam flags" nhưng spam filter là AI feature cần logic riêng. Estimate 6h cho cả moderation + spam filter là quá thấp.
- **Vấn đề — NFR8 Vietnamese full-text search**: FR5 cần Vietnamese full-text search nhưng không có story nào cho việc enable `pg_trgm` / `unaccent` extension trên Supabase, hoặc configure full-text search index.
- M3.3 "Browse & search: filters, sort, pagination" 10h — nếu bao gồm Vietnamese search thì sẽ cần nhiều hơn

### Epic 4: AI Intelligence

- FR7, FR8 được cover
- **Vấn đề — FR9 bị tách khỏi Epic 4**: Spam filter (FR9) nên ở đây, không phải Epic 3
- M4.2 Trust Score "algorithm (seller verify + listing quality + market alignment)" — "market alignment" cần data từ Auto-Import (Epic 5). Đây là forward dependency: Epic 4 phụ thuộc Epic 5 data để Trust Score hoạt động đầy đủ.
- **Vấn đề timeline**: Epic 4 (Week 5-7) chạy TRƯỚC Epic 5 (Week 7-9) nhưng Trust Score cần imported listings data từ Epic 5. Trust Score sẽ không đầy đủ khi Epic 4 hoàn thành.

### Epic 5: Xaction Integration

- FR10, FR11, FR12, FR13, FR17 được cover
- **Vấn đề nghiêm trọng — Xaction API docs chưa có**: PRD ghi "Trạng thái: READY — Chờ Xaction API docs để finalize Epic M5". Tất cả 7 stories của Epic 5 (52h) phụ thuộc vào API docs chưa được finalize. Estimate hoàn toàn không đáng tin cậy.
- **Vấn đề — FR17 News feed thiếu frontend story**: Không có story nào cho rendering news feed trên UI
- M5.5 "Auto-Import: crawl tin từ BDS + Chợ Tốt + FB" không có deduplication story riêng
- **Rủi ro cao — Facebook chặn auto-post**: PRD nhận định probability HIGH, nhưng không có fallback story trong epics

### Epic 6: Inquiry & SEO

- FR14, FR15, FR18 được cover
- Stories M6.1–M6.5 logic và độc lập
- **Vấn đề nhỏ**: M6.2 "Notification: email + SMS" — SMS provider chưa được chỉ định (Twilio? VNPT SMS? Stringee?). Cost và setup time không rõ.
- **Vấn đề — Performance NFR thiếu story**: NFR1 (SSR < 500ms), NFR2 (API < 200ms), NFR4 (page load < 2s) cần đo lường cụ thể nhưng M6.5 "Performance optimization: caching, lazy load" 6h là quá chung chung — không rõ sẽ đo bằng gì, benchmark ở đâu.

---

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK**

Tài liệu planning có nền tảng tốt — 19/19 FR được trace vào epics, architecture invariants rõ ràng. Tuy nhiên có 3 vấn đề block cần giải quyết trước khi sprint đầu tiên bắt đầu.

---

### Top 5 Vấn đề Nghiêm trọng nhất

#### 1. Xaction API docs chưa có — 22% effort bị block

**Vấn đề**: Epic M5 (52h / 22% tổng effort) được đánh dấu "Chờ Xaction API docs". Toàn bộ 7 stories của Epic 5 không thể estimate chính xác, không thể viết acceptance criteria, không thể bắt đầu development.

**Tác động**: Timeline 11 tuần bị rủi ro cao. Nếu Xaction API docs đến muộn (sau Week 5), Epic 5 sẽ bị đẩy lùi → dồn vào cuối → overshoot deadline.

**Đề xuất**: Luis cần cung cấp Xaction API docs (hoặc ít nhất endpoint list + auth mechanism) trước khi sprint 5 bắt đầu. Tạo story placeholder với estimate có điều kiện.

---

#### 2. Supabase Free 500MB vs mục tiêu import 1,000+ listings

**Vấn đề**: PRD target Month 1 = "Imported listings: 1,000+". Mỗi imported listing có: title (500 chars), description (text), images array, location, seller info → ước tính ~5-10KB/row. 1,000 listings = ~5-10MB chỉ cho imported_listings. Bình thường OK, nhưng cộng thêm: public_listings, cross_posts, users, AI results, indexes → 500MB Free tier có thể chật trong 2-3 tháng nếu tăng trưởng đúng target.

**Tác động**: DB hit limit → app lỗi, không thể insert mới. Xảy ra TRONG thời gian MVP nếu target đạt được.

**Đề xuất**: Lên kế hoạch upgrade Supabase Pro ($25/mo) từ Month 2 — không phải "nâng cấp sau" chung chung. Thêm monitoring alert khi DB > 400MB.

---

#### 3. Forward dependency: Trust Score (Epic 4) cần data từ Auto-Import (Epic 5)

**Vấn đề**: M4.2 Trust Score bao gồm "market alignment" — cần so sánh giá listing với thị trường. Data thị trường đến từ Auto-Import (Epic 5, Week 7-9). Nhưng Epic 4 chạy Week 5-7, TRƯỚC Epic 5.

**Tác động**: Trust Score sẽ deploy thiếu component "market alignment" — khi Epic 4 done, feature chưa hoàn chỉnh. Dev có thể stub nó, nhưng điều này không được ghi rõ trong stories → rủi ro scope creep hoặc kỳ vọng sai.

**Đề xuất**: Tách Trust Score thành 2 phần: (a) Phase 1 ở Epic 4 — seller verify + listing quality chỉ, (b) Phase 2 ở Epic 5 — thêm market alignment sau khi có imported data. Ghi rõ trong acceptance criteria.

---

#### 4. Timeline 11 tuần vs 233h với 2 devs — phép tính không khớp

**Vấn đề**: PRD ghi "2 devs @ 40h/tuần → ~11 tuần". Nhưng: 2 devs × 40h × 11 tuần = 880h capacity. Total estimate = 233h. Tức là chỉ dùng 26% capacity — hoặc team thực tế ít hơn 2 full-time devs, hoặc estimate thiếu nhiều tasks.

Nhìn kỹ hơn: Luis là PM/Dev kiêm (không phải full-time dev), Frontend Dev 1 người. Thực tế capacity ~1.5 devs. 233h / (1.5 devs × 40h/tuần) = ~3.9 tuần nếu không có overhead. Nhưng với onboarding, code review, meetings, debugging thực tế thường x2-3 → 8-12 tuần là hợp lý. Tuy nhiên estimate 233h không bao gồm:
- Turborepo monorepo setup
- Redis/BullMQ setup và config
- Drizzle migration management
- Sentry integration
- Vietnamese full-text search setup
- SMS provider integration và testing
- Xaction API integration testing (unknown complexity)
- Performance tuning cho NFR1/2/4

**Tác động**: Estimate có thể thiếu 30-50h. Timeline 11 tuần sẽ trượt nếu không điều chỉnh.

**Đề xuất**: Re-estimate sau khi có Xaction API docs. Thêm infrastructure stories bị thiếu vào Epic 1.

---

#### 5. NFR8 Vietnamese Full-Text Search không có implementation path

**Vấn đề**: FR5 cần tìm kiếm tiếng Việt (có dấu, không dấu, địa danh: "Nhơn Trạch", "Long Thành"). NFR8 ghi "Vietnamese full-text search support" nhưng:
- Không có story nào setup PostgreSQL full-text search cho tiếng Việt
- Supabase Free cần enable extension (`unaccent`, `pg_trgm`) — có thể làm được nhưng cần config
- Drizzle ORM full-text search với tiếng Việt cần custom `to_tsvector` config
- M3.3 estimate 10h không bao gồm việc này

**Tác động**: Search không tìm được "Long Thanh" khi user gõ "long thành" — core feature bị broken trên production.

**Đề xuất**: Thêm story M1.5: "Setup PostgreSQL full-text search với unaccent extension cho tiếng Việt" vào Epic 1. Estimate thêm 4-6h.

---

### FR Coverage Gaps

Không có FR nào hoàn toàn thiếu epic. Tuy nhiên có coverage gaps chất lượng:

| FR | Gap |
|----|-----|
| FR9 | Spam Filter đặt ở Epic 3 thay vì Epic 4 — sẽ tạo coupling |
| FR11 | Không có deduplication story riêng |
| FR17 | Không có frontend rendering story cho news feed |
| FR15 | SMS provider chưa được chỉ định |

---

### Recommended Next Steps

1. **Ngay bây giờ**: Luis cung cấp Xaction API docs (endpoint list, auth, rate limits) để unlock Epic 5 estimate
2. **Trước Sprint 1**: Thêm stories bị thiếu vào Epic 1 — Redis setup, Turborepo config, Vietnamese FTS setup (thêm ~12-16h)
3. **Trước Sprint 4**: Tách Trust Score thành 2 phase để giải quyết forward dependency với Epic 5
4. **Trước launch**: Lên kế hoạch Supabase Pro upgrade từ Month 2, setup monitoring alert DB > 400MB
5. **Optional nhưng nên làm**: Viết wireframe đơn giản cho multi-step listing form và promotion flow — giảm rủi ro UX thiếu spec

---

### Final Note

Assessment này phát hiện **12 vấn đề** trên **5 danh mục** (Epic quality, Dependency, Estimate, Infrastructure, NFR). Trong đó 3 vấn đề là blockers thực sự: Xaction API docs, forward dependency Trust Score↔Import, và NFR8 thiếu implementation path. Các vấn đề còn lại là risk management — có thể handle trong sprint nếu team aware.

Tài liệu planning có nền tảng vững — architecture invariants rõ ràng, FR coverage 100%, tech stack hợp lý. Với 5 điều chỉnh được đề xuất ở trên, dự án có thể READY để bắt đầu implementation.
