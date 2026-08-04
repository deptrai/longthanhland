---
name: sprint-change-proposal
project: bdsai.vn (longthanhland)
date: 2026-08-04
author: Correct Course Workflow + Luis
mode: batch
status: ADOPTED
trigger: Vision Lock 2026-08-04 — Nowing = engine AI, bdsai.vn = sản phẩm BĐS, pilot demand-first qua group Zalo
inputs:
  - docs/bdsai/planning/prd-mvp-v2.md
  - docs/bdsai/planning/epics.md
  - docs/bdsai/architecture/ARCHITECTURE-SPINE.md
  - docs/bdsai/ux-design/wireframe-listing-form.md
  - /Users/luisphan/Documents/GitHub/nowing/_bmad-output/planning-artifacts/vision-lock-and-this-week-2026-08-04.md
scope_classification: MAJOR (strategic pivot + scope cut + engine boundary)
---

> **Status:** ADOPTED — đã apply vào 4 tài liệu: `docs/bdsai/planning/prd-mvp-v2.md`, `docs/bdsai/architecture/ARCHITECTURE-SPINE.md`, `docs/bdsai/planning/epics.md`, `docs/bdsai/ux-design/wireframe-listing-form.md`.

# Sprint Change Proposal — bdsai.vn pivot sang sàn BĐS + AI với Nowing engine

> **Bối cảnh:** Vision Lock 2026-08-04 đã chốt: **Nowing = engine AI headless**, **bdsai.vn = sản phẩm/sàn rao vặt BĐS**. Quan trọng hơn: **thứ tự đúng là validate cầu TRƯỚC, re-architect/xây app SAU**. Bộ tài liệu planning hiện tại (PRD v2.0, Epics, Architecture) vẫn theo hướng xây full MVP marketplace 11 tuần (web + mobile + CRM + Xaction + SEO) — đã lỗi thời và cần cắt scope mạnh để phù hợp pivot.

---

## Section 1 — Issue Summary (Tóm tắt vấn đề)

**Nguyên nhân kích hoạt:** Vision Lock 2026-08-04 (`vision-lock-and-this-week-2026-08-04.md`) — Luisphan (PO) chốt pivot từ Nowing research platform độc lập sang **bdsai.vn (sàn BĐS + AI)**, với Nowing làm **engine headless** (multi-agent chat, memory, matching, automation, scraper, deep-research). Đi kèm lệnh thứ tự: **2 tuần pilot Zalo để validate cầu trước**, KHÔNG re-architect toàn bộ, KHÔNG xây web/mobile/full CRM, KHÔNG thu phí, KHÔNG seed scrape.

**Phân loại vấn đề:** Strategic pivot / market change + scope re-ordering.

**4 cụm vấn đề (change trigger):**

| # | Vấn đề | Mức | Nguồn |
|---|---|---|---|
| C1 | PRD v2.0 vẫn định vị bdsai.vn là "public marketplace" full feature với 11 tuần timeline — sai thứ tự so với "demand-first" | EXISTENTIAL | Vision Lock §B-1, §D |
| C2 | Kiến trúc MVP quy định Next.js 16 + NestJS + Supabase full monorepo — bị đình chỉ trong 2 tuần pilot | HIGH | Vision Lock §C |
| C3 | Epic M5 (Xaction auto-post/import) và M4.2b (Trust Score market alignment) vẫn trong scope — đã bị hoãn vô thời hạn vì KHÔNG seed scrape, KHÔNG quảng bá đa kênh tuần này | HIGH | Vision Lock §D-6 |
| C4 | Epics M1-M6 tổng cộng 233h vẫn đặt làm "Track A build ngay" — cần gộp/cắt thành 2 epics pilot tối thiểu | HIGH | Vision Lock §D |

**Bằng chứng:** Vision Lock 2026-08-04; Implementation Readiness Report Nowing 2026-08-05 (NFR-10 resolved); bộ docs bdsai hiện tại chưa cập nhật.

---

## Section 2 — Impact Analysis (Phân tích ảnh hưởng)

### 2.1 Epic Impact

| Epic | Trạng thái cũ | Ảnh hưởng |
|---|---|---|
| **M1 Foundation & Infrastructure** | Track A READY | Cắt: full monorepo/Next.js/NestJS/Supabase **không build trong pilot**. Chỉ giữ: script Zalo + tracker CSV + Nowing API credentials. |
| **M2 User Management** | Track A READY | **Hoãn** — pilot dùng Zalo burner account, không cần auth/profile. |
| **M3 Listing Management** | Track A READY | **Hoãn** — pilot không có public listing CRUD/web form. Chỉ cần nguồn tin để matching (có thể từ spreadsheet/Notion thủ công hoặc Nowing memory). |
| **M4 AI Features** | Track A Phase 1 READY | **Cắt scope:** AI Summary/Trust Score trên listing **KHÔNG** cần web UI. Chỉ dùng Nowing engine cho matching + Deal-Radar alert (qua Zalo). |
| **M5 Xaction Integration** | Track B BLOCKED | **Hoãn vô thời hạn** — không auto-post, không auto-import, không seed scrape. Xaction chỉ dùng nếu pilot xanh và tuần sau. |
| **M6 Inquiry & SEO** | Track A READY | **Hoãn** — không web, không SEO, không inquiry form. Liên hệ qua Zalo trực tiếp. |

### 2.2 Artifact Conflicts

- **PRD (`docs/bdsai/planning/prd-mvp-v2.md`)**: Vision vẫn là "AI-Powered Real Estate Marketplace" mà chưa nói Nowing = engine; timeline 11 tuần; success metrics vẫn là listings/users/traffic; chưa có section Demand-First Pilot.
- **Architecture (`docs/bdsai/architecture/ARCHITECTURE-SPINE.md`)**: Vẫn là 3-tier Next.js + NestJS + Supabase cho full marketplace; không có architecture cho pilot Zalo + Nowing API.
- **Epics (`docs/bdsai/planning/epics.md`)**: 6 epics với stories chi tiết cho web/CRM; chưa có epic pilot.
- **UX (`docs/bdsai/ux-design/wireframe-listing-form.md`)**: Wireframe web form cần archive hoặc đánh dấu post-pilot.

### 2.3 Technical Impact

- Không cần setup full monorepo trong 2 tuần.
- Có thể dùng script Node.js (zca-js) để gửi/nhận Zalo group.
- Cần integration tối thiểu với Nowing API: `/workspaces/{id}/automations/` hoặc tương đương để trigger Deal-Radar/matching.
- Cần tracker CSV/Notion để đo retention, match, willingness-to-pay.

---

## Section 3 — Recommended Approach (Hướng đi đề xuất)

**Đã đánh giá 3 option:**

| Option | Đánh giá | Effort | Risk |
|---|---|---|---|
| **1. Direct Adjustment** (sửa tài liệu, cắt epics) | Viable — chưa có code bdsai web | Low | Low |
| **2. Rollback** (bỏ toàn bộ docs cũ) | Không cần — docs còn giá trị post-pilot | — | — |
| **3. Two-track rewrite** (viết lại docs cho pilot + archive docs cũ) | Viable & cần thiết để rõ ràng | Medium | Medium |

**→ Lựa chọn: HYBRID (Option 1 + Option 3)**

**Lý do:** Không rollback docs cũ (vẫn là north-star post-pilot). Thay vào đó:
- Sửa PRD: thêm Vision Lock, cắt timeline, cắt scope, thêm demand-first pilot metrics.
- Thêm 2 epics pilot mới: **P0 Demand Validation (Zalo)** + **P1 Engine Integration (Nowing API thin)**.
- Đánh dấu M1-M6 cũ là **DEFERRED — mở khóa sau pilot xanh**.
- Sửa Architecture: thêm "Pilot Mode" (Zalo bot + script + Nowing API), giữ full architecture làm "Post-Pilot Mode".

---

## Section 4 — Detailed Change Proposals (Đề xuất sửa chi tiết)

### 📄 NHÓM A — PRD (`docs/bdsai/planning/prd-mvp-v2.md`)

**A1. Sửa Vision (mục 1.1)**

```
OLD:
Xây dựng sàn rao vặt bất động sản thông minh tập trung vào khu vực Long Thành, Đồng Nai —
nơi thị trường BĐS đang bùng nổ nhờ sân bay Long Thành. Platform tự động hóa việc đăng tin,
quảng bá đa kênh, và cung cấp AI insights cho cả người mua lẫn người bán.

NEW:
**North star:** bdsai.vn = sàn rao vặt BĐS có AI cho thị trường VN; **Nowing = engine AI**
(agent, memory, matching, automation, scraper, deep-research) chạy sau lưng, không còn là
research platform độc lập. Thắng BĐS → nhân engine sang vertical khác. Freemium.

**Pilot 2 tuần (demand-first):** kéo 30 môi giới Bình Thạnh qua group Zalo private, đo
retention tuần 2, ≥2 match, ≥3 willingness-to-pay. **KHÔNG xây web/mobile/full CRM trong pilot.**
```
*Lý do:* Phản ánh vision lock và thứ tự đúng.

**A2. Sửa Scope mục 1.2 / 1.3**

```
OLD: MVP 3 tháng — 500+ listings, 200+ users, 5,000+ visits/tháng

NEW:
### Phase 0 — Pilot (2 tuần)
- 30 môi giới Bình Thạnh trong group Zalo test
- Retention tuần 2 ≥10 người quay lại
- ≥2 match giữa nhu cầu và tin
- ≥3 môi giới nói "sẽ trả tiền"

### Phase 1 — Post-pilot (chỉ mở khi Phase 0 xanh)
- Xây dần web/CRM bdsai.vn, gọi Nowing engine qua API
- Các epic M1-M6 được mở khóa dần theo tín hiệu cầu
```
*Lý do:* Demand-first, không đo traffic trước khi có sản phẩm.

**A3. Thêm Section mới "12. Demand-First Pilot Guardrails"**

```
## 12. Demand-First Pilot Guardrails

**KHÔNG làm trong 2 tuần pilot:**
- Re-architect toàn bộ hệ thống
- Mobile app / full CRM
- Thu phí
- Seed scrape / auto-post / auto-import
- Tích hợp licensed-API

**Cổng quyết định cuối tuần 2:**
- Pilot XANH (retention + match + willingness-to-pay đạt) → mới bắt đầu Phase 1
- Pilot ĐỎ → chỉnh hook/ngách, chạy lại 1 vòng, chưa xây gì lớn
```
*Lý do:* Tránh bẫy rebuild trước cầu.

**A4. Cập nhật Timeline & Success Metrics**

```
OLD: Week 1-11 theo M1-M6

NEW:
### Pilot timeline (2 tuần)
- Ngày 0: Lập list 30 môi giới Bình Thạnh 3-4 tỷ
- Ngày 1-7: Nhắn tay 10-15/ngày bằng script + hook Deal-Radar; onboard concierge
- Ngày 1-14: Kênh test = group Zalo private (zca-js tài khoản burner)
- Tuần 2: Đo retention + match + "sẽ trả tiền?" → tracker CSV
```

---

### 📐 NHÓM B — Architecture (`docs/bdsai/architecture/ARCHITECTURE-SPINE.md`)

**B1. Thêm section "Architecture Modes" ở đầu**

```
## Architecture Modes

### Mode 0 — Pilot (2 tuần, demand-first)
```
┌─────────────────────────────────────────────┐
│  Luis (concierge) + tracker CSV/Notion      │
├─────────────────────────────────────────────┤
│  Zalo group (burner account, zca-js)        │  ← kênh test
├─────────────────────────────────────────────┤
│  Thin Node.js automation script             │  ← nhận filter, gọi Nowing
├─────────────────────────────────────────────┤
│  Nowing engine API                          │  ← matching, memory, Deal-Radar
└─────────────────────────────────────────────┘
```
- Không web app, không NestJS/Supabase full, không CI/CD phức tạp.
- Lưu trữ tối thiểu: tracker CSV + nếu cần thì Notion/Airtable.

### Mode 1 — Post-pilot (bdsai.vn product)
```
┌─────────────────────────────────────────────────────────┐
│  Next.js 16 (Vercel) — public marketplace              │
├─────────────────────────────────────────────────────────┤
│  NestJS 11 (Dokploy) — bdsai business logic            │
├─────────────────────────────────────────────────────────┤
│  Nowing engine API — AI/memory/matching/automation     │
├─────────────────────────────────────────────────────────┤
│  Supabase + Redis (bdsai data)                         │
└─────────────────────────────────────────────────────────┘
```
- bdsai BE/FE riêng, gọi Nowing engine qua API.
- Không gộp codebase, không nhúng iframe.
```
*Lý do:* Phân biệt rõ pilot vs post-pilot, và boundary với Nowing.

**B2. Thêm invariant AD-11 — Engine Boundary [ADOPTED]**

```
### AD-11 — Nowing Engine Boundary [ADOPTED]
- **Binds:** all pilot + post-pilot AI/automation features
- **Prevents:** bdsai gọi trực tiếp ChainLens/scraper; bdsai trở thành monolith lặp lại Nowing
- **Rule:** bdsai product gọi Nowing qua public/authenticated API. Nowing owns multi-agent chat,
  memory, matching, automation, scraper, deep-research. bdsai owns listings, search, auth,
  billing, SEO, moderation UI.
```
*Lý do:* Enforce vision lock: bdsai = product, Nowing = engine.

**B3. Thêm invariant AD-12 — Pilot Data Isolation [ADOPTED]**

```
### AD-12 — Pilot Data Isolation [ADOPTED]
- **Binds:** Mode 0 pilot
- **Prevents:** pilot data leaching into production schema
- **Rule:** Pilot data lives in tracker CSV / Notion / ad-hoc storage. Không tạo production DB
  schema cho đến khi pilot xanh. Nếu dùng Nowing workspace, dùng workspace test riêng.
```
*Lý do:* Không invest schema trước khi validate cầu.

---

### 📋 NHÓM C — Epics (`docs/bdsai/planning/epics.md`)

**C1. Thêm 2 epics pilot, đánh dấu M1-M6 DEFERRED**

```
## Epic Pilot 0 (P0): Demand Validation qua Zalo — `[ACTIVE]`
Mục tiêu: có tín hiệu cầu thật từ 30 môi giới Bình Thạnh trong 2 tuần.

**Stories bắt buộc:**
- P0.1 Lập list 30 môi giới Bình Thạnh (sourcing script/tracker)
- P0.2 Nhắn tay 10-15 môi giới/ngày với hook Deal-Radar
- P0.3 Tạo group Zalo private và onboard burner account
- P0.4 Tracker CSV: retention tuần 2, match count, willingness-to-pay

**Deliverable:** Decision gate cuối tuần 2 (XANH/ĐỎ).

## Epic Pilot 1 (P1): Thin Nowing Engine Integration — `[ACTIVE]`
Mục tiêu: Zalo bot nhận filter từ môi giới → gọi Nowing engine → trả Deal-Radar alert.

**Stories bắt buộc:**
- P1.1 Xác định Nowing API endpoint cho matching/automation (workspace + automation trigger)
- P1.2 Script parse tin nhắn Zalo thành filter (location, price range, type)
- P1.3 Gọi Nowing API với filter, nhận match
- P1.4 Định dạng Deal-Radar alert + gửi vào group Zalo
- P1.5 Handoff concierge: khi match đạt ngưỡng, Luis liên hệ trực tiếp

**Deliverable:** Luồng Zalo → Nowing → Zalo hoạt động với ít nhất 1 match.

## Epic M1–M6 — `[DEFERRED — mở khóa sau pilot xanh]`
Toàn bộ 6 epics marketplace (Foundation, Users, Listings, AI, Xaction, Inquiry/SEO) bị hoãn
cho đến khi P0 XANH. Sau đó mở khóa dần theo thứ tự ưu tiên.
```
*Lý do:* Tập trung nguồn lực vào 2 tuần pilot.

---

### 🎨 NHÓM D — UX (`docs/bdsai/ux-design/wireframe-listing-form.md`)

**D1. Đánh dấu wireframe là post-pilot**

```
OLD: Wireframe multi-step form tạo listing (M3.2)

NEW (thêm header):
---
status: POST-PILOT
note: Wireframe này thuộc Epic M3 Listing Management, bị hoãn cho đến khi P0 XANH.
      Trong pilot, tin đăng được thu thập qua Zalo hoặc spreadsheet thủ công.
---
```
*Lý do:* Tránh hiểu nhầm wireframe là việc cần làm tuần này.

---

## Section 5 — Decision Gates (Cổng quyết định)

| Gate | Điều kiện | Hành động tiếp theo |
|---|---|---|
| G1 — Vision Lock đồng ý | PO đồng ý proposal này | Apply changes vào docs, bắt đầu P0/P1 |
| G2 — Pilot XANH (cuối tuần 2) | ≥10 retention, ≥2 match, ≥3 willingness-to-pay | Mở khóa M1-M6 dần |
| G3 — Pilot ĐỎ | Không đạt 1 trong 3 chỉ số | Chỉnh hook/ngách, chạy lại pilot, vẫn không xây app |

---

## Section 6 — Next Steps

1. **Approve proposal** (Luis / PO) — chọn batch mode hoặc yêu cầu chỉnh sửa.
2. **Apply changes** vào 4 tài liệu: PRD, Architecture, Epics, UX wireframe.
3. **Tạo stories cho P0.1–P0.4 và P1.1–P1.5**.
4. **Kiểm tra Nowing API** cho matching/automation (workspace, automation trigger, auth).
5. **Setup tracker CSV** và Zalo burner account.
6. **Bắt đầu pilot** — ngày 0 lập list 30 môi giới.

---

**Tóm tắt một dòng:**
Cắt scope bdsai từ full MVP marketplace 11 tuần xuống 2 tuần pilot Zalo demand-first; Nowing = engine headless; chỉ xây web/CRM sau khi pilot xanh.
