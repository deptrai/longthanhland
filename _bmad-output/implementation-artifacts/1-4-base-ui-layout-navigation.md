# Story 1.4: Base UI — layout, navigation, responsive

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **buyer hoặc seller**,
I want **một giao diện nền với header, navigation, footer responsive**,
so that **tôi có khung điều hướng nhất quán trên mọi trang, cả desktop lẫn mobile**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 1 → Story 1.4 (dòng 196-209, AC gốc Given/When/Then). AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC8. Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass".

1. **AC1 — shadcn/ui cài đặt + init + components cần thiết cho layout.** Given `apps/web` đang dùng Tailwind CSS 4.3.1 (qua `@tailwindcss/postcss`, CSS-first config trong `globals.css`) chưa có shadcn/ui (chỉ `components/ui/.gitkeep`), When chạy `npx shadcn@latest init` + `npx shadcn@latest add button navigation-menu sheet skeleton avatar dropdown-menu`, Then tạo được `components.json` (config shadcn, alias `@/components`, `@/lib/utils`), `lib/utils.ts` (helper `cn`), và 6 component shadcn trong `components/ui/` (`button.tsx`, `navigation-menu.tsx`, `sheet.tsx`, `skeleton.tsx`, `avatar.tsx`, `dropdown-menu.tsx`). Dependencies cần thêm: `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/*` (theo component). Build vẫn PASS (`yarn build` ở `bdsai/`).

2. **AC2 — Header component (logo bdsai.vn, nav, nút đăng nhập/đăng tin) — responsive, mobile hamburger → Sheet.** Given layout root render `<SiteHeader />`, When truy cập bất kỳ trang nào, Then header hiện: (a) logo "bdsai.vn" (text, font Geist đậm, link `/`), (b) nav desktop (md+): "Trang chủ" (`/`), "Tìm kiếm" (`/listings`), "Đăng tin" (`/my-listings/new`) dùng `NavigationMenu` shadcn, (c) nút "Đăng nhập" (link `/auth/login`, variant ghost) + nút "Đăng tin" (variant default, link `/my-listings/new`), (d) mobile (<md): hamburger button → mở `Sheet` (drawer) chứa nav + nút đóng. Header là server component (AD-4) trừ phần toggle Sheet (`'use client'` island). Touch target ≥ 44px (EXPERIENCE.md accessibility floor). Skip navigation link đầu trang (EXPERIENCE.md).

3. **AC3 — Footer component (logo, links, copyright) — responsive.** Given layout root render `<SiteFooter />`, When truy cập bất kỳ trang nào, Then footer hiện: (a) logo "bdsai.vn" + tagline ngắn, (b) link columns: "Về chúng tôi" (`/about`), "Liên hệ" (`/inquiry` hoặc mailto), "Điều khoản" (`/terms`), "Bảo mật" (`/privacy`) — link chưa có route thì dùng `href` tĩnh (placeholder, không lỗi 404 ở build vì Next static export chưa bật — dùng `<a>` hoặc `Link` với `href`, page chưa tạo thì Next render 404 runtime, OK cho 1.4), (c) copyright "© 2026 bdsai.vn", (d) responsive: mobile 1 cột stack, desktop grid 2-3 cột. Footer là server component (AD-4).

4. **AC4 — Route groups (public)/(dashboard)/(admin) + layout riêng mỗi group, page `/` chuyển vào (public).** Given Structural Seed chỉ định 3 route groups, When cấu trúc lại `app/`, Then: (a) `app/(public)/layout.tsx` — wrap children với `<SiteHeader />` + `<SiteFooter />` (public shell), (b) `app/(dashboard)/layout.tsx` — wrap với header + sidebar placeholder (seller dashboard shell, client-heavy allowed per EXPERIENCE.md), (c) `app/(admin)/layout.tsx` — wrap với header admin + sidebar placeholder (admin shell), (d) `app/layout.tsx` (root) giữ `<html lang="vi">` + `<body>` + font Geist + metadata, KHÔNG render header/footer (để route group layout quyết định shell), (e) page `/` hiện có (`app/(public)/page.tsx`) render trong `(public)` layout → thấy header+footer. Mỗi group layout render được kể cả khi chưa có page con (placeholder `.gitkeep` đã có từ 1.1). Root layout KHÔNG xung đột với group layout (Next App Router: root layout bọc group layout).

5. **AC5 — Layout responsive mobile-first, không vỡ 360px → 1440px.** Given layout dùng Tailwind responsive classes (mobile-first, breakpoint sm 640 / md 768 / lg 1024 / xl 1280), When mở browser ở viewport 360px (mobile nhỏ) → 1440px (desktop), Then: (a) 360px: nav hamburger hoạt động, logo không tràn, header/footer 1 cột, không scroll ngang (overflow-x hidden), touch target ≥ 44px, (b) 768px: nav desktop hiện, 2 cột, (c) 1440px: content container `max-width` (xl:max-w-7xl hoặc tương đương, không trải full width vô hạn), nav đầy đủ. Verify bằng e2e browser thật (trạm 4 harness) — screenshot ở 360 + 768 + 1440, KHÔNG vỡ. Container dùng `mx-auto max-w-7xl px-4` (DESIGN.md: max-width container hẹp cho nội dung đọc).

6. **AC6 — Loading/skeleton component + demo ở page `/` (sẵn cho SSR page sau).** Given EXPERIENCE.md State Patterns yêu cầu 4 trạng thái (Loading/Empty/Error/Loaded) cho mọi surface dữ liệu, When tạo `components/ui/skeleton.tsx` (shadcn) + demo skeleton card ở page `/`, Then: (a) `Skeleton` component render được (shadcn default — div với `animate-pulse` bg-muted), (b) page `/` hiện demo: 1 section "Skeleton demo" với 3 skeleton card (giả lập listing card loading) để sẵn cho SSR page `/listings` (story 3.3) dùng sau, (c) skeleton KHÔNG block render server-side (shadcn Skeleton là pure CSS animate, không client JS). Ghi TODO: story 3.3 thay demo bằng skeleton thật khi fetch listing.

7. **AC7 — Theme Tailwind (Slate primary + Emerald accent) + font Geist per DESIGN.md.** Given DESIGN.md chỉ định primary `#111827` (slate near-black), accent `#10B981` (emerald), font Geist, rounded sm 4 / md 8 / lg 12, When cấu hình theme, Then: (a) `globals.css` định nghĩa CSS variables cho shadcn theme (`--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`...) khớp DESIGN.md colors (Tailwind 4 CSS-first config qua `@theme` / `:root`), (b) font Geist cài qua package `geist` (`npm i geist`) + import trong root layout (`import { GeistSans } from 'geist/font/sans'`), áp `className={GeistSans.variable}` trên `<html>`, (c) display typography (Geist 44px/700, letter-spacing -0.02em) định nghĩa qua utility class hoặc CSS variable cho hero/heading lớn, (d) rounded tokens (sm 4px / md 8px / lg 12px) override shadcn default qua CSS variables. ⚠️ Emerald CHỈ dùng làm background/border, KHÔNG làm foreground text trên nền sáng (contrast 2.54:1 FAIL WCAG AA — DESIGN.md CRITICAL warning).

8. **AC8 — Test tự động (unit test component render) + không phá 1.1/1.2/1.3 build/lint/typecheck/test.** Given quy ước test toàn dự án (dòng 144) + Story 1.3 CI gate, When chạy test, Then: (a) cài Vitest + @testing-library/react + @testing-library/jest-dom + jsdom (devDependencies trong `apps/web`), (b) viết unit test cho `SiteHeader`, `SiteFooter`, `Skeleton` — verify render đúng text/logo/nav links (React Testing Library `render` + `getByText`/`getByRole`), (c) `apps/web/package.json` script `test` đổi từ `echo "no web unit tests yet"` → `vitest run`, (d) `yarn build && yarn lint && yarn typecheck && yarn test` PASS ở `bdsai/` (cả 3 package qua Turborepo, không phá 1.1/1.2/1.3). Lighthouse SEO `/` ≥ 90 vẫn pass (AD-4, header/footer SSR — không thêm client-only logic vào layout).

## Tasks / Subtasks

- [ ] **Task 1 — Cài shadcn/ui + dependencies (AC1, AC7)**
  - [ ] Chạy `npx shadcn@latest init` trong `bdsai/apps/web/` (detect Tailwind 4, tạo `components.json` với alias `@/components`, `@/lib/utils`, base color slate). Chọn style "new-york" (gần DESIGN.md tech-forward) hoặc "default" — chốt theo DESIGN.md (đơn sắc, sắc) → "new-york".
  - [ ] Cài components: `npx shadcn@latest add button navigation-menu sheet skeleton avatar dropdown-menu` → tạo 6 file trong `components/ui/` + `lib/utils.ts` + dependencies (`clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-dialog` (sheet), `@radix-ui/react-avatar`, `@radix-ui/react-dropdown-menu`).
  - [ ] Cài font: `yarn workspace @bdsai/web add geist`.
  - [ ] Verify `yarn build` PASS sau khi cài.
- [ ] **Task 2 — Cấu hình theme Tailwind 4 + font Geist (AC7)**
  - [ ] Update `app/globals.css`: định nghĩa `:root` CSS variables cho shadcn theme khớp DESIGN.md — `--primary: #111827`, `--primary-foreground: #FFFFFF`, `--accent: #10B981`, `--accent-foreground: #04231A`, kế thừa shadcn defaults cho phần còn lại (background, foreground, muted, border, card, popover, destructive). Dùng `@theme inline` (Tailwind 4) hoặc `:root` + `@layer base` tùy shadcn init output.
  - [ ] Dark mode: DESIGN.md đơn sắc Slate → **skip dark mode ở 1.4** (TODO sau). Ghi TODO trong globals.css.
  - [ ] Rounded tokens: `--radius: 0.5rem` (8px md), shadcn tính sm/lg từ `--radius`. Override: sm 4px = `calc(var(--radius) - 4px)`, lg 12px = `calc(var(--radius) + 4px)`.
  - [ ] Display typography: thêm utility class `.text-display` (Geist 44px/700, letter-spacing -0.02em) + `.text-display-sm` (28px/700, -0.01em) trong globals.css `@layer components` hoặc inline Tailwind classes.
  - [ ] Update root `app/layout.tsx`: import `GeistSans` từ `geist/font/sans`, áp `className={GeistSans.variable}` trên `<html>`, set `--font-sans` CSS variable. Giữ `<html lang="vi">`.
- [ ] **Task 3 — SiteHeader component (AC2)**
  - [ ] Tạo `components/shared/site-header.tsx` — server component (default export hoặc named export per convention — **chốt named export** theo ARCHITECTURE-SPINE Consistency: "Named exports only").
  - [ ] Logo: text "bdsai.vn" trong `<Link href="/">`, font Geist đậm, `text-primary`.
  - [ ] Nav desktop (md+): `NavigationMenu` shadcn — items "Trang chủ" (`/`), "Tìm kiếm" (`/listings`), "Đăng tin" (`/my-listings/new`). Ẩn dưới md (`hidden md:flex`).
  - [ ] Nút: "Đăng nhập" (`Button variant="ghost"` link `/auth/login`), "Đăng tin" (`Button` default link `/my-listings/new`). `hidden sm:inline-flex` cho đăng nhập, "Đăng tin" luôn hiện.
  - [ ] Mobile (<md): hamburger `Button variant="ghost" size="icon"` + `aria-label="Mở menu"` → mở `Sheet` (shadcn, side="left"). Sheet content: nav links (stack dọc) + nút đóng. Sheet trigger cần `'use client'` → tách `MobileNav` client component (`components/shared/mobile-nav.tsx`) khỏi `SiteHeader` server component.
  - [ ] Container: `mx-auto max-w-7xl px-4`, header `sticky top-0 z-40 border-b bg-background`.
  - [ ] Touch target ≥ 44px: hamburger + nav links mobile `min-h-[44px]`.
- [ ] **Task 4 — SiteFooter component (AC3)**
  - [ ] Tạo `components/shared/site-footer.tsx` — server component, named export.
  - [ ] Logo "bdsai.vn" + tagline "Sàn rao vặt BĐS AI — Long Thành".
  - [ ] Link columns: "Về chúng tôi" (`/about`), "Liên hệ" (`/inquiry`), "Điều khoản" (`/terms`), "Bảo mật" (`/privacy`). Dùng `Link` từ `next/link` (page chưa tạo → Next render 404 runtime, OK cho 1.4; KHÔNG lỗi build vì không static export).
  - [ ] Copyright "© 2026 bdsai.vn".
  - [ ] Responsive: mobile `flex flex-col gap-4`, desktop `grid grid-cols-2 md:grid-cols-3` + `max-w-7xl mx-auto px-4`.
- [ ] **Task 5 — Route group layouts (AC4)**
  - [ ] `app/(public)/layout.tsx` — render `<SiteHeader />` + `<main className="flex-1">{children}</main>` + `<SiteFooter />`. Wrap trong `min-h-screen flex flex-col`.
  - [ ] `app/(dashboard)/layout.tsx` — render header (có thể reuse SiteHeader hoặc variant) + sidebar placeholder (`<aside className="hidden md:block w-64">Dashboard nav</aside>`) + main. Ghi TODO: story 2.x thêm auth guard + nav seller thật.
  - [ ] `app/(admin)/layout.tsx` — render header admin + sidebar placeholder. Ghi TODO: story 2.4/2.5 thêm admin guard + nav admin thật.
  - [ ] Root `app/layout.tsx`: giữ `<html lang="vi" className={GeistSans.variable}>` + `<body>` + `metadata`. KHÔNG render header/footer (route group layout quyết định).
  - [ ] Page `/` (`app/(public)/page.tsx`): update nội dung — giữ demo `@bdsai/shared` Role (AC1 proof từ 1.1) + thêm skeleton demo section (AC6). Hero heading dùng `.text-display`.
- [ ] **Task 6 — Skeleton demo ở page `/` (AC6)**
  - [ ] `Skeleton` shadcn đã cài (Task 1). Tạo demo section trong `app/(public)/page.tsx`: 3 skeleton card (giả lập listing card loading) — `Skeleton className="h-48 w-full"` (ảnh) + `Skeleton className="h-4 w-3/4"` (title) + `Skeleton className="h-4 w-1/2"` (price).
  - [ ] Section heading "Demo loading state" + ghi chú TODO story 3.3 thay bằng skeleton thật.
  - [ ] Verify skeleton là pure CSS (`animate-pulse`), không client JS, SSR OK (AD-4).
- [ ] **Task 7 — Skip navigation link + accessibility (AC2, AC5)**
  - [ ] Thêm skip nav link đầu `<body>` trong root layout: `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2">Bỏ qua đến nội dung</a>`. Main content wrap `<main id="main-content">` ở group layout (hoặc root).
  - [ ] `<html lang="vi">` đã có (giữ).
  - [ ] Focus indicator rõ (shadcn default `focus-visible:ring`). Sheet focus trap = Radix default (EXPERIENCE.md: không override `onOpenAutoFocus`).
- [ ] **Task 8 — Unit test (AC8)**
  - [ ] Cài devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/dom`, `jsdom`, `@vitejs/plugin-react`. `yarn workspace @bdsai/web add -D ...`.
  - [ ] Tạo `vitest.config.ts` trong `apps/web` (environment jsdom, setup file `tests/setup.ts` import `@testing-library/jest-dom`).
  - [ ] Update `apps/web/package.json` script `test`: `"test": "vitest run"` (thay `echo "no web unit tests yet"`).
  - [ ] Viết test: `tests/site-header.test.tsx` (render SiteHeader, verify logo "bdsai.vn", nav links "Trang chủ"/"Tìm kiếm"/"Đăng tin" tồn tại), `tests/site-footer.test.tsx` (verify "© 2026 bdsai.vn", link "Về chúng tôi"), `tests/skeleton.test.tsx` (render Skeleton, verify div với animate class).
  - [ ] Verify: `yarn workspace @bdsai/web test` PASS. `yarn build && yarn lint && yarn typecheck && yarn test` PASS ở `bdsai/` (cả 3 package).
- [ ] **Task 9 — Verify responsive + Lighthouse (AC5, AC8)**
  - [ ] `yarn workspace @bdsai/web dev` (port 3100), mở browser, screenshot 360px + 768px + 1440px — verify không vỡ (handoff e2e tester trạm 4 verify thật).
  - [ ] Lighthouse SEO `/` ≥ 90 (AD-4 gate từ 1.3). Header/footer SSR, không client-only logic ở layout. Verify local `npx lighthouse http://localhost:3100 --only-categories=seo` (optional, CI gate ở 1.3 đã cover).

## Dev Notes

### Bối cảnh dự án
- Dự án **bdsai.vn** — sàn rao vặt BĐS AI Long Thành. KHÔNG phải Twenty CRM (Twenty trong `packages/twenty-*` chỉ tham khảo, KHÔNG đụng).
- Code sống ở `bdsai/apps/web/` (Next.js 16 Presentation layer). Story 1.4 thuộc Epic 1 Track A — hợp lệ, KHÔNG đụng Track B.

### Trạng thái từ Story 1.1 + 1.2 + 1.3 (KHÔNG làm lại)
- **Monorepo** `bdsai/` (Turborepo): `apps/web` (Next 16.2.9 + React 19.2.7), `apps/api` (NestJS 11), `packages/shared`. [Source: 1-1.../00-infra-decisions.md]
- **apps/web hiện tại:**
  - `package.json`: scripts `dev: next dev -p 3100`, `build: next build`, `lint: eslint .`, `typecheck: tsc --noEmit`, `test: echo "no web unit tests yet" && exit 0`. Deps: `next 16.2.9`, `react 19.2.7`, `@supabase/ssr 0.12.0`, `@supabase/supabase-js 2.108.2`, `@bdsai/shared workspace:*`. DevDeps: `tailwindcss 4.3.1`, `@tailwindcss/postcss 4.3.1`, `typescript 5.9.3`, `eslint 9.39.4`, `eslint-config-next 16.2.9`. [Source: bdsai/apps/web/package.json]
  - `app/` cấu trúc hiện tại (từ scaffold 1.1): `app/layout.tsx` (root, `<html lang="vi">` + metadata, KHÔNG header/footer), `app/globals.css` (chỉ `@import 'tailwindcss'`), `app/(public)/page.tsx` (homepage demo), `app/(dashboard)/.gitkeep`, `app/(admin)/.gitkeep`, `app/api/.gitkeep`. **Route groups đã tồn tại** (folder + .gitkeep), chỉ thiếu layout.tsx mỗi group. [Source: bdsai/apps/web/app/]
  - `components/`: `components/ui/.gitkeep`, `components/shared/.gitkeep`, `components/listings/.gitkeep`, `components/promotion/.gitkeep` — toàn empty. [Source: bdsai/apps/web/components/]
  - `lib/`: `lib/api.ts`, `lib/supabase/{client,server,index}.ts` (read-only client, AD-2/AD-5). [Source: bdsai/apps/web/lib/]
  - `next.config.ts`: `transpilePackages: ['@bdsai/shared']`, `turbopack.root = path.join(__dirname,'..','..')`. [Source: bdsai/apps/web/next.config.ts]
  - `tsconfig.json`: paths `@/* → ./*` (alias `@/components`, `@/lib`). [Source: bdsai/apps/web/tsconfig.json]
  - `postcss.config.mjs`: `@tailwindcss/postcss`. KHÔNG có `tailwind.config.js` (Tailwind 4 CSS-first). [Source: bdsai/apps/web/postcss.config.mjs]
- **Supabase local** dải port 5435x (DB 54352). Web dùng `lib/supabase/{client,server}.ts` (anon key, FE read-only). [Source: 1-2.../02-dev.md]
- **CI gate (Story 1.3):** `yarn build && yarn lint && yarn typecheck && yarn test` qua Turborepo phải PASS. Lighthouse CI gate SEO ≥ 90 trên `/` + `/listings` (post-deploy). [Source: 1-3.../02-dev.md]
- Node v22.22.3, yarn 4.9.2 (corepack). [Source: 1-1.../00-infra-decisions.md]

### Quyết định kiến trúc nhỏ (tự chốt — ghi rõ trong PR)
1. **shadcn/ui setup:** Story 1.1 scaffold chỉ cài Tailwind 4 (chưa shadcn). Story 1.4 cài shadcn CLI (`npx shadcn@latest init`) + 6 components (button, navigation-menu, sheet, skeleton, avatar, dropdown-menu). Style "new-york" (gần DESIGN.md tech-forward sắc). Tailwind 4 CSS-first config — shadcn init detect Tailwind 4, tạo `components.json` + update `globals.css` với CSS variables.
2. **Route groups:** `app/(public)/`, `app/(dashboard)/`, `app/(admin)/` đã tồn tại (folder + .gitkeep từ 1.1). Story 1.4 thêm `layout.tsx` mỗi group. Page `/` đã trong `(public)/page.tsx` (không cần chuyển). Root `app/layout.tsx` giữ html/body/font, KHÔNG render header/footer (route group layout quyết định shell).
3. **Header:** logo "bdsai.vn" (text, Geist đậm), nav desktop (NavigationMenu shadcn, md+), nút "Đăng nhập" + "Đăng tin". Mobile hamburger → Sheet (drawer, side left). Header = server component; MobileNav (Sheet trigger) = client component island (`'use client'`).
4. **Footer:** logo + tagline + 4 links (Về chúng tôi, Liên hệ, Điều khoản, Bảo mật) + copyright. Responsive grid. Server component. Link page chưa tạo → Next render 404 runtime (OK, không lỗi build).
5. **Responsive:** mobile-first Tailwind (sm 640, md 768, lg 1024, xl 1280). Container `mx-auto max-w-7xl px-4`. Test 360px → 1440px. Hamburger <md, nav desktop md+.
6. **Loading/skeleton:** shadcn Skeleton (pure CSS `animate-pulse`, không client JS → SSR OK). Demo 3 skeleton card ở page `/` (sẵn cho `/listings` story 3.3).
7. **Font:** Geist qua package `geist` (`import { GeistSans } from 'geist/font/sans'`), áp `className={GeistSans.variable}` trên `<html>`. Next 16 KHÔNG bundle Geist mặc định → phải cài package. Display typography (44px/700) qua utility class.
8. **Theme:** Tailwind 4 CSS variables trong `globals.css` — primary `#111827` (slate), accent `#10B981` (emerald), kế thừa shadcn defaults phần còn lại. Rounded sm 4 / md 8 / lg 12. ⚠️ Emerald CHỈ background/border, KHÔNG foreground text (contrast 2.54:1 FAIL WCAG AA — DESIGN.md CRITICAL).
9. **Dark mode:** SKIP ở 1.4 (DESIGN.md đơn sắc Slate, TODO sau). Ghi TODO trong globals.css.
10. **Test:** Vitest + @testing-library/react + jsdom. Unit test SiteHeader/SiteFooter/Skeleton render. `apps/web` script `test` đổi từ echo → `vitest run`. KHÔNG có Storybook ở 1.4 (TODO). Visual/responsive test = e2e browser thật (trạm 4 harness).
11. **Named exports:** theo ARCHITECTURE-SPINE Consistency ("Named exports only") — components dùng named export (`export function SiteHeader()`), KHÔNG default export.

### Invariants áp dụng (BẮT BUỘC tuân — vi phạm = review fail)
- **AD-4 (SSR Boundary):** Header/footer/layout MUST server-render (server components). Client interactivity chỉ qua `'use client'` islands (MobileNav Sheet toggle). KHÔNG client-only logic ở layout. Lighthouse SEO `/` ≥ 90 (gate từ 1.3). [Source: ARCHITECTURE-SPINE.md#AD-4]
- **AD-10 (Next API Route Boundary):** Layout KHÔNG chứa business logic — chỉ UI shell (header/footer/nav). KHÔNG gọi Supabase/OpenAI/NestJS business logic trong layout. [Source: ARCHITECTURE-SPINE.md#AD-10]
- **AD-1 (Module Isolation):** UI components KHÔNG gọi Supabase trực tiếp, chỉ qua hooks/service sau (story 2.x). Layout 1.4 không fetch data (chỉ static shell + skeleton demo). [Source: ARCHITECTURE-SPINE.md#AD-1]
- **AD-2 (Single Data Mutation Path):** Layout 1.4 không mutate data (chỉ render). Supabase client trong `lib/supabase/` là read-only (từ 1.2) — KHÔNG dùng trong layout 1.4. [Source: ARCHITECTURE-SPINE.md#AD-2]

### Consistency conventions (BẮT BUỌC) [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions]
- Files **kebab-case** (`site-header.tsx`, `mobile-nav.tsx`, `site-footer.tsx`). Components PascalCase (`SiteHeader`).
- Named exports only (KHÔNG default export).
- Types over interfaces.
- Config: theme qua CSS variables trong `globals.css` (Tailwind 4 CSS-first), KHÔNG `tailwind.config.js`.
- State (frontend): Zustand client + TanStack Query server — 1.4 chưa cần (layout stateless).

### Versions (theo stack doc + môi trường đã verify)
| Tool | Version | Ghi chú |
|---|---|---|
| Next.js | 16.2.9 | App Router, SSR [Source: apps/web/package.json] |
| React | 19.2.7 | [Source: apps/web/package.json] |
| Tailwind CSS | 4.3.1 | CSS-first config, `@tailwindcss/postcss` [Source: apps/web/package.json] |
| shadcn/ui | latest | `npx shadcn@latest init/add` [Source: ARCHITECTURE-SPINE.md#Stack] |
| Geist font | latest | package `geist` [Source: DESIGN.md#typography] |
| Vitest | latest | Unit test [Source: quy ước test dòng 144] |
| @testing-library/react | latest | Component render test |
| Node.js | 22 LTS | [Source: 1-1.../00-infra-decisions.md] |
| yarn | 4.9.2 | corepack [Source: 1-1.../00-infra-decisions.md] |
[Source: ARCHITECTURE-SPINE.md#Stack, apps/web/package.json, 1-1.../00-infra-decisions.md]

### Source tree — file sẽ tạo/sửa
**NEW (`bdsai/apps/web/`):**
- `components.json` — shadcn config (alias, base color, style)
- `lib/utils.ts` — helper `cn` (clsx + tailwind-merge)
- `components/ui/button.tsx` — shadcn Button
- `components/ui/navigation-menu.tsx` — shadcn NavigationMenu (nav desktop)
- `components/ui/sheet.tsx` — shadcn Sheet (mobile drawer)
- `components/ui/skeleton.tsx` — shadcn Skeleton (loading)
- `components/ui/avatar.tsx` — shadcn Avatar (sẵn cho user menu story 2.x)
- `components/ui/dropdown-menu.tsx` — shadcn DropdownMenu (sẵn cho user menu story 2.x)
- `components/shared/site-header.tsx` — Header (server component)
- `components/shared/mobile-nav.tsx` — Mobile nav Sheet (client component)
- `components/shared/site-footer.tsx` — Footer (server component)
- `app/(public)/layout.tsx` — public shell (header + footer)
- `app/(dashboard)/layout.tsx` — dashboard shell (header + sidebar placeholder)
- `app/(admin)/layout.tsx` — admin shell (header + sidebar placeholder)
- `vitest.config.ts` — Vitest config (jsdom)
- `tests/setup.ts` — test setup (jest-dom)
- `tests/site-header.test.tsx` — unit test header
- `tests/site-footer.test.tsx` — unit test footer
- `tests/skeleton.test.tsx` — unit test skeleton
**UPDATE:**
- `app/globals.css` — thêm CSS variables theme (primary slate, accent emerald, rounded) + display typography utilities
- `app/layout.tsx` — thêm Geist font (`GeistSans.variable`), skip nav link, giữ metadata + `<html lang="vi">`
- `app/(public)/page.tsx` — update nội dung (hero + skeleton demo section), giữ @bdsai/shared Role proof
- `apps/web/package.json` — thêm deps (geist, clsx, tailwind-merge, cva, lucide-react, @radix-ui/*) + devDeps (vitest, @testing-library/*, jsdom) + script `test: vitest run`
[Source: ARCHITECTURE-SPINE.md#Structural-Seed — `app/(public)`, `app/(dashboard)`, `app/(admin)`, `components/ui`, `components/shared`]

### Edge cases cần xử lý
- **Mobile 360px (nhỏ nhất):** nav hamburger hoạt động, logo không tràn (text logo, không SVG quá rộng), header/footer 1 cột, KHÔNG scroll ngang (`overflow-x-hidden` body). Touch target ≥ 44px (hamburger, nav links mobile). Verify screenshot 360px.
- **Desktop 1440px:** content container `max-w-7xl` (1280px) + `mx-auto` → không trải full width vô hạn. Nav đầy đủ (md+). KHÔNG quá rộng.
- **Route group (admin)/(dashboard) chưa có page:** layout vẫn render được (placeholder sidebar). `.gitkeep` đã có. Truy cập `/admin/moderation` → 404 (chưa có page, OK). Layout không lỗi khi render standalone.
- **Dark mode:** SKIP ở 1.4 (DESIGN.md đơn sắc Slate). Ghi TODO trong globals.css. shadcn theme có `--background`/`--foreground` light chỉ (không `.dark` selector) — hoặc giữ `.dark` nhưng không toggle (TODO sau).
- **Font Geist:** Next 16 KHÔNG bundle Geist mặc định → cài package `geist`. Nếu `geist` package conflict với Next 16 font API → fallback `next/font/local` hoặc `next/font/google` (Geist có trên Google Fonts). Chốt: package `geist` (`geist/font/sans`), verify build.
- **shadcn/ui CLI + Tailwind 4:** shadcn init detect Tailwind 4 (qua `@tailwindcss/postcss` trong postcss.config). Tạo `components.json` + update `globals.css` với `@theme`/CSS variables. KHÔNG tạo `tailwind.config.js` (Tailwind 4 CSS-first). Nếu shadcn CLI yêu cầu `tailwind.config.js` → dùng flag Tailwind 4 mode hoặc manual config CSS variables.
- **Link page chưa tạo (footer /about, /terms...):** dùng `next/link` `Link href="/about"`. Page chưa tồn tại → Next render 404 runtime (KHÔNG lỗi build vì không `output: export`). OK cho 1.4. TODO: story 6.x tạo page thật.
- **Sheet focus trap:** Radix Dialog (Sheet base) có focus trap mặc định — KHÔNG override `onOpenAutoFocus` (EXPERIENCE.md accessibility floor).
- **Lighthouse SEO `/`:** header/footer SSR (server component) → HTML có nội dung → SEO OK. Skeleton demo = pure CSS → không hurt SEO. Verify ≥ 90 (gate 1.3).
- **Vitest + Next 16:** Vitest cần `@vitejs/plugin-react` + jsdom environment. Next 16 App Router components (server components) test với RTL — server component render OK trong jsdom (không async data fetch trong 1.4 layout). Nếu server component cần async → mock. 1.4 layout stateless → OK.
- **Turborepo test task:** `apps/web` script `test` đổi sang `vitest run` → `yarn test` ở root chạy cả 3 package (shared + api + web). Verify turbo `test` task `dependsOn: ["^build"]` vẫn OK (web test không cần shared build? — shared build cho type, vitest dùng ts source trực tiếp). Nếu lỗi → adjust turbo config hoặc web vitest config.

### Testing standards
- Unit test (Vitest + RTL): SiteHeader, SiteFooter, Skeleton — verify render đúng text/logo/nav links.
- Responsive/visual: e2e browser thật (trạm 4 harness) — screenshot 360 + 768 + 1440, verify không vỡ.
- Lighthouse SEO `/` ≥ 90 (AD-4 gate từ 1.3).
- Story chỉ Done khi: `yarn build && yarn lint && yarn typecheck && yarn test` PASS ở `bdsai/` (cả 3 package) + e2e browser verify responsive.
- Quy ước test toàn dự án (dòng 144): Story 1.4 phải pass CI gate (1.3) trước khi Done. [Source: epics.md#Quy-ước-test]

### Project Structure Notes
- Route groups `(public)/(dashboard)/(admin)` khớp Structural Seed + EXPERIENCE.md IA. Mỗi group layout riêng → shell khác (public: header+footer; dashboard/admin: header+sidebar).
- Components trong `components/shared/` (site-header, site-footer, mobile-nav) — cross-group reusable. `components/ui/` = shadcn primitives.
- `lib/utils.ts` = shadcn `cn` helper (clsx + tailwind-merge).
- KHÔNG tạo page nghiệp vụ (listings, auth, dashboard pages) — ngoài scope 1.4 (chỉ layout shell + demo). Page `/` update nội dung demo, KHÔNG thêm route mới.
- KHÔNG đụng Track B (promotion/import UI) — `components/promotion/.gitkeep` giữ nguyên.

### References
- [Source: docs/bdsai/planning/epics.md#Story-1.4] — AC gốc Given/When/Then (dòng 196-209)
- [Source: docs/bdsai/planning/epics.md#Quy-ước-test] — bắt buộc test mỗi story, Story 1.3 CI gate (dòng 144)
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-4] — SSR Boundary, Lighthouse gate SEO ≥ 90, server components
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-10] — Next API Route Boundary, layout không business logic
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-1] — Module Isolation, UI không gọi Supabase trực tiếp
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-2] — Single Data Mutation Path, FE read-only
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Consistency-Conventions] — naming kebab-case, named exports, types over interfaces, config CSS-first
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Stack] — Next 16, React 19, Tailwind 4, shadcn/ui, Geist
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Structural-Seed] — `app/(public)`, `app/(dashboard)`, `app/(admin)`, `components/ui`, `components/shared`, `lib/utils`
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/DESIGN.md] — colors (primary #111827 slate, accent #10B981 emerald, contrast CRITICAL), typography (Geist 44px/700 display), rounded (sm 4/md 8/lg 12), components (trust-badge, ai-insight-card, listing-card)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Foundation] — form-factor 360→1440, SSR public pages, shadcn/ui + Tailwind 4
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Information-Architecture] — IA (public/dashboard/admin), nav items
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#State-Patterns] — loading skeleton, 4 trạng thái
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Accessibility-Floor] — skip nav, lang vi, touch target 44px, focus trap Radix default, emerald contrast
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Responsive] — mobile 1 cột hamburger, tablet 2 cột, desktop 3-4 cột
- [Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md] — port 5435x, code ở `bdsai/`, Node 22, yarn 4.9.2, Turborepo
- [Source: _bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md] — apps/web lib/supabase read-only, build/typecheck/lint PASS
- [Source: _bmad-output/harness-workspace/1-3-cicd-github-actions/02-dev.md] — CI gate lint+typecheck+build+test, Lighthouse SEO ≥ 90 gate
- [Source: bdsai/apps/web/package.json] — scripts, deps (Next 16.2.9, React 19.2.7, Tailwind 4.3.1), port 3100, test echo
- [Source: bdsai/apps/web/app/layout.tsx] — root layout hiện tại (html lang vi, metadata, không header/footer)
- [Source: bdsai/apps/web/app/globals.css] — chỉ `@import 'tailwindcss'` (Tailwind 4 CSS-first)
- [Source: bdsai/apps/web/next.config.ts] — transpilePackages @bdsai/shared, turbopack root
- [Source: bdsai/apps/web/tsconfig.json] — paths `@/* → ./*`
- [Source: bdsai/apps/web/postcss.config.mjs] — @tailwindcss/postcss (Tailwind 4)
- [Source: bdsai/apps/web/app/(public)/page.tsx] — homepage demo hiện tại (@bdsai/shared Role proof)
- [Source: bdsai/apps/web/components/] — ui/shared/listings/promotion .gitkeep (empty)
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — story queue (1.1/1.2/1.3 done, 1.4 backlog → ready-for-dev)
- [Source: .claude/agents/story-author.md] — persona + protocol (3 output bắt buộc, tự verify)
- [Source: .claude/skills/bmad-create-story/template.md] — story file template convention
- [Source: _bmad-output/implementation-artifacts/1-3-cicd-github-actions.md] — story file convention (AC đánh số + Dev Notes + References [Source:])

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
