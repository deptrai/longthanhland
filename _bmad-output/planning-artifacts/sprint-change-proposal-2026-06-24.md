---
name: sprint-change-proposal
project: bdsai.vn (longthanhland)
date: 2026-06-24
author: Correct Course Workflow + Luis
mode: batch
status: draft-for-approval
trigger: 3-vòng review planning (adversarial + readiness + edge-case)
inputs:
  - _bmad-output/planning-artifacts/PRD-marketplace-mvp-v2.md
  - _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-06-24.md
scope_classification: MAJOR (replan trước khi tạo stories)
---

# Sprint Change Proposal — bdsai.vn

> **Bối cảnh:** Dự án đang ở **cuối phase planning (pre-implementation)** — có PRD + Architecture Spine + Epics, CHƯA có sprint-status / stories / code. Đây là điều chỉnh tài liệu planning TRƯỚC khi tạo stories, không phải sửa giữa sprint. Đây là thời điểm rẻ nhất để sửa.

---

## Section 1 — Issue Summary (Tóm tắt vấn đề)

**Nguyên nhân kích hoạt:** 3 vòng review song song (Cynical Review, Implementation Readiness Check, Edge Case Hunter) trên bộ tài liệu planning hội tụ về một kết luận: nền tảng tài liệu tốt (FR coverage 100%, 7 invariants rõ ràng) nhưng **1 epic (M5 Xaction) kéo cả dự án xuống** và một loạt gap chất lượng cần đóng trước khi viết stories.

**Phân loại vấn đề:** Hỗn hợp — (a) Technical limitation (Xaction API chưa tồn tại), (b) New requirement (compliance pháp lý), (c) Misunderstanding (estimate thiếu infra), (d) Failed approach (mitigation ToS sai bản chất).

**6 cụm vấn đề (change trigger):**

| # | Vấn đề | Mức | Nguồn |
|---|---|---|---|
| C1 | Epic M5 đánh dấu READY nhưng Xaction API docs "sẽ gửi sau" → 52h (22% effort) không estimate/viết AC được | EXISTENTIAL | 3/3 agent |
| C2 | Rủi ro pháp lý KHÔNG xuất hiện trong cả 3 tài liệu: auto-post proxy vi phạm ToS FB/BDS/Chợ Tốt; lưu `sellerPhone` raw từ crawl có thể vi phạm NĐ 13/2023 | EXISTENTIAL | Adversarial |
| C3 | Single point of failure: 100% giá trị khác biệt (đa kênh, import, so giá, news feed) phụ thuộc Xaction, không fallback | HIGH | Adversarial |
| C4 | Forward dependency: Trust Score (M4.2 "market alignment", Week 5-7) cần data từ Auto-Import (Epic 5, Week 7-9) — sai thứ tự | HIGH | Readiness |
| C5 | Estimate thiếu ~30-50h: Redis/BullMQ, Turborepo, Drizzle migration, Vietnamese FTS (NFR8), SMS provider, Sentry | MEDIUM | Readiness |
| C6 | 4 edge case Critical: tin reject/xóa vẫn live trên platform ngoài; spam từ crawl bypass filter; thiếu quy trình cấp quyền admin (privilege escalation) | CRITICAL | Edge Case |

**Bằng chứng:** Báo cáo readiness đầy đủ tại `implementation-readiness-report-2026-06-24.md`; 18 edge case (4C/6H/8M) + adversarial findings trong thread review.

---

## Section 2 — Impact Analysis (Phân tích ảnh hưởng)

### 2.1 Epic Impact

| Epic | Trạng thái | Ảnh hưởng |
|---|---|---|
| **M1 Foundation** | ✅ Mở rộng | Thêm story M1.5 (Vietnamese FTS) + bổ sung infra rõ ràng (Redis/BullMQ, Turborepo, Drizzle migration, Sentry) → +30-50h |
| **M2 Users** | ⚠️ Sửa | Thêm story quy trình cấp quyền admin (C6) — hiện không có |
| **M3 Listings** | ⚠️ Sửa | Edge case lifecycle (expire/renew/sold race); FR9 Spam Filter giữ ở M3 nhưng cần cứng hóa khi có nguồn crawl |
| **M4 AI** | ⚠️ Sửa | Tách Trust Score Phase 1/2 (C4); Trust Score cần quy trình appeal (rủi ro kiện) |
| **M5 Xaction** | 🔴 **BLOCK + Redesign** | Block tới khi có API docs; tách thành track riêng; redesign provider pattern; thêm compliance gate; sửa schema phone; xử lý cross-post lifecycle |
| **M6 Inquiry & SEO** | ⚠️ Sửa nhẹ | Edge case inquiry khi listing expire; SMS provider chưa chốt |

### 2.2 Artifact Conflicts

- **PRD** (`PRD-marketplace-mvp-v2.md`): thiếu hẳn section Compliance/Legal; mục 9 Risks đánh giá ToS sai bản chất; mục 4 Epic M5 đánh dấu READY sai; Trust Score thiếu cơ chế appeal.
- **Architecture** (`ARCHITECTURE-SPINE.md`): AD-3 chưa nói tới fallback/provider pattern; thiếu invariant về Data Privacy (AD-8); thiếu invariant về Cross-Post Lifecycle Integrity (AD-9); AD-4 thiếu cơ chế đo Lighthouse trong CI; schema `imported_listings` lưu `sellerPhone` raw.
- **Epics** (`epics.md`): thiếu story FTS, dedup, admin role grant, news feed FE; FR9 đặt sai epic; estimate không khớp.
- **UX**: không có — rủi ro MEDIUM với multi-step form + promotion flow.

### 2.3 Technical Impact

- Schema migration: `imported_listings.sellerPhone` → hash (sha256) thay vì raw.
- XactionModule: redesign theo provider/plugin interface (mỗi platform 1 provider, có thể tắt/fallback).
- Thêm bảng/cột tracking cross-post lifecycle (đồng bộ trạng thái khi listing reject/xóa).
- CI: thêm Lighthouse CI gate cho NFR3.

---

## Section 3 — Recommended Approach (Hướng đi đề xuất)

**Đã đánh giá 3 option (checklist Section 4):**

| Option | Đánh giá | Effort | Risk |
|---|---|---|---|
| **1. Direct Adjustment** (sửa trong cấu trúc epic hiện tại) | Viable cho M1-M4, M6 | Medium | Low |
| **2. Rollback** (revert work đã làm) | **N/A** — chưa có code | — | — |
| **3. MVP Review** (giảm scope) | Viable & cần thiết cho M5 | Medium | Medium |

**→ Lựa chọn: HYBRID (Option 1 + Option 3)**

**Lý do:** Chưa có code nên không có gì để rollback (Option 2 loại). M1-M4 + M6 chỉ cần Direct Adjustment (sửa tài liệu, thêm vài story) — đường an toàn, build được ngay. Riêng M5 cần MVP Review: **block + tách track + thêm compliance gate**, vì nó vừa thiếu nền móng kỹ thuật (API docs) vừa có rủi ro tồn vong pháp lý — không thể "sửa nhẹ".

**Nguyên tắc tái cấu trúc timeline:**
- **Track A (build ngay):** M1 (mở rộng) → M2 → M3 → M4 (Trust Score Phase 1) → M6. Không phụ thuộc Xaction.
- **Track B (blocked):** M5 + M4.2 Phase 2 (market alignment). Mở khóa khi: (1) Xaction API docs có, (2) quyết định kinh doanh về ToS compliance, (3) schema phone đã hash.

---

## Section 4 — Detailed Change Proposals (Đề xuất sửa chi tiết)

### 📄 NHÓM A — PRD (`PRD-marketplace-mvp-v2.md`)

**A1. Sửa trạng thái Epic M5 (mục 4, Epic M5 header) — [C1]**
```
OLD: ### Epic M5: Xaction Integration — Auto-Post & Import (Week 7-9)
NEW: ### Epic M5: Xaction Integration — Auto-Post & Import (BLOCKED — chờ API docs + quyết định compliance)
     ⚠️ Track B — không nằm trong critical path. Điều kiện mở khóa: (1) Xaction API docs;
        (2) quyết định kinh doanh ToS/compliance; (3) schema phone đã hash.
```
*Lý do:* Không đánh dấu READY một epic chưa có nền móng — tránh đưa vào sprint sớm.

**A2. Thêm Section mới "11. Compliance & Pháp lý" — [C2]**
```
NEW (section mới, sau mục 10):
## 11. Compliance & Pháp lý

### 11.1 Auto-Post & Quản lý danh tính proxy
- RỦI RO: Đăng dưới danh tính proxy có thể vi phạm ToS Facebook/Batdongsan/Chợ Tốt.
- QUYẾT ĐỊNH CẦN CHỐT (Luis): chấp nhận rủi ro / chuyển sang official API
  (FB Page API, đối tác chính thức) / bỏ kênh vi phạm.
- KHÔNG dùng "rate limiting" như mitigation chính — nó không giải quyết bản chất fake account.

### 11.2 Bảo vệ dữ liệu cá nhân (NĐ 13/2023)
- KHÔNG lưu sellerPhone raw từ crawl. Lưu hash (sha256) phục vụ dedup.
- Có cơ chế xóa theo yêu cầu (data subject request).
- Imported listing hiển thị công khai chỉ khi có cơ sở pháp lý / đã ẩn PII.

### 11.3 AI Trust Score — trách nhiệm pháp lý
- Có disclaimer "tham khảo, không phải xác nhận pháp lý".
- Có quy trình appeal khi tin bị gắn nhãn điểm thấp.
```

**A3. Sửa bảng Risks (mục 9) — [C2][C3]**
```
OLD: | Facebook chặn auto-post | HIGH | HIGH | Tuân thủ rate limit, đa dạng content, dùng Page API |
NEW: | Vi phạm ToS FB/BDS/Chợ Tốt (proxy + crawl) | EXISTENTIAL | HIGH | Quyết định compliance trước khi code M5; ưu tiên official API; rate limit KHÔNG đủ |
ADD: | Lưu PII (sellerPhone) vi phạm NĐ 13/2023 | EXISTENTIAL | HIGH | Hash phone, cơ chế xóa, ẩn PII công khai |
ADD: | Phụ thuộc đơn điểm vào Xaction | HIGH | MEDIUM | Provider pattern (AD-3 mở rộng), Track A không phụ thuộc Xaction |
```

**A4. Trust Score tách phase (mục 4, Epic M4 / M4.2) — [C4]**
```
OLD: | M4.2 | Trust Score: algorithm (seller verify + listing quality + market alignment) | 8h |
NEW: | M4.2a | Trust Score Phase 1: seller verify + listing quality (KHÔNG cần market data) | 5h |
     | M4.2b | Trust Score Phase 2: + market alignment (Track B — sau khi có Auto-Import) | 3h |
```

---

### 📐 NHÓM B — Architecture (`ARCHITECTURE-SPINE.md`)

**B1. Mở rộng AD-3 (Xaction) — provider pattern + fallback — [C3]**
```
OLD (AD-3 Rule): ... XactionModule owns all Xaction communication.
NEW (AD-3 Rule): ... XactionModule owns all Xaction communication.
  Mỗi platform (FB/BDS/Chợ Tốt) là một PROVIDER độc lập implement interface chung
  (IPromotionProvider). Provider có thể bật/tắt qua config và fail độc lập —
  1 kênh fail KHÔNG kéo sập cả promotion. Hỗ trợ thay Xaction bằng official API
  provider mà không sửa marketplace module.
```

**B2. Thêm invariant AD-8 — Data Privacy [ADOPTED] — [C2]**
```
NEW:
### AD-8 — Data Privacy & PII Handling [ADOPTED]
- Binds: M5 (imported listings), M2 (user data)
- Prevents: vi phạm NĐ 13/2023, lưu trữ PII trái phép
- Rule: KHÔNG lưu sellerPhone/sellerName raw từ nguồn crawl. Phone → sha256 hash
  (chỉ phục vụ dedup). Mọi PII hiển thị công khai phải có cơ sở pháp lý hoặc bị ẩn.
  Hỗ trợ xóa theo yêu cầu. Audit log mọi truy cập PII.
```

**B3. Thêm invariant AD-9 — Cross-Post Lifecycle Integrity — [C6]**
```
NEW:
### AD-9 — Cross-Post Lifecycle Integrity [ADOPTED]
- Binds: M3 (listing lifecycle), M5 (cross-posts)
- Prevents: tin reject/xóa/sold vẫn live trên platform ngoài (stale external state)
- Rule: Khi listing chuyển trạng thái (reject/delete/sold/expire), MỌI cross_post
  liên quan PHẢI được enqueue job gỡ/cập nhật trên platform ngoài. cross_posts.status
  phản ánh trạng thái thực. Không có "orphan" cross-post.
```

**B4. Sửa schema `imported_listings` (mục 5.4 PRD reference + Arch) — [C2]**
```
OLD: sellerPhone: varchar('seller_phone', { length: 20 }),
NEW: sellerPhoneHash: varchar('seller_phone_hash', { length: 64 }), // sha256, dedup only — KHÔNG lưu raw
```

**B5. Mở rộng AD-4 — đo lường Lighthouse trong CI — [Readiness]**
```
ADD vào AD-4 Rule: CI pipeline chạy Lighthouse CI trên các public pages mỗi PR;
  gate fail nếu SEO score < 90 (NFR3). Đây là cơ chế verify, không chỉ mục tiêu.
```

---

### 📋 NHÓM C — Epics (`epics.md`)

**C1-story. Thêm story M1.5 — Vietnamese Full-Text Search — [C5/NFR8]**
```
ADD vào Epic 1: M1.5 | Vietnamese FTS: unaccent + pg_trgm extension + to_tsvector config | 4-6h
```

**C2-story. Bổ sung infra rõ ràng vào Epic 1 — [C5]**
```
ADD ghi chú Epic 1: Stories M1.x phải bao gồm tường minh: Redis/BullMQ setup,
Turborepo config, Drizzle migration management, Sentry integration.
Re-estimate Epic 1: 24h → ~50-70h.
```

**C3-story. Thêm story cấp quyền admin vào Epic 2 — [C6 Critical]**
```
ADD vào Epic 2: M2.5 | Admin role grant: quy trình cấp/thu quyền admin
  (seed super-admin + audit log, KHÔNG self-promote) | 4h
```

**C4-story. Thêm dedup story + sửa vị trí FR9 — [Readiness gaps]**
```
ADD vào Epic 5 (Track B): M5.x | Deduplication: hash(URL+title+phoneHash),
  xử lý tin trùng đổi giá, tin trùng với listing của chính seller | 4h
ADD vào Epic 5: M5.x | News feed FE rendering (FR17 hiện thiếu story FE) | 4h
NOTE FR9: giữ ở Epic 3 nhưng tách rule-engine để Epic 5 (crawl) tái dùng — giảm coupling.
```

**C5-story. Cập nhật FR Coverage Map — đánh dấu Track A/B**
```
ADD cột "Track" vào FR Coverage Map: FR10-13,17 = Track B (blocked);
  còn lại = Track A (build ngay).
```

---

## Section 5 — Implementation Handoff (Bàn giao)

**Phân loại scope: MAJOR** (replan trước khi tạo stories — đụng cả 3 tài liệu nền tảng + tách track).

| Thay đổi | Người thực thi | Vai trò |
|---|---|---|
| Sửa PRD (A1-A4) | PM agent (`bmad-agent-pm` / John) | Cập nhật requirements + compliance section |
| Sửa Architecture (B1-B5) | Architect agent (`bmad-agent-architect` / Winston) | Thêm AD-8/AD-9, provider pattern, schema |
| Sửa Epics (C1-C5) | PM/SM | Thêm stories, re-estimate, đánh dấu track |
| **Quyết định ToS compliance (A2.1)** | **Luis (business decision)** | KHÔNG phải kỹ thuật — phải chốt trước Track B |
| **Cung cấp Xaction API docs** | **Luis** | Điều kiện mở khóa Track B |

**Success criteria:**
- [ ] PRD có section 11 Compliance; M5 đánh dấu BLOCKED
- [ ] Architecture có AD-8, AD-9, AD-3 mở rộng provider pattern
- [ ] Epics có M1.5, M2.5, dedup story; re-estimate xong
- [ ] Track A/B phân định rõ trong FR Coverage Map
- [ ] Luis chốt quyết định ToS + cung cấp API docs (gate Track B)

**Bước tiếp theo sau khi proposal được duyệt:**
1. Áp dụng các edit A/B/C vào 3 tài liệu (tôi có thể làm ngay, hoặc giao agent PM/Architect).
2. Chạy `bmad-create-epics-and-stories` / `bmad-create-story` cho **Track A** (M1-M4 Phase1, M6) — bắt đầu code phần an toàn.
3. Track B chờ Luis chốt 2 gate.

---

## Changelog
| Ngày | Thay đổi |
|------|----------|
| 2026-06-24 | Sprint Change Proposal v1 — tổng hợp 3 vòng review, đề xuất Hybrid (Track A build / Track B block) |
