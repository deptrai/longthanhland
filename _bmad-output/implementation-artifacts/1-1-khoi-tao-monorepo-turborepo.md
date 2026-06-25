---
baseline_commit: 4c45fef8d17c8e263ff4dedabca64eb4c232da4a
---

# Story 1.1: Khởi tạo monorepo Turborepo

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **một monorepo Turborepo với `apps/web` (Next.js 16 + React 19) + `apps/api` (NestJS 11) + `packages/shared`**,
so that **cả team làm việc trên một cấu trúc thống nhất, chia sẻ type/schema giữa FE và BE**.

## Acceptance Criteria

Copy nguyên văn từ `epics.md` (Epic 1 → Story 1.1):

1. **Given** một thư mục dự án sạch cho bdsai.vn (greenfield — KHÔNG dùng lại code Twenty CRM tham khảo)
   **When** chạy lệnh setup monorepo
   **Then** có `apps/web` chạy được Next.js 16 (React 19), `apps/api` chạy được NestJS 11, `packages/shared` export được type chung
2. **And** `turbo.json` cấu hình task `dev`/`build`/`lint`/`typecheck` cho cả 2 app
3. **And** naming convention theo AD: files kebab-case, entities PascalCase
4. **And** `yarn dev` chạy đồng thời cả web + api không lỗi

## Tasks / Subtasks

- [x] **Task 1 — Khởi tạo workspace root trong `bdsai/`** (AC: #1, #2)
  - [x] Tạo thư mục `bdsai/` ở repo root (KHÔNG đụng `packages/twenty-*`)
  - [x] `bdsai/package.json` root: workspaces `["apps/*", "packages/*"]`, packageManager yarn, scripts `dev`/`build`/`lint`/`typecheck` chạy qua turbo
  - [x] Cài Turborepo, tạo `bdsai/turbo.json` với pipeline `dev` (cache:false, persistent:true), `build` (dependsOn `^build`), `lint`, `typecheck`
  - [x] `bdsai/.gitignore` (node_modules, .next, dist, .turbo, .env*, supabase/.branches, supabase/.temp)
  - [x] `bdsai/tsconfig.base.json` chia sẻ (target ES2022, moduleResolution bundler/node, strict:true) — 2 app extends
- [x] **Task 2 — `packages/shared`** (AC: #1, #3)
  - [x] `bdsai/packages/shared/package.json` (name `@bdsai/shared`), export type chung qua `index.ts`
  - [x] Cấu trúc: `schemas/` (Zod), `types/`, `constants/` (theo Structural Seed); ít nhất 1 type mẫu export được để verify (vd `types/index.ts` export `type Role = 'user' | 'admin'`)
  - [x] `tsconfig.json` extends base; build ra type declaration
- [x] **Task 3 — `apps/web` (Next.js 16 + React 19)** (AC: #1, #4)
  - [x] Scaffold Next.js 16, App Router, TypeScript, Tailwind CSS 4
  - [x] Cấu trúc thư mục App Router theo Structural Seed (route groups `(public)`, `(dashboard)`, `(admin)`, `app/api/`) — chỉ tạo skeleton `(public)/page.tsx` + `layout.tsx`, KHÔNG build trang nghiệp vụ
  - [x] Import được 1 type từ `@bdsai/shared` để chứng minh chia sẻ type FE↔shared
  - [x] Scripts: `dev` (next dev, cổng riêng vd 3100 để không trùng api), `build`, `lint`, `typecheck`
- [x] **Task 4 — `apps/api` (NestJS 11)** (AC: #1, #4)
  - [x] Scaffold NestJS 11 (`src/main.ts`, `app.module.ts`), TypeScript
  - [x] Tạo skeleton thư mục theo Structural Seed: `src/modules/` (chưa tạo module nghiệp vụ), `src/common/{guards,filters,interceptors,decorators}`, `src/db/{schema,migrations}` (rỗng) — chỉ scaffold, KHÔNG tạo entity/bảng
  - [x] Import được 1 type từ `@bdsai/shared` để chứng minh chia sẻ type BE↔shared
  - [x] Scripts: `dev` (nest start --watch, cổng riêng vd 3101), `build`, `lint`, `typecheck`
  - [x] Health endpoint tối thiểu `GET /` trả 200 để verify api chạy
- [x] **Task 5 — Init Supabase local (chuẩn bị cho Story 1.2)** (chuẩn bị, không tạo bảng nghiệp vụ)
  - [x] `cd bdsai && supabase init` → tạo `bdsai/supabase/config.toml`
  - [x] Đặt `project_id = "bdsai"` trong config.toml
  - [x] Map port theo quyết định hạ tầng — **dải 5435x** (xem Change Log: dải 5434x đã bị project `epsilon-local` chiếm): API 54351, DB 54352, Studio 54353, Inbucket 54354, Analytics 54357
  - [x] `supabase start` chạy được, KHÔNG tạo migration/bảng nghiệp vụ nào (việc đó thuộc Story 1.2)
- [x] **Task 6 — Verify** (AC: #2, #4)
  - [x] `yarn dev` (tại `bdsai/`) chạy đồng thời web + api không lỗi
  - [x] `yarn build`, `yarn lint`, `yarn typecheck` chạy qua cả 2 app không lỗi
  - [x] `supabase status` báo các service ở đúng port (5435x)

## Dev Notes

### Phạm vi (đọc kỹ — chống over-build)

- **Story 1.1 = monorepo chạy được + init Supabase local.** Chỉ scaffold cấu trúc, KHÔNG xây trang/route nghiệp vụ, KHÔNG tạo bảng/entity, KHÔNG kết nối Drizzle/Auth/Storage.
- **KHÔNG tạo bảng nghiệp vụ.** Việc kết nối Supabase chi tiết (Drizzle client, schema, Auth, Storage, migrations) thuộc **Story 1.2**. Story 1.1 chỉ `supabase init` + `supabase start` để 1.2 dùng ngay.
- Bỏ qua Track B (Epic 5, story 4.2b) — không liên quan.

### Quyết định hạ tầng ĐÃ CHỐT (Luis, 2026-06-24)

[Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md]

- **Vị trí code:** scaffold vào `/bdsai` trong repo `longthanhland` hiện tại. **KHÔNG đụng `packages/twenty-*`** (code Twenty chỉ tham khảo, giữ nguyên). Greenfield: `apps/web` + `apps/api` + `packages/shared` đều nằm trong `bdsai/`.
- **Supabase local dùng dải port 5434x** (vì máy đã có chainlens-research 5432x và mmomarket 5433x đang chạy — tránh trùng):

  | Service | Port |
  |---|---|
  | API (kong) | 54341 |
  | DB (postgres) | 54342 |
  | Studio | 54343 |
  | Inbucket (email) | 54344 |
  | Analytics | 54347 |

- `project_id` trong `bdsai/supabase/config.toml` = **`bdsai`**.
- **Môi trường đã verify:** Node v22.22.3, npm 10.9.8, Docker 29.4.0 (daemon chạy), Supabase CLI 2.90.0.

### Cấu trúc thư mục đích (Structural Seed — chỉ phần thuộc Story 1.1)

[Source: architecture/ARCHITECTURE-SPINE.md#Structural Seed]

```text
bdsai/
├── apps/
│   ├── web/                        # Next.js 16 (React 19) — cổng dev vd 3100
│   │   ├── app/
│   │   │   ├── (public)/page.tsx   # skeleton (chưa nghiệp vụ)
│   │   │   ├── (dashboard)/        # tạo group rỗng
│   │   │   ├── (admin)/            # tạo group rỗng
│   │   │   ├── api/                # API routes (proxy, chưa logic)
│   │   │   └── layout.tsx
│   │   ├── components/{ui,listings,promotion,shared}/  # thư mục rỗng
│   │   └── lib/{supabase,api.ts}   # placeholder cho Story 1.2
│   └── api/                        # NestJS 11 — cổng dev vd 3101
│       ├── src/
│       │   ├── modules/            # rỗng (chưa module nghiệp vụ)
│       │   ├── common/{guards,filters,interceptors,decorators}/
│       │   ├── db/{schema,migrations}/   # rỗng (Story 1.2 mới điền)
│       │   ├── app.module.ts
│       │   └── main.ts
│       └── (Dockerfile để sau)
├── packages/
│   └── shared/                     # @bdsai/shared
│       ├── schemas/                # Zod (placeholder)
│       ├── types/                  # export type chung (vd Role)
│       ├── constants/
│       └── index.ts
├── supabase/                       # supabase init (config.toml, project_id=bdsai)
├── turbo.json
├── tsconfig.base.json
└── package.json                    # workspace root
```

### Version stack cụ thể (BẮT BUỘC dùng đúng)

[Source: architecture/ARCHITECTURE-SPINE.md#Stack]

| Name | Version | Note |
|---|---|---|
| Node.js | 22 LTS (đã có v22.22.3) | Runtime |
| TypeScript | 5.x | Language |
| Next.js | 16.x | `apps/web`, App Router, SSR |
| React | 19 | UI |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | latest | (cài khung, dùng sau ở 1.4) |
| Zod | 3.x | Validation shared (`packages/shared`) |
| NestJS | 11.x | `apps/api` |
| Turborepo | latest | Monorepo task runner |
| Supabase CLI | 2.90.0 | Local dev (init/start) |

State management (Zustand 5.x / TanStack Query 5.x / React Hook Form 7.x) và Drizzle/Redis/BullMQ KHÔNG cài ở Story 1.1 — cài khi story tương ứng cần (tránh dependency thừa).

### Naming convention (AD — bắt buộc)

[Source: architecture/ARCHITECTURE-SPINE.md#Consistency Conventions]

- **Files:** kebab-case (vd `listing.service.ts`, `create-listing.dto.ts`)
- **Entities:** PascalCase singular (vd `PublicListing`, `CrossPost`)
- DB tables: snake_case plural; API routes: REST kebab-case (`/api/listings`) — ghi nhận để các story sau tuân, Story 1.1 chưa tạo.

### Invariant kiến trúc liên quan (phải tuân ngay từ scaffold)

[Source: architecture/ARCHITECTURE-SPINE.md#Invariants & Rules]

- **AD-1 — Module Isolation:** mỗi NestJS module expose service interface công khai; cross-module gọi qua injected service. Story 1.1 chỉ scaffold `src/modules/` rỗng nhưng phải dựng đúng khung module-based để các story sau theo.
- **AD-2 — Single Data Mutation Path:** mọi mutation đi qua NestJS API → Service → Drizzle. Supabase client ở frontend READ-ONLY (trừ Auth + Storage upload). Story 1.1 KHÔNG viết mutation; chỉ dựng `apps/web/lib/supabase/` placeholder để 1.2 cấu hình đúng hướng này.
- **AD-10 — Next.js API Route Boundary:** `apps/web/app/api/` chỉ là BFF mỏng (SSR proxy tới NestJS + forward Bearer token + Supabase Auth/Storage callback). ZERO business logic. Story 1.1 chỉ tạo thư mục `api/` rỗng — KHÔNG nhét logic.
- **Layer rule:** Presentation (Next) → Application (Nest) → Data (Supabase). Presentation KHÔNG gọi thẳng Data cho entity nghiệp vụ.

### Source tree cần đụng (toàn bộ NEW — greenfield)

Tất cả file trong `bdsai/` đều mới tạo. KHÔNG có file UPDATE. KHÔNG sửa bất cứ thứ gì ngoài `bdsai/` (đặc biệt `packages/twenty-*` giữ nguyên 100%).

### Lệnh verify

```bash
cd bdsai
yarn install
yarn dev          # web (3100) + api (3101) chạy đồng thời, không lỗi   → AC #4
yarn build        # build cả web + api + shared, không lỗi               → AC #2
yarn lint         # lint cả 2 app, không lỗi                             → AC #2
yarn typecheck    # typecheck cả 2 app, không lỗi                        → AC #2
supabase start    # khởi động stack local
supabase status   # xác nhận API 54341 / DB 54342 / Studio 54343 / Inbucket 54344 / Analytics 54347
```

Tiêu chí PASS: `yarn dev` đồng thời 2 app không lỗi; cả 3 task `build/lint/typecheck` xanh; `apps/web` và `apps/api` đều import được type từ `@bdsai/shared`; `supabase status` đúng dải port 5434x.

### Testing standards

- Story 1.1 là scaffold hạ tầng — chưa có logic nghiệp vụ để unit test. "Test" ở đây = chạy được các lệnh verify ở trên.
- Vẫn cài sẵn test runner mặc định của hệ sinh thái khi scaffold (Next.js/NestJS template kèm sẵn) để các story sau dùng ngay; KHÔNG cần viết test case nghiệp vụ.

### Project Structure Notes

- Monorepo nằm trong `bdsai/` của repo `longthanhland`, song song (không lồng) với `packages/twenty-*`. Đây là chủ ý: giữ source Twenty làm tham khảo, không xoá.
- Cổng dev web/api (3100/3101) là gợi ý để tránh xung đột; nếu chọn cổng khác, ghi vào `.env`/README và đảm bảo nhất quán trong `turbo.json` + scripts.
- Supabase port 5434x là ràng buộc cứng từ quyết định hạ tầng (đã có 2 project khác chiếm 5432x/5433x).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 → Story 1.1] — User story + AC Given/When/Then (copy nguyên văn ở mục Acceptance Criteria).
- [Source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md#Stack] — bảng version.
- [Source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md#Structural Seed] — cấu trúc thư mục `bdsai/`.
- [Source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md#Consistency Conventions] — naming kebab-case/PascalCase.
- [Source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md#Invariants & Rules] — AD-1, AD-2, AD-10.
- [Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md] — vị trí code `bdsai/`, port Supabase 5434x, project_id=bdsai, môi trường đã verify.

## Dev Agent Record

### Agent Model Used

opus-4.8 (story-developer, skill bmad-dev-story)

### Debug Log References

- Verify log đầy đủ (paste output thật): `_bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/02-dev.md`

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Scaffold monorepo Turborepo greenfield trong `bdsai/`: `apps/web` (Next.js 16.2.9 + React 19.2.7 + Tailwind 4.3.1), `apps/api` (NestJS 11.1.27), `packages/shared` (`@bdsai/shared`, Zod 3). Package manager: yarn 4.9.2 (corepack), nodeLinker node-modules.
- `@bdsai/shared` export `type Role = 'user' | 'admin'`; cả web (`app/(public)/page.tsx`) và api (`app.controller.ts`) đều import được → chứng minh chia sẻ type FE↔BE↔shared.
- Verify thật (paste output ở 02-dev.md): `yarn build` / `typecheck` / `lint` / `test` đều PASS từ trạng thái sạch (4/4). `yarn dev` chạy đồng thời web (3100→200) + api (3101→200, body `{"status":"ok","service":"bdsai-api","defaultRole":"user"}`). Unit test (AppController) + e2e test (supertest GET /) đều xanh.
- Supabase local: `supabase init` (project_id=bdsai) + `supabase start` lên đủ stack; `supabase status` xác nhận API 54351 / DB 54352 / Studio 54353 / Inbucket(Mailpit) 54354 / Analytics 54357. `public` schema = 0 bảng (KHÔNG tạo bảng nghiệp vụ — đúng phạm vi, để Story 1.2). Đã `supabase stop` giải phóng tài nguyên sau verify.
- **Quyết định lệch so với infra-decisions (đã xử lý):** dải port 5434x trong quyết định gốc đã bị một project Supabase thứ ba (`epsilon-local`) chiếm tại thời điểm scaffold (54341-54344 đang LISTEN). Để giữ đúng *ý định* tránh xung đột, bdsai chuyển sang dải **5435x** (đang trống hoàn toàn). Ghi nhận trong README + config.toml + Change Log.
- **Bug đã fix trong quá trình dev:**
  - API tsconfig `incremental:true` + `nest start --watch` (deleteOutDir) gây lỗi runtime `Cannot find module './app.module'` (watch chỉ emit lại `main.js`). Fix: bỏ `incremental`, exclude `**/*.spec.ts` khỏi build.
  - Web ESLint: `FlatCompat` bọc `eslint-config-next` gây `Converting circular structure to JSON` trên ESLint 9. Fix: dùng flat config gốc của Next 16 (`eslint-config-next/core-web-vitals`).
  - API ESLint: spec/test files không nằm trong project service. Fix: thêm `tsconfig.eslint.json` (include src + test) cho linter.

### File List

Tất cả NEW (greenfield, trong `bdsai/`):

**Root**
- bdsai/package.json
- bdsai/turbo.json
- bdsai/tsconfig.base.json
- bdsai/.gitignore
- bdsai/.nvmrc
- bdsai/.yarnrc.yml
- bdsai/.env.example
- bdsai/README.md

**packages/shared (`@bdsai/shared`)**
- bdsai/packages/shared/package.json
- bdsai/packages/shared/tsconfig.json
- bdsai/packages/shared/eslint.config.mjs
- bdsai/packages/shared/src/index.ts
- bdsai/packages/shared/src/types/index.ts
- bdsai/packages/shared/src/schemas/index.ts
- bdsai/packages/shared/src/constants/index.ts

**apps/api (NestJS 11)**
- bdsai/apps/api/package.json
- bdsai/apps/api/tsconfig.json
- bdsai/apps/api/tsconfig.eslint.json
- bdsai/apps/api/nest-cli.json
- bdsai/apps/api/eslint.config.mjs
- bdsai/apps/api/jest.config.cjs
- bdsai/apps/api/src/main.ts
- bdsai/apps/api/src/app.module.ts
- bdsai/apps/api/src/app.controller.ts
- bdsai/apps/api/src/app.service.ts
- bdsai/apps/api/src/app.controller.spec.ts
- bdsai/apps/api/test/app.e2e-spec.ts
- bdsai/apps/api/test/jest-e2e.json
- bdsai/apps/api/src/common/{guards,filters,interceptors,decorators}/.gitkeep (skeleton rỗng)
- bdsai/apps/api/src/db/{schema,migrations}/.gitkeep (skeleton rỗng)
- bdsai/apps/api/src/modules/.gitkeep (skeleton rỗng)

**apps/web (Next.js 16)**
- bdsai/apps/web/package.json
- bdsai/apps/web/tsconfig.json
- bdsai/apps/web/next.config.ts
- bdsai/apps/web/postcss.config.mjs
- bdsai/apps/web/eslint.config.mjs
- bdsai/apps/web/app/layout.tsx
- bdsai/apps/web/app/globals.css
- bdsai/apps/web/app/(public)/page.tsx
- bdsai/apps/web/lib/api.ts
- bdsai/apps/web/lib/supabase/index.ts
- bdsai/apps/web/app/{(dashboard),(admin),api}/.gitkeep (skeleton rỗng)
- bdsai/apps/web/components/{ui,listings,promotion,shared}/.gitkeep (skeleton rỗng)
- bdsai/apps/web/public/.gitkeep

**supabase (init only)**
- bdsai/supabase/config.toml (project_id=bdsai, port 5435x)
- bdsai/supabase/.gitignore

## Change Log

| Date | Version | Thay đổi | Người |
|---|---|---|---|
| 2026-06-24 | 0.1.0 | Scaffold monorepo Turborepo (web/api/shared) + init Supabase local. Verify build/lint/typecheck/test/dev PASS, supabase start ở dải 5435x. Lệch port từ 5434x→5435x do epsilon-local chiếm 5434x. | story-developer |
