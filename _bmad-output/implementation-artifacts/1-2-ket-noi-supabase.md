---
baseline_commit: 4c45fef8d17c8e263ff4dedabca64eb4c232da4a
---

# Story 1.2: Kết nối Supabase (DB + Auth + Storage)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **apps/api kết nối Supabase PostgreSQL qua Drizzle ORM, cùng Auth và Storage client cấu hình sẵn**,
so that **các story sau có thể tạo bảng, xác thực user, và lưu ảnh**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 1 → Story 1.2 (Given/When/Then). AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được.

1. **AC1 — Drizzle kết nối PostgreSQL, migration rỗng chạy được.** Given monorepo từ Story 1.1 và Supabase local đang chạy (dải port 5435x, DB ở `54352`), When chạy quy trình migration Drizzle (`generate` → `migrate`), Then Drizzle kết nối thành công tới PostgreSQL và migration đầu tiên (rỗng — KHÔNG có bảng nghiệp vụ) apply thành công, ghi vào bảng metadata migration của Drizzle (`drizzle.__drizzle_migrations` hoặc tương đương). Chạy lại `migrate` lần 2 → idempotent, không lỗi.

2. **AC2 — Config 100% qua NestJS ConfigModule + .env, KHÔNG hardcode.** Given biến môi trường khai báo trong `.env` (mẫu ở `.env.example`), When app khởi động, Then mọi giá trị Supabase (DB URL, Supabase URL, anon key, service-role key, storage bucket) đọc qua `@nestjs/config` `ConfigService` (AD: Config qua `.env` + ConfigModule). KHÔNG có chuỗi kết nối / key nào hardcode trong source. Thiếu biến bắt buộc → app fail-fast lúc bootstrap với thông báo rõ ràng (validation schema).

3. **AC3 — Supabase Auth client + Storage client khởi tạo, healthcheck pass.** Given config hợp lệ, When gọi endpoint healthcheck `GET /health/supabase` (hoặc tương đương), Then trả về trạng thái OK cho cả 3 thành phần: `db` (Drizzle `SELECT 1`), `auth` (Supabase Auth client khởi tạo được + ping được), `storage` (Storage client khởi tạo được + list bucket được). Response theo error shape chuẩn khi lỗi: `{ statusCode, message, error?, details? }`.

4. **AC4 — KHÔNG tạo bảng nghiệp vụ nào ở story này.** Given phạm vi story, When migration chạy xong, Then schema `public` KHÔNG chứa bảng nghiệp vụ (`public_users`, `public_listings`, `inquiries`, `cross_posts`, `ai_results`, `imported_listings` — các bảng này tạo ở story sau: `public_users` ở 2.1, `public_listings` ở 3.1...). Chỉ có metadata migration của Drizzle được phép tồn tại. (`epics.md` Story 1.2: "KHÔNG tạo bảng nghiệp vụ nào").

5. **AC5 — Connection pooling phù hợp giới hạn Supabase Free.** Given Supabase Free tier (giới hạn số connection thấp), When cấu hình postgres.js client, Then dùng connection pool có `max` connections giới hạn hợp lý (vd `max: 10` cho local, thấp hơn cho prod theo Supavisor), `idle_timeout` để giải phóng connection rảnh. Với prod (Supabase Cloud Free) dùng **Supavisor transaction pooler** (port `6543`) với `prepare: false` (bắt buộc — transaction pool mode không hỗ trợ prepared statements). Local dev dùng kết nối trực tiếp port `54352`.

6. **AC6 (từ review 1.1 — L1) — Chốt PostgreSQL version khớp giữa config.toml và stack doc.** Given `supabase/config.toml` hiện đặt `major_version = 17` nhưng `ARCHITECTURE-SPINE.md` (stack) + AC Story 1.2 ghi **PostgreSQL 15**, When xử lý story này, Then hai nguồn phải KHỚP nhau. Quyết định mặc định: đổi `config.toml` `major_version = 15` để khớp stack doc + AC (PostgreSQL 15). Sau khi đổi cần `supabase stop` rồi `supabase start` lại để DB volume tái tạo đúng PG15, và xác nhận `SELECT version()` trả về PostgreSQL 15.x. (Nếu dev xác minh được Supabase Free Cloud chỉ cấp PG17 cho project mới → thay vào đó cập nhật stack doc + AC thành PG17 và ghi rõ lý do; KHÔNG để hai nguồn lệch nhau.)

7. **AC7 (quy ước test toàn dự án) — Test tự động.** Given mọi story phải có test trước khi Done, When implement story này, Then có: unit test cho config validation (thiếu biến → fail-fast) + integration test cho healthcheck (`/health/supabase` trả OK khi Supabase chạy; trả lỗi đúng shape khi DB unreachable). Test pass local; sẽ chạy trong CI ở Story 1.3.

## Tasks / Subtasks

- [x] **Task 1 — Cài dependencies DB + config + supabase (AC1, AC2, AC3, AC5)**
  - [x] Thêm vào `bdsai/apps/api/package.json` dependencies: `drizzle-orm@^0.36`, `postgres@^3` (driver porsager/postgres.js), `@nestjs/config@^4` (tương thích Nest 11), `@supabase/supabase-js@^2`. devDependencies: `drizzle-kit@^0.31`.
  - [x] `yarn install` ở `bdsai/` (yarn 4.9.2 qua corepack). Xác nhận không phá build hiện có.
- [x] **Task 2 — ConfigModule + env schema fail-fast (AC2)**
  - [x] Tạo `bdsai/apps/api/src/config/env.validation.ts`: schema validate biến môi trường (dùng Zod từ `@bdsai/shared` để nhất quán FE/BE, hoặc class-validator/joi). Biến bắt buộc: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` (default `listings`). Thiếu → throw lúc bootstrap.
  - [x] Import `ConfigModule.forRoot({ isGlobal: true, validate })` vào `app.module.ts` (giữ comment AD-1 sẵn có; KHÔNG xoá module nghiệp vụ placeholder).
- [x] **Task 3 — Drizzle client + drizzle.config.ts + migration rỗng (AC1, AC4, AC5)**
  - [x] Tạo `bdsai/apps/api/src/db/drizzle.config.ts` (drizzle-kit config): `dialect: 'postgresql'`, `schema: './src/db/schema/*'`, `out: './src/db/migrations'`, `dbCredentials.url` đọc từ `process.env.DATABASE_URL` (qua `dotenv` cho CLI). Lưu ý: file CLI này nằm ngoài DI nên đọc env trực tiếp được phép.
  - [x] Tạo Drizzle DB provider trong NestJS: `bdsai/apps/api/src/db/database.module.ts` + `database.provider.ts` — khởi tạo `postgres(url, { prepare: false, max, idle_timeout })` và `drizzle(client)`, expose qua DI token (vd `DRIZZLE`). Đọc URL qua `ConfigService` (KHÔNG `process.env` trực tiếp trong runtime app).
  - [x] `src/db/schema/` để TRỐNG (chỉ `index.ts` export rỗng / `.gitkeep`) — KHÔNG định nghĩa bảng nghiệp vụ (AC4).
  - [x] Thêm scripts vào `apps/api/package.json`: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), trỏ `--config src/db/drizzle.config.ts`.
  - [x] Chạy `yarn db:generate` → tạo migration rỗng (hoặc snapshot ban đầu); `yarn db:migrate` → apply. Verify idempotent.
- [x] **Task 4 — Supabase Auth + Storage client (AC3)**
  - [x] Tạo `bdsai/apps/api/src/supabase/supabase.module.ts` + `supabase.service.ts`: khởi tạo `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` (server-side, dùng service-role cho thao tác backend). Expose `.auth` và `.storage` qua service. (AD-5: public auth qua Supabase; AD-2 exception: auth + storage là service riêng.)
  - [x] Frontend Supabase client (`bdsai/apps/web/lib/supabase/client.ts` + `server.ts`) hiện là placeholder từ 1.1 → khởi tạo client read-only + auth bằng `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (AD-2: FE read-only, KHÔNG service-role key ở FE). Tối thiểu wire env + export client; CHƯA cần UI.
- [x] **Task 5 — Healthcheck endpoint (AC3, AC7)**
  - [x] Tạo `bdsai/apps/api/src/health/health.module.ts` + `health.controller.ts` + `health.service.ts`: `GET /health/supabase` chạy `SELECT 1` (Drizzle), ping auth, list storage bucket. Trả `{ db, auth, storage }` status. Lỗi → exception filter trả error shape chuẩn `{ statusCode, message, error?, details? }`.
- [x] **Task 6 — Env mẫu + chốt PG version (AC2, AC6)**
  - [x] Tạo `bdsai/apps/api/.env.example` với mọi biến (giá trị mẫu local từ `supabase status`): `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54352/postgres`, `SUPABASE_URL=http://127.0.0.1:54351`, `SUPABASE_ANON_KEY=<lấy từ supabase status>`, `SUPABASE_SERVICE_ROLE_KEY=<lấy từ supabase status>`, `SUPABASE_STORAGE_BUCKET=listings`. Cập nhật `bdsai/.env.example` root: bổ sung `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (thay comment "điền ở Story 1.2"). **KHÔNG commit `.env` thật / key thật** — chỉ `.env.example` với placeholder hoặc key local demo (key local Supabase là cố định cho dev, không nhạy cảm; key prod KHÔNG bao giờ vào repo).
  - [x] Đổi `supabase/config.toml` `major_version = 17` → `15` (AC6). `supabase stop` → `supabase start` lại → `psql -c "SELECT version();"` xác nhận PostgreSQL 15.x.
- [x] **Task 7 — Test (AC7)**
  - [x] Unit test: env validation throw khi thiếu biến bắt buộc.
  - [x] Integration test: `/health/supabase` trả OK (Supabase đang chạy); mock/giả lập DB down → trả lỗi đúng shape.
  - [x] `yarn lint && yarn typecheck && yarn test` ở `apps/api` PASS. `yarn build` cả monorepo PASS (không phá Story 1.1).

## Dev Notes

### Bối cảnh dự án (BẮT BUỘC đọc trước khi code)
- Dự án: **bdsai.vn** — sàn rao vặt BĐS AI khu vực Long Thành. **KHÔNG** phải Twenty CRM. Code Twenty ở `packages/twenty-*` chỉ là tham khảo — **KHÔNG đụng tới**.
- Codebase thật nằm tại **`bdsai/`** (greenfield, scaffold xong ở Story 1.1). Mọi đường dẫn dưới đây tương đối từ `bdsai/`.
- Kiến trúc 3 tầng Layered-Modular: Presentation (Next.js 16) → Application (NestJS 11) → Data (Supabase + Redis). [Source: ARCHITECTURE-SPINE.md#Design-Paradigm]

### Trạng thái từ Story 1.1 (đã DONE — KHÔNG làm lại)
- Monorepo Turborepo chạy: `apps/web` (Next.js 16.2.9 / React 19), `apps/api` (NestJS 11.1.27), `packages/shared` (`@bdsai/shared`, Zod 3.25.76).
- TS strict toàn workspace (`tsconfig.base.json`: ES2022, moduleResolution Bundler, `noUncheckedIndexedAccess`).
- `apps/api/src/db/{schema,migrations}/` đã tồn tại nhưng **RỖNG** — story này điền vào.
- `apps/api/src/modules/` + `common/{guards,filters,interceptors,decorators}/` đã có (rỗng).
- `apps/web/lib/supabase/index.ts` + `lib/api.ts` là **placeholder** từ 1.1 — story này wire env thật.
- `app.module.ts` hiện `imports: []` với comment AD-1; thêm `ConfigModule` + `DatabaseModule` + `SupabaseModule` + `HealthModule` vào đây. **Giữ comment AD-1.**
- Cổng dev: web `3100`, api `3101`. [Source: harness-workspace/1-1.../02-dev.md]

### ⚠️ PORT SUPABASE CHÍNH THỨC = dải 5435x (KHÔNG dùng 5434x)
project_id = `bdsai`. Dải 5434x đã bị `epsilon-local` chiếm lúc scaffold → bdsai chuyển 5435x:
| Service | Port | Dùng cho |
|---|---|---|
| API (kong) | `54351` | `SUPABASE_URL=http://127.0.0.1:54351` |
| DB (postgres) | `54352` | `DATABASE_URL` (local trực tiếp) |
| Studio | `54353` | UI quản lý |
| Inbucket/Mailpit | `54354` | email test |
| Analytics | `54359` | (config) |
| shadow_db | `54350` | drizzle/diff |
[Source: harness-workspace/1-1.../00-infra-decisions.md, 02-dev.md]
Lấy anon key + service-role key thật bằng `supabase status` (sau `supabase start`).

### ⚠️ L1 — PostgreSQL version mismatch (AC6, BẮT BUỘC xử lý)
- `supabase/config.toml` dòng 36: `major_version = 17` (default supabase init mới).
- Stack doc: `Supabase | Free tier | PostgreSQL 15`. [Source: ARCHITECTURE-SPINE.md#Stack]
- AC Story 1.2 gốc: "Drizzle kết nối được **PostgreSQL 15**". [Source: epics.md#Story-1.2]
- → Lệch. Quyết định mặc định: pin local về **15** cho khớp. Phải `supabase stop && supabase start` lại sau khi đổi (đổi major_version yêu cầu tái tạo DB volume). Đây là lý do AC6 tồn tại — đừng bỏ qua, reviewer 1.1 đã flag.

### Invariants áp dụng (BẮT BUỘC tuân — vi phạm = review fail)
- **AD-2 (Single Data Mutation Path):** Mọi mutation entity nghiệp vụ đi qua NestJS → Service → Drizzle. **Exception được phép:** Supabase **Auth** (`auth.*`) và **Storage upload** trực tiếp — chúng là service riêng, KHÔNG phải business write. Story này chỉ *khởi tạo* client, chưa có mutation nghiệp vụ. [Source: ARCHITECTURE-SPINE.md#AD-2]
- **AD-5 (Auth Separation):** Public users qua Supabase Auth (JWT); admin qua NestJS guard. Story này lập Supabase client nền tảng cho cả hai. Service-role key chỉ ở **backend** (apps/api), anon key cho frontend. [Source: ARCHITECTURE-SPINE.md#AD-5]
- **AD-8 (Data Privacy & PII):** Story này **KHÔNG lưu PII** (chưa có bảng user). Healthcheck/log **KHÔNG in chuỗi kết nối, key, hay PII**. [Source: ARCHITECTURE-SPINE.md#AD-8]
- **AD-1 (Module Isolation):** `DatabaseModule`/`SupabaseModule` expose service interface qua DI token; module khác inject service, KHÔNG truy cập client/connection trực tiếp. [Source: ARCHITECTURE-SPINE.md#AD-1]
- **AD-10 (Next.js API Route Boundary):** Nếu chạm `apps/web`, API route chỉ proxy/forward — ZERO business logic, KHÔNG truy cập DB trực tiếp từ Next. [Source: ARCHITECTURE-SPINE.md#AD-10]

### Consistency conventions (BẮT BUỘC) [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions]
- Files **kebab-case** (`database.module.ts`, `supabase.service.ts`). Entities **PascalCase** (`DatabaseModule`).
- DB tables **snake_case plural** (khi tạo ở story sau).
- IDs: UUID v4 (`gen_random_uuid()`). Dates: ISO 8601, `timestamptz`, serialize UTC.
- Error shape: `{ statusCode, message, error?, details? }` qua NestJS exception filter.
- Config: env qua `.env` + **NestJS ConfigModule** (KHÔNG `process.env` rải rác trong runtime; CLI script như drizzle.config được phép dùng dotenv).
- Validation: Zod schema share FE/BE ở `packages/shared` khi cần; class-validator trên DTO.
- Logging: NestJS Logger, structured JSON.

### Quyết định kỹ thuật cụ thể (chống reinvent + sai lib)
- **Driver:** `postgres` (porsager/postgres.js) — chính thức được Drizzle khuyến nghị cho Supabase, KHÔNG dùng `pg` node-postgres cho transaction pooler. [Source: Drizzle docs — connect-supabase]
- **`prepare: false` BẮT BUỘC** khi qua Supavisor transaction pool mode (port 6543, prod). Local trực tiếp 54352 cũng để `prepare: false` cho nhất quán an toàn. Mẫu:
  ```typescript
  // Disable prefetch — không hỗ trợ ở "Transaction" pool mode
  const client = postgres(url, { prepare: false, max: 10, idle_timeout: 20 });
  const db = drizzle({ client });
  ```
- **drizzle.config.ts** (file CLI, đọc dotenv trực tiếp được phép): `dialect: 'postgresql'`, `schema: './src/db/schema/*'`, `out: './src/db/migrations'`. [Source: Drizzle docs — drizzle-with-supabase tutorial]
- **`out` migration:** đặt `./src/db/migrations` (KHÔNG `./supabase/migrations`) để Drizzle quản lý độc lập với supabase CLI migration — tránh xung đột 2 hệ migration. Story 1.6 sẽ document quy trình migration đầy đủ.
- **`@nestjs/config`** cho ConfigModule (`isGlobal: true` + `validate`). KHÔNG tự viết wrapper env.
- **`@supabase/supabase-js` v2** `createClient` cho auth + storage.

### Versions (theo stack doc + latest tương thích Nest 11 / Node 22)
| Package | Version | Ghi chú |
|---|---|---|
| drizzle-orm | `^0.36` | Theo stack doc (Drizzle ORM 0.36.x) |
| drizzle-kit | `^0.31` | Latest tương thích (0.31.x), dùng `generate`/`migrate` |
| postgres (postgres.js) | `^3` | Driver Supabase-recommended |
| @nestjs/config | `^4` | Tương thích NestJS 11 |
| @supabase/supabase-js | `^2` | Auth + Storage client |
[Source: ARCHITECTURE-SPINE.md#Stack + Drizzle docs Context7]

### Source tree — file sẽ tạo/sửa (trong `bdsai/`)
**NEW:**
- `apps/api/src/config/env.validation.ts`
- `apps/api/src/db/drizzle.config.ts`
- `apps/api/src/db/database.module.ts` + `database.provider.ts`
- `apps/api/src/db/schema/index.ts` (export rỗng — AC4)
- `apps/api/src/supabase/supabase.module.ts` + `supabase.service.ts`
- `apps/api/src/health/health.module.ts` + `health.controller.ts` + `health.service.ts`
- `apps/api/.env.example`
- Test: `apps/api/src/config/env.validation.spec.ts`, `apps/api/test/health.e2e-spec.ts` (hoặc integration)
- (web) wire `apps/web/lib/supabase/client.ts` + `server.ts`
**UPDATE:**
- `apps/api/src/app.module.ts` (import ConfigModule + DatabaseModule + SupabaseModule + HealthModule; giữ comment AD-1)
- `apps/api/package.json` (deps + scripts `db:generate`/`db:migrate`)
- `bdsai/.env.example` (root — bổ sung biến NEXT_PUBLIC_SUPABASE_*)
- `supabase/config.toml` (`major_version` 17 → 15)
[Source: ARCHITECTURE-SPINE.md#Structural-Seed — `apps/api/src/db/drizzle.config.ts`, `lib/supabase/{client,server}.ts`]

### Edge cases cần xử lý
- **Thiếu env bắt buộc** → fail-fast lúc bootstrap, KHÔNG để app chạy với config nửa vời (AC2).
- **DB unreachable** lúc healthcheck → trả lỗi đúng error shape, KHÔNG crash app (AC3, AC7).
- **`migrate` chạy lần 2** → idempotent (AC1).
- **PG version sau khi đổi config** → nếu quên `supabase stop/start`, DB cũ vẫn PG17 → `SELECT version()` để verify thật (AC6).
- **Connection leak** → đặt `max` + `idle_timeout`; trên Supabase Free số connection rất hạn chế, pool to gây lỗi "too many connections" (AC5).

### Testing standards
- Unit test: Jest (đã cấu hình `apps/api/jest.config.cjs` từ 1.1). File `*.spec.ts` cạnh source.
- Integration/e2e: supertest qua `apps/api/test/` (mẫu `app.e2e-spec.ts` đã có từ 1.1).
- Story chỉ Done khi test PASS. CI gate thật ở Story 1.3. [Source: epics.md#Quy-ước-test]
- Edge case nêu ở AC phải có test tương ứng.

### Project Structure Notes
- Mọi file đặt đúng `Structural Seed` của architecture (db/, lib/supabase/). Không lệch.
- KHÔNG tạo bảng → `schema/` rỗng có chủ đích (AC4); reviewer đừng coi là thiếu sót.
- Drizzle migration `out` tách khỏi `supabase/migrations` — quyết định có chủ đích để 1 hệ migration (Drizzle) là nguồn chân lý cho schema nghiệp vụ.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2] — AC gốc Given/When/Then
- [Source: _bmad-output/planning-artifacts/epics.md#Quy-ước-test] — bắt buộc test mỗi story
- [Source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md#AD-1] — Module Isolation
- [Source: ARCHITECTURE-SPINE.md#AD-2] — Single Data Mutation Path (+ exception Auth/Storage)
- [Source: ARCHITECTURE-SPINE.md#AD-5] — Auth Separation
- [Source: ARCHITECTURE-SPINE.md#AD-8] — Data Privacy & PII
- [Source: ARCHITECTURE-SPINE.md#AD-10] — Next.js API Route Boundary
- [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions] — naming, error shape, config, validation
- [Source: ARCHITECTURE-SPINE.md#Stack] — versions (PostgreSQL 15, Drizzle 0.36)
- [Source: ARCHITECTURE-SPINE.md#Structural-Seed] — vị trí drizzle.config.ts, lib/supabase
- [Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md] — port 5435x, vị trí code `bdsai/`
- [Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/02-dev.md] — trạng thái scaffold, L1 PG version, port mapping
- [Source: Drizzle ORM docs (Context7 /drizzle-team/drizzle-orm-docs)] — connect-supabase (`prepare: false`), drizzle.config.ts, drizzle-kit migrate

## Dev Agent Record

### Agent Model Used

opus-4.8 (skill bmad-dev-story, agent story-developer)

### Debug Log References

- Log đầy đủ + paste output thật: `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md`
- Verify chính: PG 15.8 (AC6), migrate idempotent (AC1), `/health/supabase` → 200 `{db:up, auth:up, storage:up}` REAL (AC3), full build/typecheck/lint/test PASS.

### Completion Notes List

- **AC1 (Drizzle + migration rỗng):** drizzle-kit `generate` báo `0 tables` (schema rỗng có chủ đích — AC4), `migrate` kết nối postgres.js tới PG 54352 và tạo bảng metadata `drizzle.__drizzle_migrations` thành công. Chạy `migrate` lần 2 → idempotent (chỉ NOTICE "already exists, skipping", vẫn "applied successfully").
- **AC2 (Config fail-fast):** `env.validation.ts` dùng Zod (đồng bộ @bdsai/shared), `ConfigModule.forRoot({ isGlobal:true, validate })`. Thiếu biến bắt buộc → throw lúc bootstrap, message chỉ in tên biến + lý do (KHÔNG lộ secret — AD-8). 7 unit test phủ các nhánh.
- **AC3 (Auth + Storage + healthcheck):** `SupabaseService` (service-role, server-side) expose `.auth`/`.storage`. `GET /health/supabase` ping 3 thành phần độc lập (Promise.all, mỗi cái try/catch riêng). All up → 200; bất kỳ down → 503 + error shape chuẩn `{statusCode, message, error, details}`. Verify REAL: 200 `{db:up,auth:up,storage:up}`; integration test giả lập DB down → 503 đúng shape, không lộ connection string.
- **AC4 (Không bảng nghiệp vụ):** `schema/index.ts` export rỗng. Sau migrate, `public` không có bảng nghiệp vụ nào; chỉ có `drizzle.__drizzle_migrations` (metadata).
- **AC5 (Pooling):** `postgres(url, { prepare:false, max:10, idle_timeout:20 })` — `prepare:false` cho transaction pool mode (prod 6543). `DatabaseModule.onModuleDestroy` đóng pool (enableShutdownHooks) tránh leak.
- **AC6 (PG version):** `config.toml major_version 17 → 15`, `supabase stop` (xoá volume PG17) → `supabase start` → `SELECT version()` = **PostgreSQL 15.8**. KHÔNG còn lệch giữa config.toml và stack doc.
- **AC7 (Test):** unit (env validation, 7 ca) + integration e2e (healthcheck 2 ca: up + DB-down shape). `apps/api` test 11 pass, e2e 3 pass. Full monorepo: build 3/3, typecheck 4/4, lint 4/4 PASS (không phá Story 1.1).
- **Web (Task 4):** `lib/supabase/client.ts` (browser, `@supabase/ssr` createBrowserClient) + `server.ts` (createServerClient + cookies) — CHỈ anon key (AD-5), FE read-only (AD-2). Build web PASS với `.env.local`.
- **Quyết định nhỏ:** (1) Thêm token file riêng `database.tokens.ts`/`supabase.tokens.ts` (Symbol token + decorator) cho AD-1 isolation thay vì gộp trong module. (2) e2e đặt `jest.setTimeout(120s)` vì cold-start kết nối auth/storage qua HTTP có thể chậm khi Docker tải nặng (đo thật: lần đầu 73s cold, warm 55–263ms). (3) Dùng new-format key? KHÔNG — dùng legacy JWT anon/service_role key (demo local cố định) cho tương thích `@supabase/supabase-js` v2 hiện tại.
- **Lưu ý môi trường (KHÔNG phải lỗi story):** máy chạy nhiều project Supabase đồng thời → `supabase start` phải kéo image PG15 (~339MB) lần đầu + studio health-check timeout; dùng `--ignore-health-check` như Story 1.1 đã ghi nhận. Cold-start request đầu tiên chậm do Docker quá tải, không phải lỗi code.

### File List

**NEW (apps/api):**
- `bdsai/apps/api/src/config/env.validation.ts`
- `bdsai/apps/api/src/config/env.validation.spec.ts`
- `bdsai/apps/api/src/db/drizzle.config.ts`
- `bdsai/apps/api/src/db/database.module.ts`
- `bdsai/apps/api/src/db/database.tokens.ts`
- `bdsai/apps/api/src/db/schema/index.ts`
- `bdsai/apps/api/src/supabase/supabase.module.ts`
- `bdsai/apps/api/src/supabase/supabase.service.ts`
- `bdsai/apps/api/src/supabase/supabase.tokens.ts`
- `bdsai/apps/api/src/health/health.module.ts`
- `bdsai/apps/api/src/health/health.controller.ts`
- `bdsai/apps/api/src/health/health.service.ts`
- `bdsai/apps/api/test/health.e2e-spec.ts`
- `bdsai/apps/api/.env.example`
- `bdsai/apps/api/.env` (gitignored — local, KHÔNG commit)
- `bdsai/apps/api/src/db/migrations/meta/_journal.json` (drizzle-kit khởi tạo)

**NEW (apps/web):**
- `bdsai/apps/web/lib/supabase/client.ts`
- `bdsai/apps/web/lib/supabase/server.ts`
- `bdsai/apps/web/.env.local` (gitignored — local, KHÔNG commit)

**UPDATE:**
- `bdsai/apps/api/src/app.module.ts` (import ConfigModule + DatabaseModule + SupabaseModule + HealthModule; giữ comment AD-1)
- `bdsai/apps/api/package.json` (deps drizzle-orm/postgres/@nestjs/config/@supabase/supabase-js/zod + devDeps drizzle-kit/dotenv + scripts db:generate/db:migrate)
- `bdsai/apps/web/package.json` (deps @supabase/ssr + @supabase/supabase-js)
- `bdsai/apps/web/lib/supabase/index.ts` (export createBrowserSupabaseClient)
- `bdsai/.env.example` (bổ sung NEXT_PUBLIC_SUPABASE_*)
- `bdsai/supabase/config.toml` (major_version 17 → 15 — AC6)
- `bdsai/yarn.lock` (yarn install deps mới)

### Change Log

- 2026-06-25: Implement Story 1.2 — Kết nối Supabase (Drizzle + Auth + Storage + healthcheck). 7/7 task hoàn tất, 7/7 AC thỏa. PG pin về 15.8 (AC6). Test 11 unit + 3 e2e PASS, full monorepo build/typecheck/lint PASS. Status → review.
