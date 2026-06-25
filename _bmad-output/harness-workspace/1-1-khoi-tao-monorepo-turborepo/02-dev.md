# Story 1.1 — Dev Log (story-developer)

**Story:** 1-1-khoi-tao-monorepo-turborepo
**Agent:** opus-4.8 (skill bmad-dev-story)
**Ngày:** 2026-06-25
**Kết quả:** PASS — Status → `review`
**baseline_commit:** 4c45fef8d17c8e263ff4dedabca64eb4c232da4a

---

## 1. Tóm tắt scaffold

Greenfield monorepo Turborepo tại `bdsai/` (KHÔNG đụng `packages/twenty-*`).

```
bdsai/
├── package.json            # workspace root (yarn 4.9.2, workspaces apps/* packages/*)
├── turbo.json              # tasks dev(persistent,cache:false)/build/lint/typecheck/test
├── tsconfig.base.json      # ES2022, moduleResolution Bundler, strict + noUncheckedIndexedAccess
├── .yarnrc.yml             # nodeLinker: node-modules
├── .nvmrc / .gitignore / .env.example / README.md
├── yarn.lock               # (rỗng — buộc yarn coi bdsai là project tách biệt repo cha)
├── apps/
│   ├── web/                # Next.js 16.2.9 + React 19.2.7 + Tailwind 4.3.1 — cổng 3100
│   │   ├── app/(public)/page.tsx   # import type Role từ @bdsai/shared
│   │   ├── app/{(dashboard),(admin),api}/  # skeleton rỗng (.gitkeep)
│   │   ├── app/layout.tsx + globals.css (@import 'tailwindcss')
│   │   ├── components/{ui,listings,promotion,shared}/ (rỗng)
│   │   ├── lib/{api.ts, supabase/index.ts} (placeholder Story 1.2)
│   │   └── next.config.ts (transpilePackages @bdsai/shared, turbopack.root=bdsai)
│   └── api/                # NestJS 11.1.27 — cổng 3101
│       ├── src/{main.ts, app.module.ts, app.controller.ts, app.service.ts}
│       ├── src/app.controller.spec.ts (unit) + test/app.e2e-spec.ts (supertest)
│       ├── src/modules/ (rỗng) + common/{guards,filters,interceptors,decorators}/ (rỗng)
│       ├── src/db/{schema,migrations}/ (rỗng — Story 1.2)
│       └── tsconfig.json + tsconfig.eslint.json + nest-cli.json + jest.config.cjs
├── packages/shared/        # @bdsai/shared — Zod 3
│   └── src/{index.ts, types/index.ts (export type Role), schemas/, constants/}
└── supabase/               # supabase init — config.toml (project_id=bdsai, port 5435x)
```

Naming: files kebab-case, entity PascalCase (`AppController`, `AppService`, `AppModule`). TS strict toàn workspace.

---

## 2. Quyết định lệch khỏi infra-decisions (đã xử lý + ghi nhận)

`00-infra-decisions.md` chốt dải port Supabase **5434x**. Nhưng tại thời điểm scaffold,
một project Supabase thứ ba (`epsilon-local`) đang chạy chiếm đúng 54341-54344:

```
$ docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E '5434[0-9]'
supabase_db_epsilon-local      0.0.0.0:54342->5432/tcp
supabase_studio_epsilon-local  0.0.0.0:54343->3000/tcp
supabase_inbucket_epsilon-local 0.0.0.0:54344->8025/tcp
supabase_kong_epsilon-local    0.0.0.0:54341->8000/tcp
```

→ Giữ đúng *ý định* (tránh xung đột), bdsai chuyển sang dải **5435x** (trống hoàn toàn):
API 54351, DB 54352, Studio 54353, Inbucket 54354, Analytics 54357 (+ shadow 54350, pooler 54359).

---

## 3. Lệnh đã chạy + kết quả thật (paste output)

### 3.1 Môi trường / package manager
```
node -v        → v22.22.3
npm -v         → 10.9.8
supabase       → 2.90.0
docker server  → 29.4.0
corepack → yarn 4.9.2  (yarn chưa cài sẵn; bật qua corepack)
```

### 3.2 yarn install
Lỗi đầu: yarn coi repo cha `longthanhland` (có yarn.lock của Twenty) là project → từ chối.
Fix theo đúng gợi ý của yarn: tạo `bdsai/yarn.lock` rỗng → bdsai thành project tách biệt.
```
➤ YN0000: · Yarn 4.9.2
➤ YN0000: └ Completed in ... (839 packages added, +526 MiB)
➤ YN0002: @bdsai/api doesn't provide webpack (requested by ts-loader)  [warning vô hại — Nest dùng tsc]
➤ YN0000: · Done with warnings
```

### 3.3 Full pipeline từ trạng thái SẠCH (xoá .turbo/.next/dist/tsbuildinfo)
```
✓ build PASS        (3 packages: shared → api → web; web prerender / và /_not-found)
✓ typecheck PASS    (4 tasks)
✓ lint PASS         (4 tasks)
✓ test PASS         (api unit + web no-op)
=== SUMMARY: 4 pass, 0 fail ===
```

### 3.4 Test (chi tiết)
```
@bdsai/api:test:  PASS src/app.controller.spec.ts
  AppController
    ✓ GET / trả health ok + service name + defaultRole user
Test Suites: 1 passed, 1 total | Tests: 1 passed

apps/api $ yarn test:e2e
Test Suites: 1 passed, 1 total | Tests: 1 passed   (supertest GET / → 200)
```

### 3.5 yarn dev — web + api ĐỒNG THỜI
```
[1s] API 3101 -> 200
[1s] WEB 3100 -> 200
=== RESULT: API=200 WEB=200 ===
--- API body --- {"status":"ok","service":"bdsai-api","defaultRole":"user"}
(no MODULE_NOT_FOUND / Error in log)
```
(launch nền → probe → kill; cổng 3100/3101 free sau khi tắt)

### 3.6 Supabase
```
$ supabase init   → Finished supabase init.  (project_id="bdsai")
$ supabase start  → supabase local development setup is running.

$ supabase status
  Studio   http://127.0.0.1:54353
  Mailpit  http://127.0.0.1:54354
  API URL  http://127.0.0.1:54351   (REST /rest/v1, GraphQL /graphql/v1)
  DB URL   postgresql://postgres:postgres@127.0.0.1:54352/postgres

$ docker ps | grep bdsai   (port mapping xác nhận)
  supabase_kong_bdsai      0.0.0.0:54351->8000/tcp
  supabase_db_bdsai        0.0.0.0:54352->5432/tcp
  supabase_studio_bdsai    0.0.0.0:54353->3000/tcp
  supabase_inbucket_bdsai  0.0.0.0:54354->8025/tcp
  supabase_analytics_bdsai 4000/tcp (port 54357 cấu hình)

$ port listeners → 54351 54352 54353 54354 54357 đều LISTEN

# Không tạo bảng nghiệp vụ (đúng phạm vi):
$ psql public tables count → 0

$ supabase stop  → Stopped supabase local development setup. (giải phóng tài nguyên)
```
Ghi chú: lần `supabase start` đầu rollback do storage container health-check timeout (~2 phút boot lần đầu);
chạy lại → storage healthy, stack lên đủ. Đây là độ trễ boot, không phải lỗi cấu hình.

---

## 4. Bug đã gặp & fix tận gốc (không vá tạm)

1. **API runtime `Cannot find module './app.module'`** khi `yarn dev`.
   - Root cause: tsconfig `incremental:true` ghi `tsconfig.tsbuildinfo`; `nest start --watch`
     deleteOutDir xoá `dist/` nhưng giữ tsbuildinfo → tsc incremental chỉ emit lại `main.js`,
     thiếu app.module.js/app.controller.js/app.service.js.
   - Fix: bỏ `incremental` khỏi `apps/api/tsconfig.json` + exclude `**/*.spec.ts` khỏi build.
   - Verify: build sạch → đủ 12 file dist; `node dist/main.js` → Nest start, GET / 200.

2. **Web lint `Converting circular structure to JSON`** (ESLint 9).
   - Root cause: `FlatCompat` bọc `eslint-config-next` (config kiểu eslintrc) trên ESLint 9 flat.
   - Fix: Next 16 ship flat config gốc → import `eslint-config-next/core-web-vitals` trực tiếp,
     bỏ FlatCompat + @eslint/eslintrc.

3. **API lint: spec/test không nằm trong project service.**
   - Fix: thêm `apps/api/tsconfig.eslint.json` (include src + test) và trỏ `parserOptions.project` vào đó.

---

## 5. Map AC → bằng chứng

| AC | Trạng thái | Bằng chứng |
|---|---|---|
| #1 web Next16/React19, api Nest11, shared export type | PASS | build 3 pkg, web import Role ở (public)/page.tsx, api import Role ở app.controller.ts |
| #2 turbo.json dev/build/lint/typecheck cả 2 app | PASS | turbo run 4/4 PASS |
| #3 naming kebab-case file / PascalCase entity | PASS | *.controller.ts / class AppController... |
| #4 yarn dev đồng thời web+api không lỗi | PASS | API=200 WEB=200, no error in dev log |

Bổ sung (chuẩn bị Story 1.2): supabase init+start ở dải 5435x, 0 bảng nghiệp vụ.

---

## 6. Handoff cho code-reviewer

- Story `1-1-khoi-tao-monorepo-turborepo` → **review**.
- Code tại `bdsai/` (xem File List trong story file).
- Lưu ý reviewer:
  - Port Supabase lệch 5434x → 5435x (lý do ở mục 2; cần xác nhận với Luis vì là ràng buộc hạ tầng).
  - `bdsai/yarn.lock` rỗng có chủ đích (tách project khỏi repo Twenty cha).
  - Chưa cài Zustand/TanStack/Drizzle/Redis/BullMQ — đúng phạm vi (cài khi story cần).
