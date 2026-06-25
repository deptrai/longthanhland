# Story 1.2 — Dev Log (story-developer)

**Story:** 1-2-ket-noi-supabase
**Agent:** opus-4.8 (skill bmad-dev-story)
**Ngày:** 2026-06-25
**Kết quả:** PASS — Status → `review`
**baseline_commit:** 4c45fef8d17c8e263ff4dedabca64eb4c232da4a

---

## 1. Tóm tắt

Kết nối `apps/api` (NestJS 11) với Supabase local (dải port 5435x, PG15) qua:
- **Drizzle ORM** + driver **postgres.js** (`prepare:false`, pool max/idle) → DI token `DRIZZLE`/`PG_CLIENT`.
- **@nestjs/config** + Zod validate fail-fast (token-less, isGlobal).
- **SupabaseService** (service-role, server-side) expose `.auth`/`.storage`.
- **HealthModule** `GET /health/supabase` ping db/auth/storage độc lập.
- Web: `lib/supabase/{client,server}.ts` (anon key, FE read-only — AD-2/AD-5).
- **AC6:** pin `config.toml major_version 17 → 15`, tái tạo volume → PG **15.8**.

7/7 task done, 7/7 AC thỏa. KHÔNG tạo bảng nghiệp vụ (AC4).

---

## 2. File tạo/sửa

NEW api: `src/config/env.validation.ts(.spec)`, `src/db/{drizzle.config,database.module,database.tokens}.ts`, `src/db/schema/index.ts`, `src/supabase/{supabase.module,supabase.service,supabase.tokens}.ts`, `src/health/{health.module,health.controller,health.service}.ts`, `test/health.e2e-spec.ts`, `.env.example`, `.env`(gitignored).
NEW web: `lib/supabase/{client,server}.ts`, `.env.local`(gitignored).
UPDATE: `apps/api/src/app.module.ts`, `apps/api/package.json`, `apps/web/package.json`, `apps/web/lib/supabase/index.ts`, `.env.example`(root), `supabase/config.toml`, `yarn.lock`.

---

## 3. Lệnh đã chạy + output thật

### 3.1 AC6 — PG version (config.toml 17→15, tái tạo volume)
```
$ supabase stop --no-backup
Stopped supabase local development setup.

$ supabase start --ignore-health-check    # kéo image PG15 ~339MB lần đầu (exit 0)
$ docker exec supabase_db_bdsai psql -U postgres -t -c "SELECT version();"
 PostgreSQL 15.8 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
```
→ config.toml + stack doc KHỚP nhau (PG15). AC6 OK.

### 3.2 supabase status (port 5435x xác nhận)
```
Project URL  http://127.0.0.1:54351
DB URL       postgresql://postgres:postgres@127.0.0.1:54352/postgres
Studio       http://127.0.0.1:54353
Mailpit      http://127.0.0.1:54354
```
Key local (legacy JWT demo, cố định) lấy qua `supabase status -o env` → đưa vào `apps/api/.env` (gitignored).

### 3.3 yarn install (deps mới)
```
+ @nestjs/config@4.0.4, @supabase/ssr@0.12.0, @supabase/supabase-js@2.108.2,
  dotenv@16.6.1, drizzle-kit@0.31.10, drizzle-orm@0.36.4, postgres@3.4.9, zod@3.25.76 ...
➤ YN0000: · Done with warnings   (chỉ warning ts-loader→webpack vô hại, có sẵn từ 1.1)
```

### 3.4 AC1/AC4 — Drizzle generate + migrate idempotent
```
$ yarn db:generate
0 tables
No schema changes, nothing to migrate 😴          # schema rỗng có chủ đích (AC4)

$ yarn db:migrate            # lần 1
Using 'postgres' driver for database querying
[✓] migrations applied successfully!

$ yarn db:migrate            # lần 2 — idempotent
... NOTICE 'relation "__drizzle_migrations" already exists, skipping'
[✓] migrations applied successfully!              # KHÔNG lỗi → idempotent OK

$ psql -c "SELECT schemaname,tablename FROM pg_tables WHERE tablename='__drizzle_migrations';"
 drizzle    | __drizzle_migrations                 # bảng metadata tồn tại (AC1)

$ psql -c "... WHERE schemaname='public' AND tablename IN ('public_users','public_listings',...);"
 (rỗng)                                            # KHÔNG bảng nghiệp vụ (AC4)
$ psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"
 (rỗng)
```

### 3.5 AC3 — healthcheck REAL (app build + node dist/main.js + curl)
```
$ yarn build  → nest build OK
$ node dist/main.js
[Nest] SupabaseService  Supabase client khởi tạo (host=127.0.0.1:54351, bucket=listings)
[Nest] RouterExplorer   Mapped {/health/supabase, GET} route

$ curl -w "HTTP=%{http_code} time=%{time_total}s" http://localhost:3101/health/supabase
HTTP=200 time=73.58s    (lần 1 — cold start, Docker tải nặng)
{"status":"ok","db":{"status":"up"},"auth":{"status":"up"},"storage":{"status":"up"}}

# warm:
HTTP=200 time=0.263s
HTTP=200 time=0.055s    # 55–263ms khi warm → healthcheck nhanh, đúng (AC3)
```
→ Cold start 73s là do Docker quá tải lúc kết nối auth/storage qua HTTP lần đầu;
   KHÔNG phải lỗi code (warm 55ms). e2e đặt jest.setTimeout(120s) để hấp thụ.

### 3.6 AC2/AC7 — Test
```
$ yarn test (apps/api)
PASS src/app.controller.spec.ts
PASS src/config/env.validation.spec.ts   (7 ca: parse OK, coerce, thiếu từng biến → throw,
                                           sai scheme, AD-8 không lộ secret)
Tests: 11 passed, 11 total

$ yarn test:e2e (apps/api)               # Supabase đang chạy
PASS test/health.e2e-spec.ts
  ✓ GET /health/supabase → 200 { status: ok }
  ✓ trả error shape chuẩn {statusCode,message,error,details} khi DB unreachable (503, redact url)
Tests: 3 passed, 3 total
```

### 3.7 Full monorepo (không phá Story 1.1)
```
$ yarn build      → 3 successful, 3 total   (shared → api → web; web prerender / + /_not-found)
$ yarn typecheck  → 4 successful, 4 total
$ yarn lint       → 4 successful, 4 total   (đã fix 1 lỗi unused import database.tokens.ts)
$ yarn test       → 3 successful (api 11 unit pass)
```

---

## 4. Bảo mật / invariant

- `.env` thật KHÔNG commit (`git check-ignore apps/api/.env` → ignored). `git status` không thấy file .env nào.
- AD-8: healthcheck error redact connection string (`postgres://...` → `[redacted-url]`); SupabaseService chỉ log host, KHÔNG log key. Test khẳng định response không chứa `postgres://`.
- AD-5: service-role key chỉ ở apps/api; web chỉ anon key (NEXT_PUBLIC_*).
- AD-1: DB + Supabase expose qua Symbol DI token, module khác inject — không tạo client riêng.
- AD-2: story chỉ KHỞI TẠO client, chưa có mutation nghiệp vụ.

---

## 5. Dọn dẹp sau verify

```
$ pkill -f "dist/main.js"     → port 3101 free
$ supabase stop               → Stopped (data backed up to docker volume bdsai)
$ rm -f /tmp/health*.json /tmp/bdsai-*.log
```

---

## 6. Phân biệt lỗi môi trường vs lỗi story

- **Môi trường (không phải lỗi story):**
  - Máy chạy nhiều project Supabase đồng thời → `supabase start` cần `--ignore-health-check` (studio health timeout) + kéo image PG15 lần đầu. Đã biết từ Story 1.1.
  - Cold-start request đầu tiên 73s do Docker quá tải; warm 55ms. Xử lý ở test bằng timeout rộng.
- **Lỗi story đã fix:** lint unused import `drizzle` trong `database.tokens.ts` → đổi sang `import type`. Pass.
- **Không có lỗi story tồn đọng.** 7/7 AC verify thật PASS.
