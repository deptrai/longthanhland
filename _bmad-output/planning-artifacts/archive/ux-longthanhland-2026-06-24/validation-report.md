# Validation Report — bdsai.vn UX Spine

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md`
- **Run at:** 2026-06-24
- **Lenses:** Rubric Walker · Accessibility · Trust & Transparency

## Overall verdict

Spine pair có nền tảng vững (shadcn inheritance discipline tốt, token completeness strong, shape fit strong) nhưng 3 lens hội tụ về cùng một vùng yếu: **chưa đủ chi tiết để dev không phạm lỗi ở phần tin cậy + accessibility**. Tổng 3 critical + 8 high. Sau Reviewer Gate, **tất cả critical + high ảnh hưởng spine đã được fix** ngay trong lần finalize này; các medium/low còn lại gom vào Accessibility Floor hoặc ghi nhận cho Update sau.

Verdict gốc theo lens: Rubric ADEQUATE · Accessibility THIN · Trust & Transparency có 2 critical.

## Category verdicts (rubric)

- Flow coverage — ADEQUATE → đã thêm failure path JWT (Flow 1) ✓
- Token completeness — STRONG
- Component coverage — ADEQUATE
- State coverage — THIN → đã thêm state /inquiries, /my-listings, /listings error, APPEAL ✓
- Visual reference coverage — THIN → đã thêm inline anchor wireframe ✓
- Bloat & overspecification — STRONG
- Inheritance discipline — ADEQUATE
- Shape fit — STRONG

## Findings by severity

### Critical (3) — ĐÃ FIX

**[Accessibility] Emerald #10B981 text trên trắng fail AA (2.54:1)** (§DESIGN.md Colors)
Fix ✓: Thêm cảnh báo CRITICAL — emerald chỉ background/border, KHÔNG foreground text trên nền sáng; phản ví dụ trong Do's/Don'ts.

**[Trust] Trust Score thấp không phân biệt "thiếu data" vs "nghi ngờ gian lận"** (§EXPERIENCE Flow 2 + trust-badge)
Fix ✓: trust-badge 2 sub-state — "Chưa đủ dữ liệu" (neutral, không số) vs điểm thật (emerald + shield); tooltip giải thích phổ thông.

**[Trust] Quy trình appeal (Section 11.3) thiếu surface** (§EXPERIENCE IA)
Fix ✓: Thêm `/my-listings/[id]/appeal` + tab Appeals trong /moderation + APPEAL lifecycle.

### High (8) — ĐÃ FIX phần spine

- **[Trust] ai-insight-card thiếu phân biệt với nội dung người thật** → Fix ✓: header chip "Phân tích bởi AI", disclaimer inline, tách heading "Mô tả người bán" vs "Phân tích AI".
- **[Trust] trust-badge "72" không self-explanatory trên grid** → Fix ✓: "Tin cậy: 72" + icon shield + tooltip.
- **[A11y] Multi-step form thiếu focus management** → Fix ✓: focus heading bước mới / first error field (Component Patterns + Accessibility Floor).
- **[A11y] Filter drawer mobile thiếu focus trap** → Fix ✓: dùng Radix Sheet mặc định, không override onOpenAutoFocus.
- **[A11y] trust-badge tooltip chỉ hover** → Fix ✓: thêm keyboard focus trigger.
- **[A11y] ai-insight-card + status banner thiếu aria-live** → Fix ✓: aria-live=polite.
- **[Rubric] Flow 1 thiếu failure path JWT expire** → Fix ✓: thêm failure beat.
- **[Rubric] /inquiries thiếu state definitions** → Fix ✓: empty/loading/error/loaded.

### Medium (6) — gom vào Accessibility Floor / ghi nhận

- Form aria-invalid/aria-describedby, lỗi không chỉ màu → Fix ✓ (Accessibility Floor).
- Upload drag-drop thiếu keyboard alternative → Fix ✓ (Accessibility Floor).
- Touch target 44px → Fix ✓ (Accessibility Floor).
- ai-insight-card border value chưa commit opacity → NOTE: dùng full emerald border, không tint (đã rõ ở frontmatter).
- Visual row multi-step-form/filter-bar trong DESIGN.md → ghi nhận, behavioral đã đủ cho dev (Update sau nếu cần).
- Imported listing PII spec (Track B) → ghi nhận, làm khi gỡ gate.

### Low (4) — ghi nhận

- Skip nav link + `<html lang="vi">` → Fix ✓ (Accessibility Floor).
- Microcopy disclaimer hơi kỹ thuật → ghi nhận, tinh chỉnh khi viết content thật.
- Dark accent #34D399 trên sáng cũng fail → Fix ✓ (ghi trong cảnh báo Colors).
- Seller dashboard "hành trình tăng điểm" → ghi nhận M1 (sprint sau).

## Reviewer files
- `review-rubric.md`
- `review-accessibility.md`
- `review-trust-transparency.md`
