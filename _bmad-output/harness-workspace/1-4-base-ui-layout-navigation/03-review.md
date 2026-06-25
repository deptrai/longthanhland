# Code Review — Story 1.4: Base UI — layout, navigation, responsive

- **Story key:** 1-4-base-ui-layout-navigation
- **Agent:** code-reviewer (opus)
- **Ngày:** 2026-06-26
- **Verdict:** **APPROVED** (0 critical, 0 high, 2 medium, 3 low — tất cả non-blocking)

## Phương pháp review (adversarial — tự verify, KHÔNG tin dev log)

1. Đọc thật toàn bộ code mới/sửa bằng `read` tool (19 file new + 4 update).
2. `git status` verify file tồn tại (khớp dev log).
3. Tự chạy gate: `yarn build && yarn lint && yarn typecheck && yarn test` ở `bdsai/` → **PASS** (web build OK, 10 web test pass, 11 api test pass, lint/typecheck cache hit pass).
4. `grep text-emerald` trong apps/web → **0 match** (DESIGN.md compliance OK).
5. `grep 'use client'` → chỉ mobile-nav.tsx + 3 shadcn (sheet, avatar, dropdown-menu) — KHÔNG ở layout/header/footer (AD-4 OK).
6. `grep supabase|createClient` trong components/ + app/ → **0 match** (AD-1 OK).
7. `grep text-accent` (emerald làm text) → chỉ `text-accent-foreground` (dark text trên emerald bg) — KHÔNG có emerald text standalone (DESIGN.md OK).
8. Start dev server port 3100, `curl http://localhost:3100` → HTTP 200, SSR content đầy đủ: "bdsai.vn", "Trang chủ", "Tìm kiếm", "Đăng nhập", "Đăng tin", "Về chúng tôi", "© 2026", "Bỏ qua đến nội dung", "Demo loading state" (AD-4 SSR verified thật).
9. Verify `GeistSans.variable` = `--font-geist-sans` khớp `globals.css` `var(--font-geist-sans)` (AC7 font chain OK).

## Findings

### MEDIUM

#### M1 — Mobile "Đăng tin" button touch target 32px < 44px floor
- **File:** `bdsai/apps/web/components/shared/site-header.tsx:60`
- **Mô tả:** Nút "Đăng tin" hiện trên mobile (`md:hidden`) dùng `size="sm"` → `h-8` (32px). EXPERIENCE.md accessibility floor yêu cầu touch target ≥ 44px trên mobile. Hamburger (min-h/min-w 44px) và link trong Sheet (min-h-44px) đều OK, nhưng nút "Đăng tin" này là touch target duy nhất bên cạnh hamburger trên header mobile và chưa đạt floor.
- **Cách sửa:** Thêm `className="min-h-[44px]"` vào Button mobile, hoặc dùng `size="default"` (h-9=36px) + `min-h-[44px]`, hoặc tạo size mobile riêng. Ví dụ:
  ```tsx
  <Button asChild size="sm" className="min-h-[44px]">
    <Link href="/my-listings/new">Đăng tin</Link>
  </Button>
  ```
- **Severity:** MEDIUM (a11y floor, 1 button, non-blocking).

#### M2 — Nhiều `<nav>` landmark thiếu aria-label (a11y)
- **File:** `bdsai/apps/web/components/shared/site-header.tsx:34` (NavigationMenu desktop), `mobile-nav.tsx:40` (nav Sheet), `site-footer.tsx:31` (nav footer)
- **Mô tả:** Trang render 3 `<nav>` landmark (desktop NavigationMenu render `<nav>` qua Radix, mobile Sheet `<nav>`, footer `<nav>`) nhưng không có `aria-label`/`aria-labelledby`. WCAG 1.3.1 + best practice: khi có nhiều nav landmark, mỗi nav cần aria-label để screen reader phân biệt (vd "Chính", "Mobile", "Footer").
- **Cách sửa:**
  - Desktop: `<NavigationMenu aria-label="Điều hướng chính" className="hidden md:flex">`
  - Mobile: `<nav aria-label="Điều hướng mobile" className="mt-6 ...">`
  - Footer: `<nav aria-label="Liên kết footer" className="grid ...">`
- **Severity:** MEDIUM (a11y, consumer-facing site, non-blocking nhưng nên sửa trước e2e).

### LOW

#### L1 — `legacyBehavior` deprecated trên Link (Next 16)
- **File:** `bdsai/apps/web/components/shared/site-header.tsx:38`
- **Mô tả:** `<Link href={item.href} legacyBehavior passHref>` — Next 16 emit deprecation warning khi dev: "`legacyBehavior` is deprecated... codemod `npx @next/codemod@latest new-link`". Build vẫn PASS nhưng sẽ break ở Next 17. Pattern này dùng để truyền `passHref` cho `NavigationMenuLink` (Radix `<a>`).
- **Cách sửa:** Bỏ `legacyBehavior passHref`, dùng `<NavigationMenuLink asChild>` hoặc wrap trực tiếp:
  ```tsx
  <NavigationMenuItem key={item.href}>
    <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
      <Link href={item.href}>{item.label}</Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
  ```
  (Verify `NavigationMenuLink` hỗ trợ `asChild` — Radix Link accept asChild.)
- **Severity:** LOW (deprecation warning, non-blocking, future-proof).

#### L2 — `navItems` array trùng lặp (DRY)
- **File:** `bdsai/apps/web/components/shared/site-header.tsx:15-19` và `mobile-nav.tsx:17-21`
- **Mô tả:** Cùng mảng `navItems` (Trang chủ, Tìm kiếm, Đăng tin) định nghĩa 2 lần ở 2 file. Nếu thêm nav item phải sửa 2 nơi — dễ lệch.
- **Cách sửa:** Tách ra `lib/nav.ts` (hoặc `components/shared/nav-items.ts`) export `navItems`, import ở cả 2.
- **Severity:** LOW (DRY, non-blocking).

#### L3 — Dashboard/Admin layout reuse public SiteHeader (placeholder)
- **File:** `bdsai/apps/web/app/(dashboard)/layout.tsx:10`, `app/(admin)/layout.tsx:10`
- **Mô tả:** AC4 nói "(admin) — header admin + sidebar placeholder". Hiện cả 2 group đều render `<SiteHeader />` (public header) — chưa có header admin riêng. TODO đã ghi (story 2.x/2.4/2.5), placeholder hợp lý cho 1.4.
- **Cách sửa:** (defer) Story 2.x tạo `AdminHeader` / `DashboardHeader` variant. Không block 1.4.
- **Severity:** LOW (placeholder, TODO documented).

## Bảng verify AC1–AC8

| AC | Mô tả | Status | Evidence |
|----|-------|--------|----------|
| AC1 | shadcn/ui init + 6 components + deps | ✅ PASS | `components.json` (style new-york, baseColor slate, alias @/components, @/lib/utils), `lib/utils.ts` (cn helper), 6 file trong `components/ui/` (button, navigation-menu, sheet, skeleton, avatar, dropdown-menu). Deps: clsx, tailwind-merge, cva, lucide-react, @radix-ui/* trong package.json. `yarn build` PASS. |
| AC2 | Header (logo, nav, nút) responsive + hamburger→Sheet | ✅ PASS (M1) | `site-header.tsx`: logo "bdsai.vn" link /, nav desktop md+ (NavigationMenu: Trang chủ/Tìm kiếm/Đăng tin), nút Đăng nhập (ghost) + Đăng tin (default), mobile hamburger→Sheet (`mobile-nav.tsx` 'use client'). Server component (no 'use client' in header). Touch target 44px trên hamburger + sheet links (M1: nút Đăng tin mobile 32px). Skip nav link ở root layout. |
| AC3 | Footer (logo, links, copyright) responsive | ✅ PASS | `site-footer.tsx`: logo + tagline "Sàn rao vặt BĐS AI — Long Thành", 4 links (Về chúng tôi/Liên hệ/Điều khoản/Bảo mật), "© 2026 bdsai.vn", grid responsive (1 col mobile → 3 col md). Server component. |
| AC4 | Route groups (public)/(dashboard)/(admin) + layout riêng | ✅ PASS (L3) | 3 layout.tsx tồn tại. (public) render SiteHeader+main+SiteFooter. (dashboard)/(admin) render SiteHeader+sidebar placeholder+main (TODO). Root layout chỉ html/body/font/metadata, KHÔNG render header/footer. Page / trong (public). |
| AC5 | Responsive mobile-first 360→1440, không vỡ | ✅ PASS (M1) | Container `mx-auto max-w-7xl px-4`, `overflow-x: hidden` (globals.css body), nav `hidden md:flex` / hamburger `md:hidden`, touch target 44px (M1: 1 button). CSS mobile-first đúng. Verify browser thật = e2e station 4. |
| AC6 | Skeleton component + demo page / | ✅ PASS | `components/ui/skeleton.tsx` (animate-pulse pure CSS, SSR-safe). Page / có section "Demo loading state" aria-label, 3 skeleton card (h-48 + h-4 w-3/4 + h-4 w-1/2). TODO story 3.3 ghi rõ. |
| AC7 | Theme Slate+Emerald + font Geist per DESIGN.md | ✅ PASS | `globals.css` @theme: primary #111827, accent #10b981, ring #10b981, radius 0.5rem (sm 4/md 8/lg 12). Font Geist qua `geist` package, `GeistSans.variable`=`--font-geist-sans` khớp `--font-sans`. `.text-display` 44px/700/-0.02em, `.text-display-sm` 28px. Emerald CHỈ bg/border (grep text-emerald=0, text-accent standalone=0). |
| AC8 | Test tự động + không phá 1.1/1.2/1.3 | ✅ PASS | Vitest + @testing-library/react + jest-dom + jsdom cài (devDeps). `vitest.config.ts` + `tests/setup.ts`. 3 test file (site-header, site-footer, skeleton) — 10 test PASS. Script test = `vitest run`. `yarn build && lint && typecheck && test` PASS (3 package Turborepo). |

## Bảng verify invariant AD + DESIGN.md

| Invariant | Status | Evidence |
|-----------|--------|----------|
| AD-4 (SSR/SEO) | ✅ PASS | Header/footer/layout = server component (no 'use client'). 'use client' chỉ ở mobile-nav.tsx + 3 shadcn (sheet, avatar, dropdown-menu). curl localhost:3100 → HTTP 200, SSR content đầy đủ (logo, nav, footer, skip link, skeleton demo). Lighthouse gate (1.3) chưa re-run nhưng không thêm client logic vào layout. |
| AD-10 (Next API mỏng) | ✅ PASS | Layout chỉ UI shell (header/footer/nav/sidebar placeholder). Không business logic, không gọi Supabase/OpenAI/NestJS. |
| AD-1 (Module Isolation) | ✅ PASS | grep `supabase|createClient` trong components/ + app/ = 0 match. UI không gọi Supabase trực tiếp. |
| DESIGN.md — Emerald không text | ✅ PASS | grep `text-emerald` = 0. grep `text-accent` standalone = 0 (chỉ `text-accent-foreground` = dark text #04231a trên emerald bg). Accent dùng làm bg/hover-bg/ring/border. |
| DESIGN.md — Slate primary đơn sắc | ✅ PASS | primary #111827, muted/secondary slate. Dark mode skip (TODO documented). |
| DESIGN.md — Bo góc 4/8/12 | ✅ PASS | --radius 0.5rem (8px), --radius-sm calc-4px (4px), --radius-lg calc+4px (12px). |
| DESIGN.md — Font Geist | ✅ PASS | geist package, GeistSans.variable trên `<html>`, --font-sans chain. |
| Named exports (ARCH-ITECTURE-SPINE) | ✅ PASS | SiteHeader, SiteFooter, MobileNav, Skeleton, Button — toàn named export. (Root/group layout = default export — framework constraint Next App Router, đã comment rõ.) |

## Kết luận + recommendation

**Verdict: APPROVED.** Story 1.4 thỏa toàn bộ AC1–AC8, tuân invariant AD-4/AD-10/AD-1 + DESIGN.md. Gate `build && lint && typecheck && test` PASS thật (verified adversarial, không tin log). SSR verified bằng curl thật (HTTP 200, content đầy đủ). Không finding critical/high.

**Recommendation:**
- **Nên sửa trước e2e/handoff** (non-blocking nhưng tăng chất lượng): M1 (touch target nút Đăng tin mobile) + M2 (aria-label nav landmarks) — cả 2 sửa nhanh, tăng a11y.
- **Có thể defer**: L1 (legacyBehavior codemod — chạy `npx @next/codemod@latest new-link` ở story sau), L2 (tách navItems), L3 (admin header variant story 2.x).
- **E2e station 4**: verify responsive thật 360/768/1440 screenshot + Lighthouse SEO ≥ 90 (AD-4 gate). Code đã SSR-ready, dự kiến pass.
