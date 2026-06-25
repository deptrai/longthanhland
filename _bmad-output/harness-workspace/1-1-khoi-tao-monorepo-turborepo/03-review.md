# Story 1.1 — Code Review (code-reviewer)

**Story:** 1-1-khoi-tao-monorepo-turborepo
**Reviewer:** opus-4.8 (skill bmad-code-review, adversarial)
**Ngày:** 2026-06-25
**Phạm vi:** Greenfield infra scaffold tại `bdsai/` (toàn bộ NEW; không có diff baseline — review trực tiếp working tree)
**Loại story:** Hạ tầng (KHÔNG có nghiệp vụ) — review tập trung: cấu trúc đúng, sạch, đặt nền invariant.

---

## VERDICT: ✅ APPROVED — sẵn sàng e2e

Không có finding blocking (0 critical, 0 high). Tất cả 4 AC đã được verify PASS bằng cách **chạy lại từ trạng thái sạch** (không tin suông dev log). Greenfield sạch, không vết Twenty, invariant AD-1/AD-2/AD-10 được đặt nền đúng. Các finding còn lại đều non-blocking (1 medium + 4 low) — là khuyến nghị cải thiện / ghi nhận cho story sau, không cản e2e.

---

## Re-verify độc lập (reviewer tự chạy, không tin dev log)

| Lệnh | Kết quả | Bằng chứng |
|---|---|---|
| `yarn build` (sau khi xoá .turbo/.next/dist/tsbuildinfo) | ✅ 3/3 success | web prerender `/` + `/_not-found`, api dist đủ |
| `yarn typecheck` | ✅ 4/4 success | shared/api/web + shared build |
| `yarn lint` | ✅ 4/4 success | no-explicit-any=error, không lỗi |
| `yarn test` (unit) | ✅ AppController 1/1 pass | health ok + service + defaultRole |
| `yarn workspace @bdsai/api test:e2e` | ✅ supertest GET / 1/1 pass | 200 + status ok |
| grep `twenty` trong source | ✅ chỉ 1 comment ở `next.config.ts` (KHÔNG import) | greenfield sạch |
| grep `any` / `@ts-ignore` / `eslint-disable` | ✅ NONE trong src | TS strict thật |
| grep secret hardcode | ✅ NONE (chỉ `env()` substitution trong config.toml) | không lộ secret |

---

## Map AC → verdict

| AC | Verdict | Bằng chứng đã kiểm |
|---|---|---|
| #1 web Next16/React19/Tailwind4, api Nest11, shared export type | ✅ PASS | `package.json` web (next 16.2.9, react 19.2.7, tailwindcss 4.3.1), api (@nestjs 11.1.27); `@bdsai/shared` export `type Role`; web `(public)/page.tsx` + api `app.controller.ts` đều `import type { Role }` → build xanh |
| #2 turbo.json dev/build/lint/typecheck cả 2 app | ✅ PASS | `turbo.json` có đủ task; `dev` cache:false+persistent:true; `build` dependsOn `^build`; turbo chạy 4/4 |
| #3 naming kebab-case file / PascalCase entity | ✅ PASS | `app.controller.ts`/`app.service.ts`/`app.module.ts`; class `AppController`/`AppService`/`AppModule`; type `Role` |
| #4 yarn dev đồng thời web+api không lỗi | ✅ PASS | dev log paste API=200/WEB=200; cấu trúc `dev` task hợp lệ (3 persistent: shared watch + api watch + web dev); type-only import nên không kẹt build-order |

**Structural Seed:** route groups `(public)/(dashboard)/(admin)/api` ✓ ở web; `common/{guards,filters,interceptors,decorators}` + `db/{schema,migrations}` + `modules/` (rỗng, .gitkeep) ✓ ở api.

**Infra:** `config.toml` project_id=`bdsai` ✓; dải port 5435x ✓ (API 54351 / DB 54352 / Studio 54353 / Inbucket 54354 / Analytics 54357 — lệch 5434x→5435x là quyết định hợp lý, KHÔNG tính lỗi); `public` schema 0 bảng nghiệp vụ ✓.

**Invariant đặt nền:** AD-1 (app.module imports:[] + modules/ rỗng đúng khung module-based, comment dẫn) ✓; AD-2 (`lib/supabase/index.ts` comment READ-ONLY, không write entity) ✓; AD-10 (`app/api/` chỉ .gitkeep, ZERO logic; `lib/api.ts` chỉ là const base URL) ✓.

---

## Findings

### 🟡 MEDIUM

**M1 — `apps/api/tsconfig.json` KHÔNG `extends` `tsconfig.base.json` (config drift risk).**
- **File:** `bdsai/apps/api/tsconfig.json:1-24`
- **Vấn đề:** Task 1 ghi rõ "tsconfig.base.json chia sẻ … **2 app extends**". `apps/web` và `packages/shared` đều `extends ../../tsconfig.base.json`, nhưng `apps/api` là **standalone** (không có key `extends`), tự khai lại toàn bộ. Hệ quả: api KHÔNG thừa kế `isolatedModules: true`, `declarationMap` từ base; mọi thay đổi base sau này sẽ KHÔNG lan tới api → dễ lệch cấu hình âm thầm giữa 3 package.
- **Vì sao không blocking:** Không AC nào yêu cầu `extends`; api vẫn set `strict` + `noUncheckedIndexedAccess` thủ công nên typecheck strict vẫn đúng; NestJS thật sự cần `module: CommonJS` + `experimentalDecorators` + `emitDecoratorMetadata` (khác base ESNext/Bundler) nên standalone là lựa chọn phòng thủ được.
- **Cách sửa (khuyến nghị, làm sớm khi còn rẻ):** Cho api `extends "../../tsconfig.base.json"` và chỉ override phần thật sự khác:
  ```jsonc
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "module": "CommonJS",
      "moduleResolution": "Node",
      "outDir": "./dist",
      "rootDir": "./src",
      "emitDecoratorMetadata": true,
      "experimentalDecorators": true,
      "strictPropertyInitialization": false
    },
    "include": ["src/**/*.ts"],
    "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
  }
  ```
  → giữ một nguồn sự thật cho strict/casing/interop, tránh drift cho các story sau.

### 🟢 LOW

**L1 — `db.major_version = 17` trong config.toml lệch với Stack doc (PostgreSQL 15).**
- **File:** `bdsai/supabase/config.toml:36`
- ARCHITECTURE-SPINE#Stack ghi "Supabase … PostgreSQL 15"; config (default CLI mới) dùng major_version 17. Local dev không sao, nhưng phải khớp version remote Supabase free tier khi deploy. **Sửa:** xác nhận version remote rồi chốt một con số ở cả doc lẫn config (Story 1.2 khi nối Supabase thật).

**L2 — `apps/web/lib/supabase/index.ts` lệch tên so với Structural Seed (`client.ts` + `server.ts`).**
- **File:** `bdsai/apps/web/lib/supabase/index.ts`
- Structural Seed chỉ định `client.ts` (browser, read-only+auth) và `server.ts` (SSR fetch). Dev tạo `index.ts` placeholder (`export {}`). Đúng tinh thần "chỉ placeholder cho 1.2" nhưng tên chưa khớp. **Sửa:** Story 1.2 tạo đúng `client.ts`/`server.ts` theo seed (không cần sửa ở 1.1).

**L3 — `yarn test` (turbo) KHÔNG chạy e2e → CI gap tiềm ẩn.**
- **File:** `bdsai/apps/api/package.json:13-14`, `bdsai/turbo.json:20-23`
- `test` task chỉ chạy unit (`jest.config.cjs`); e2e nằm ở script riêng `test:e2e` không được turbo `test` gọi. Đúng convention NestJS, nhưng CI chạy `yarn test` sẽ không bắt regression e2e. **Sửa (story CI):** thêm task `test:e2e` vào pipeline CI, hoặc gộp e2e vào lệnh test tổng ở bước dựng CI.

**L4 — turbo `test` khai `outputs: ["coverage/**"]` nhưng test không sinh coverage → WARNING "no output files found".**
- **File:** `bdsai/turbo.json:20-23`
- Cosmetic; gây 2 WARNING mỗi lần `yarn test`. **Sửa:** bỏ `outputs` khỏi `test` (hoặc chỉ khai khi chạy `--coverage`).

---

## Ghi nhận tích cực (đáng giữ)
- Build-order đúng: `typecheck`/`lint` dependsOn `^build` để `@bdsai/shared` emit `.d.ts` trước khi api/web resolve type — cần thiết, không thừa.
- `import type { Role }` (type-only) bị erase lúc compile → `yarn dev` không kẹt thứ tự build dù `dev` task không dependsOn `^build`; đồng thời `shared` có script `dev` (tsc --watch) nên runtime import sau này vẫn có dist. Thiết kế chắc.
- Bug runtime `Cannot find module './app.module'` đã fix **tận gốc** (bỏ `incremental` + exclude spec khỏi build), không vá tạm — reviewer xác nhận `nest build` ra dist đủ, e2e load AppModule OK.
- `main.ts` có `enableShutdownHooks()`; không nhét CORS/pipe/business — đúng phạm vi infra.
- `no-explicit-any: 'error'` bật ở api ESLint → ràng buộc "no any" có hiệu lực thật, không chỉ convention.

---

## Handoff
- **→ e2e-tester:** Story 1.1 APPROVED. E2E nên xác nhận với hạ tầng thật: (a) `supabase start` lên đủ stack ở dải 5435x + `supabase status` đúng port; (b) `yarn dev` → GET http://localhost:3101/ trả `{"status":"ok","service":"bdsai-api","defaultRole":"user"}` và http://localhost:3100 render homepage; (c) `public` schema = 0 bảng nghiệp vụ.
- **→ leader:** Cần Luis xác nhận 1 ràng buộc hạ tầng: port Supabase chính thức là **5435x** (đã lệch khỏi 5434x trong 00-infra-decisions.md vì epsilon-local chiếm 5434x). Hợp lý nhưng là ràng buộc cứng nên cần chốt để các story sau tham chiếu nhất quán.
- M1 + L1–L4 là non-blocking: có thể xử lý ngay (M1 nên làm sớm) hoặc cuốn vào Story 1.2 / story CI. Không cản e2e.
