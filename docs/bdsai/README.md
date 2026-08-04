# bdsai.vn — Sàn Rao Vặt Bất Động Sản AI

## Cấu Trúc Tài Liệu

```
docs/bdsai/
├── planning/          # PRD, phân tích, roadmap
├── architecture/      # Kiến trúc hệ thống
├── stories/           # User stories cho development
└── ux-design/         # Wireframes, mockups, flows
```

## Tài Liệu Hiện Có

| File | Mô tả | Status |
|------|--------|--------|
| `planning/prd-mvp-v2.md` | PRD v2.1 — Vision Lock 2026-08-04 applied; Phase 0 Zalo pilot + Phase 1 marketplace | READY |
| `architecture/ARCHITECTURE-SPINE.md` | Architecture Spine — Mode 0 pilot + Mode 1 product; 12 invariants AD-1→AD-12 | READY |
| `ux-design/wireframe-listing-form.md` | Wireframe low-fi multi-step form (M3.2) | POST-PILOT |
| `ux-designs/ux-longthanhland-2026-06-24/` | UX Spec đầy đủ — DESIGN.md + EXPERIENCE.md (post-pilot reference) | FINAL |

> **Trạng thái sau pivot (04/08):** Phase 0 (P0/P1) ✅ ACTIVE — 2 tuần pilot Zalo demand-first. Phase 1 (M1-M6) 🔴 DEFERRED — chỉ mở khóa sau pilot xanh. Track B (M5 Xaction + Trust Score Phase 2) vẫn BLOCKED. Xem `_bmad-output/planning-artifacts/sprint-change-proposal-2026-08-04-bdsai-nowing-pivot.md`.

## Tổng Quan Dự Án

- **Domain**: bdsai.vn
- **Stack (Phase 0 pilot)**: Zalo burner + zca-js + Node.js script + Nowing engine API
- **Stack (Phase 1)**: NestJS 11 + Next.js 16 + Supabase + Nowing engine API + Xaction API (mở khóa sau pilot xanh)
- **Scope MVP**: Sàn rao vặt BĐS AI với quảng bá đa kênh
- **Timeline**: 2 tuần pilot Zalo → mở Phase 1 nếu XANH
- **8 Epics**: P0 (Demand Validation) → P1 (Nowing Engine Integration) → M1-M6 (mở khóa sau pilot xanh)

## Tài Liệu Cần Tạo

- [x] Architecture document — `architecture/ARCHITECTURE-SPINE.md`
- [x] PRD v2.1 — `planning/prd-mvp-v2.md`
- [x] Epics P0/P1 + M1-M6 deferred — `planning/epics.md`
- [ ] Implementation stories + tracker CSV cho P0/P1 — **bước tiếp theo**
- [ ] Xác định Nowing API endpoint cho matching/automation (P1.1)
- [ ] Zalo burner account + zca-js setup
- [ ] User stories Track A (M1-M4 Phase1, M6) — **deferred đến sau pilot xanh**
- [~] UX wireframes — wireframe form (post-pilot) + UX Spec đầy đủ (post-pilot)
- [ ] Xaction API integration spec (chờ docs từ Luis — gate Track B)
- [ ] Quyết định ToS compliance (Luis — gate Track B)

## Archive

Tài liệu phiên bản cũ (Twenty CRM approach) được lưu tại `docs/archive/`.

---

**Cập nhật**: 04/08/2026
