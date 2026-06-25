# Dev Log — Story 1.6: Hạ tầng nền — Redis/BullMQ, Drizzle migration docs, Sentry

- **Story key:** `1-6-ha-tang-nen-redis-bullmq-drizzle-sentry`
- **Agent:** story-developer (opus)
- **Ngày:** 2026-06-26
- **Kết quả:** PASS (9/9 AC thỏa, real-data verify)
- **Baseline commit:** `307a4a4959`

## Tóm tắt

Implement Story 1.6 — tích hợp Redis/BullMQ cho background job processing, nestjs-pino cho structured JSON logging, Sentry error tracking (API + Web), global exception filter, monitoring cron (DB/Storage size alert), và Drizzle migration documentation. Tất cả 9 AC thỏa mãn với real-data verify trên Redis thật + Supabase local.

## File tạo/sửa

**NEW (apps/api):**
- `src/queue/queue.tokens.ts` — DI tokens: `ECHO_QUEUE` ('bdsai-echo'), `REDIS_CONNECTION`, `EchoJobData` interface.
- `src/queue/queue.module.ts` — Global QueueModule: ioredis connection provider + BullMQ forRoot + registerQueue.
- `src/queue/queue.service.ts` — QueueService: `addEchoJob()` enqueue echo job, `close()` graceful shutdown.
- `src/queue/queue.processor.ts` — EchoProcessor (WorkerHost): process echo job, log + return `{ echoed: message }`.
- `src/queue/queue.service.spec.ts` — Unit test QueueService (mock BullMQ Queue).
- `src/common/filters/all-exceptions.filter.ts` — Global AllExceptionsFilter: chuẩn hóa error shape `{ statusCode, message, error, details? }`, Sentry.captureException, AD-8 không leak stack/message.
- `src/common/filters/all-exceptions.filter.spec.ts` — Unit test 6 case (HttpException, ZodError, generic Error, Sentry capture).
- `src/common/logger/logger.module.ts` — LoggerModule: nestjs-pino config (pretty dev, JSON prod, redact secret keys).
- `src/common/sentry/sentry.util.ts` — `redactSecrets()` beforeSend hook: strip Authorization/Cookie headers, redact env keys + connection strings.
- `src/health/monitoring.service.ts` — MonitoringService: `checkSizes()` (DB pg_database_size + Storage listBuckets), `hourlyCheck()` cron (try/catch, không phá app).
- `src/health/monitoring.service.spec.ts` — Unit test 4 case (DB alert, DB no-alert, Storage alert, query fail graceful).
- `src/db/MIGRATIONS.md` — Documentation: Drizzle migration workflow (generate, migrate, custom), existing 0000_vietnamese_fts.sql, troubleshooting.
- `test/queue.e2e-spec.ts` — E2e: enqueue echo job → completed + returnvalue, /health/redis. Redis env guard (redis-cli sync, skip if unreachable).
- `test/sentry.e2e-spec.ts` — E2e: 404 error shape chuẩn + Sentry.captureException called.

**NEW (apps/web):**
- `sentry.client.config.ts` — Sentry browser init (optional DSN, graceful disable).
- `sentry.server.config.ts` — Sentry server init (optional DSN).
- `instrumentation.ts` — Next.js instrumentation hook (register server Sentry).

**UPDATE (apps/api):**
- `src/main.ts` — Sentry init (optional DSN), pino logger (LoggerModule), global AllExceptionsFilter.
- `src/app.module.ts` — Import LoggerModule, QueueModule, ScheduleModule; register global filter.
- `src/config/env.validation.ts` — Add REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB.
- `src/health/health.service.ts` — Add `checkRedis()` method (ioredis ping).
- `src/health/health.controller.ts` — Add `GET /health/redis` endpoint, `GET /monitoring` endpoint.
- `src/health/health.module.ts` — Import QueueModule (for REDIS_CONNECTION), add MonitoringService.
- `package.json` — Add deps: bullmq, ioredis, @nestjs/bullmq, @sentry/node, nestjs-pino, pino, pino-pretty, @nestjs/schedule.
- `.env.example` — Add REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB.

**UPDATE (apps/web):**
- `next.config.ts` — withSentryConfig wrapper (sourcemaps.deleteSourcemapsAfterUpload, telemetry: false).
- `package.json` — Add dep: @sentry/nextjs.

**UPDATE (root):**
- `.env.example` — Add REDIS_URL, SENTRY_DSN.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status `1-6-...: ready-for-dev → review`.

## Quyết định kiến trúc nhỏ (dev resolve)

1. **BullMQ queue name kebab-case:** Story gốc dùng `bdsai:echo` nhưng BullMQ 5 không cho phép `:` trong queue name → đổi thành `bdsai-echo`. Runtime error `Queue name cannot contain :` khi boot.

2. **ioredis type cast cho BullMQ forRoot:** Top-level ioredis (5.11.1) vs bullmq's nested ioredis có type defs khác nhau (duplicate node_modules) → cast `as unknown as QueueOptions`. Runtime compatible (cùng ioredis API).

3. **Sentry 10 jest.mock thay spyOn:** Sentry 10 exports non-configurable props → `jest.spyOn(Sentry, 'captureException')` fail với `Cannot redefine property`. Giải pháp: `jest.mock('@sentry/node')` toàn module + `jest.mocked(Sentry.captureException)`.

4. **E2e Redis env guard sync:** `describe`/`describe.skip` phải chọn lúc module eval (trước beforeAll) → không thể dùng async ping. Giải pháp: `execSync('redis-cli -h 127.0.0.1 -p 6379 ping')` sync, timeout 2s. Có redis-cli trên dev machine (homebrew) + CI Redis container.

5. **BullMQ returnvalue re-fetch:** `job.returnvalue` là property cached lúc `getJob()`. Nếu job completed sau khi fetch, returnvalue = null. Giải pháp: re-fetch `queue.getJob(jobId)` sau khi state = completed.

6. **Sentry redact headers:** Ban đầu chỉ redact bằng pattern (SECRET_KEYS + connection strings). Authorization/Cookie headers không match pattern → leak. Fix: strip `authorization` + `cookie` headers luôn (delete key), không rely trên pattern.

7. **Next.js Sentry v10 config:** `hideSourceMaps` + `disableLogger` deprecated trong @sentry/nextjs 10 → dùng `sourcemaps.deleteSourcemapsAfterUpload: true`. `treeshake` chỉ nằm dưới `webpack.*` (webpack-only, không tác dụng Turbopack) → bỏ.

## Lệnh đã chạy + output thật

### 1. CI gate (AC8 — không phá 1.1-1.5)
```
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test
```
- `yarn build` → Tasks: 3 successful, 3 total (web/api/shared). EXIT 0.
- `yarn lint` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn typecheck` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn test` (unit) → @bdsai/api: 25 passed (5 suites). Tasks: 3 successful. EXIT 0.

### 2. Start Redis + Supabase local
```
docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine  # (docker, nhưng host có native Redis 8.6 trên :6379)
supabase start --ignore-health-check
```
- Redis: PONG (native Redis 8.6.2 trên host 127.0.0.1:6379).
- Supabase: Started. DB URL `postgresql://postgres:postgres@127.0.0.1:54352/postgres`.

### 3. Drizzle migration verify (AC3)
```
yarn db:migrate
docker exec supabase_db_bdsai psql -U postgres -c "SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');"
docker exec supabase_db_bdsai psql -U postgres -c "SELECT id, hash FROM drizzle.__drizzle_migrations;"
```
- Migration 0000 (vietnamese_fts) vẫn OK: 1 row, unaccent + pg_trgm present.

### 4. API boot + endpoints (AC1, AC2, AC4, AC5, AC6, AC7)
```
node dist/main.js
curl http://localhost:3101/health/redis
curl http://localhost:3101/health/supabase
curl http://localhost:3101/nonexistent
curl -X POST http://localhost:3101/queue/test -H 'Content-Type: application/json' -d '{"message":"hello-bdsai"}'
curl http://localhost:3101/monitoring
```
- `/health/redis` → `{"status":"ok","redis":{"status":"up"}}` ✅ AC1
- `/health/supabase` → `{"status":"ok","db":{"status":"up"},"auth":{"status":"up"},"storage":{"status":"up"}}` ✅
- `/nonexistent` → `{"statusCode":404,"message":"Cannot GET /nonexistent","error":"Not Found"}` ✅ AC6
- `/queue/test` → `{"jobId":"1","queued":true}` → log "Echo job processed (AC2)" → BullMQ completed set có job 1+2, returnvalue `{"echoed":"verify-2"}` ✅ AC2
- `/monitoring` → `{"checkedAt":"...","db":{"sizeBytes":11268911,"sizeMb":11,"thresholdMb":400,"alert":false},"storage":{"sizeBytes":0,"sizeMb":0,"thresholdMb":800,"alert":false}}` ✅ AC7

### 5. Pino JSON prod mode (AC5)
```
NODE_ENV=production node dist/main.js
```
- Output: `{"level":30,"time":1782410303783,"pid":26530,"hostname":"...","msg":"Redis kết nối OK — queue enabled"}` ✅ Structured JSON.

### 6. Sentry redact verify (AC4, AD-5/AD-8)
```
node -e "const {redactSecrets} = require('./dist/common/sentry/sentry.util.js'); ..."
```
- `authorization` + `cookie` headers: stripped (delete key).
- `DATABASE_URL: 'postgres://user:pass@host'` → `[Redacted]`.
- `SUPABASE_SERVICE_ROLE_KEY: 'eyJsecret'` → `[Redacted]`.
- Breadcrumb `postgres://[Redacted]@h/db` ✅

### 7. Sentry graceful disable (E2)
- `SENTRY_DSN` empty → log "SENTRY_DSN empty — Sentry disabled (dev, E2 graceful)." → app boot OK, không crash.

### 8. E2e tests
```
yarn test:e2e
```
- 5 suites PASS, 17 tests PASS (app, sentry, health, vietnamese-fts, queue).
- Queue e2e: 2/2 PASS (enqueue + completed + returnvalue, /health/redis).

## AC checklist

| AC | Mô tả | Status | Verify |
|----|-------|--------|--------|
| AC1 | Redis connectivity + /health/redis | ✅ | curl 200 `{ status: ok, redis: { status: up } }` |
| AC2 | BullMQ job processing (echo) | ✅ | POST /queue/test → job completed, returnvalue `{ echoed: ... }` |
| AC3 | Drizzle migration docs (MIGRATIONS.md) | ✅ | File tạo, migration 0000 vẫn functional |
| AC4 | Sentry integration (API + Web, optional DSN) | ✅ | captureException called, redactSecrets works, graceful disable |
| AC5 | Pino structured JSON logging | ✅ | Dev: pino-pretty. Prod: `{"level":30,"time":...}` JSON |
| AC6 | Global exception filter (standard error shape) | ✅ | 404/500/400 shape `{ statusCode, message, error, details? }` |
| AC7 | Monitoring cron (DB/Storage size alert) | ✅ | /monitoring returns sizes + alert flags, hourlyCheck try/catch |
| AC8 | CI gate (build/lint/typecheck/test) | ✅ | 3/3 build, 4/4 lint, 4/4 typecheck, 25 unit + 17 e2e |
| AC9 | Graceful degradation (Redis/Sentry down) | ✅ | Sentry DSN empty → disabled. Redis down → queue skip, app boot OK |
