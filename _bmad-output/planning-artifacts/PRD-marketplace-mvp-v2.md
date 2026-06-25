# PRD v2.0: Sàn Rao Vặt Bất Động Sản AI — MVP
## bdsai.vn — AI-Powered Real Estate Marketplace

---

## Thông tin Tài liệu

- **Phiên bản**: 2.0 (MVP Rewrite)
- **Ngày tạo**: 22/06/2026
- **Người tạo**: Mary (Business Analyst) + Luis
- **Trạng thái**: READY — Chờ Xaction API docs để finalize Epic M5
- **Dự án**: bdsai.vn — AI-Powered Real Estate Marketplace
- **Kiến trúc**: Custom Build (NestJS + Next.js 16 + Supabase)
- **Scope**: MVP — Public Marketplace Only

---

## 1. Tổng quan Sản phẩm

### 1.1. Vision

Xây dựng **sàn rao vặt bất động sản thông minh** tập trung vào khu vực Long Thành, Đồng Nai — nơi thị trường BĐS đang bùng nổ nhờ sân bay Long Thành. Platform tự động hóa việc đăng tin, quảng bá đa kênh, và cung cấp AI insights cho cả người mua lẫn người bán.

### 1.2. Khác biệt cốt lõi vs Đối thủ

| Tính năng | bdsai.vn | Batdongsan.com.vn | Chợ Tốt Nhà Đất |
|-----------|----------|-------------------|------------------|
| **AI Summary** | GPT-4 phân tích tin đăng | Không | Không |
| **Trust Score** | Chấm điểm uy tín AI | Badge manual | Không |
| **Quảng bá đa kênh** | 1-click → FB + BDS + Chợ Tốt (proxy) | Không | Không |
| **Auto-Import data** | Crawl tin từ các sàn về enrich DB | Không | Không |
| **So sánh giá thị trường** | Crawl realtime + AI phân tích | Không | Không |
| **User chọn nơi quảng bá** | Tick platforms + xem link | Không | Không |
| **SEO-First** | SSR native (Next.js 16) | Có | Có |
| **Khu vực focus** | Long Thành → Đồng Nai → MN | Toàn quốc | Toàn quốc |
| **Giá** | Miễn phí 100% (MVP) | Trả phí | Miễn phí giới hạn |

### 1.3. Mục tiêu MVP (3 tháng đầu)

| Metric | Target |
|--------|--------|
| Listings đăng | 500+ tin |
| Registered users | 200+ |
| Monthly organic traffic | 5,000+ visits |
| Lead inquiries | 100+/tháng |
| Lighthouse SEO score | >90 |

---

## 2. Target Users

### 2.1. Người Bán / Môi giới (Sellers/Brokers) — PRIMARY

**Persona**: Anh Minh, 32 tuổi, môi giới BĐS tại Long Thành
- Có 10-50 lô đất cần bán
- Hiện đăng thủ công trên Facebook groups, Batdongsan, Chợ Tốt
- Pain: Tốn 2-3 giờ/ngày đăng tin lên nhiều nền tảng
- Want: Đăng 1 lần, tự động quảng bá khắp nơi

**Giá trị mang lại:**
- Đăng 1 tin → tự động post lên Facebook + BDS + Chợ Tốt (via Xaction)
- AI tóm tắt tin đăng hấp dẫn hơn
- Trust Score tăng uy tín
- Dashboard theo dõi hiệu quả tin đăng

### 2.2. Người Mua / Thuê (Buyers/Renters) — PRIMARY

**Persona**: Chị Lan, 28 tuổi, nhân viên văn phòng TP.HCM
- Đang tìm đất Long Thành để đầu tư
- Sợ bị lừa đảo (tin ảo, giá ảo)
- Pain: Tin tràn lan, không biết tin nào thật
- Want: Nền tảng uy tín, có AI verify, dễ tìm kiếm

**Giá trị mang lại:**
- Trust Score giúp phân biệt tin thật/ảo
- AI Summary giải thích nhanh ưu nhược điểm
- Tìm kiếm thông minh (tiếng Việt, lọc theo khu vực/giá/diện tích)
- Liên hệ trực tiếp seller qua platform

### 2.3. Admin — SECONDARY

- Approve/reject listings
- Quản lý users, xem báo cáo
- Cấu hình spam rules

---

## 3. Kiến trúc Kỹ thuật (MVP)

### 3.1. Tech Stack

| Layer | Technology | Lý do |
|-------|-----------|-------|
| **Frontend** | Next.js 16 + React 19 + Tailwind CSS + shadcn/ui | SSR native, SEO tối ưu |
| **Backend** | NestJS 11 + TypeScript | Enterprise-grade, modular |
| **Database** | Supabase PostgreSQL 15 | Managed, Auth + Storage + Realtime |
| **ORM** | Drizzle ORM | Lightweight, SQL-first |
| **Auth** | Supabase Auth | Email/phone/social login |
| **Storage** | Supabase Storage | CDN cho images |
| **Cache** | Redis | API cache, rate limiting |
| **AI** | OpenAI GPT-4 | Summary, content analysis |
| **Auto-Post** | Xaction API | Đăng bài đa kênh + crawl data |
| **Deploy (FE)** | Vercel | Next.js native |
| **Deploy (BE)** | Dokploy | Self-hosted Docker |

### 3.2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    PUBLIC USERS                           │
│         Buyers ──── Sellers/Brokers ──── Search Bots    │
└────────────┬────────────────┬──────────────┬────────────┘
             │                │              │
             ▼                ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS 16 (Vercel)                         │
│    SSR Pages ─── API Routes ─── Static Pages            │
│    /listings    /api/...        /about                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              NESTJS 11 (Dokploy)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │Marketplace│ │  Auth    │ │   AI     │ │  Xaction  │ │
│  │  Module   │ │  Module  │ │  Module  │ │  Module   │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
│  ┌──────────┐ ┌──────────┐                             │
│  │  Admin   │ │  Queue   │   BullMQ (Background Jobs)  │
│  │  Module  │ │  Module  │                             │
│  └──────────┘ └──────────┘                             │
└───────────┬─────────────────────────┬───────────────────┘
            │                         │
            ▼                         ▼
┌───────────────────────┐   ┌─────────────────────────────┐
│   SUPABASE            │   │     EXTERNAL SERVICES       │
│  PostgreSQL 15        │   │  ┌─────────┐ ┌───────────┐ │
│  Auth                 │   │  │ OpenAI  │ │  Xaction  │ │
│  Storage (CDN)        │   │  │ GPT-4   │ │  API      │ │
│  Realtime             │   │  └─────────┘ └───────────┘ │
└───────────────────────┘   └─────────────────────────────┘
```

---

## 4. Tính năng MVP — Chi tiết

### Epic M1: Foundation & Infrastructure (Week 1-2)

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M1.1 | Project setup: NestJS + Next.js monorepo | 8h |
| M1.2 | Supabase setup: DB schema + Auth + Storage | 6h |
| M1.3 | CI/CD: GitHub Actions → Vercel + Dokploy | 4h |
| M1.4 | Base UI: Layout, navigation, responsive | 6h |

**Deliverable:** App chạy được, deploy tự động, UI skeleton

---

### Epic M2: User Management (Week 2-3)

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M2.1 | Registration: email + phone (Supabase Auth) | 6h |
| M2.2 | Login/logout + JWT session | 4h |
| M2.3 | User profile: avatar, bio, phone verified | 6h |
| M2.4 | Admin: user list, ban/unban | 4h |

**Deliverable:** Users có thể đăng ký, đăng nhập, quản lý profile

---

### Epic M3: Listing Management (Week 3-5)

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M3.1 | Listing entity: CRUD + status workflow | 8h |
| M3.2 | Post listing: multi-step form + image upload | 10h |
| M3.3 | Browse & search: filters, sort, pagination | 10h |
| M3.4 | Listing detail page + SSR + SEO meta tags | 8h |
| M3.5 | Admin: approve/reject queue + spam flags | 6h |
| M3.6 | Listing status: expire, renew, mark sold | 4h |

**Deliverable:** Core marketplace hoạt động — đăng tin, duyệt, tìm kiếm

---

### Epic M4: AI Features (Week 5-7)

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M4.1 | AI Summary: GPT-4 phân tích tin đăng | 8h |
| M4.2a | Trust Score Phase 1: seller verify + listing quality (KHÔNG cần market data) | 5h |
| M4.2b | Trust Score Phase 2: + market alignment (**Track B** — sau khi có Auto-Import M5) | 3h |
| M4.3 | Smart Spam Filter: rule-based + keyword blacklist | 6h |
| M4.4 | Display AI insights trên listing detail (kèm disclaimer + nút appeal) | 4h |

**Deliverable:** AI-powered insights cho mỗi tin đăng

---

### Epic M5: Xaction Integration — Auto-Post & Import (BLOCKED — chờ API docs + quyết định compliance)

> ⚠️ **Track B — KHÔNG nằm trong critical path.** Điều kiện mở khóa: (1) Xaction API docs; (2) quyết định kinh doanh về ToS/compliance (xem Section 11); (3) schema phone đã hash (AD-8). Estimate 52h dưới đây CHƯA đáng tin cho tới khi có API docs.

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M5.1 | Xaction API client: authentication + error handling | 6h |
| M5.2 | Auto-Post: đăng listing lên Facebook (page/group) | 8h |
| M5.3 | Auto-Post: đăng listing lên Batdongsan.com.vn | 8h |
| M5.4 | Auto-Post: đăng listing lên Chợ Tốt | 8h |
| M5.5 | Auto-Import: crawl tin từ BDS + Chợ Tốt + FB | 10h |
| M5.6 | Import dashboard: review + approve crawled listings | 6h |
| M5.7 | News feed: tin tức BĐS từ Facebook pages/groups | 6h |

**Deliverable:** Đăng 1 tin → tự động xuất hiện trên 4+ nền tảng. Import tin từ bên ngoài.

---

### Epic M6: Inquiry & SEO (Week 9-11)

| Story | Mô tả | Estimate |
|-------|--------|----------|
| M6.1 | Inquiry form: gửi liên hệ cho seller | 6h |
| M6.2 | Notification: **email cho seller khi có inquiry (SMS hoãn sang post-MVP)** | 5h |
| M6.3 | Dynamic sitemap.xml + robots.txt | 4h |
| M6.4 | Structured data: JSON-LD Schema.org | 4h |
| M6.5 | Performance optimization: caching, lazy load | 6h |

**Deliverable:** Marketplace SEO-optimized, có hệ thống liên hệ

---

## 5. Xaction Integration — Chi tiết

### 5.1. Tổng quan

**Xaction** là API service nội bộ của Luis, hoạt động như một **proxy quảng bá đa kênh**:

1. **Auto-Post (Quảng bá)**: Đăng bài dưới **danh tính proxy** (các tài khoản Xaction quản lý) lên Facebook groups, pages, Batdongsan.com.vn, Chợ Tốt, và các sàn khác
2. **Auto-Import (Thu thập data)**: Crawl dữ liệu BĐS từ các nền tảng → feed vào DB → hiển thị trên app CRM + admin
3. **News Feed**: Thu thập tin tức BĐS từ Facebook pages/groups

**Nguyên tắc hoạt động:**
- Xaction **KHÔNG đăng dưới tên user** — đăng dưới các tài khoản proxy Xaction quản lý
- User **có quyền chọn** nơi quảng bá (tick checkbox platforms)
- User **có thể xem link** bài đã đăng trên từng platform
- Khi user đăng tin → trigger crawl data liên quan → enrich DB

### 5.2. User Flow — Quảng bá (Auto-Post)

```
Seller đăng tin trên bdsai.vn
        │
        ▼
Tin được approve (hoặc seller tự publish nếu verified)
        │
        ▼
Seller click "Quảng bá" → chọn platforms:
  ☑ Facebook Groups (Long Thành BĐS, Đồng Nai BĐS...)
  ☑ Batdongsan.com.vn
  ☑ Chợ Tốt Nhà Đất
  ☐ Khác (mở rộng sau)
        │
        ▼
Background Job (BullMQ) → Gọi Xaction API
        │
        ├── Xaction dùng proxy account → post lên FB Group
        ├── Xaction dùng proxy account → post lên BDS
        └── Xaction dùng proxy account → post lên Chợ Tốt
        │
        ▼
Xaction trả về: { platform, post_url, status }
        │
        ▼
Lưu vào cross_posts table
        │
        ▼
Seller Dashboard hiển thị:
  ✓ Facebook Group "BĐS Long Thành" — [Xem bài →]
  ✓ Batdongsan.com.vn — [Xem bài →]
  ✓ Chợ Tốt — [Xem bài →]
```

### 5.3. User Flow — Thu thập Data (Auto-Import)

```
TRIGGER 1: User đăng tin mới
        │
        ▼
Background Job → Gọi Xaction API
  "Tìm tin tương tự tại [location], giá [range]"
        │
        ▼
Xaction crawl từ BDS + Chợ Tốt + FB Groups
        │
        ▼
Data trả về → Lưu vào imported_listings
        │
        ▼
Hiển thị trên:
  - Admin dashboard: "Market data" panel
  - CRM: "Tin tương tự" sidebar
  - User: "So sánh giá thị trường" widget

─────────────────────────────────────

TRIGGER 2: Cron Job (mỗi 6 giờ)
        │
        ▼
Xaction crawl toàn bộ listings mới từ Long Thành area
        │
        ▼
Deduplicate (hash URL + title + phone)
        │
        ▼
Listings mới → Insert vào DB (status: IMPORTED)
        │
        ▼
Admin review → Approve hiển thị / Reject / Link to existing
```

### 5.4. Database Schema — Xaction

```typescript
// schema/cross-posts.ts
export const crossPosts = pgTable('cross_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  listingId: uuid('listing_id').notNull().references(() => publicListings.id),
  platform: varchar('platform', { length: 50 }).notNull(), // 'facebook', 'batdongsan', 'chotot'
  externalPostId: varchar('external_post_id', { length: 255 }),
  externalUrl: varchar('external_url', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'posted', 'failed', 'removed'
  postedAt: timestamp('posted_at'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'), // platform-specific data
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// schema/imported-listings.ts
export const importedListings = pgTable('imported_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  source: varchar('source', { length: 50 }).notNull(), // 'batdongsan', 'chotot', 'facebook'
  externalId: varchar('external_id', { length: 255 }).notNull(),
  externalUrl: varchar('external_url', { length: 1000 }).notNull(),
  title: varchar('title', { length: 500 }),
  description: text('description'),
  price: decimal('price', { precision: 15, scale: 2 }),
  area: decimal('area', { precision: 10, scale: 2 }),
  location: varchar('location', { length: 500 }),
  images: text('images').array(),
  sellerName: varchar('seller_name', { length: 255 }), // ẩn/hash khi hiển thị công khai (AD-8)
  sellerPhoneHash: varchar('seller_phone_hash', { length: 64 }), // sha256 — dedup only, KHÔNG lưu raw (AD-8, NĐ 13/2023)
  status: varchar('status', { length: 20 }).notNull().default('imported'), // 'imported', 'approved', 'rejected', 'linked'
  linkedListingId: uuid('linked_listing_id').references(() => publicListings.id),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});
```

---

## 6. Revenue Model (Post-MVP)

| Phase | Model | Timing |
|-------|-------|--------|
| **MVP** | Miễn phí 100% — thu hút users | Month 1-3 |
| **Growth** | Freemium: free 3 tin, trả phí thêm | Month 4-6 |
| **Monetize** | Subscriptions + Featured Listings + Ads | Month 7+ |

**Pricing dự kiến (Phase Growth):**
- FREE: 3 tin, 30 ngày, 5 ảnh
- BASIC (99k/tháng): 10 tin, 60 ngày, 10 ảnh, auto-post 1 kênh
- PRO (299k/tháng): Unlimited tin, 90 ngày, 20 ảnh, auto-post tất cả kênh, featured listings

---

## 7. Timeline & Resources

### 7.1. MVP Timeline (11 tuần)

```
Week 1-2:   Epic M1 — Foundation & Infrastructure
Week 2-3:   Epic M2 — User Management
Week 3-5:   Epic M3 — Listing Management (CORE)
Week 5-7:   Epic M4 — AI Features
Week 7-9:   Epic M5 — Xaction Integration
Week 9-11:  Epic M6 — Inquiry & SEO
```

### 7.2. Team

| Role | Số lượng | Responsibilities |
|------|----------|-----------------|
| Fullstack Dev (Lead) | 1 | Backend + Architecture |
| Frontend Dev | 1 | Next.js + UI/UX |
| Luis (PM/Dev) | 1 | Xaction API + Product decisions |

### 7.3. Estimated Hours

| Epic | Hours | % |
|------|-------|---|
| M1: Foundation | 24h | 10% |
| M2: Users | 20h | 8% |
| M3: Listings | 46h | 19% |
| M4: AI | 26h | 11% |
| M5: Xaction | 52h | 22% |
| M6: Inquiry & SEO | 26h | 11% |
| Buffer (20%) | 39h | 16% |
| **TOTAL** | **233h** | 100% |

**Với 2 devs @ 40h/tuần → ~11 tuần**

---

## 8. Success Metrics

### 8.1. Launch Criteria (Week 11)

- [ ] 50+ listings đăng (seeded + real)
- [ ] Lighthouse SEO score >90
- [ ] SSR working cho tất cả public pages
- [ ] Xaction auto-post hoạt động ≥2 kênh
- [ ] AI Summary generate cho mỗi listing
- [ ] 0 critical bugs

### 8.2. Month 1 After Launch

| Metric | Target |
|--------|--------|
| Listings | 200+ |
| Registered users | 50+ |
| Organic traffic | 1,000+/tháng |
| Auto-posts sent | 500+ |
| Imported listings | 1,000+ |

### 8.3. Month 3 After Launch

| Metric | Target |
|--------|--------|
| Listings | 500+ |
| Registered users | 200+ |
| Organic traffic | 5,000+/tháng |
| Inquiries | 100+/tháng |
| Trust Score coverage | 80%+ listings |

---

## 9. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Vi phạm ToS FB/BDS/Chợ Tốt (proxy post + crawl)** | **EXISTENTIAL** | HIGH | Quyết định compliance TRƯỚC khi code M5 (Section 11); ưu tiên official API (FB Page API, đối tác); rate limit KHÔNG giải quyết bản chất fake account |
| **Lưu PII (sellerPhone) từ crawl vi phạm NĐ 13/2023** | **EXISTENTIAL** | HIGH | Hash phone (AD-8), cơ chế xóa theo yêu cầu, ẩn PII công khai |
| **Phụ thuộc đơn điểm vào Xaction** | HIGH | MEDIUM | Provider pattern (AD-3 mở rộng); Track A không phụ thuộc Xaction |
| Xaction API không ổn định | HIGH | MEDIUM | Retry logic, fallback manual, queue system |
| Ít user đăng ký ban đầu | MEDIUM | HIGH | Seed data từ crawling, mời brokers trực tiếp |
| AI cost quá cao (GPT-4) | MEDIUM | LOW | Dùng GPT-3.5 cho simple tasks, cache results |
| Trust Score gắn nhãn sai → kiện cáo | MEDIUM | MEDIUM | Disclaimer "tham khảo"; quy trình appeal (Section 11.3) |
| SEO chưa hiệu quả ngay | LOW | HIGH | Structured data, sitemap, social signals từ auto-post |

---

## 10. Xác nhận từ Luis (22/06/2026)

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | Xaction API docs | Sẽ gửi sau |
| 2 | Xaction platforms | TẤT CẢ — FB groups, pages, BDS, Chợ Tốt. Đăng dưới danh tính proxy (không phải tên user). User chọn nơi quảng bá + xem link |
| 3 | Xaction crawl limit | Không giới hạn, có thể nâng cấp |
| 4 | Domain | **bdsai.vn** |
| 5 | Supabase plan | Free (nâng cấp sau) |

### Giới hạn Supabase Free cần lưu ý:
- Database: 500MB
- Storage: 1GB
- Auth: 50,000 monthly active users
- Edge Functions: 500K invocations/month
- Realtime: 200 concurrent connections

→ **Đủ cho MVP**. Nâng cấp Pro ($25/mo) khi cần.

---

## 11. Compliance & Pháp lý

> ⚠️ Section này được thêm sau review (24/06/2026) vì cả PRD/Architecture/Epics ban đầu KHÔNG đề cập rủi ro pháp lý — đây là rủi ro tồn vong, không phải kỹ thuật.

### 11.1. Auto-Post & Quản lý danh tính proxy

- **RỦI RO:** Đăng bài dưới danh tính proxy lên Facebook/Batdongsan/Chợ Tốt có thể vi phạm ToS các nền tảng này (fake account, automation trái phép) → ban account hàng loạt, mất kênh quảng bá, rủi ro pháp lý.
- **QUYẾT ĐỊNH CẦN CHỐT (Luis — business decision):**
  - [ ] Chấp nhận rủi ro (hiểu rõ hậu quả), HOẶC
  - [ ] Chuyển sang official API (FB Page API, đối tác chính thức của BDS/Chợ Tốt), HOẶC
  - [ ] Bỏ các kênh vi phạm, chỉ giữ kênh hợp lệ
- **LƯU Ý:** "Rate limiting" trong bảng Risks cũ KHÔNG phải mitigation hợp lệ — nó không giải quyết bản chất fake account.

### 11.2. Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP)

- **KHÔNG lưu `sellerPhone` raw** từ nguồn crawl. Chỉ lưu hash (sha256) phục vụ deduplication (xem AD-8 trong Architecture).
- Có cơ chế **xóa theo yêu cầu** (data subject request).
- Imported listing chỉ hiển thị công khai khi có cơ sở pháp lý hoặc đã ẩn PII.
- Audit log mọi truy cập dữ liệu cá nhân.

### 11.3. AI Trust Score — Trách nhiệm pháp lý

- Mọi hiển thị Trust Score phải kèm **disclaimer**: "Điểm tham khảo do AI tạo, không phải xác nhận pháp lý về tính chính xác của tin đăng."
- Có **quy trình appeal** cho seller khi tin bị gắn nhãn điểm thấp — tránh rủi ro kiện cáo về bôi nhọ/cản trở kinh doanh.

---

## Changelog

| Ngày | Thay đổi |
|------|----------|
| 22/06/2026 | PRD v2.0 MVP — Viết lại hoàn toàn, focus marketplace only |
| 24/06/2026 | Correct Course: M5 → BLOCKED (Track B); thêm Section 11 Compliance; sửa Risks (ToS + PII = EXISTENTIAL); tách Trust Score Phase 1/2 |

---

**Cập nhật lần cuối**: 22 tháng 6, 2026
**Tác giả**: Mary (Business Analyst)
**Trạng thái**: DRAFT — Chờ Luis confirm Xaction details
