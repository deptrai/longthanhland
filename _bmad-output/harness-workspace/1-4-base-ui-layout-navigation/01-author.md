# Story 1.4 — Author Log (story-author)

**Story:** 1-4-base-ui-layout-navigation
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-26
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/1-4-base-ui-layout-navigation.md` | ✅ Đã ghi (8 AC + 9 Task + Dev Notes + edge case + References [Source:]) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `1-4-base-ui-layout-navigation: ready-for-dev` (dòng 52), `last_updated: 2026-06-26` (dòng 38, đã đúng từ trước) |
| 3 | Author log | `_bmad-output/harness-workspace/1-4-base-ui-layout-navigation/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `docs/bdsai/planning/epics.md` (dòng 196-209) — Epic 1, Story 1.4 AC gốc Given/When/Then + quy ước test toàn dự án (dòng 144: Story 1.3 là CI gate, mọi story sau phải pass).
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-4 (SSR/SEO, Lighthouse gate, server components), AD-10 (layout không business logic), AD-1 (Module Isolation, UI không gọi Supabase), AD-2 (FE read-only), Stack (Next 16 + React 19 + Tailwind 4 + shadcn/ui + Geist), Structural Seed (route groups (public)/(dashboard)/(admin), components/ui, components/shared, lib/utils), Consistency Conventions (kebab-case, named exports, types over interfaces, CSS-first config).
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` — story queue: 1.1 done, 1.2 done, 1.3 done, 1.4 backlog → nâng ready-for-dev.
4. `_bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md` — port 5435x, code ở `bdsai/`, Turborepo, Node 22.22.3, yarn 4.9.2.
5. `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md` — apps/web lib/supabase read-only (client/server), build/typecheck/lint/test PASS.
6. `_bmad-output/harness-workspace/1-3-cicd-github-actions/02-dev.md` — CI gate lint+typecheck+build+test qua Turborepo, Lighthouse SEO ≥ 90 gate trên `/` + `/listings`.
7. Code thật `bdsai/apps/web/`:
   - `package.json` — Next 16.2.9, React 19.2.7, Tailwind 4.3.1 (@tailwindcss/postcss), dev port 3100, script `test: echo "no web unit tests yet"`, deps @supabase/ssr + @bdsai/shared.
   - `app/` — `layout.tsx` (root, html lang vi + metadata, KHÔNG header/footer), `globals.css` (chỉ `@import 'tailwindcss'`), `(public)/page.tsx` (homepage demo @bdsai/shared Role), `(dashboard)/.gitkeep`, `(admin)/.gitkeep`, `api/.gitkeep`. **Route groups đã tồn tại từ scaffold 1.1** (folder + .gitkeep), chỉ thiếu layout.tsx mỗi group.
   - `components/` — `ui/.gitkeep`, `shared/.gitkeep`, `listings/.gitkeep`, `promotion/.gitkeep` (toàn empty, chưa có shadcn).
   - `lib/` — `api.ts`, `supabase/{client,server,index}.ts`.
   - `next.config.ts` — transpilePackages @bdsai/shared, turbopack root.
   - `tsconfig.json` — paths `@/* → ./*`.
   - `postcss.config.mjs` — @tailwindcss/postcss (Tailwind 4 CSS-first, KHÔNG tailwind.config.js).
8. `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/DESIGN.md` — colors (primary #111827 slate, accent #10B981 emerald, contrast CRITICAL 2.54:1 — emerald chỉ bg/border), typography (Geist 44px/700 display, Geist Sans body), rounded (sm 4 / md 8 / lg 12), components (trust-badge, ai-insight-card, listing-card), brand 单 sắc tech-forward.
9. `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md` — Foundation (form-factor 360→1440, SSR public pages, shadcn/ui + Tailwind 4), IA (public/dashboard/admin + nav items), State Patterns (loading skeleton, 4 trạng thái), Accessibility Floor (skip nav, lang vi, touch target 44px, focus trap Radix default, emerald contrast), Responsive (mobile 1 cột hamburger, tablet 2, desktop 3-4).
10. `.claude/agents/story-author.md` — persona + protocol (3 output bắt buộc, tự verify trước khi kết thúc).
11. `.claude/skills/bmad-create-story/template.md` — story file template convention.
12. Story 1.3 file (`1-3-cicd-github-actions.md`) + author log — convention AC đánh số + Dev Notes + References [Source:] + output table format.

---

## Quyết định kiến trúc nhỏ (tự chốt — ghi trong story Dev Notes)

1. **shadcn/ui setup:** Story 1.1 scaffold chỉ cài Tailwind 4 (chưa shadcn). Story 1.4 cài shadcn CLI (`npx shadcn@latest init`) + 6 components (button, navigation-menu, sheet, skeleton, avatar, dropdown-menu). Style "new-york" (gần DESIGN.md tech-forward sắc). Tailwind 4 CSS-first config — shadcn init detect Tailwind 4, tạo `components.json` + update `globals.css` với CSS variables.
2. **Route groups:** `app/(public)/`, `app/(dashboard)/`, `app/(admin)/` đã tồn tại (folder + .gitkeep từ 1.1). Story 1.4 thêm `layout.tsx` mỗi group. Page `/` đã trong `(public)/page.tsx`. Root `app/layout.tsx` giữ html/body/font, KHÔNG render header/footer (route group layout quyết định shell).
3. **Header:** logo "bdsai.vn" (text, Geist đậm), nav desktop (NavigationMenu shadcn, md+), nút "Đăng nhập" + "Đăng tin". Mobile hamburger → Sheet (drawer, side left). Header = server component; MobileNav (Sheet trigger) = client component island.
4. **Footer:** logo + tagline + 4 links (Về chúng tôi, Liên hệ, Điều khoản, Bảo mật) + copyright. Responsive grid. Server component. Link page chưa tạo → Next render 404 runtime (OK, không lỗi build).
5. **Responsive:** mobile-first Tailwind (sm 640, md 768, lg 1024, xl 1280). Container `mx-auto max-w-7xl px-4`. Test 360px → 1440px. Hamburger <md, nav desktop md+.
6. **Loading/skeleton:** shadcn Skeleton (pure CSS animate-pulse, không client JS → SSR OK). Demo 3 skeleton card ở page `/` (sẵn cho `/listings` story 3.3).
7. **Font:** Geist qua package `geist` (`import { GeistSans } from 'geist/font/sans'`), áp `className={GeistSans.variable}` trên `<html>`. Next 16 KHÔNG bundle Geist mặc định → phải cài package. Display typography (44px/700) qua utility class.
8. **Theme:** Tailwind 4 CSS variables trong `globals.css` — primary #111827 (slate), accent #10B981 (emerald), kế thừa shadcn defaults. Rounded sm 4 / md 8 / lg 12. ⚠️ Emerald CHỈ background/border, KHÔNG foreground text (contrast 2.54:1 FAIL WCAG AA — DESIGN.md CRITICAL).
9. **Dark mode:** SKIP ở 1.4 (DESIGN.md đơn sắc Slate, TODO sau).
10. **Test:** Vitest + @testing-library/react + jsdom. Unit test SiteHeader/SiteFooter/Skeleton render. `apps/web` script `test` đổi từ echo → `vitest run`. KHÔNG có Storybook ở 1.4. Visual/responsive test = e2e browser thật (trạm 4 harness).
11. **Named exports:** theo ARCHITECTURE-SPINE Consistency — components dùng named export, KHÔNG default export.

---

## AC tóm tắt (8 AC)

- AC1: shadcn/ui cài đặt + init + 6 components (button, navigation-menu, sheet, skeleton, avatar, dropdown-menu)
- AC2: Header component (logo bdsai.vn, nav, nút đăng nhập/đăng tin) — responsive, mobile hamburger → Sheet
- AC3: Footer component (logo, links, copyright) — responsive
- AC4: Route groups (public)/(dashboard)/(admin) + layout riêng mỗi group, page `/` trong (public)
- AC5: Layout responsive mobile-first, không vỡ 360px → 1440px (verify browser thật e2e)
- AC6: Loading/skeleton component + demo ở page `/` (sẵn cho SSR page sau)
- AC7: Theme Tailwind (Slate primary + Emerald accent) + font Geist per DESIGN.md
- AC8: Test tự động (unit test component render) + không phá 1.1/1.2/1.3 build/lint/typecheck/test

---

## Edge case nêu trong story

- Mobile 360px: nav không vỡ, hamburger hoạt động, logo không tràn, touch target ≥ 44px
- Desktop 1440px: max-width container, nav đầy đủ, không quá rộng
- Route group (admin)/(dashboard) chưa có page → layout vẫn render (placeholder)
- Dark mode: skip ở 1.4 (TODO sau)
- Font Geist: Next 16 không bundle mặc định → cài package `geist`, fallback next/font/google
- shadcn CLI + Tailwind 4: CSS-first config, không tailwind.config.js
- Link footer page chưa tạo → Next 404 runtime (OK, không lỗi build)
- Sheet focus trap: Radix default, không override onOpenAutoFocus
- Lighthouse SEO `/` ≥ 90: header/footer SSR, skeleton pure CSS
- Vitest + Next 16: jsdom, @vitejs/plugin-react, server component stateless OK
- Turborepo test task: web test đổi sang vitest run, verify cả 3 package pass

---

## Handoff tới story-developer

**Story 1.4 ready-for-dev.** File tại `_bmad-output/implementation-artifacts/1-4-base-ui-layout-navigation.md`.

Developer cần lưu ý:
- Đọc kỹ section "Trạng thái từ Story 1.1 + 1.2 + 1.3" — KHÔNG làm lại scaffold/Supabase/CI. Route groups đã tồn tại (folder + .gitkeep), chỉ thêm layout.tsx mỗi group.
- shadcn/ui CLI + Tailwind 4 CSS-first: `npx shadcn@latest init` detect Tailwind 4, KHÔNG tạo tailwind.config.js. Style "new-york".
- Font Geist: cài package `geist` (Next 16 không bundle mặc định).
- Header = server component, MobileNav (Sheet) = client component island. Footer = server component. AD-4 SSR.
- Emerald CHỈ background/border, KHÔNG foreground text (contrast FAIL WCAG AA — DESIGN.md CRITICAL).
- Test: Vitest + RTL + jsdom. `apps/web` script `test` đổi sang `vitest run`. Verify `yarn build/lint/typecheck/test` PASS cả 3 package (CI gate 1.3).
- Responsive verify = e2e browser thật (trạm 4 harness) screenshot 360 + 768 + 1440.
- KHÔNG tạo page nghiệp vụ (listings/auth/dashboard pages) — ngoài scope 1.4 (chỉ layout shell + demo).
- KHÔNG đụng Track B (components/promotion/.gitkeep giữ nguyên).
- Tuân thủ AD-4 (SSR, Lighthouse ≥ 90), AD-10 (layout không business logic), AD-1 (UI không gọi Supabase), AD-2 (FE read-only).

Baseline commit: developer ghi vào story file header khi bắt đầu dev.

Exit code: 0
