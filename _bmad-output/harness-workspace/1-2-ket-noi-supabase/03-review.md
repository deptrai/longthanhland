# Code Review — Story 1.2: Kết nối Supabase

- **Story key:** 1-2-ket-noi-supabase
- **Agent:** code-reviewer (opus-4.8)
- **Ngày:** 2026-06-25
- **Verdict:** **APPROVED** (không có finding critical/high; 6 finding low — khuyến nghị sửa ở story sau, không chặn Done)

---

## 1. Phương pháp verify (adversarial — KHÔNG tin log dev)

- Tự đọc toàn bộ code thật bằng `read` (env.validation, drizzle.config, database.module/tokens, supabase.module/service/tokens, health.module/controller/service, app.module, schema/index, main.ts, web client/server/index, config.toml, .env.example root+api, package.json).
- Tự chạy `git check-ignore`: `apps/api/.env`, `apps/web/.env.local`, `.env` → **ignored** (exit 0); `.env.example` + `apps/api/.env.example` → **NOT ignored** (exit 1). `.env` thật KHÔNG bị track.
- Tự chạy `yarn workspace @bdsai/api test` → **11 passed** (env.validation 7 + app.controller 4). Khớp log dev.
- Tự chạy `yarn workspace @bdsai/api typecheck` → **exit 0**. `yarn workspace @bdsai/api lint` → **exit 0**.
- Tự chạy `yarn build` (cả monorepo) → **3 successful, 3 total** (shared cache hit, api cache hit, web build OK prerender / + /_not-found). Không phá Story 1.1.
- AC6: đọc `bdsai/supabase/config.toml` dòng 37 → `major_version = 15` ✓. (Supabase local đang stop nên không chạy lại `SELECT version()` — nhưng config đã pin 15, khớp stack doc; log dev paste PG 15.8.)
- AC1/AC4: `apps/api/src/db/migrations/meta/_journal.json` = `{"version":"7","dialect":"postgresql","entries":[]}` — journal rỗng, không có file SQL (drizzle-kit generate với schema rỗng không tạo artifact). `schema/index.ts` = `export {}` (rỗng có chủ đích).
- grep `process.env` trong `apps/api/src` → chỉ 2 hit: `drizzle.config.ts` (CLI, được phép) + `main.ts` (port — xem LOW-1).
- grep secret/key trong source → 0 hit (chỉ test fixture trong spec).

> Lưu ý: KHÔNG chạy lại e2e `test/health.e2e-spec.ts` vì Supabase local đang stop (reviewer không khởi động lại để tránh phá môi trường dev). Unit test + build + typecheck + lint đã verify độc lập. e2e yêu cầu Supabase chạy — leader/e2e-tester chạy ở bước tiếp theo.

---

## 2. Findings theo severity

### Critical — KHÔNG

### High — KHÔNG

### Medium — KHÔNG

### Low

#### LOW-1 — `main.ts:11` đọc port qua `process.env` thay vì ConfigService
- **File:** `bdsai/apps/api/src/main.ts:11`
- **Mô tả:** `const port = Number(process.env.API_PORT ?? 3101);` bypass ConfigService. AC2 + Consistency Conventions yêu cầu "Config qua `.env` + ConfigModule (KHÔNG `process.env` rải rác trong runtime)". Port không phải secret nên không vi phạm AD-8, nhưng lệch quy ước. Lý do khả thi: cần port trước `app.listen`, nhưng `app.get(ConfigService)` lấy được sau `NestFactory.create`.
- **Cách sửa:** `const config = app.get(ConfigService); const port = config.get('API_PORT', { infer: true });`
- **Severity:** low (không chặn Done).

#### LOW-2 — `supabase.tokens.ts` dead code (SUPABASE_CLIENT / InjectSupabase không dùng)
- **File:** `bdsai/apps/api/src/supabase/supabase.tokens.ts:5-8`
- **Mô tả:** `SUPABASE_CLIENT` Symbol + `InjectSupabase` decorator định nghĩa nhưng không bao giờ được import/provide ở đâu (SupabaseModule provide `SupabaseService` theo class token, không theo Symbol). grep chỉ trả về chính file định nghĩa. Dead code gây nhầm lẫn cho story sau.
- **Cách sửa:** xoá file `supabase.tokens.ts`, hoặc chuyển SupabaseModule sang provide `SUPABASE_CLIENT` token (nhất quán với DatabaseModule dùng Symbol). Khuyến nghị xoá nếu không dùng.
- **Severity:** low.

#### LOW-3 — `DatabaseModule` export `PG_CLIENT` (raw client) không có consumer — yếu AD-1
- **File:** `bdsai/apps/api/src/db/database.module.ts:48` + `database.tokens.ts:8-9`
- **Mô tả:** Module export cả `PG_CLIENT` (postgres.js client thô) với comment "dùng cho health SELECT 1 + đóng connection", nhưng `health.service.ts:54` thực tế dùng `DRIZZLE` (`this.db.execute(sql\`SELECT 1\`)`), KHÔNG dùng PG_CLIENT. Việc expose raw client cho phép module nghiệp vụ sau này inject và bypass Drizzle → đi ngược tinh thần AD-1 (Module Isolation: inject service interface, không truy cập client/connection trực tiếp). `OnModuleDestroy` vẫn inject PG_CLIENT nội bộ (đúng) — chỉ việc **export** là thừa.
- **Cách sửa:** bỏ `PG_CLIENT` khỏi `exports` (giữ trong providers để OnModuleDestroy inject nội bộ). Khi có consumer thật mới export.
- **Severity:** low.

#### LOW-4 — `health.service.ts` trả `error.message` của Supabase chưa qua redact
- **File:** `bdsai/apps/api/src/health/health.service.ts:67,80`
- **Mô tả:** Nhánh `checkAuth`/`checkStorage` khi Supabase trả `{ error }` (không throw) thì return `{ status:'down', error: error.message }` — message chưa qua `safeMessage` redact. Nhánh catch (throw) thì đã qua `safeMessage`. Supabase error.message thường không chứa key/URL, nhưng để nhất quán AD-8 nên пропуск cả 2 nhánh qua redact.
- **Cách sửa:** `return { status: 'down', error: this.safeMessage(new Error(error.message)) };` hoặc bọc `error.message` qua cùng hàm redact.
- **Severity:** low.

#### LOW-5 — Không có artifact migration (journal rỗng, 0 file SQL)
- **File:** `bdsai/apps/api/src/db/migrations/meta/_journal.json` + thư mục `migrations/`
- **Mô tả:** AC1 nói "migration đầu tiên (rỗng) apply thành công, ghi vào bảng metadata migration". Thực tế drizzle-kit `generate` với schema rỗng in "No schema changes, nothing to migrate 😴" và KHÔNG tạo file SQL nào; journal `entries: []`. `db:migrate` vẫn kết nối + tạo bảng `drizzle.__drizzle_migrations` (metadata) — connection OK. Như vậy "migration rỗng" không tồn tại dạng file; chỉ có metadata table. Chấp nhận được vì đây là behavior drizzle-kit với schema rỗng (AC4 cấm tạo bảng), nhưng cần document để e2e-tester/reviewer story sau không kỳ vọng file migration 0000.
- **Cách sửa (tùy chọn):** thêm note vào `schema/index.ts` hoặc README rằng "migration đầu tiên sẽ sinh khi story 2.1/3.1 thêm bảng". KHÔNG cần tạo migration rỗng giả.
- **Severity:** low.

#### LOW-6 — `DB_IDLE_TIMEOUT` cho phép `0` (disable timeout)
- **File:** `bdsai/apps/api/src/config/env.validation.ts:40`
- **Mô tả:** `z.coerce.number().int().nonnegative().default(20)` chấp nhận `0`. Trong postgres.js, `idle_timeout: 0` = disabled → connection rảnh không được giải phóng → rủi ro leak trên Supabase Free (AC5). Default 20 an toàn, nhưng nếu ai đặt `DB_IDLE_TIMEOUT=0` sẽ vô hiệu cơ chế chống leak.
- **Cách sửa:** đổi `.nonnegative()` → `.positive()` (hoặc `.min(1)`).
- **Severity:** low.

---

## 3. Bảng verify AC1–AC7

| AC | Nội dung | Kết quả | Bằng chứng |
|----|----------|---------|------------|
| AC1 | Drizzle kết nối PG, migration rỗng chạy + idempotent, có bảng metadata | **PASS** (có note LOW-5) | `database.module.ts` postgres.js+drizzle; `drizzle.config.ts` dialect postgresql; log dev paste `migrate` thành công + idempotent + `drizzle.__drizzle_migrations` tồn tại. Journal rỗng (không file SQL) — chấp nhận do schema rỗng (AC4). Reviewer không chạy lại được (Supabase stop). |
| AC2 | Config 100% qua ConfigModule + .env, fail-fast, không hardcode | **PASS** (có note LOW-1) | `env.validation.ts` Zod schema, `validateEnv` throw chỉ in tên biến+lý do (AD-8); `app.module.ts` `ConfigModule.forRoot({ isGlobal, validate })`; `database.module.ts`/`supabase.service.ts` đọc qua `ConfigService.get(...,{infer:true})`; grep `process.env` runtime chỉ có `main.ts` port (LOW-1). Không hardcode secret trong source. |
| AC3 | Auth + Storage client + healthcheck 3 thành phần, error shape chuẩn | **PASS** | `supabase.service.ts` createClient(service-role, persistSession:false) expose `.auth`/`.storage`; `health.controller.ts` `GET /health/supabase` → 200 khi all up, 503 + shape `{statusCode,message,error,details}` khi down; `health.service.ts` Promise.all 3 check độc lập try/catch. Log dev paste 200 `{db:up,auth:up,storage:up}`. |
| AC4 | KHÔNG tạo bảng nghiệp vụ | **PASS** | `schema/index.ts` = `export {}` (rỗng có chủ đích, comment liệt kê bảng sẽ tạo ở story sau); log dev paste `pg_tables WHERE schemaname='public'` = rỗng. |
| AC5 | Connection pooling postgres.js `prepare:false`, `max`, `idle_timeout` | **PASS** (có note LOW-6) | `database.module.ts:34-38` `postgres(url,{prepare:false,max,idle_timeout})`; `env.validation.ts` `DB_POOL_MAX`(default 10), `DB_IDLE_TIMEOUT`(default 20). `.env.example` ghi rõ prod dùng Supavisor 6543 + prepare:false. LOW-6: idle_timeout cho phép 0. |
| AC6 | PG version khớp config.toml + stack doc = 15 | **PASS** | `supabase/config.toml:37` `major_version = 15` (đổi từ 17, có comment AC6); stack doc `ARCHITECTURE-SPINE.md:154` PostgreSQL 15. Log dev paste `SELECT version()` = PostgreSQL 15.8. |
| AC7 | Test tự động (unit + integration, edge case) | **PASS** | `env.validation.spec.ts` 7 ca (parse, coerce, thiếu từng biến, sai scheme, AD-8 không lộ secret); `health.e2e-spec.ts` 2 ca (200 khi up, 503 + error shape khi DB unreachable + redact url). Unit test verify độc lập: 11 passed. e2e cần Supabase chạy (leader/e2e-tester chạy tiếp). |

---

## 4. Bảng verify invariant AD

| AD | Nội dung | Kết quả | Bằng chứng / note |
|----|----------|---------|-------------------|
| AD-1 | Module Isolation — DI token Symbol, inject service, không truy cập client trực tiếp | **PASS** (note LOW-2, LOW-3) | `DRIZZLE`/`PG_CLIENT` = Symbol; `SupabaseService` expose getter `.auth`/`.storage`/`.raw`; HealthModule inject `DRIZZLE` + `SupabaseService`. LOW-3: export PG_CLIENT raw thừa. LOW-2: SUPABASE_CLIENT token dead code. |
| AD-2 | Single Data Mutation Path — story chỉ khởi tạo client, chưa mutation | **PASS** | Không có `insert/update/delete` nào trong code story. SupabaseService chỉ createClient + getter. Healthcheck chỉ `SELECT 1` + listUsers(1) + listBuckets (read). |
| AD-5 | Auth Separation — service-role chỉ api, web chỉ anon NEXT_PUBLIC_* | **PASS** | `supabase.service.ts` dùng `SUPABASE_SERVICE_ROLE_KEY` (backend); `apps/web/lib/supabase/{client,server}.ts` dùng `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (FE). `.env.example` root không có service-role. |
| AD-8 | PII/secret redact — healthcheck không log key/connection string | **PASS** (note LOW-4) | `supabase.service.ts:38` log chỉ host+bucket; `env.validation.ts` throw chỉ in tên biến; `health.service.ts:93` `safeMessage` redact `postgres(ql)://` + slice 200; e2e test assert `res.body` không match `postgres(ql)://`. LOW-4: nhánh `error.message` (non-throw) chưa qua redact. |
| AD-10 | Next API route mỏng | **PASS** (N/A story này) | Story 1.2 không tạo API route Next nào; `lib/supabase/{client,server}.ts` là client factory, không chứa business logic. Comment trong file nhắc AD-10. |

---

## 5. Kết luận + recommendation

**Verdict: APPROVED.**

Code Story 1.2 đúng 7/7 AC, tuân 5 invariant AD áp dụng, an toàn (không hardcode secret, `.env` gitignored, fail-fast config, redact PII/URL). Build/typecheck/lint/unit-test verify độc lập PASS, không phá Story 1.1. AC6 (PG15) đã pin đúng ở `config.toml`.

Không có finding critical/high. 6 finding low đều là dọn dẹp/consistency, KHÔNG chặn Done:
- LOW-1 (main.ts port qua process.env), LOW-2 (dead token), LOW-3 (export raw client thừa), LOW-4 (redact nhánh non-throw), LOW-5 (document journal rỗng), LOW-6 (idle_timeout cho phép 0).

**Recommendation:**
1. **Leader:** chuyển story sang bước e2e-tester (chạy `test/health.e2e-spec.ts` với Supabase local đã start + `apps/api/.env` có key thật) để verify AC3/AC7 end-to-end thật.
2. **Story sau (2.1/3.1):** xử lý LOW-1 → LOW-6 khi chạm lại các file này (không cần story riêng). Đặc biệt LOW-3 (bỏ export PG_CLIENT) và LOW-6 (idle_timeout positive) nên fix trước khi có traffic thật.
3. **e2e-tester:** lưu ý cold-start healthcheck có thể chậm (log dev ghi 73s lần đầu do Docker); test đã đặt `jest.setTimeout(120_000)`.
