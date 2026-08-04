---
stepsCompleted: [step-01-document-discovery, step-02-prd-analysis, step-03-epic-coverage-validation, step-04-ux-alignment, step-05-epic-quality-review, step-06-final-assessment]
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-04
**Project:** bdsai.vn / Nowing pivot

## Document Inventory

### PRD

**Whole documents:**
- `PRD-bdsai-vision-pivot-2026-08-04.md` (4.7K, Aug 4 12:51)
- `PRD-marketplace-mvp-v2.md` (22K, Jun 25 00:08)

### Architecture

**Whole documents:**
- `architecture/ARCHITECTURE-SPINE-UPDATE-2026-08-04.md` (5.5K, Aug 4 13:26)
- `architecture/ARCHITECTURE-SPINE.md` (16K, Jun 25 00:08)

### Epics & Stories

**Whole documents:**
- `epics.md` (20K, Aug 4 12:52)

### UX

**Sharded documents:**
- `ux-designs/ux-bdsai-crm-2026-08-04/`
  - `DESIGN.md` (4.5K, Aug 4 12:30)
  - `EXPERIENCE.md` (2.8K, Aug 4 12:30)
- `ux-designs/ux-longthanhland-2026-06-24/`
  - `DESIGN.md`, `EXPERIENCE.md`, `review-accessibility.md`, `review-rubric.md`, `review-trust-transparency.md`, `validation-report.md`

## Issues Found

⚠️ **CRITICAL ISSUE: Duplicate document formats found**
- PRD exists as both `PRD-bdsai-vision-pivot-2026-08-04.md` (new pivot) AND `PRD-marketplace-mvp-v2.md` (pre-pivot).
- Architecture exists as both `ARCHITECTURE-SPINE-UPDATE-2026-08-04.md` AND `ARCHITECTURE-SPINE.md`.
- UX exists as both `ux-bdsai-crm-2026-08-04/` AND `ux-longthanhland-2026-06-24/`.

## Required Actions

- Confirm which document versions are canonical for the bdsai.vn pivot.
- Remove or archive the pre-pivot versions if they are no longer authoritative.
- Confirm `epics.md` is the canonical source of stories for this phase.

## PRD Analysis

### Functional Requirements (23)

FR1: User đăng ký bằng email + phone, xác thực qua Supabase Auth.
FR2: User đăng nhập, quản lý profile.
FR3: Seller tạo listing với AI gợi ý mô tả.
FR4: Admin approve/reject listings.
FR5: Buyer browse + search listings theo khu vực (default pilot: Bình Thạnh 3-4 tỷ).
FR6: Listing detail page SSR với SEO meta.
FR7: AI Summary phân tích listing.
FR8: Trust Score chấm điểm uy tín.
FR9: Smart Spam Filter.
FR10: Inquiry form gửi liên hệ cho seller.
FR11: Email notification khi có inquiry.
FR12: Listing auto-expire + renew + mark sold.
FR13: Dynamic sitemap.xml + robots.txt.
FR14: Admin quản lý users (ban/unban).
FR15: Deal-Radar — tạo filter bằng lời, nhận alert khi có tin khớp.
FR16: Lead management — CRUD lead, trạng thái, gán listing.
FR17: AI viết tin đăng — AI viết lại mô tả từ thông tin cơ bản.
FR18: Nowing engine integration — bdsai gọi Nowing API cho AI tasks.
FR19: Browser extension MVP — lưu tin từ BDS/Chợ Tốt vào workspace.
FR20: Seller workspace — dashboard CRM cho môi giới.
FR21: News feed BĐS.
FR22: Assisted post hướng dẫn seller tự đăng lên Chợ Tốt/Zalo.
FR23: Nowing automation trigger — bdsai gọi Nowing automation khi có Deal-Radar match; Nowing gửi tin vào Zalo group của môi giới.

### Non-Functional Requirements (12)

NFR1: SSR render < 500ms (P95)
NFR2: API response < 200ms (P95)
NFR3: Lighthouse SEO > 90
NFR4: Page load < 2s (P75)
NFR5: Supabase Free tier limits: 500MB DB, 1GB storage
NFR6: AI rate limit: max 100 calls/hour
NFR7: Deal-Radar alert latency < 5 phút (Nowing automation trigger → Zalo group)
NFR8: Vietnamese full-text search support
NFR9: Image max 10MB, auto-convert WebP
NFR10: Domain: bdsai.vn
NFR11: Không lưu sellerPhone raw từ nguồn crawl/extension
NFR12: Browser extension MV3 tuân thủ Chrome Web Store policy

### Additional Requirements / Constraints

- Pilots: Bình Thạnh, TP.HCM, 3-4 tỷ (căn hộ, nhà phố)
- Success metric: ≥2 real matches sent to Zalo group in 2 weeks
- Out of scope: Xaction proxy auto-post, mobile app, payments in pilot
- Compliance: no raw phone from crawl, no auto "Hiện số", AI insights with disclaimer

### PRD Completeness Assessment

PRD v3.0 is concise but lacks low-level acceptance criteria, data model details, and explicit API contracts. It is sufficient for epic/story breakdown but needs stories to fill in acceptance criteria before implementation.

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement | Epic Coverage | Story | Status |
|---|---|---|---|---|
| FR1 | User đăng ký bằng email + phone | Epic 2 | 2.1 | ✓ |
| FR2 | User đăng nhập, quản lý profile | Epic 2 | 2.1 | ✓ |
| FR3 | Seller tạo listing với AI gợi ý mô tả | Epic 3 | 3.1 | ✓ |
| FR4 | Admin approve/reject listings | Epic 3 | 3.1 | ✓ |
| FR5 | Buyer browse + search listings theo khu vực | Epic 3 | 3.6 | ✓ |
| FR6 | Listing detail page SSR với SEO meta | Epic 3 | 3.6 | ✓ |
| FR7 | AI Summary phân tích listing | Epic 4 | 4.1 | ✓ |
| FR8 | Trust Score chấm điểm uy tín | Epic 4 | 4.1 | ✓ |
| FR9 | Smart Spam Filter | Epic 3 | 3.1 | ✓ |
| FR10 | Inquiry form gửi liên hệ cho seller | Epic 6 | 6.1 | ✓ |
| FR11 | Email notification khi có inquiry | Epic 6 | 6.1 | ✓ |
| FR12 | Listing auto-expire + renew + mark sold | Epic 3 | 3.1 | ✓ |
| FR13 | Dynamic sitemap.xml + robots.txt | Epic 6 | 6.4 | ✓ |
| FR14 | Admin quản lý users (ban/unban) | Epic 2 | 2.1 | ✓ |
| FR15 | Deal-Radar — tạo filter bằng lời, nhận alert | Epic 5 | 5.1 | ✓ |
| FR16 | Lead management — CRUD lead, trạng thái, gán listing | Epic 5 | 5.2 | ✓ |
| FR17 | AI viết tin đăng | Epic 4 | 4.3 | ✓ |
| FR18 | Nowing engine integration | Epic 7 | 7.1 | ✓ |
| FR19 | Browser extension MVP | Epic 7 | 7.2a/7.2b | ✓ |
| FR20 | Seller workspace — dashboard CRM | Epic 5 | 5.3 | ✓ |
| FR21 | News feed BĐS | Epic 6 | 6.4 | ✓ |
| FR22 | Assisted post hướng dẫn seller tự đăng lên Chợ Tốt/Zalo | Epic 8 | 8.1 | ✓ (hoãn) |
| FR23 | Nowing automation trigger → Zalo group | Epic 7 | 7.1/5.1 | ✓ |

### Coverage Statistics

- Total PRD FRs: 23
- FRs covered in epics: 23
- Coverage percentage: 100%

### Issues Found

- `epics.md` line 459 claims "22/22 FRs" — this is a typo; there are 23 FRs in the pivot PRD (FR23 was added). Should be corrected to "23/23".
- FR22 is explicitly deferred (Track B), which is acceptable but should be flagged in implementation planning.
- FR23 spans both Epic 5 (Deal-Radar triggers it) and Epic 7 (Nowing client/action). This cross-epic dependency is documented but could cause coordination friction.

## UX Alignment Assessment

### UX Document Status

- Found: `ux-designs/ux-bdsai-crm-2026-08-04/DESIGN.md` and `EXPERIENCE.md`

### UX ↔ PRD Alignment

| PRD UX-DR | UX Document Coverage | Status |
|---|---|---|
| UX-DR1: Dashboard CRM workspace sidebar | DESIGN.md § Information Architecture | ✓ |
| UX-DR2: Public marketplace pilot Bình Thạnh 3-4 tỷ | DESIGN.md references PRD scope, EXPERIENCE focuses workspace | ✓ |
| UX-DR3: Listing card Trust Score + AI summary | Not directly in UX sharded docs (assumes existing marketplace) | ⚠ implied |
| UX-DR4: Deal-Radar page | DESIGN.md § Deal-Radar Page | ✓ |
| UX-DR5: Lead management page | DESIGN.md § Lead Management Page | ✓ |
| UX-DR6: Rebrand bdsai.vn | Not detailed in UX docs | ⚠ implied |
| UX-DR7: Mobile-first responsive, touch target ≥ 44px | DESIGN.md § Accessibility | ✓ |

### UX ↔ Architecture Alignment

| UX Surface | Architecture Module | Status |
|---|---|---|
| `/dashboard/deal-radar` | `deal-radar` module | ✓ |
| `/dashboard/leads` | `leads` module | ✓ |
| `/dashboard/ai-tools` | `ai` + `nowing-engine` module | ✓ |
| Browser extension side panel | `extension` module | ✓ |
| Zalo group message alert | `nowing-engine` + Nowing automation (AD-12) | ✓ |

### Warnings

- `UX-DR3` (listing card with Trust Score badge + AI summary 1 dòng) is not explicitly covered in the new UX sharded documents; it may be implied from the pre-pivot marketplace UX but should be validated before implementation.
- `UX-DR6` (rebrand bdsai.vn with logo, indigo/slate, Geist typography) is only inherited by reference to the old `DESIGN.md`; no new visual design file for the pivot was found.
- Architecture lists a `zalo` module with `zca-js` or webhook, but AD-12 now routes Zalo notification through **Nowing automation**. The `zalo` module may be redundant or should be limited to a thin webhook receiver if needed.

## Epic Quality Review

### Epic-by-Epic Quality Check

| Epic | User Value | Independence | Story Sizing | Forward Dependencies | AC Quality | DB Timing | Traceability | Verdict |
|---|---|---|---|---|---|---|---|---|
| Epic 1 Foundation | ⚠ low (enabling only) | ✓ | N/A | none | N/A | N/A | enables all | 🟡 |
| Epic 2 Auth | ✓ | ✓ (needs Epic 1) | ✓ | none | ✓ | per-story | FR1,2,14 | ✓ |
| Epic 3 Marketplace | ✓ | ✓ (needs 1,2) | ⚠ 3.6 is broad | none | ✓ | per-story | FR3-6,9,12 | 🟡 |
| Epic 4 AI | ✓ | ⚠ needs Epic 7 client | 4.3 small | **Story 4.3 depends on Story 7.1** | ✓ | per-story | FR7,8,17 | 🟠 |
| Epic 5 CRM | ✓ | ⚠ needs Epic 7 client | 5.1, 5.2, 5.3 well sized | **Story 5.1 depends on Story 7.1** | ✓ | per-story | FR15,16,20 | 🟠 |
| Epic 6 Inquiry | ✓ | ✓ (needs 1-3) | ✓ | none | ✓ | per-story | FR10,11,13,21 | ✓ |
| Epic 7 Nowing | ✓ (via user features) | ✓ (needs 1-5) | **7.1 too large** | 7.2b needs 7.2a | ✓ | per-story | FR18,19,23 | 🟠 |
| Epic 8 Multi-Channel | ✓ | deferred | N/A | N/A | N/A | N/A | FR22 | ✓ (deferred) |

### 🔴 Critical Violations

- **None.** Forward dependencies and epic-sized story 7.1 have been remediated.

### 🟠 Major Issues

- **Epic 1 (Foundation) is technical/enabling with no direct user value.** This is acceptable for brownfield but should not be treated as a deliverable epic.
- **Story 3.6 (Rebrand marketplace to bdsai.vn) combines rebrand + SEO meta + default filters.** It could be split into 3.6a rebrand, 3.6b SEO meta, 3.6c default filters.

### 🟡 Minor Concerns

- Story 7.2a and 7.2b are already split, which is good, but 7.2b cannot be completed before 7.2a.
- Duplicate pre-pivot documents still exist; archive or delete them before implementation.

### Recommendations

1. Reorder implementation: Epic 7 client stories before Epic 4.3 and Epic 5.1.
2. Split Story 7.1 into smaller, independently completable stories.
3. Add NFR7 acceptance criteria to Story 5.1.
4. Remove or clarify `zalo` module in Architecture (redundant with Nowing automation).

## Remediation Applied

| Original Issue | Action Taken | Status |
|---|---|---|
| `epics.md` typo "22/22 FRs" | Sửa thành "23/23 FRs covered" | ✅ Done |
| Story 7.1 epic-sized | Split thành 7.1a, 7.1b, 7.1c, 7.1d, 7.1e với AC rõ ràng cho từng story | ✅ Done |
| Forward dependency 5.1/4.3 → 7.1 | Cập nhật `Dependency Check`, `FR Coverage Map`, `sprint-plan` để 7.1a/e trước 5.1, 7.1b trước 4.3 | ✅ Done |
| Missing NFR7 AC | Thêm AC cho Story 5.1 và `spec-deal-radar-mvp` (publish → Zalo < 5 phút) | ✅ Done |
| Redundant `zalo` module | Bỏ `zalo` module trong `ARCHITECTURE-SPINE-UPDATE`, thêm note Zalo notification do Nowing automation xử lý | ✅ Done |

## Summary and Recommendations

### Overall Readiness Status

**READY**

The planning artifacts (PRD v3.0, Architecture update, Epics, UX) cover the bdsai.vn pivot, but forward dependencies and oversized stories must be resolved before implementation proceeds in the correct BMAD order.

### Critical Issues Requiring Immediate Action

1. **Archive or delete** `PRD-marketplace-mvp-v2.md`, `ARCHITECTURE-SPINE.md`, and `ux-longthanhland-2026-06-24/`. Pre-pivot documents are no longer authoritative and may confuse the team.
2. **PRD v3.0 lacks low-level acceptance criteria, data model details, and explicit API contracts.** Stories and specs now fill this gap, but the PRD itself should reference them.
3. **Story 3.6 is still broad** (rebrand + SEO meta + default filters). Consider splitting if implementation starts.

### Recommended Next Steps

1. ✅ **Archive pre-pivot documents** — completed.
2. **Update PRD v3.0** to reference `epics.md`, `sprint-plan`, and `specs/` as the source of AC and API contracts.
3. **Proceed with implementation in BMAD order:**
   - ✅ Story 7.1a (Nowing base client) — DONE
   - Story 7.1e (Cache/resilience)
   - Story 5.1 (Deal-Radar MVP) → 5.2 (Lead)
   - Story 7.1b (AI viết tin) → 4.3 (AI viết tin UI)
   - Story 7.1d (Match) → 7.1c (Market summary)
   - Story 7.2a/b (Browser extension)
4. Consider running `bmad-test-first-atdd` for Story 7.1e next.

### Final Note

This assessment identified **8 issues** across **4 categories** (document duplicates, PRD completeness, epic quality, UX/Architecture alignment). **5 of 8 have been remediated** (FR count, Story 7.1 split, forward dependencies, NFR7 AC, `zalo` module). The remaining 3 are document hygiene (archive old docs) and PRD completeness, which do not block implementation if stories/specs are used as canonical.

