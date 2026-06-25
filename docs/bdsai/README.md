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
| `planning/prd-mvp-v2.md` | PRD v2.0 — MVP Marketplace (+ Section 11 Compliance) | READY |
| `architecture/ARCHITECTURE-SPINE.md` | Architecture Spine — 10 invariants AD-1→AD-10 | READY |
| `ux-design/wireframe-listing-form.md` | Wireframe low-fi multi-step form (M3.2) | READY |
| `ux-designs/ux-longthanhland-2026-06-24/` | UX Spec đầy đủ — DESIGN.md + EXPERIENCE.md (validated) | FINAL |

> **Trạng thái sau review (24/06):** Track A (M1-M4 Phase1, M6) ✅ READY để tạo story. Track B (M5 Xaction + Trust Score Phase 2) 🔴 BLOCKED — chờ Xaction API docs + quyết định ToS compliance. Xem `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-24.md` và `implementation-readiness-report-2026-06-24-v2.md`.

## Tổng Quan Dự Án

- **Domain**: bdsai.vn
- **Stack**: NestJS 11 + Next.js 16 + Supabase + Xaction API
- **Scope MVP**: Sàn rao vặt BĐS AI với quảng bá đa kênh
- **Timeline**: 11 tuần (2 devs)
- **6 Epics**: Foundation → Users → Listings → AI → Xaction → SEO

## Tài Liệu Cần Tạo

- [x] Architecture document — `architecture/ARCHITECTURE-SPINE.md`
- [ ] User stories Track A (M1-M4 Phase1, M6) — **bước tiếp theo**
- [~] UX wireframes — wireframe form + UX Spec đầy đủ (DESIGN.md + EXPERIENCE.md, validated 3 lens)
- [ ] Xaction API integration spec (chờ docs từ Luis — gate Track B)
- [ ] Quyết định ToS compliance (Luis — gate Track B)

## Archive

Tài liệu phiên bản cũ (Twenty CRM approach) được lưu tại `docs/archive/`.

---

**Cập nhật**: 22/06/2026
