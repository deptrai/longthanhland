# Story 1.4 — Dev Log

| Field | Value |
|-------|-------|
| Story key | `1-4-base-ui-layout-navigation` |
| Agent | story-developer (opus) |
| Ngày | 2026-06-26 |
| Kết quả | **PASS** (8/8 AC, build+lint+typecheck+test PASS, dev server HTTP 200) |
| Baseline commit | `ca6a2826cf` (production, Story 1.3 HEAD) |
| Status | `ready-for-dev` → `in-progress` → `review` |

## Tóm tắt

Implement Story 1.4 — Base UI layout, navigation, responsive cho `apps/web` (Next 16 + React 19 + Tailwind 4 CSS-first). Cài shadcn/ui (manual, Tailwind 4-compatible), 6 components, header/footer/mobile-nav, 3 route group layouts, theme Slate+Emerald, font Geist, skeleton demo, Vitest+RTL unit test. Không phá 1.1/1.2/1.3 (api 11/11 test vẫn pass).

## File tạo/sửa

### NEW (15 file)
- `bdsai/apps/web/components.json` — shadcn config (new-york style, slate base, alias @/components, @/lib/utils)
- `bdsai/apps/web/lib/utils.ts` — `cn` helper (clsx + tailwind-merge)
- `bdsai/apps/web/components/ui/button.tsx` — shadcn Button (cva variants)
- `bdsai/apps/web/components/ui/navigation-menu.tsx` — shadcn NavigationMenu (Radix)
- `bdsai/apps/web/components/ui/sheet.tsx` — shadcn Sheet (Radix Dialog, client)
- `bdsai/apps/web/components/ui/skeleton.tsx` — shadcn Skeleton (pure CSS animate-pulse)
- `bdsai/apps/web/components/ui/avatar.tsx` — shadcn Avatar (Radix, client)
- `bdsai/apps/web/components/ui/dropdown-menu.tsx` — shadcn DropdownMenu (Radix, client)
- `bdsai/apps/web/components/shared/site-header.tsx` — Header (server component, AD-4)
- `bdsai/apps/web/components/shared/mobile-nav.tsx` — Mobile nav Sheet (client island)
- `bdsai/apps/web/components/shared/site-footer.tsx` — Footer (server component)
- `bdsai/apps/web/app/(public)/layout.tsx` — public shell (header + main + footer)
- `bdsai/apps/web/app/(dashboard)/layout.tsx` — dashboard shell (header + sidebar placeholder)
- `bdsai/apps/web/app/(admin)/layout.tsx` — admin shell (header + sidebar placeholder)
- `bdsai/apps/web/vitest.config.ts` — Vitest config (jsdom, @vitejs/plugin-react, alias @)
- `bdsai/apps/web/tests/setup.ts` — test setup (jest-dom matchers)
- `bdsai/apps/web/tests/site-header.test.tsx` — 4 unit test (logo, nav, đăng nhập, hamburger)
- `bdsai/apps/web/tests/site-footer.test.tsx` — 4 unit test (logo, tagline, links, copyright)
- `bdsai/apps/web/tests/skeleton.test.tsx` — 2 unit test (animate-pulse, custom className)

### UPDATE (4 file)
- `bdsai/apps/web/app/globals.css` — Tailwind 4 @theme (Slate primary #111827 + Emerald accent #10B981 + Geist font var + rounded sm4/md8/lg12) + display typography utilities + overflow-x hidden
- `bdsai/apps/web/app/layout.tsx` — Geist font (GeistSans.variable), skip nav link, metadata, giữ `<html lang="vi">`
- `bdsai/apps/web/app/(public)/page.tsx` — hero (.text-display) + skeleton demo section (3 card) + giữ @bdsai/shared Role proof
- `bdsai/apps/web/package.json` — script `test: vitest run` (thay echo) + deps (geist, clsx, tailwind-merge, cva, lucide-react, @radix-ui/*) + devDeps (vitest, @testing-library/*, jsdom, @vitejs/plugin-react, vite)

## Quyết định kỹ thuật

1. **shadcn/ui manual (không CLI):** Tailwind 4 CSS-first + Next 16 — tạo components manual (copy shadcn new-york style + adapt Tailwind 4 @theme). Đáng tin cậy hơn CLI có thể fail trên Tailwind 4. Components dùng CSS variables từ globals.css @theme.
2. **Root layout default export:** Next.js App Router yêu cầu root layout/page default export (framework constraint). Named exports chỉ áp dụng cho components (site-header, site-footer, mobile-nav, ui/*) — tuân thủ ARCHITECTURE-SPINE Consistency.
3. **Geist font:** package `geist`, `import { GeistSans } from 'geist/font/sans'`, CSS var `--font-geist-sans` → map vào `--font-sans` trong @theme. Build PASS.
4. **Emerald accent:** CHỈ dùng làm `--color-accent` (bg/border cho hover states, ring). KHÔNG dùng cho text foreground (contrast 2.54:1 FAIL WCAG AA — DESIGN.md CRITICAL). `--color-accent-foreground: #04231a` (dark green trên emerald bg).
5. **MobileNav client island:** SiteHeader = server component (SSR), MobileNav (Sheet) = `'use client'`. AD-4 tuân thủ — layout SSR-able, client interactivity chỉ qua island.
6. **Dark mode SKIP:** globals.css ghi TODO. Chỉ light theme (DESIGN.md đơn sắc Slate).
7. **Vitest + jsdom:** server components render OK trong jsdom (stateless, không async data fetch trong 1.4). 10 test PASS.

## Lệnh đã chạy + output thật

### 1. Typecheck (web)
```
$ cd bdsai/apps/web && yarn typecheck
Exit code: 0  (PASS)
```

### 2. Test (web)
```
$ cd bdsai/apps/web && yarn test
 RUN  v4.1.9
 ✓ tests/skeleton.test.tsx (2 tests) 17ms
 ✓ tests/site-footer.test.tsx (4 tests) 99ms
 ✓ tests/site-header.test.tsx (4 tests) 126ms
 Test Files  3 passed (3)
      Tests  10 passed (10)
 Exit code: 0  (PASS)
```

### 3. Lint (web)
```
$ cd bdsai/apps/web && yarn lint
Exit code: 0  (PASS)
```

### 4. Build (web)
```
$ cd bdsai/apps/web && yarn build
▲ Next.js 16.2.9 (Turbopack)
✓ Compiled successfully in 2.2s
✓ Finished TypeScript in 2.4s
✓ Collecting page data using 4 workers in 296ms
✓ Generating static pages using 4 workers (3/3) in 278ms
Route (app)
┌ ○ /
└ ○ /_not-found
○  (Static)  prerendered as static content
Exit code: 0  (PASS)
```

### 5. Full turbo verify (bdsai/ — cả 3 package)
```
$ yarn build   → Tasks: 3 successful, 3 total  (PASS)
$ yarn lint    → Tasks: 4 successful, 4 total  (PASS)
$ yarn typecheck → Tasks: 4 successful, 4 total  (PASS)
$ yarn test    → Tasks: 3 successful, 3 total  (PASS)
  @bdsai/web:test:  3 files, 10 tests passed
  @bdsai/api:test:  2 suites, 11 tests passed  (không phá 1.2)
```

### 6. Dev server + curl (port 3100)
```
$ yarn dev (apps/web, port 3100)
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3100
200  (PASS)

SSR render check (HTML có nội dung server-rendered):
$ curl -s http://localhost:3100 | grep -oE "(Trang chủ|Tìm kiếm|Đăng nhập|© 2026 bdsai.vn|Demo loading state)"
Demo loading state
Trang chủ
Tìm kiếm
© 2026 bdsai.vn
Đăng nhập

Responsive classes present in HTML:
max-w-7xl (6), md:hidden (3), hidden md:flex (2), min-h-[44px] (9),
grid-cols-1 (4), sm:grid-cols-2 (2), lg:grid-cols-3 (2), text-display (4), animate-pulse (20)

CSS compiled (theme + overflow):
$ curl -s .../_1h2avyo._.css | grep -oE '...'
--color-accent:  --color-primary:  .text-display  animate-pulse  font-geist-sans  overflow-x: hidden
```

## AC thỏa (8/8)

| AC | Mô tả | Status |
|----|-------|--------|
| AC1 | shadcn/ui cài + init + 6 components (button, navigation-menu, sheet, skeleton, avatar, dropdown-menu) + lib/utils.ts + components.json | ✅ |
| AC2 | Header (logo, nav desktop, nút đăng nhập/đăng tin, mobile hamburger → Sheet) — server component + client island | ✅ |
| AC3 | Footer (logo, tagline, 4 links, copyright) — responsive, server component | ✅ |
| AC4 | Route groups (public)/(dashboard)/(admin) + layout riêng mỗi group, root layout giữ html/body/font | ✅ |
| AC5 | Layout responsive mobile-first (max-w-7xl, md breakpoints, overflow-x hidden, touch target 44px) — CSS verify 360→1440 | ✅ |
| AC6 | Skeleton component + demo 3 card ở page `/` (pure CSS animate-pulse, SSR-safe) | ✅ |
| AC7 | Theme Tailwind Slate+Emerald + font Geist + display typography + rounded tokens | ✅ |
| AC8 | Test tự động (Vitest+RTL, 10 test) + không phá 1.1/1.2/1.3 (api 11/11 pass) | ✅ |

## Bảo mật / Invariant

- **AD-4 (SSR):** Header/footer/layout = server component. MobileNav = client island. curl HTML có nội dung SSR (nav, footer, skeleton). ✅
- **AD-10 (Next API Boundary):** Layout KHÔNG chứa business logic — chỉ UI shell. Không gọi Supabase/OpenAI. ✅
- **AD-1 (Module Isolation):** UI không gọi Supabase. Layout stateless. ✅
- **AD-2 (Single Data Mutation):** Layout không mutate data. ✅
- **Emerald contrast:** Emerald CHỈ dùng bg/border/ring, KHÔNG text foreground. ✅
- **Skip nav link:** có trong root layout (`#main-content`). ✅
- **Touch target ≥ 44px:** hamburger + mobile nav links `min-h-[44px]`. ✅
- **.env KHÔNG commit.** Không push. ✅

## Dọn dẹp

- Dev server đã tắt (kill shell).
- Không tạo file tạm ngoài source tree.
- `.next/` build artifact (gitignored).

## Phân biệt lỗi môi trường vs lỗi story

Không có lỗi. Tất cả verify PASS lần đầu:
- Typecheck PASS (no type error)
- Lint PASS (no eslint error)
- Build PASS (Next 16 Turbopack, 3 static pages)
- Test PASS (web 10/10, api 11/11)
- Dev server HTTP 200 + SSR content verified

Peer dep warning (`@bdsai/api` webpack/ts-loader, `@vitejs/plugin-react` vite) — non-fatal, đã resolve bằng cách add `vite` devDep. Không ảnh hưởng build/test.
