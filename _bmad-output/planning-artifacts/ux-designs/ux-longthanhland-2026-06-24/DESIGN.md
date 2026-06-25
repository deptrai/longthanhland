---
name: bdsai.vn
description: Sàn rao vặt bất động sản AI khu vực Long Thành. shadcn/ui trên Next.js 16 + Tailwind CSS 4; DESIGN.md này chỉ định brand-layer delta. Hướng hiện đại & tối giản, tech-forward.
status: final
created: 2026-06-24
updated: 2026-06-24
sources:
  - _bmad-output/planning-artifacts/PRD-marketplace-mvp-v2.md
  - _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics.md
  - docs/bdsai/ux-design/wireframe-listing-form.md
colors:
  # Brand overrides trên shadcn defaults. Token không liệt kê kế thừa shadcn
  # (background, foreground, muted, muted-foreground, popover, card, border, input, ring, destructive).
  # Palette: hướng "hiện đại & tối giản, tech-forward" — Luis xác nhận 24/06/2026.
  primary: '#111827'          # Near-black slate — đơn sắc, tech-forward
  primary-foreground: '#FFFFFF'
  accent: '#10B981'           # Emerald — tín hiệu "verified / AI insight / trust"
  accent-foreground: '#04231A'
  primary-dark: '#F9FAFB'
  primary-foreground-dark: '#111827'
  accent-dark: '#34D399'
  accent-foreground-dark: '#04231A'
typography:
  # Body/label/muted kế thừa shadcn (Geist Sans). Chỉ override display cho "typography mạnh".
  display:
    fontFamily: 'Geist'
    fontSize: 44px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-sm:
    fontFamily: 'Geist'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.01em
rounded:
  # Hơi chặt hơn shadcn default cho cảm giác sắc, tech-forward.
  sm: 4px
  md: 8px
  lg: 12px
spacing:
  # shadcn / Tailwind defaults — không override. "Nhiều khoảng âm" đạt qua layout (generous section padding).
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  trust-badge:
    # Badge hiển thị Trust Score / verified — dùng accent
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.sm}'
  ai-insight-card:
    # Card chứa AI Summary — phân biệt nhẹ bằng accent border
    border: '{colors.accent}'
    radius: '{rounded.lg}'
  listing-card:
    background: '{colors.card}'
    radius: '{rounded.lg}'
    border: '{colors.border}'
---

## Brand & Style

bdsai.vn là sàn rao vặt bất động sản thông minh, định vị **AI-powered** cho thị trường Long Thành đang bùng nổ. Tiền đề thương hiệu: *minh bạch và đáng tin trong một thị trường đầy tin ảo*. Biểu đạt hình ảnh đi theo: bề mặt đơn sắc tĩnh lặng (gần như đen-trắng), typography mạnh dẫn dắt, và **một màu accent duy nhất (emerald) chỉ dùng cho tín hiệu tin cậy** — Trust Score, verified badge, AI insight. Emerald nghĩa là "đã được AI/hệ thống xác nhận".

bdsai.vn kế thừa shadcn/ui defaults toàn bộ. DESIGN.md này chỉ định brand-layer delta: màu primary đơn sắc, một accent emerald, display typography đậm, bo góc hơi chặt, và vài component đặc thù (trust-badge, ai-insight-card, listing-card). ~80% component ship từ shadcn (Button, Card, Dialog, Sheet, Command, Input, Select, Toast, Pagination) kế thừa nguyên specs. Tùy biến chúng là *đi ngược* kỷ luật thương hiệu.

## Colors

Palette bdsai.vn = hai màu brand-layer + shadcn defaults cho phần còn lại.

- **Primary Slate (`#111827` light / `#F9FAFB` dark)** — màu thương hiệu. Dùng cho primary button, nav active, heading mạnh, link. Thay `primary` của shadcn. Đơn sắc → cảm giác tech-forward, không phân tán.
- **Accent Emerald (`#10B981` light / `#34D399` dark)** — accent DUY NHẤT. Chỉ dùng cho tín hiệu tin cậy: Trust Score badge, verified seller, AI insight card border. KHÔNG dùng cho chrome, KHÔNG trang trí. Emerald = "đã xác nhận / đáng tin".
  - ⚠️ **CONTRAST (CRITICAL):** Emerald `#10B981` trên nền trắng chỉ đạt **2.54:1 — FAIL WCAG AA**. Vì vậy emerald CHỈ được dùng làm **background** (badge fill) hoặc **border**, TUYỆT ĐỐI KHÔNG làm màu chữ (foreground text) trên nền sáng. Text bên trong trust-badge dùng `accent-foreground` (`#04231A` trên emerald = 6.57:1 ✓). Link/label/text nhấn dùng `primary` slate, không dùng emerald. Dark accent `#34D399` trên nền sáng cũng fail — cùng quy tắc.
- **Mọi token khác** (`background`, `foreground`, `muted`, `border`, `input`, `ring`, `card`, `popover`, `destructive`) kế thừa shadcn. Không tự biện minh được lý do override thì không override.

Tránh: gradient lòe loẹt, nhiều màu accent, dùng emerald cho mục trang trí, custom destructive (dùng shadcn). Kỷ luật: hai-màu-và-dừng.

## Typography

Body / label / caption kế thừa ramp Geist Sans của shadcn. Chỉ role `display` được brand-override: **Geist 44px/700, letter-spacing chặt (-0.02em)** cho "typography mạnh". Display dùng ở: hero homepage, tiêu đề trang listing detail, section heading lớn. Phần còn lại giữ Geist Sans mặc định để dễ đọc tin BĐS dày đặc thông tin.

## Layout & Spacing

Kế thừa Tailwind spacing scale. "Nhiều khoảng âm" đạt qua **generous section padding** (py-16/py-24 trên public pages) và max-width container hẹp cho nội dung đọc. Listing grid responsive: 1 cột (mobile 360px) → 2 (tablet) → 3-4 (desktop 1440px). Admin/dashboard dùng layout dày đặc hơn (data-heavy, ít khoảng âm).

## Shapes

Bo góc hơi chặt hơn shadcn default (sm 4 / md 8 / lg 12px) → cảm giác sắc, tech. Listing card và ai-insight-card dùng `lg`; badge dùng `sm`.

## Components

Brand-specific (ngoài shadcn):
- **trust-badge** — hiển thị Trust Score (0-100) hoặc "verified", nền emerald. Dạng pill nhỏ góc ảnh bìa.
- **ai-insight-card** — chứa AI Summary, phân biệt bằng border emerald nhạt + icon AI. Nhấn mạnh đây là nội dung do AI tạo (gắn với disclaimer Section 11.3 PRD).
- **listing-card** — card tin trong grid: ảnh bìa, giá (đậm), diện tích/vị trí, trust-badge overlay.

## Do's and Don'ts

- ✅ Đơn sắc cho mọi chrome; emerald chỉ cho tín hiệu tin cậy.
- ✅ Typography đậm dẫn dắt; nhiều khoảng âm ở public pages.
- ✅ Kế thừa shadcn cho 80% component.
- ❌ Không dùng emerald trang trí, không nhiều màu, không gradient.
- ❌ **Không dùng emerald làm màu chữ trên nền sáng** (fail contrast 2.54:1) — chỉ background/border. Phản ví dụ: `text-emerald-500` cho link = SAI; dùng `text-primary` (slate).
- ❌ Không tùy biến shadcn component trừ khi có lý do thương hiệu rõ.
- ❌ Không để AI insight trông giống nội dung do người dùng nhập (phải phân biệt được — minh bạch).
