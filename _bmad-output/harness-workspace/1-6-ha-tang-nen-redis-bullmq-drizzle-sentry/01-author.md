# Story 1.6 — Author Log (story-author)

**Story:** 1-6-ha-tang-nen-redis-bullmq-drizzle-sentry
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-26
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`
**Vai trò:** Story CUỐI CÙNG Epic 1 (Foundation & Infrastructure). Sau 1.6 done → Epic 1 hoàn tất (retrospective optional).

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/1-6-ha-tang-nen-redis-bullmq-drizzle-sentry.md` | ✅ Đã ghi (9 AC + Invariant AD table + 10 Edge Case + Dev Notes + Source tree NEW/UPDATE + References [Source:] + Dev Agent Record) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `1-6-ha-tang-nen-redis-bullmq-drizzle-sentry: ready-for-dev` (dòng 54), `last_updated: 2026-06-26` (dòng 38, đã đúng từ trước) |
| 3 | Author log | `_bmad-output/harness-workspace/1-6-ha-tang-nen-redis-bullmq-drizzle-sentry/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `docs/bdsai/planning/epics.md` (dòng 226-240) — Epic 1, Story 1.6 AC gốc Given/When/Then + quy ước test toàn dự án (dòng 144: Story 1.3 CI gate). Đọc thêm Epic 1 goal (dòng 146-148) + Story 1.1-1.5 context.
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-1 (Module Isolation, dòng 39), AD-5 (Auth Separation, dòng 63), AD-6 (AI Cost Control / Background Job, dòng 69), AD-8 (PII/secret, dòng 81), Consistency Conventions error shape (dòng 129) + Logging NestJS Logger structured JSON (dòng 133), Stack Redis 7/BullMQ 5/Drizzle 0.36/Sentry (dòng 152-160), NFR5/Deferred Supabase Pro (dòng 331), Deployment Redis trên Dokploy (dòng 279-283), Structural Seed `queue/` module (dòng 204) + `common/filters/` (dòng 207).
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` — story queue: 1.1 done, 1.2 done, 1.3 done, 1.4 done, 1.5 done, 1.6 backlog → nâng ready-for-dev. Epic 1 `in-progress`.
4. `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md` — Drizzle setup (drizzle.config, database.module postgres.js `prepare:false`, migrations folder, ConfigService, env validation Zod fail-fast, health endpoint `GET /health/supabase`, port 5435x, PG 15.8, deps drizzle-orm 0.36.4/postgres 3.4.9/drizzle-kit 0.31.10).
5. `_bmad-output/harness-workspace/1-5-vietnamese-full-text-search/02-dev.md` — Drizzle `--custom` migration hoạt động (`drizzle-kit generate --custom --name vietnamese_fts` sinh file 0000 + journal entry + snapshot tự động), migration 0000 đã apply (extension unaccent + pg_trgm + 2 function IMMUTABLE), journal mechanism verified.
6. Code thật `bdsai/apps/api/src/`:
   - `main.ts` — bootstrap: `NestFactory.create(AppModule)`, `enableShutdownHooks`, ConfigService lấy `API_PORT` (default 3101), `app.listen`. CHƯA có Sentry init / pino logger / global filter.
   - `app.module.ts` — imports: ConfigModule.forRoot (isGlobal, validate), DatabaseModule, SupabaseModule, HealthModule. CHƯA có QueueModule/LoggerModule/ScheduleModule.
   - `config/env.validation.ts` — Zod schema: API_PORT, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, DB_POOL_MAX, DB_IDLE_TIMEOUT. CHƯA có REDIS_URL/SENTRY_DSN/thresholds.
   - `db/database.module.ts` — @Global, provide PG_CLIENT (postgres.js) + DRIZZLE, export DRIZZLE only, OnModuleDestroy đóng pool.
   - `db/drizzle.config.ts` — dialect postgresql, schema ./src/db/schema/*, out ./src/db/migrations, dbCredentials.url (dotenv CLI).
   - `db/database.tokens.ts` — DRIZZLE/PG_CLIENT Symbol, DrizzleDB type, InjectDrizzle decorator.
   - `health/health.service.ts` — checkSupabase() ping db/auth/storage độc lập, safeMessage redact connection string (AD-8).
   - `health/health.controller.ts` — `GET /health/supabase` throw HttpException shape chuẩn `{ statusCode, message, error, details }` khi degraded (503).
   - `health/health.module.ts` — controllers + providers HealthService.
7. `bdsai/apps/api/package.json` — scripts db:generate/db:migrate/test/test:e2e. Deps: @nestjs/common 11.1.27, @nestjs/config 4.0.4, drizzle-orm 0.36.4, postgres 3.4.9, zod 3.25.76. **CHƯA có: ioredis, bullmq, @sentry/node, nestjs-pino, pino, pino-pretty, @nestjs/schedule.**
8. `bdsai/apps/web/package.json` — Next 16.2.9, React 19.2.7. **CHƯA có @sentry/nextjs.**
9. `bdsai/.env.example` + `bdsai/apps/api/.env.example` — env hiện có (API_PORT, DATABASE_URL, SUPABASE_*, DB_POOL_MAX, DB_IDLE_TIMEOUT, NEXT_PUBLIC_*). **CHƯA có REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB.**
10. `bdsai/supabase/config.toml` — Supabase local config: major_version=15, db port 54352, API 54351, Studio 54353, Inbucket 54354. **KHÔNG có Redis** (Supabase local chỉ PG/Auth/Storage/Realtime — không cache layer).
11. Story 1.5 file + author log — convention AC đánh số + Dev Notes + References [Source:] + Dev Agent Record + output table format.

---

## Quyết định kiến trúc (tự chốt — ghi trong story Dev Notes)

1. **Redis:** Supabase local KHÔNG có Redis → chạy riêng Docker `redis:7-alpine` port 6379. `REDIS_URL=redis://localhost:6379`. KHÔNG thêm vào Supabase local. Prod: Dokploy VPS chạy Redis container cùng host (ARCHITECTURE-SPINE.md Deployment dòng 279-283).
2. **BullMQ:** `bullmq` + `ioredis` (BullMQ dùng ioredis nội bộ). QueueModule @Global (hạ tầng dùng chung như DatabaseModule). QueueService wrapper — module nghiệp vụ (AI, Xaction) inject + enqueue, KHÔNG tạo queue riêng (AD-1). Test job "echo" verify pipeline. AD-6: job chạy async NGÒAI request path.
3. **Drizzle migration docs:** `apps/api/src/db/MIGRATIONS.md` — 2 luồng (schema generate + custom SQL `--custom`), verify steps, rollback note (Drizzle 0.36 KHÔNG auto-rollback). Story 1.5 đã verify `--custom` hoạt động. **KHÔNG tạo migration mới** — chỉ docs + verify process.
4. **Sentry:** `@sentry/node` (api) + `@sentry/nextjs` (web). DSN optional (dev skip — empty = disabled). API init trong `main.ts` trước NestFactory. Web init qua `sentry.{client,server}.config.ts` (Next.js 16 instrumentation). `beforeSend` redact secret (AD-5/AD-8).
5. **Logger:** `nestjs-pino` + `pino` + `pino-pretty` (dev). Thay default NestJS Logger. Prod JSON compact, dev pretty. Pino redact secret fields (AD-8).
6. **Exception filter:** `apps/api/src/common/filters/all-exceptions.filter.ts` — global, normalize HttpException + non-HttpException + ZodError → shape chuẩn `{ statusCode, message, error?, details? }`. Sentry capture trong filter. KHÔNG phá health endpoint 1.2 (đã throw HttpException shape chuẩn).
7. **Monitoring:** `@nestjs/schedule` cron hourly. `monitoring.service.ts` check `pg_database_size()` + Supabase Storage API. Alert qua pino log + `Sentry.captureMessage`. Threshold env configurable (default 400/800MB — NFR5 80% của Supabase Free 500MB DB / 1GB Storage).
8. **Graceful degradation Redis:** `REDIS_URL` optional. QueueModule ping Redis khi init — fail thì log warning + queue disabled, app vẫn boot (không fail-fast). Health endpoint khác vẫn OK.
9. **KHÔNG tạo migration mới** — Story 1.5 đã có 0000. Story 1.6 chỉ docs + verify `yarn db:migrate` idempotent.

---

## AC tóm tắt (9 AC)

- **AC1:** Redis 7 kết nối được (Docker `redis:7-alpine` port 6379, env REDIS_URL, healthcheck `GET /health/redis`).
- **AC2:** BullMQ tạo/chạy được test job (queue + processor, job echo → complete, AD-6 async ngoài request).
- **AC3:** Drizzle migration:generate + migrate hoạt động + tài liệu MIGRATIONS.md (2 luồng: schema generate + custom SQL, rollback note).
- **AC4:** Sentry bắt lỗi từ api + web (init, DSN env optional, unhandled exception capture, beforeSend redact secret).
- **AC5:** NestJS Logger structured JSON (nestjs-pino, JSON prod / pino-pretty dev, redact secret).
- **AC6:** Exception filter chuẩn error shape `{ statusCode, message, error?, details? }` (global filter, HttpException + non-HttpException + ZodError).
- **AC7:** Monitoring DB > 400MB + Storage > 800MB (cron hourly, alert qua Sentry/log, threshold env configurable).
- **AC8:** Không phá Story 1.1-1.5 (build/lint/typecheck/test pass, migration 0000 vẫn OK, health endpoint 1.2 vẫn 200).
- **AC9:** Test tự động (unit queue/filter/monitoring + integration queue/sentry, skip nếu Redis không reach).

---

## Invariant AD áp dụng

| AD | Áp dụng |
|----|---------|
| AD: NestJS Logger (structured JSON) | AC5 — nestjs-pino, JSON prod / pretty dev |
| AD-6 (Background Job) | AC2 — BullMQ queue, async ngoài request path |
| AD consistency (error shape) | AC6 — global exception filter `{ statusCode, message, error?, details? }` |
| NFR5 (DB/Storage threshold) | AC7 — monitoring DB < 400MB, Storage < 800MB |
| AD-1 (Module Isolation) | queue/ + monitoring/ module riêng, không lẫn business logic |
| AD-5 (Auth Separation) | AC4 — Sentry beforeSend redact secret |
| AD-8 (PII/secret) | AC5 pino redact + AC4 Sentry redact + AC6 filter không leak stack |

---

## Handoff tới story-developer

**Story-developer (opus, skill bmad-dev-story):**
1. Đọc story file `_bmad-output/implementation-artifacts/1-6-ha-tang-nen-redis-bullmq-drizzle-sentry.md` (9 AC + Invariant AD + 10 Edge Case + Dev Notes + Source tree NEW/UPDATE + References).
2. ⚠️ **Story cuối Epic 1** — sau 1.6 done → Epic 1 hoàn tất (retrospective optional). Đảm bảo không phá 1.1-1.5 (AC8).
3. **Thứ tự implement đề xuất:** (a) Redis + healthcheck (AC1), (b) BullMQ queue + test job (AC2), (c) nestjs-pino logger (AC5), (d) exception filter (AC6), (e) Sentry (AC4), (f) monitoring cron (AC7), (g) MIGRATIONS.md docs (AC3), (h) test (AC9), (i) verify AC8.
4. **Redis:** chạy `docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine` trước khi test. Supabase local cũng phải chạy (`supabase start`, port 5435x, PG 15.8) cho health endpoint + migration verify.
5. **Deps cài:** `cd bdsai/apps/api && yarn add bullmq ioredis @sentry/node nestjs-pino pino pino-pretty @nestjs/schedule` + `cd bdsai/apps/web && yarn add @sentry/nextjs`.
6. **Env thêm:** REDIS_URL (optional, default redis://localhost:6379), SENTRY_DSN (optional, empty=disabled), DB_SIZE_ALERT_MB (default 400), STORAGE_SIZE_ALERT_MB (default 800). Cập nhật `env.validation.ts` + `.env.example` (api + root).
7. **KHÔNG tạo migration mới** — Story 1.5 đã có 0000. Chỉ tạo MIGRATIONS.md docs + verify `yarn db:migrate` idempotent.
8. **KHÔNG phá health endpoint 1.2** — `GET /health/supabase` vẫn 200. Exception filter mới chỉ normalize non-HttpException, không thay đổi shape HttpException đã chuẩn.
9. **Integration test cần Redis live** — skip nếu REDIS_URL không reach (env guard, không fail CI). Đặt `jest.setTimeout` rộng nếu cần.
10. Verify 9 AC thật (curl healthcheck + e2e test pass + build/lint/typecheck/test qua Turborepo + migration 0000 vẫn apply).
11. Ghi dev log `02-dev.md` (baseline_commit, file tạo/sửa, lệnh + output thật, bảng verify AC).
