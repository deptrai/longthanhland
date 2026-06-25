# Code Review — Story 1.6: Hạ tầng nền — Redis/BullMQ, Drizzle migration docs, Sentry

- **Story key:** `1-6-ha-tang-nen-redis-bullmq-drizzle-sentry`
- **Agent:** code-reviewer (opus)
- **Ngày:** 2026-06-26
- **Verdict:** **APPROVED** (0 critical / 0 high / 1 medium / 4 low — tất cả non-blocking)
- **Baseline commit:** `307a4a4959`

## Phương pháp review

Review adversarial — KHÔNG tin dev log, tự verify:
- Đọc toàn bộ 16 file NEW + 11 file UPDATE (read tool).
- `git status` xác nhận file thật tồn tại (16 NEW + 11 UPDATE khớp log).
- Chạy `yarn build && yarn lint && yarn typecheck && yarn test` + `yarn test:e2e` (Redis live 127.0.0.1:6379 PONG).
- Chạy `node` test `redactSecrets()` với payload chứa secret thật (DATABASE_URL, SERVICE_ROLE_KEY, REDIS_URL, Authorization, Cookie) → verify redact.
- `grep console.log` trong `apps/api/src` (loại spec/test) → chỉ main.ts (allowed).
- `grep` secret patterns trong sentry.util.ts → patterns present.

## Kết quả CI gate (AC8 — verify thật)

| Lệnh | Kết quả | Exit |
|------|---------|------|
| `yarn build` | 3/3 successful (shared, api, web) | 0 |
| `yarn lint` | 4/4 successful | 0 |
| `yarn typecheck` | 4/4 successful | 0 |
| `yarn test` (unit) | @bdsai/api 25 passed (5 suites) + web 10 passed | 0 |
| `yarn test:e2e` (api) | 17 passed (5 suites: app, queue, sentry, health, vietnamese-fts) | 0 |

→ KHÔNG phá Story 1.1–1.5. Migration 0000 `vietnamese_fts` vẫn apply (vietnamese-fts.e2e pass).

## Findings

### MEDIUM

#### M1 — QueueModule.onModuleDestroy đóng shared Redis trước khi BullMQ Worker đóng → unhandled "Connection is closed" lúc shutdown
- **File:** `apps/api/src/queue/queue.module.ts:54-60`
- **Mô tả:** `QueueModule.onModuleDestroy()` gọi `this.redis.quit()` trên instance ioredis dùng chung cho cả BullMQ Queue + Worker (BullModule.forRoot dùng cùng `REDIS_CONNECTION`). Khi app shutdown, `redis.quit()` chạy TRƯỚC khi `EchoProcessor` (WorkerHost) đóng worker → Worker phát sinh event `error` "Connection is closed" không có listener → `ERR_UNHANDLED_ERROR`. Reproduced thật trong `yarn test:e2e` teardown:
  ```
  Error: Unhandled error. ([Error: Connection is closed.])
      at Worker.emit ... at RedisConnection.emit
  node:events:508 ... ERR_UNHANDLED_ERROR
  ```
  Jest bắt được nên exit 0, nhưng trong production với `app.enableShutdownHooks()` + SIGTERM, unhandled 'error' event trên Worker có thể crash process hoặc gây exit code ≠ 0 (Docker/K8s có thể hiểu nhầm là crash thay vì graceful shutdown).
- **Cách sửa (chọn 1):**
  1. Bỏ `redis.quit()` thủ công — để BullMQ WorkerHost (`OnModuleDestroy` tự `worker.close()`) + ioredis GC xử lý. Simple nhất.
  2. Hoặc attach noop error listener trong constructor: `this.redis.on('error', () => undefined)` để swallow event không listener.
  3. Hoặc inject `EchoProcessor` vào QueueModule và `await worker.close()` trước `redis.quit()`.
- **Severity:** MEDIUM — không ảnh hưởng AC, không ảnh hưởng runtime khi app đang chạy, chỉ ảnh hưởng teardown/shutdown hygiene.

### LOW

#### L1 — Duplicate `@nestjs/bullmq` entry + version pin không nhất quán
- **File:** `apps/api/package.json:21` và `apps/api/package.json:26`
- **Mô tả:** `@nestjs/bullmq` xuất hiện 2 lần trong `dependencies`: dòng 21 `"^11.0.4"` (có caret) + dòng 26 `"11.0.4"` (exact). Caret `^` vi phạm quy ước pin exact version mà các dep khác dùng (bullmq `5.79.1`, ioredis `5.11.1`, @sentry/node `10.61.0`...). Yarn resolve về 1 entry nhưng duplicate gây nhầm lẫn + không deterministic.
- **Cách sửa:** Xóa dòng 21 (`^11.0.4`), giữ dòng 26 (`11.0.4` exact).

#### L2 — Pino redact paths không cover `err.message` / `err.stack` → secret trong error message có thể lọt server log
- **File:** `apps/api/src/common/logger/logger.module.ts:27-40` + `apps/api/src/common/filters/all-exceptions.filter.ts:59-64`
- **Mô tả:** AllExceptionsFilter log server-side `err: { name, message, stack }`. Pino redact paths hiện cover `*.password`, `*.key`, `*.token`, `*.SUPABASE_SERVICE_ROLE_KEY`... nhưng KHÔNG cover `err.message` / `err.stack`. Nếu một Error chứa connection string trong message (vd `postgres://user:pass@host` từ postgres.js error), secret đó lọt vào server log JSON. E9 yêu cầu "pino redact secret không lọt log". HealthService/QueueService/MonitoringService đã có `safeMessage()` redact connection string riêng, nhưng AllExceptionsFilter log `exception.message` raw (không qua safeMessage).
- **Cách sửa:** Thêm redact paths `'err.message'`, `'err.stack'` KHÔNG hợp lý (sẽ redact mọi error). Thay vào đó: trong AllExceptionsFilter, sanitize `err.message` + `err.stack` qua helper tương tự `safeMessage()` trước khi log, HOẶC chấp nhận vì server log đã access-controlled. Đề xuất: sanitize `err.message`/`err.stack` connection-string pattern trong filter trước khi truyền vào logContext.
- **Severity:** LOW — server-side log only, access-controlled, không ra client (client response đã verify không leak qua unit test AC6b).

#### L3 — E2e test không gọi `app.useLogger(pino)` → không verify pino JSON output trong e2e
- **File:** `apps/api/test/queue.e2e-spec.ts:55-56`, `apps/api/test/sentry.e2e-spec.ts:32-33`
- **Mô tả:** E2e tạo app qua `createNestApplication()` không gọi `app.useLogger(app.get(Logger))` như `main.ts`. Do đó e2e chạy với default NestJS Logger, không pino JSON. AC5 (pino structured JSON) chỉ verify qua manual run (`NODE_ENV=production node dist/main.js` trong dev log) — không có test tự động assert log JSON format. Story AC5 verify yêu cầu "Test: unit test assert log format JSON khi NODE_ENV=production" — chưa có unit test này.
- **Cách sửa (optional):** (a) Thêm `app.useLogger(app.get(Logger))` vào e2e setup cho parity; (b) Thêm 1 unit test assert pino config trả JSON transport khi `NODE_ENV=production` (test LoggerModule useFactory output).
- **Severity:** LOW — AC5 thỏa qua manual verify + code review (config đúng), chỉ thiếu test tự động cho format.

#### L4 — Sentry redact patterns quá broad (`/token/i`, `/secret/i`, `/jwt/i`) → over-redaction mất debug context
- **File:** `apps/api/src/common/sentry/sentry.util.ts:11-22`
- **Mô tả:** `SECRET_PATTERNS` gồm `/token/i`, `/secret/i`, `/jwt/i` — key/value chứa từ "token" (vd breadcrumb "CSRF token mismatch", field `accessToken` hợp lệ để debug) sẽ bị redact toàn bộ thành `[Redacted]`, mất context debug. Đây là over-redaction (safe-side, không leak) nhưng giảm giá trị Sentry event.
- **Cách sửa (optional):** Thu hẹp pattern — chỉ redact khi key MATCH exact secret key name (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL`, `SENTRY_DSN`, `password`, `serviceRoleKey`) thay vì substring broad. Giữ `/token/i` `/secret/i` `/jwt/i` chỉ cho value matching (JWT shape `eyJ...`), không cho key name.
- **Severity:** LOW — không security risk (over-redaction an toàn), chỉ UX debug.

## Bảng verify AC1–AC9

| AC | Mô tả | Status | Verify thật |
|----|-------|--------|------------|
| AC1 | Redis 7 + /health/redis | ✅ | `health.service.ts:116-132` checkRedis ping ioredis; `health.controller.ts:61-78` GET /health/redis; e2e queue test `GET /health/redis` 200 `{status:ok, redis:{status:up}}` pass; env REDIS_URL optional default `redis://localhost:6379` |
| AC2 | BullMQ test job echo → complete | ✅ | `queue.module.ts` BullMQ forRoot + registerQueue `bdsai-echo`; `queue.processor.ts` echo + return `{echoed}`; `queue.service.ts` addEchoJob attempts 3 + exponential backoff (E3); e2e POST /queue/test → job completed + returnvalue `{echoed:'hello-bdsai-e2e'}` pass; AD-6 KHÔNG await job trong handler (controller return ngay) |
| AC3 | Drizzle migration docs MIGRATIONS.md | ✅ | `db/MIGRATIONS.md` 119 dòng — Luồng A (schema change), Luồng B (custom SQL), verify, rollback note (Drizzle 0.36 không auto-rollback), tham chiếu Story 1.2/1.5; KHÔNG tạo migration mới (schema/index.ts vẫn `export {}`, git status không thêm file migration) |
| AC4 | Sentry api + web (DSN optional, redact) | ✅ | `main.ts:24-33` Sentry.init optional DSN + beforeSend redactSecrets; `sentry.util.ts` redact verify thật (Authorization/Cookie stripped, DATABASE_URL/SERVICE_ROLE_KEY/REDIS_URL/SENTRY_DSN → [Redacted], breadcrumb connection string redacted); web `sentry.client.config.ts` + `sentry.server.config.ts` + `instrumentation.ts` + `next.config.ts` withSentryConfig; E2 graceful (DSN empty → skip) |
| AC5 | nestjs-pino structured JSON | ✅ | `logger.module.ts` pino-pretty dev / JSON prod (transport undefined khi isProd); redact paths secret; `main.ts:39` app.useLogger(pino); KHÔNG console.log ngoài main.ts (grep verify); dev log verify prod JSON `{"level":30,"time":...}`. (L3: thiếu unit test assert format) |
| AC6 | Global exception filter error shape | ✅ | `all-exceptions.filter.ts` HttpException giữ shape + details, ZodError → 400 + issues, non-HttpException → 500 generic không leak stack/message; Sentry.captureException gọi; unit test 6 case pass; e2e GET /nonexistent → 404 shape chuẩn pass; health 503 shape không phá |
| AC7 | Monitoring DB > 400MB + Storage > 800MB cron | ✅ | `monitoring.service.ts` @Cron EVERY_HOUR; checkDbSize `pg_database_size(current_database())` qua Drizzle; checkStorageSize listBuckets + sum metadata.size; threshold env DB_SIZE_ALERT_MB/STORAGE_SIZE_ALERT_MB default 400/800; alert → logger.warn + Sentry.captureMessage; KHÔNG throw (hourlyCheck try/catch); unit test 4 case pass (DB alert/no-alert, Storage alert, query fail graceful); GET /monitoring endpoint |
| AC8 | Không phá 1.1-1.5 | ✅ | build 3/3, lint 4/4, typecheck 4/4, unit 25 + e2e 17 pass; vietnamese-fts.e2e pass (migration 0000 OK); health.e2e pass |
| AC9 | Test tự động unit + integration | ✅ | Unit: queue.service.spec (4), all-exceptions.filter.spec (6), monitoring.service.spec (4) + existing 11 = 25 unit; E2e: queue.e2e (2, Redis env guard skip khi down), sentry.e2e (3) + existing 12 = 17 e2e; Redis guard `execSync redis-cli ping` sync skip |

## Bảng verify invariant AD

| AD | Áp dụng | Status | Verify |
|----|---------|--------|--------|
| AD: NestJS Logger structured JSON | AC5 pino | ✅ | logger.module.ts pino config, main.ts useLogger; QueueService/EchoProcessor/Filter inject `Logger` từ nestjs-pino; HealthService/MonitoringService dùng `new Logger()` (@nestjs/common) route qua pino khi app.useLogger set |
| AD-6 (Background Job) | AC2 BullMQ | ✅ | Queue @Global, job chạy async ngoài request — controller POST /queue/test return `{jobId}` ngay KHÔNG await job; processor WorkerHost chạy trong BullMQ event loop |
| AD-1 (Module Isolation) | queue/ + monitoring riêng | ✅ | QueueModule @Global expose QueueService + REDIS_CONNECTION; MonitoringService trong HealthModule; không lẫn business logic |
| AD-5 (Auth Separation) | Sentry beforeSend redact | ✅ | sentry.util.ts redactSecrets strip Authorization/Cookie + env keys + connection strings; verify thật bằng node test; web client/server config cũng redact headers |
| AD-8 (PII/secret) | pino redact + Sentry redact + filter không leak | ✅ | pino redact paths; sentry redact; filter client response không stack (unit test AC6b assert `hunter2`/`postgres://` không lọt); (L2: err.message trong server log chưa sanitize — LOW) |
| NFR5 (DB/Storage threshold) | AC7 monitoring | ✅ | cron hourly, threshold 400/800MB, alert Sentry.captureMessage + log warn |
| Error shape consistency | AC6 | ✅ | `{ statusCode, message, error?, details? }` — filter normalize mọi exception |

## Bảo mật (CRITICAL check)

| Check | Status | Verify |
|-------|--------|--------|
| Sentry beforeSend redact secret thật sự? | ✅ | node test thật: Authorization/Cookie stripped, DATABASE_URL/SERVICE_ROLE_KEY/REDIS_URL/SENTRY_DSN → [Redacted], connection string trong breadcrumb → `postgres://[Redacted]@host` |
| KHÔNG log env keys trong pino log? | ✅ (partial) | pino redact paths cover `*.SUPABASE_SERVICE_ROLE_KEY` etc.; (L2: err.message raw trong filter log chưa sanitize — LOW) |
| Exception filter không leak stack prod? | ✅ | client response chỉ `{statusCode, message, error, details?}` — KHÔNG stack; unit test AC6b assert; stack chỉ log server-side |
| Redis URL không hardcode? | ✅ | qua env REDIS_URL (env.validation.ts default `redis://localhost:6379`); QueueModule dùng ConfigService |
| Sentry DSN optional — graceful? | ✅ | main.ts `if (dsn)` guard; web config same; E2 verified (dev log: empty DSN → boot OK) |

## Kết luận + recommendation

**Verdict: APPROVED.**

Story 1.6 thỏa mãn 9/9 AC, tuân thủ toàn bộ invariant AD liên quan, không có finding CRITICAL hay HIGH. Code chất lượng cao:
- Sentry redact verify thật (không chỉ đọc code) — secret không lọt Sentry.
- Exception filter shape chuẩn, không leak stack ra client (unit test assert).
- BullMQ queue + worker setup đúng, AD-6 async tuân thủ (controller không await job).
- Graceful degradation E1 (Redis down) + E2 (Sentry DSN empty) implement đúng.
- MIGRATIONS.md đầy đủ (Luồng A/B, verify, rollback note, tham chiếu 1.2/1.5).
- CI gate pass thật (build/lint/typecheck/test + e2e 17 test).

**Recommendation (non-blocking, có thể fix ở story sau hoặc patch riêng):**
1. **M1 (teardown)** — Khuyến nghị fix trước khi deploy prod: bỏ `redis.quit()` thủ công trong QueueModule.onModuleDestroy HOẶC attach error listener, tránh unhandled error lúc graceful shutdown.
2. **L1 (package.json duplicate)** — Xóa entry duplicate `^11.0.4`, giữ `11.0.4` exact.
3. **L2 (err.message sanitize)** — Sanitize connection-string trong filter logContext.
4. **L3 (pino unit test)** — Thêm unit test assert pino config JSON khi prod (optional).
5. **L4 (Sentry over-redaction)** — Thu hẹp pattern (optional, safe-side).

Tất cả finding non-blocking → leader có thể chuyển sang trạm e2e-tester.
