---
stepsCompleted: [step-01-document-discovery]
date: 2026-06-24
project: bdsai.vn
version: 2
supersedes: implementation-readiness-report-2026-06-24.md
note: Chạy lại sau Correct Course (M5 BLOCKED, Section 11 Compliance) + Architecture review (AD-8/9/10)
---

# Implementation Readiness Assessment Report (v2)

**Date:** 2026-06-24 (lần 2 — sau Correct Course + Architecture review)
**Project:** longthanhland (bdsai.vn)
**Assessor:** Winston (System Architect)

> Báo cáo v1 (`implementation-readiness-report-2026-06-24.md`) phản ánh trạng thái TRƯỚC Correct Course. v2 này đánh giá lại sau khi: PRD thêm Section 11 + M5→BLOCKED; Architecture thêm AD-8 (Data Privacy), AD-9 (Cross-Post Lifecycle), AD-10 (Next API Boundary); Epics phân Track A/B + thêm story M1.5/M2.5/dedup.

---

## Step 1 — Document Inventory

| Loại | File | Kích thước | Định dạng |
|---|---|---|---|
| PRD | `PRD-marketplace-mvp-v2.md` | 21.9K | Whole ✅ |
| Architecture | `architecture/ARCHITECTURE-SPINE.md` | 16.2K | Whole ✅ (10 invariants AD-1→AD-10) |
| Epics | `epics.md` | 6.6K | Whole ✅ |
| UX | — | — | ❌ Không có (chủ đích — dùng shadcn/ui) |

**Duplicate:** 2 bản (`_bmad-output/` canonical + `docs/bdsai/` đọc) — đã verify đồng bộ IDENTICAL. Assess trên canonical.

**Thiếu:** UX Design — quyết định chủ đích, rủi ro MEDIUM (multi-step form + promotion flow).

---

## Step 2 — PRD Analysis

### Functional Requirements (19)

| FR | Mô tả | Nguồn PRD |
|---|---|---|
| FR1 | Đăng ký email + phone (Supabase Auth) | M2.1 |
| FR2 | Đăng nhập, quản lý profile (avatar, bio, phone verified) | M2.2-2.3 |
| FR3 | Seller tạo listing (multi-step form, image upload, draft/publish) | M3.1-3.2 |
| FR4 | Admin approve/reject listings từ moderation queue | M3.5 |
| FR5 | Buyer browse + search (filters: location, price, type, area) | M3.3 |
| FR6 | Listing detail SSR + dynamic meta + structured data | M3.4 |
| FR7 | AI Summary GPT-4 phân tích mỗi listing | M4.1 |
| FR8 | Trust Score 0-100 (Phase 1 + Phase 2 sau sửa) | M4.2a/b |
| FR9 | Smart Spam Filter rule-based + blacklist | M4.3 |
| FR10 | Xaction Auto-Post (proxy) — **Track B** | M5.2-5.4 |
| FR11 | Xaction Auto-Import crawl — **Track B** | M5.5 |
| FR12 | Seller promotion dashboard (xem link) — **Track B** | M5.x |
| FR13 | Import dashboard admin — **Track B** | M5.6 |
| FR14 | Inquiry form gửi liên hệ seller | M6.1 |
| FR15 | Notification email + SMS | M6.2 |
| FR16 | Listing auto-expire + renew + mark sold | M3.6 |
| FR17 | News feed BĐS từ FB (via Xaction) — **Track B** | M5.7 |
| FR18 | Dynamic sitemap.xml + robots.txt | M6.3-6.4 |
| FR19 | Admin user list, ban/unban | M2.4 |

**Total FRs: 19**

### Non-Functional Requirements (10)

| NFR | Mô tả | Invariant đảm bảo |
|---|---|---|
| NFR1 | SSR render < 500ms (P95) | AD-4 |
| NFR2 | API response < 200ms (P95) | — (chưa có cơ chế đo) |
| NFR3 | Lighthouse SEO > 90 | AD-4 (+ Lighthouse CI gate mới) ✅ |
| NFR4 | Page load < 2s (P75) | AD-4 |
| NFR5 | Supabase Free 500MB DB, 1GB storage | Deferred (upgrade trigger) |
| NFR6 | AI rate limit max 100 calls/hour | AD-6 ✅ |
| NFR7 | Xaction retry 3x backoff, never block | AD-3 ✅ |
| NFR8 | Vietnamese full-text search | Story M1.5 (`unaccent`+`pg_trgm`) ✅ |
| NFR9 | Image max 10MB, auto WebP | AD-7 ✅ |
| NFR10 | Domain bdsai.vn | — (config) |

**Total NFRs: 10**

### Additional Requirements & Constraints

- Monorepo Turborepo (apps/web + apps/api + packages/shared)
- Deploy: Vercel (FE) + Dokploy Docker (BE)
- Module isolation (AD-1), single mutation path (AD-2), Next API boundary (AD-10)
- **Compliance (Section 11 — MỚI):** ToS proxy decision, NĐ 13/2023 PII handling (AD-8), Trust Score appeal
- Xaction async via BullMQ (AD-3); 2 gate chặn Track B (API docs + compliance decision)

### PRD Completeness Assessment

PRD **hoàn chỉnh và rõ ràng** sau Correct Course. Điểm mạnh: FR/NFR đánh số, có FR coverage map, có Section 11 Compliance (lấp gap pháp lý). Điểm cần lưu ý: NFR2 (API <200ms) và NFR1 (SSR <500ms) chưa có cơ chế đo lường/gate trong CI (chỉ NFR3 có sau khi thêm Lighthouse gate). FR/NFR đánh số thực tế nằm trong `epics.md` Requirements Inventory, không phải trong PRD body — sẽ kiểm tra alignment ở Step 3.

---

## Step 3 — Epic Coverage Validation

### Coverage Matrix

| FR | Epic | Track | Status |
|---|---|---|---|
| FR1 Đăng ký | Epic 2 | A | ✓ Covered |
| FR2 Profile | Epic 2 | A | ✓ Covered |
| FR3 Tạo listing | Epic 3 | A | ✓ Covered |
| FR4 Admin approve/reject | Epic 3 | A | ✓ Covered |
| FR5 Browse + search | Epic 3 | A | ✓ Covered (cần M1.5 FTS) |
| FR6 Listing detail SSR | Epic 3 | A | ✓ Covered |
| FR7 AI Summary | Epic 4 | A | ✓ Covered |
| FR8 Trust Score | Epic 4 | A(P1)/B(P2) | ✓ Covered (đã tách phase) |
| FR9 Spam Filter | Epic 3 | A | ✓ Covered (rule-engine tách dùng chung) |
| FR10 Auto-Post | Epic 5 | **B (BLOCKED)** | ⚠️ Covered nhưng blocked |
| FR11 Auto-Import | Epic 5 | **B (BLOCKED)** | ⚠️ Covered + dedup story mới |
| FR12 Promotion dashboard | Epic 5 | **B (BLOCKED)** | ⚠️ Covered nhưng blocked |
| FR13 Import dashboard | Epic 5 | **B (BLOCKED)** | ⚠️ Covered nhưng blocked |
| FR14 Inquiry form | Epic 6 | A | ✓ Covered |
| FR15 Notification | Epic 6 | A | ✓ Covered (⚠️ SMS provider chưa chốt) |
| FR16 Expire/renew/sold | Epic 3 | A | ✓ Covered (edge case lifecycle AD-9) |
| FR17 News feed | Epic 5 | **B (BLOCKED)** | ⚠️ Covered + FE story mới |
| FR18 Sitemap/robots | Epic 6 | A | ✓ Covered |
| FR19 Admin user mgmt | Epic 2 | A | ✓ Covered |

### Missing Requirements

**KHÔNG có FR thiếu epic** — coverage 100% (19/19). Tuy nhiên có các điểm chất lượng:
- FR15: chưa chỉ định SMS provider (Twilio? eSMS.vn? FPT SMS?) — cần chốt trước khi tạo story M6.2.
- FR10-13, FR17 (5 FR, Track B): coverage có nhưng **BLOCKED** bởi 2 gate (Xaction API docs + compliance decision) → không thể tạo story chi tiết đến khi gỡ block.

### Coverage Statistics

- **Total PRD FRs: 19**
- **FRs covered in epics: 19**
- **Coverage percentage: 100%**
- Track A (build ngay): 14 FR | Track B (blocked): 5 FR

---

## Step 4 — UX Alignment Assessment

### UX Document Status

**Not Found** — không có file UX nào trong `planning_artifacts`.

### UX có implied không?

**CÓ — mạnh.** Đây là ứng dụng user-facing rõ rệt: 3 persona (buyer/seller/admin), PRD nêu nhiều UI component (multi-step listing form, browse/search filters, promotion dashboard, import dashboard, listing detail). Stack đã chọn shadcn/ui + Tailwind. Vậy UX KHÔNG phải không cần — nó được quyết định "không viết spec riêng, build trực tiếp từ component library".

### Alignment Issues (UX ngầm ↔ PRD ↔ Architecture)

| Vùng | Đánh giá |
|---|---|
| Architecture có hỗ trợ UX không? | ✅ Có. AD-4 (SSR cho public pages) phục vụ buyer browse/detail. `(dashboard)` + `(admin)` route groups (client) phục vụ seller/admin. AD-10 mới giữ Next API mỏng — không ảnh hưởng UX. |
| Performance UX | ✅ NFR1/4 (SSR <500ms, page <2s) khớp nhu cầu UX buyer; NFR3 Lighthouse>90 có CI gate. |
| Component nào thiếu hỗ trợ kiến trúc? | Không phát hiện — shadcn/ui đủ cho mọi UI nêu trong PRD. |

### Warnings

⚠️ **MEDIUM — 2 flow phức tạp thiếu wireframe:**
1. **Multi-step listing form (M3.2)** — nhiều bước + image upload + validation. Không có wireframe → rủi ro dev và PM hiểu khác nhau về số bước, thứ tự field, xử lý lỗi giữa chừng (đã có edge case JWT expire giữa form).
2. **Promotion flow (FR12, Track B)** — "tick platforms + xem link". **Double unknown**: vừa thiếu UX vừa thiếu Xaction API docs. Không nên thiết kế UI này cho tới khi gỡ block Track B.

**Khuyến nghị:** Trước khi tạo story M3.2, làm wireframe thô (low-fi) cho multi-step form — chỉ cần 1 trang. Promotion flow để lại cùng Track B. Có thể dùng skill `bmad-ux` nếu muốn spec đầy đủ, nhưng với MVP shadcn/ui thì wireframe thô là đủ.

---

## Step 5 — Epic Quality Review

> Áp dụng chuẩn create-epics-and-stories nghiêm khắc. Lưu ý: `epics.md` hiện ở mức **epic-list + story headers**, CHƯA có full story spec (AC Given/When/Then). Một số kiểm tra chi tiết sẽ đánh dấu "chưa tồn tại để đánh giá" — đó là gap của giai đoạn, không phải lỗi.

### A. User Value Focus Check

| Epic | Tiêu đề có user-centric? | Đánh giá |
|---|---|---|
| Epic 1 Foundation & Infrastructure | ❌ **Technical milestone** | 🔴 Vi phạm — "Foundation & Infrastructure" không có user value trực tiếp. Đây là red flag điển hình. |
| Epic 2 User Auth & Profiles | ✅ | OK (borderline nhưng user đăng ký/đăng nhập = value thật) |
| Epic 3 Listing Management & Search | ✅ | Tốt — seller đăng tin, buyer tìm kiếm |
| Epic 4 AI Intelligence | ✅ | Tốt — buyer đánh giá tin nhanh |
| Epic 5 Xaction | ✅ | Tốt — seller quảng bá 1-click (nhưng BLOCKED) |
| Epic 6 Inquiry & SEO | ✅ | Tốt — buyer liên hệ seller |

### B. Epic Independence Validation

| Quan hệ | Đánh giá |
|---|---|
| Epic 1 đứng độc lập | ✅ (infra) |
| Epic 2 chỉ cần Epic 1 | ✅ |
| Epic 3 cần Epic 1,2 | ✅ (listing cần auth) |
| Epic 4 cần Epic 1,2,3 | ✅ sau khi tách Trust Score Phase 1/2 — **forward dependency Epic4→Epic5 đã được Correct Course xử lý** (Phase 2 chuyển sang Track B). ✅ |
| Epic 5 (Track B) | ⚠️ BLOCKED bởi external gate, không phải forward dep nội bộ |
| Epic 6 cần Epic 1,2,3 | ✅ |

**Kết quả:** KHÔNG còn forward dependency nội bộ (đã sửa ở Correct Course). Đây là cải thiện lớn so với báo cáo v1.

### Findings by Severity

#### 🔴 Critical Violations

1. **Epic 1 là technical epic, không có user value.** "Foundation & Infrastructure" + stories M1.1-M1.5 (monorepo, Supabase, CI/CD, FTS) đều là infra. → *Đây là vi phạm chuẩn BMad, NHƯNG được chấp nhận cho greenfield* (xem Special Checks bên dưới). Khuyến nghị: giữ Epic 1 nhưng đổi tên hướng kết quả, vd "Project Skeleton chạy được & deploy tự động" để rõ deliverable.

#### 🟠 Major Issues

1. **Chưa có full story spec.** `epics.md` mới ở mức epic + story header (có estimate, chưa có AC). Không thể validate AC Given/When/Then, error conditions, testability. → Cần chạy `bmad-create-epics-and-stories` / `bmad-create-story` để sinh story đầy đủ. Đây là bước kế tiếp tự nhiên.
2. **FR15 SMS provider chưa chốt** — story M6.2 không thể có AC cụ thể đến khi chọn provider.

#### 🟡 Minor Concerns

1. Estimate Epic 1 ghi "24h → ~50-70h" nhưng chưa phân bổ lại từng story — cần re-estimate chi tiết khi tạo story.
2. Story dedup (M5.x) và news feed FE (M5.x) chưa đánh số chính thức (đang để "M5.x").

### Special Implementation Checks

- **Greenfield project** ✅ → Epic 1 có project setup story (M1.1 monorepo), CI/CD sớm (M1.3), dev env. Đúng chuẩn greenfield. → **Điều này HỢP THỨC HÓA Epic 1 technical** — greenfield được phép có infra epic đầu.
- **Starter template:** Architecture KHÔNG chỉ định starter template cụ thể (build from scratch NestJS + Next.js). M1.1 "monorepo setup" là đủ.
- **Database timing:** `epics.md` chưa ghi rõ table tạo theo story hay upfront. ⚠️ Cần đảm bảo mỗi story tạo table nó cần (AD-2/Drizzle), KHÔNG tạo toàn bộ schema ở M1. Kiểm tra lại khi sinh story.

### Best Practices Compliance Checklist

- [x] Epic delivers user value — ✅ trừ Epic 1 (chấp nhận cho greenfield)
- [x] Epic độc lập — ✅ (forward dep đã sửa)
- [~] Story sizing — chưa đủ chi tiết để đánh giá (chưa có full spec)
- [x] No forward dependencies — ✅ (Correct Course đã gỡ Epic4→5)
- [~] DB tables tạo khi cần — chưa xác định, cần check khi sinh story
- [ ] Clear AC — ❌ chưa tồn tại (chưa sinh story)
- [x] Traceability tới FR — ✅ 100%

---

## Summary and Recommendations

### Overall Readiness Status

# ✅ READY (Track A) / 🔴 BLOCKED (Track B)

Đây là verdict **tách track** — khác báo cáo v1 (NEEDS WORK toàn cục) vì Correct Course + Architecture review đã gỡ phần lớn vấn đề nội tại:
- **Track A (14 FR: M1-M4 Phase1, M6):** READY để tạo story và build. Coverage 100%, không forward dependency, architecture đủ invariant chi phối (AD-1→AD-10), NFR cốt lõi có cơ chế đảm bảo.
- **Track B (5 FR: M5 + Trust Score Phase 2):** BLOCKED bởi 2 gate external mà chỉ Luis mở được.

### So sánh với báo cáo v1 (đã cải thiện)

| Vấn đề v1 | Trạng thái v2 |
|---|---|
| Forward dependency Trust Score (Epic4→5) | ✅ Đã sửa (tách Phase 1/2) |
| Rủi ro pháp lý không có trong tài liệu | ✅ Đã thêm Section 11 + AD-8 |
| Single point of failure Xaction | ✅ AD-3 provider pattern |
| NFR8 Vietnamese FTS không có path | ✅ Story M1.5 |
| Estimate thiếu infra | ✅ Re-estimate Epic 1 (24h→50-70h) |
| **MỚI phát hiện v2:** ranh giới Next API↔NestJS | ✅ Đã thêm AD-10 |
| **MỚI phát hiện v2:** AD-9 invariant quá tham vọng | ✅ Đổi sang best-effort |

### Critical Issues Requiring Immediate Action

1. 🔴 **[Track B gate] Quyết định compliance ToS** (Luis) — business decision, chặn toàn bộ Epic 5. Không code M5 trước khi chốt.
2. 🔴 **[Track B gate] Xaction API docs** (Luis) — chặn estimate + AC của 7 story M5.
3. 🟠 **Chưa có full story spec** — `epics.md` mới ở mức header. Cần sinh story đầy đủ (AC Given/When/Then) cho Track A trước khi dev.

### Issues còn lại (không chặn Track A)

- 🟠 FR15 SMS provider chưa chốt (Twilio/eSMS.vn/FPT) → chốt trước story M6.2.
- 🟡 Multi-step listing form (M3.2) nên có wireframe thô trước khi dev.
- 🟡 Database table timing — đảm bảo tạo theo story, không upfront ở M1.
- 🟡 Epic 1 nên đổi tên hướng deliverable (minor).
- 🟡 NFR1/NFR2 (SSR/API latency) chưa có gate đo lường trong CI (chỉ NFR3 có).

### Recommended Next Steps

1. **Sinh story chi tiết cho Track A** → chạy `bmad-create-epics-and-stories` hoặc `bmad-create-story` cho M1 → M2 → M3 → M4 Phase 1 → M6. Đây là việc ngay được.
2. **Chốt 2 quyết định nhỏ:** SMS provider (FR15) + wireframe thô multi-step form (M3.2).
3. **Luis xử lý 2 gate Track B** song song: quyết định ToS compliance + lấy Xaction API docs. Khi xong → quay lại tạo story M5.
4. (Tùy chọn) Đổi tên Epic 1 hướng deliverable; thêm Lighthouse/latency gate vào CI khi setup M1.3.

### Final Note

Assessment này tìm thấy **3 issue critical** (2 là external gate của Track B, 1 là thiếu story spec) và **~5 issue minor**, trải trên 5 category. **Track A sẵn sàng triển khai ngay** — không issue nào chặn nó. Track B chờ Luis mở 2 gate. So với v1, tài liệu đã cải thiện đáng kể nhờ Correct Course + Architecture review. Anh có thể proceed tạo story Track A, hoặc xử lý các minor issue trước nếu muốn hoàn hảo hơn.

---

**Assessor:** Winston (System Architect) · **Date:** 2026-06-24 · **Report:** v2

stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]





