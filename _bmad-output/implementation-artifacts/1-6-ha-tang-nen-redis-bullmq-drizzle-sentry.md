---
baseline_commit: TBD-by-developer
---

# Story 1.6: Hạ tầng nền — Redis/BullMQ, Drizzle migration, Sentry

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Story CUỐI CÙNG Epic 1 (Foundation & Infrastructure). Sau 1.6 done → Epic 1 hoàn tất. -->

## Story

As a **developer**,
I want **Redis + BullMQ queue, quy trình migration Drizzle, và Sentry error tracking cấu hình sẵn**,
so that **các epic sau (AI, notification) có hạ tầng job nền và lỗi được theo dõi**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 1 → Story 1.6 (dòng 226-240, AC gốc Given/When/Then).
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC9.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.

1. **AC1 — Redis 7 kết nối được (docker, port 6379, env REDIS_URL, healthcheck).**
   Given Supabase local KHÔNG có Redis (Supabase local chỉ có PG/Auth/Storage/Realtime — không cache layer),
   When khởi tạo Redis riêng cho dev qua Docker (`docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine` HOẶC thêm service `redis` vào `bdsai/docker-compose.dev.yml` nếu có),
   Then Redis 7 chạy, ping `redis-cli ping` → `PONG`, app `apps/api` kết nối được qua `ioredis` dùng env `REDIS_URL=redis://localhost:6379`.
   Env `REDIS_URL` thêm vào `apps/api/.env.example` + `env.validation.ts` (Zod, optional với default `redis://localhost:6379` — xem Edge Case E1 cho graceful degradation).
   Healthcheck: `apps/api/src/health/health.service.ts` thêm method `checkRedis()` (ping qua ioredis), expose qua `GET /health/redis` (hoặc gộp vào `/health/supabase` thành `/health/infra` — quyết định dev, ưu tiên không phá endpoint 1.2).
   Verify: `curl http://localhost:3101/health/redis` → 200 `{ status: 'ok', redis: { status: 'up' } }` khi Redis chạy.

2. **AC2 — BullMQ tạo/chạy được một test job (queue + processor, job echo → complete).**
   Given Redis kết nối được (AC1) + BullMQ 5.x cài (`bullmq` + `ioredis` deps),
   When tạo `apps/api/src/queue/` module: `queue.module.ts` (@Global, expose QueueService), `queue.service.ts` (wrapper add job), `queue.processor.ts` (Worker xử lý test job),
   Then test job "echo" được enqueue + process → complete. Job nhận `{ message: string }`, processor echo lại log, mark completed.
   AD-6 (Background Job): BullMQ job chạy async NGÒAI request path — KHÔNG `await` job trong HTTP handler. Test job enqueue qua endpoint `POST /queue/test` (dev only) hoặc qua test trực tiếp.
   Verify: enqueue test job → poll `job.getState()` → `completed`. BullMQ default retry 3x (xem Edge Case E3).
   Test tự động: integration test enqueue + wait complete (cần Redis live).

3. **AC3 — Drizzle migration:generate + migrate hoạt động + tài liệu MIGRATIONS.md.**
   Given Story 1.2 đã setup Drizzle (`drizzle.config.ts`, `yarn db:generate`/`yarn db:migrate` scripts) + Story 1.5 đã verify `drizzle-kit generate --custom` hoạt động (migration 0000 `vietnamese_fts` đã apply, journal có 1 entry),
   When viết tài liệu hướng dẫn thêm migration,
   Then có file `apps/api/src/db/MIGRATIONS.md` (hoặc section trong `apps/api/README.md`) hướng dẫn:
   (a) **Schema change (table/column):** `yarn db:generate` (từ `schema/*.ts`) → review SQL sinh → `yarn db:migrate` → verify journal `_journal.json` + `__drizzle_migrations` table.
   (b) **Custom SQL (extension/function/raw):** `yarn db:generate -- --custom --name <name>` → edit file `NNNN_<name>.sql` → `yarn db:migrate` → verify journal tự cập nhật (Story 1.5 đã verify mechanism).
   (c) **Verify:** `SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;` + check `_journal.json` entries match.
   (d) **Rollback note:** Drizzle 0.36 KHÔNG có auto-rollback — rollback = viết migration ngược thủ công (document rõ).
   (e) Tham chiếu Story 1.2 (setup) + Story 1.5 (custom migration thực tế).
   Verify: tài liệu tồn tại, developer mới đọc hiểu cách thêm migration mà không hỏi. KHÔNG tạo migration mới trong story này (chỉ docs + verify process hiện tại vẫn OK — chạy `yarn db:migrate` idempotent, migration 0000 vẫn apply đúng).

4. **AC4 — Sentry bắt lỗi từ cả web và api (init, DSN env, unhandled exception capture).**
   Given Sentry là error tracking (stack ARCHITECTURE-SPINE.md dòng 160),
   When cài `@sentry/node` cho `apps/api` + `@sentry/nextjs` cho `apps/web`, cấu hình Sentry init,
   Then:
   (a) **API:** `apps/api/src/main.ts` init Sentry (`Sentry.init({ dsn: SENTRY_DSN, environment, tracesSampleRate })`) TRƯỚC `NestFactory.create`. Env `SENTRY_DSN` thêm `env.validation.ts` (optional string URL — empty = disabled, xem Edge Case E2). Sentry capture unhandled exceptions + exception filter (AC6) report qua `Sentry.captureException`.
   (b) **Web:** `apps/web/sentry.client.config.ts` + `sentry.server.config.ts` (Next.js 16 withInstrumentation) init `@sentry/nextjs`. Env `SENTRY_DSN` (NEXT_PUBLIC cho client + server). DSN empty → skip init (dev).
   (c) Verify: throw test error trong api → Sentry capture (check Sentry dashboard hoặc mock `Sentry.captureException` trong test). Web: trigger error trong client component → capture.
   AD-5 (Auth Separation): Sentry KHÔNG log secret — redact env keys (SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL password) trước khi gửi (xem Edge Case E8). Dùng `Sentry.init({ beforeSend: redactSecrets })`.

5. **AC5 — NestJS Logger structured JSON (nestjs-pino, JSON log format).**
   Given ARCHITECTURE-SPINE.md Consistency Conventions (dòng 133): "Logging: NestJS Logger (Winston transport in prod), structured JSON",
   When cài `nestjs-pino` + `pino` + `pino-pretty` (dev) và thay default NestJS Logger,
   Then:
   (a) `apps/api/src/main.ts` dùng `NestFactory.create(AppModule, { bufferLogs: true })` + `app.useLogger(app.get(Logger))` (PinoLogger).
   (b) `app.module.ts` import `LoggerModule.forRootAsync` (nestjs-pino) config: dev → `pino-pretty` (readable), prod → JSON compact (structured). Detect qua `NODE_ENV`.
   (c) Log output JSON: `{ level, time, pid, hostname, msg, ...context }`. Service dùng `@PinoLogger` hoặc default Logger (inject `Logger` service) — KHÔNG `console.log` trong runtime code (chỉ `main.ts` bootstrap console.log OK).
   (d) AD-8: pino redact secret fields — config `redact: ['*.password', '*.key', '*.token', '*.serviceRoleKey']` (xem Edge Case E8).
   Verify: start app → log JSON (prod mode) hoặc pretty (dev mode). Test: unit test assert log format JSON khi NODE_ENV=production.

6. **AC6 — Exception filter chuẩn error shape { statusCode, message, error?, details? } (global filter).**
   Given ARCHITECTURE-SPINE.md Consistency Conventions (dòng 129): "Error shape: `{ statusCode, message, error?, details? }` — NestJS exception filter",
   When tạo `apps/api/src/common/filters/all-exceptions.filter.ts` (global filter) + register trong `main.ts` (`app.useGlobalFilters(new AllExceptionsFilter())` hoặc qua DI),
   Then:
   (a) **HttpException:** extract `statusCode` + `message` + `error` (status text) + `details` (nếu response là object có details). Shape: `{ statusCode, message, error?, details? }`.
   (b) **Non-HttpException (Error gốc):** map về 500 `{ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' }`. KHÔNG leak stack/message gốc ra client (AD-8) — log full stack server-side (pino), client chỉ nhận message chung.
   (c) **ZodError / validation error:** nếu throw từ pipe → map 400 `{ statusCode: 400, message, error: 'Bad Request', details: zodIssues }`.
   (d) Sentry capture exception trong filter (AC4) — `Sentry.captureException(exception)` trước khi return response.
   (e) Verify: test throw HttpException (404) → response `{ statusCode: 404, message, error: 'Not Found' }`. Test throw generic Error → 500 shape chuẩn, KHÔNG lộ stack. Test hiện có `health.e2e-spec.ts` (Story 1.2) assert error shape 503 — vẫn pass (filter không phá shape đã có).
   Note: `health.controller.ts` (Story 1.2) đã throw HttpException với shape chuẩn — filter mới chỉ normalize non-HttpException + ensure consistency. KHÔNG phá health endpoint.

7. **AC7 — Monitoring DB > 400MB + Storage > 800MB (cron check, alert qua Sentry/log).**
   Given NFR5 (readiness report): "DB < 400MB, Storage < 800MB — trigger nâng Pro trước khi đầy" (Supabase Free: DB 500MB, Storage 1GB → cảnh báo 80% threshold),
   When tạo `apps/api/src/health/monitoring.service.ts` (cron job check định kỳ),
   Then:
   (a) **DB size:** query `SELECT pg_database_size(current_database())` (bytes) qua Drizzle. Alert khi > 400MB (400 * 1024 * 1024).
   (b) **Storage size:** query Supabase Storage API (`supabase.storage.from(bucket).list()` + sum sizes, HOẶC Supabase Management API nếu có — dev local có thể mock). Alert khi > 800MB.
   (c) **Cron:** dùng `@nestjs/schedule` (`@Cron('0 * * * *')` — hourly) HOẶC BullMQ repeat job (quyết định dev — ưu tiên `@nestjs/schedule` cho đơn giản, BullMQ cho retry). Cài `@nestjs/schedule` dep.
   (d) **Alert:** log warning (pino structured) + `Sentry.captureMessage('DB size > 400MB threshold', 'warning')` khi vượt. KHÔNG throw (monitoring không phá app).
   (e) **Threshold env:** `DB_SIZE_ALERT_MB=400`, `STORAGE_SIZE_ALERT_MB=800` (optional, default 400/800) — thêm env.validation.ts.
   Verify: test unit mock `pg_database_size` trả > 400MB → assert alert triggered (spy on Sentry.captureMessage / logger.warn). Test < 400MB → no alert.

8. **AC8 — Không phá Story 1.1-1.5 (build/lint/typecheck/test pass, migration 0000 vẫn OK).**
   Given Story 1.3 CI gate (lint+typecheck+build+test qua Turborepo phải pass) + Story 1.5 migration 0000 đã apply,
   When chạy `yarn build && yarn lint && yarn typecheck && yarn test` ở `bdsai/` (cả 3 package: shared, api, web),
   Then PASS (không phá 1.1 monorepo, 1.2 Drizzle/Supabase/health, 1.3 CI, 1.4 web UI, 1.5 FTS migration).
   Migration 0000 `vietnamese_fts` vẫn apply đúng (`yarn db:migrate` idempotent, `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm')` vẫn 2 rows).
   Health endpoint 1.2 (`GET /health/supabase`) vẫn 200 khi Supabase chạy. KHÔNG thay đổi schema `schema/index.ts` (vẫn `export {}` — không bảng nghiệp vụ).

9. **AC9 — Test tự động (unit + integration test queue/filter/monitoring).**
   Given quy ước test toàn dự án (dòng 144) + Story 1.3 CI gate,
   When chạy test, Then:
   (a) **Unit test:** `queue.service.spec.ts` (mock ioredis/BullMQ, assert add job gọi queue.add), `all-exceptions.filter.spec.ts` (assert shape HttpException + non-HttpException + ZodError), `monitoring.service.spec.ts` (mock DB size > 400MB → alert, < 400MB → no alert).
   (b) **Integration test (e2e):** `queue.e2e-spec.ts` (cần Redis live — enqueue test job, wait complete, assert state), `sentry.e2e-spec.ts` (optional — mock Sentry.captureException, throw error, assert called). Monitoring có thể unit test (mock query).
   (c) `yarn test` (unit) + `yarn test:e2e` (integration) PASS. Integration test cần Redis chạy (skip nếu REDIS_URL không reach — dùng `describe.skip` hoặc env guard, KHÔNG fail CI khi Redis không có).
   (d) Test hiện có (Story 1.2 health, Story 1.5 FTS) vẫn pass — KHÔNG phá.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD: NestJS Logger (structured JSON)** | AC5 — thay default Logger bằng `nestjs-pino`, log JSON compact prod / pino-pretty dev. Consistency Conventions dòng 133. |
| **AD-6 (Background Job)** | AC2 — BullMQ queue, job chạy async NGÒAI request path. KHÔNG `await` job trong HTTP handler. AI/Xaction epic sau sẽ enqueue job qua QueueService. |
| **AD consistency (error shape)** | AC6 — global exception filter chuẩn `{ statusCode, message, error?, details? }`. Consistency Conventions dòng 129. |
| **NFR5 (DB/Storage threshold)** | AC7 — monitoring DB < 400MB, Storage < 800MB, alert khi vượt. Readiness report trigger nâng Pro. |
| **AD-1 (Module Isolation)** | `queue/` module riêng, `monitoring/` (hoặc gộc health) module riêng — KHÔNG lẫn business logic. QueueService expose interface công khai, module khác inject. |
| **AD-5 (Auth Separation)** | AC4 — Sentry `beforeSend` redact secret (SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL password, JWT). KHÔNG gửi secret lên Sentry. |
| **AD-8 (PII/secret)** | AC5 pino redact + AC4 Sentry redact + AC6 filter không leak stack ra client. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Redis không start → app vẫn boot được?** Quyết định: **graceful degradation**. `REDIS_URL` optional (default `redis://localhost:6379`). QueueModule `onModuleInit` ping Redis — nếu fail, log warning (pino) + mark queue disabled, app vẫn boot (health endpoint khác vẫn OK). BullMQ job enqueue throw clear error khi Redis down. Test: unit test mock ioredis reject → assert app boot + queue.add throw. KHÔNG fail-fast (Redis là hạ tầng job nền, không bắt buộc cho healthcheck cơ bản).
- **E2 — Sentry DSN không có (dev) → Sentry init skip, không crash.** `SENTRY_DSN` optional (default empty). `Sentry.init` chỉ gọi khi DSN non-empty. `Sentry.captureException` no-op khi chưa init (Sentry SDK handle tự). Test: env không có SENTRY_DSN → app boot OK, throw error → không crash (captureException no-op).
- **E3 — BullMQ job fail → retry strategy.** BullMQ default 3 retries với exponential backoff. QueueService config `attempts: 3, backoff: { type: 'exponential', delay: 1000 }`. Test: processor throw → job retry 3x → mark failed. AD-3 (Xaction) + AD-6 (AI) epic sau sẽ dựa vào retry này.
- **E4 — DB size check: Supabase free tier 500MB, cảnh báo 400MB (80% threshold).** `pg_database_size()` trả bytes. Threshold `DB_SIZE_ALERT_MB=400`. Test mock query trả 450MB → alert. Test 350MB → no alert.
- **E5 — Storage size check: Supabase free 1GB, cảnh báo 800MB (80%).** Supabase Storage API list objects + sum sizes (local có thể limited — dev local Storage empty → no alert). Threshold `STORAGE_SIZE_ALERT_MB=800`. Test mock API trả 850MB → alert.
- **E6 — pino-pretty chỉ dev, production JSON compact.** Detect `NODE_ENV=production` → JSON transport; else pino-pretty. Test: assert `NODE_ENV=production` log JSON (parse được JSON.parse), `NODE_ENV=development` log pretty (contains color/code).
- **E7 — Exception filter: HttpException + non-HttpException đều chuẩn shape.** HttpException giữ shape gốc (nếu đã chuẩn). Non-HttpException → 500 generic. ZodError → 400 + details. Test cả 3 case.
- **E8 — Migration: Story 1.5 đã có migration 0000 → Story 1.6 KHÔNG tạo migration mới.** Chỉ tạo docs MIGRATIONS.md + verify `yarn db:migrate` vẫn idempotent. KHÔNG đụng `schema/index.ts` (vẫn `export {}`).
- **E9 — Sentry/pino redact secret không lọt log.** Pino `redact: ['*.password','*.key','*.token','*.serviceRoleKey','*.SUPABASE_SERVICE_ROLE_KEY']`. Sentry `beforeSend` strip event fields chứa secret. Test: log object có `password: 'secret'` → output `[Redacted]` hoặc removed. AD-5/AD-8.
- **E10 — @nestjs/schedule cron cần enable.** `ScheduleModule.forRoot()` trong AppModule. `@Cron` decorator cần `@nestjs/schedule` dep. Test: mock time hoặc trigger manual (monitoring.service.checkSizes() gọi trực tiếp trong test).

## UX Spec tham chiếu

Story 1.6 là hạ tầng nền (developer-facing), KHÔNG có UI user-facing. Không tham chiếu UX DESIGN.md/EXPERIENCE.md. Logging/error shape ảnh hưởng API response shape (AC6) — khớp Consistency Conventions, không đụng UI.

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack dòng 136-160)

| Package | Version | Note |
|---------|---------|------|
| Redis | 7.x (alpine) | Docker `redis:7-alpine`, port 6379 |
| BullMQ | 5.x | `bullmq` + `ioredis` (BullMQ dùng ioredis nội bộ) |
| Drizzle ORM | 0.36.4 (đã có) | KHÔNG nâng cấp — Story 1.2/1.5 đã pin |
| drizzle-kit | 0.31.10 (đã có) | `--custom` flag hoạt động (Story 1.5 verify) |
| Sentry (`@sentry/node`) | latest 8.x | API |
| Sentry (`@sentry/nextjs`) | latest 8.x | Web |
| nestjs-pino | latest 4.x | Structured JSON logger |
| pino | latest 9.x | Logger core |
| pino-pretty | latest 11.x | Dev pretty print |
| @nestjs/schedule | latest 4.x | Cron cho monitoring |

### Port & infra

- **API:** 3101 (khớp Story 1.1, `API_PORT` env, default 3101).
- **Web:** 3100 (Next.js dev).
- **Supabase local:** dải 5435x (API 54351, DB 54352, Studio 54353, Inbucket 54354) — Story 1.2 pin.
- **Redis:** 6379 (mới — KHÔNG trùng dải 5435x). `REDIS_URL=redis://localhost:6379`.
- **Redis KHÔNG có sẵn trong Supabase local** — chạy riêng: `docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine` HOẶC thêm vào `bdsai/docker-compose.dev.yml` (file chưa tồn tại — ARCHITECTURE-SPINE.md dòng 228 đề cập `docker-compose.dev.yml` optional local). Quyết định dev: docker run đơn giản cho dev (không tạo compose file mới nếu không cần).

### Source tree (NEW/UPDATE)

```
bdsai/apps/api/
├── src/
│   ├── common/                          # NEW directory
│   │   └── filters/
│   │       ├── all-exceptions.filter.ts # NEW — global filter (AC6)
│   │       └── all-exceptions.filter.spec.ts # NEW — unit test
│   ├── queue/                           # NEW directory (AD-1 module riêng)
│   │   ├── queue.module.ts              # NEW — @Global, expose QueueService
│   │   ├── queue.service.ts             # NEW — wrapper add job
│   │   ├── queue.service.spec.ts        # NEW — unit test
│   │   ├── queue.processor.ts           # NEW — Worker test job
│   │   └── queue.tokens.ts              # NEW — DI token (optional)
│   ├── health/
│   │   ├── health.service.ts            # UPDATE — thêm checkRedis() (AC1)
│   │   ├── health.controller.ts         # UPDATE — thêm GET /health/redis (AC1)
│   │   ├── monitoring.service.ts        # NEW — cron DB/Storage size check (AC7)
│   │   ├── monitoring.service.spec.ts   # NEW — unit test
│   │   └── health.module.ts             # UPDATE — import ScheduleModule, providers + monitoring
│   ├── config/
│   │   └── env.validation.ts            # UPDATE — thêm REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB
│   ├── db/
│   │   ├── MIGRATIONS.md                # NEW — docs hướng dẫn thêm migration (AC3)
│   │   ├── drizzle.config.ts            # KHÔNG ĐỔI
│   │   ├── database.module.ts           # KHÔNG ĐỔI
│   │   └── migrations/                  # KHÔNG ĐỔI (0000 vẫn, không tạo mới)
│   ├── app.module.ts                    # UPDATE — import LoggerModule, QueueModule, ScheduleModule, filter
│   └── main.ts                          # UPDATE — Sentry.init, useLogger(pino), useGlobalFilters
├── test/
│   ├── queue.e2e-spec.ts                # NEW — integration test BullMQ (AC2, AC9)
│   ├── sentry.e2e-spec.ts               # NEW (optional) — Sentry capture test (AC4)
│   └── health.e2e-spec.ts               # KHÔNG ĐỔI (Story 1.2 — vẫn pass)
├── package.json                         # UPDATE — deps: bullmq, ioredis, @sentry/node, nestjs-pino, pino, pino-pretty, @nestjs/schedule
└── .env.example                         # UPDATE — REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB

bdsai/apps/web/
├── sentry.client.config.ts              # NEW — @sentry/nextjs client init (AC4)
├── sentry.server.config.ts              # NEW — @sentry/nextjs server init (AC4)
├── package.json                         # UPDATE — deps: @sentry/nextjs
└── .env.example                         # UPDATE — SENTRY_DSN (NEXT_PUBLIC_SENTRY_DSN cho client)

bdsai/.env.example                       # UPDATE — SENTRY_DSN note (web)
bdsai/apps/api/.env.example              # UPDATE — REDIS_URL, SENTRY_DSN, thresholds
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **Redis:** Docker `redis:7-alpine` port 6379, KHÔNG thêm vào Supabase local (Supabase không quản lý Redis). `REDIS_URL=redis://localhost:6379`. Prod: Dokploy VPS chạy Redis container cùng host (ARCHITECTURE-SPINE.md Deployment dòng 279-283).
2. **BullMQ:** `bullmq` + `ioredis`. QueueModule @Global (hạ tầng dùng chung như DatabaseModule). QueueService wrapper — module nghiệp vụ (AI, Xaction) inject + enqueue, KHÔNG tạo queue riêng (AD-1). Test job "echo" verify pipeline.
3. **Drizzle migration docs:** `apps/api/src/db/MIGRATIONS.md` — 2 luồng (schema generate + custom SQL), verify steps, rollback note. Story 1.5 đã verify `--custom` hoạt động.
4. **Sentry:** `@sentry/node` (api) + `@sentry/nextjs` (web). DSN optional (dev skip). `beforeSend` redact secret (AD-5/AD-8). API init trong `main.ts` trước NestFactory. Web init qua `sentry.{client,server}.config.ts` (Next.js 16 instrumentation).
5. **Logger:** `nestjs-pino` + `pino` + `pino-pretty` (dev). Thay default NestJS Logger. Pino redact secret fields. Prod JSON compact, dev pretty.
6. **Exception filter:** `apps/api/src/common/filters/all-exceptions.filter.ts` — global, normalize HttpException + non-HttpException + ZodError → shape chuẩn. Sentry capture trong filter.
7. **Monitoring:** `@nestjs/schedule` cron hourly. `monitoring.service.ts` check `pg_database_size()` + Supabase Storage API. Alert qua pino log + `Sentry.captureMessage`. Threshold env configurable (default 400/800MB).
8. **KHÔNG tạo migration mới** — Story 1.5 đã có 0000. Story 1.6 chỉ docs + verify.

### Test strategy

- **Unit (jest):** queue.service (mock ioredis), all-exceptions.filter (HttpException/non-HttpException/ZodError), monitoring.service (mock DB size >/< threshold).
- **Integration (jest e2e):** queue.e2e (Redis live — enqueue + wait complete), sentry.e2e (mock captureException). Skip nếu Redis không reach (env guard).
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3). `yarn test:e2e` cần Redis + Supabase local (không fail CI nếu thiếu — skip).

### Lệnh verify (dev chạy)

```bash
# 1. Redis
docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine
docker exec bdsai-redis redis-cli ping  # → PONG

# 2. Supabase local (Story 1.2)
cd bdsai && supabase start --ignore-health-check

# 3. Install deps
cd bdsai/apps/api && yarn add bullmq ioredis @sentry/node nestjs-pino pino pino-pretty @nestjs/schedule
cd bdsai/apps/web && yarn add @sentry/nextjs

# 4. Build/lint/typecheck/test (AC8)
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test

# 5. Migration verify (AC3 — idempotent, 0000 vẫn)
cd bdsai/apps/api && yarn db:migrate  # exit 0, no new migration
docker exec supabase_db_bdsai psql -U postgres -c "SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');"  # 2 rows

# 6. Start API + healthcheck
cd bdsai/apps/api && yarn build && node dist/main.js
curl http://localhost:3101/health/redis   # 200 { status: ok, redis: { status: up } }
curl http://localhost:3101/health/supabase # 200 (Story 1.2 vẫn OK)

# 7. BullMQ test job
curl -X POST http://localhost:3101/queue/test -H 'Content-Type: application/json' -d '{"message":"hello"}'
# → job enqueued + completed

# 8. Integration test
cd bdsai/apps/api && yarn test:e2e  # queue + sentry + health + FTS pass

# 9. Teardown
pkill -f "dist/main.js"
docker stop bdsai-redis && docker rm bdsai-redis
cd bdsai && supabase stop
```

## References

- [Source: epics.md] `docs/bdsai/planning/epics.md` dòng 226-240 (AC gốc Story 1.6) + dòng 144 (quy ước test toàn dự án)
- [Source: ARCHITECTURE-SPINE.md] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-1 (dòng 39), AD-5 (dòng 63), AD-6 (dòng 69), AD-8 (dòng 81), Consistency Conventions error shape (dòng 129) + Logging (dòng 133), Stack Redis 7/BullMQ 5/Drizzle 0.36/Sentry (dòng 152-160), NFR5/Deferred Supabase Pro (dòng 331), Deployment Redis (dòng 279-283)
- [Source: sprint-status.yaml] `_bmad-output/implementation-artifacts/sprint-status.yaml` — 1.1-1.5 done, 1.6 backlog → ready-for-dev
- [Source: Story 1.2 dev log] `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md` — Drizzle setup, postgres.js, ConfigService, env validation, health endpoint
- [Source: Story 1.5 dev log] `_bmad-output/harness-workspace/1-5-vietnamese-full-text-search/02-dev.md` — Drizzle `--custom` migration hoạt động, journal mechanism, migration 0000 đã apply
- [Source: code] `bdsai/apps/api/src/main.ts`, `app.module.ts`, `config/env.validation.ts`, `db/{database.module,database.tokens,drizzle.config}.ts`, `health/{health.service,health.controller,health.module}.ts`, `db/migrations/0000_vietnamese_fts.sql`, `db/migrations/meta/_journal.json`
- [Source: package.json] `bdsai/apps/api/package.json` (deps hiện có — CHƯA có ioredis/bullmq/@sentry/node/nestjs-pino/@nestjs/schedule), `bdsai/apps/web/package.json` (CHƯA có @sentry/nextjs)
- [Source: env] `bdsai/apps/api/.env.example` (CHƯA có REDIS_URL/SENTRY_DSN), `bdsai/.env.example`, `bdsai/supabase/config.toml` (Supabase local KHÔNG có Redis)
- [Source: .claude/agents/story-author.md] — persona + protocol (3 output bắt buộc, tự verify trước khi kết thúc)
- [Source: _bmad-output/implementation-artifacts/1-5-vietnamese-full-text-search.md] — story file convention (AC đánh số + Dev Notes + References [Source:] + Dev Agent Record)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
