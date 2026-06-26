# Epic 1 Gap Review — Foundation & Infrastructure

> Rà soát AC Story 1.1–1.6 (Epic 1) vs implementation thực tế trong `bdsai/`.
> Method: đọc AC `_bmad-output/planning-artifacts/epics.md` (lines 146–240) → grep/read code/config → so sánh → verify live (curl search API, kiểm CI workflow).
> Ngày review: 2026-06-26. KHÔNG sửa code.

## Story 1.1: Khởi tạo monorepo Turborepo
- **Status:** NO GAP
- **Gaps:** Không có.
- **Implemented:**
  - Monorepo Turborepo 2.10.0 + yarn 4.9.2 workspace (`bdsai/package.json` workspaces `apps/*`, `packages/*`).
  - `apps/web` Next.js 16.2.9 + React 19.2.7 (`apps/web/package.json`).
  - `apps/api` NestJS 11.1.27 (`apps/api/package.json`).
  - `packages/shared` export type/schema/constant chung (`packages/shared/src/index.ts` → types, schemas, constants; build `tsc` ra `dist/`).
  - `turbo.json` cấu hình task `dev`/`build`/`lint`/`typecheck`/`test`/`clean` cho cả workspace (topological `^build`).
  - `yarn dev` = `turbo run dev` chạy đồng thời web (3100) + api (3101) — README xác nhận.
  - Naming convention: files kebab-case (`site-header.tsx`, `marketplace.service.ts`, `public-listings.ts`), entities PascalCase (`publicListings`, `MarketplaceService`).
  - Test: vitest (web) + jest (api) cấu hình sẵn.

## Story 1.2: Kết nối Supabase (DB + Auth + Storage)
- **Status:** NO GAP
- **Gaps:** Không có.
- **Implemented:**
  - `DatabaseModule` (`apps/api/src/db/database.module.ts`): postgres.js + Drizzle ORM, expose qua DI token `DRIZZLE`. `@Global`, `OnModuleDestroy` đóng pool.
  - Connection pooling phù hợp Supabase Free: `prepare: false` (Supavisor), `max` (DB_POOL_MAX=10), `idle_timeout` (DB_IDLE_TIMEOUT=20) — `apps/api/src/db/drizzle.config.ts` + `database.module.ts`.
  - `drizzle.config.ts` (dialect postgresql, schema `./src/db/schema/*`, out `./src/db/migrations`, tách khỏi `supabase/migrations`).
  - `SupabaseService` (`apps/api/src/supabase/supabase.service.ts`): client service-role (persistSession false), expose `.auth` + `.storage` + storage-only client. AD-8: chỉ log host.
  - `HealthController` GET `/health/supabase` — ping db (SELECT 1) + auth (listUsers limit 1) + storage (listBuckets), 503 error shape chuẩn khi degraded.
  - Env qua NestJS ConfigModule `validateEnv` (`apps/api/src/config/env.validation.ts`) — zod schema.
  - Story không tạo bảng nghiệp vụ (schema `index.ts` rỗng `export {}` lúc 1.2; bảng đầu tiên `public_users` ở Story 2.1).
  - `.env.example` đầy đủ (API, web) với demo key local cố định dải 5435x.

## Story 1.3: CI/CD GitHub Actions → Vercel + Dokploy
- **Status:** MINOR GAP
- **Gaps:**
  - GAP-1 (MINOR): CI trigger branch — AC ghi "push/merge vào nhánh chính" nhưng `ci.yml` trigger trên `production` + `develop` (không có `main`/`master`). File: `.github/workflows/ci.yml:10-15`. Suggested fix: Nếu `main` là nhánh chính thực tế, thêm `main` vào `branches`; hoặc cập nhật AC ghi rõ `production`/`develop` là nhánh chính của project (chấp nhận được nếu đó là quy ước).
  - GAP-2 (MINOR): Lighthouse gate scope hạn chế — AC4 yêu cầu "Lighthouse CI trên public pages, fail nếu SEO < 90" nhưng `.lighthouserc.js` chỉ gate `/` (homepage). `/listings`, `/listings/[id]` đánh dấu TODO(story 3.3/3.4). File: `bdsai/.lighthouserc.js:13-20`. Suggested fix: Đây là quyết định hợp lý (route chưa tồn tại → 404 spurious fail), nhưng cần theo dõi thêm 2 page khi Story 3.3/3.4 ready. Không phải gap chức năng ở thời điểm 1.3.
- **Implemented:**
  - `.github/workflows/ci.yml` tồn tại, chạy trên PR/push `production`+`develop`: Build → Lint → Typecheck → Test (Turborepo topological, `working-directory: bdsai`, `yarn install --immutable` frozen lockfile). Gate: step fail → job fail.
  - `.github/workflows/deploy.yml`: trigger push `production` only. Luồng `ci-gate` → (`deploy-web` || `deploy-api`) → `lighthouse` (post-deploy) → `lighthouse-fail-issue` (if: failure()).
  - `deploy-web`: Vercel CLI `vercel deploy --prod` (VERCEL_ORG_ID + VERCEL_PROJECT_ID + VERCEL_TOKEN qua secrets).
  - `deploy-api`: Docker buildx → push GHCR (`packages: write` perms M2) → Dokploy webhook redeploy (DOKPLOY_WEBHOOK_URL + DOKPLOY_TOKEN). Dockerfile multi-stage (`apps/api/Dockerfile`), `--filter=@bdsai/api...` chỉ build api+shared (M3), healthcheck `/health/supabase`.
  - Secrets qua `${{ secrets.* }}` — không hardcode (AD-5/AD-8).
  - Lighthouse SEO ≥ 0.9 (`error` assertion), performance/accessibility `warn` (non-blocking). Fail → tạo GitHub issue (không rollback).

## Story 1.4: Base UI — layout, navigation, responsive
- **Status:** NO GAP
- **Gaps:** Không có.
- **Implemented:**
  - `SiteHeader` (`apps/web/components/shared/site-header.tsx`): server component, logo `bdsai.vn`, nav desktop (NavigationMenu: Trang chủ / Tìm kiếm / Đăng tin), `HeaderAuthActions` (đăng nhập/đăng xuất conditional), nút "Đăng tin". Touch target ≥ 44px.
  - `MobileNav` (`apps/web/components/shared/mobile-nav.tsx`): client island (Sheet/Radix Dialog) — hamburger <md, nav drawer.
  - `SiteFooter` (`apps/web/components/shared/site-footer.tsx`): server component, responsive grid 1-col mobile / 3-col desktop, footer links, copyright.
  - Route groups: `(public)`, `(dashboard)`, `(admin)`, `(auth)` — mỗi group có `layout.tsx` riêng (`apps/web/app/*/layout.tsx`). Public shell = header+main+footer.
  - Root `layout.tsx`: Geist font, skip-nav a11y, AuthProvider.
  - Responsive mobile-first (Tailwind 4 CSS-first, `md:` breakpoints) — verified 360/768/1440 không vỡ (e2e Playwright per changelog).
  - Skeleton/loading: `Skeleton` component (`apps/web/components/ui/skeleton.tsx`) + demo trên homepage (`apps/web/app/(public)/page.tsx`), loading states trong dashboard/admin layouts.
  - shadcn/ui manual (6 components: button, navigation-menu, sheet, avatar, dropdown-menu, skeleton) + Tailwind 4.
  - Test: vitest 10 test (site-header, site-footer, skeleton, ...).

## Story 1.5: Vietnamese Full-Text Search setup
- **Status:** NO GAP
- **Gaps:** Không có.
- **Implemented:**
  - Migration `0000_vietnamese_fts.sql` (`apps/api/src/db/migrations/`): `CREATE EXTENSION IF NOT EXISTS unaccent` + `pg_trgm` (AC1).
  - `f_unaccent_to_tsvector(input text) RETURNS tsvector` — IMMUTABLE, `to_tsvector('simple', unaccent(lower(input)))` bỏ dấu + lowercase (AC2). Safe cho GIN index.
  - `f_unaccent_query(input text) RETURNS tsquery` — IMMUTABLE, `plainto_tsquery('simple', unaccent(lower(input)))` chấp nhận plain text "long thanh" → `'long' & 'thanh'` (AC2/AC3).
  - Idempotent: `IF NOT EXISTS` + `CREATE OR REPLACE` (AC5).
  - Giới hạn ranking từ ghép documented trong migration comments (AC7 — 'simple' config tách phrase thành token riêng, ts_rank yếu; ES migrate DEFERRED).
  - 0 bảng nghiệp vụ (AC6 — chỉ DDL).
  - E2e test `apps/api/test/vietnamese-fts.e2e-spec.ts`: verify extension enabled, function IMMUTABLE, "Long Thành" → 'long'/'thanh', "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền", pg_trgm similarity, idempotent.
  - **Live verify (curl API đang chạy):** `GET /marketplace/search?q=long` → 200 JSON items; `q=long thanh` → 45 results (gồm district "Long Thành"); `q=can ho` → 13 results (gồm "Căn hộ chung cư"); `q=dat nen` → 33 results (gồm "Đất nền..."); `q=Long Thành` (có dấu) → 45 results (khớp không dấu). FTS hoạt động đúng AC.
  - GIN index tạo ở Story 3.3 (`0005_listings_fts_index.sql`) dùng `f_unaccent_to_tsvector` — khớp design Story 1.5.

## Story 1.6: Hạ tầng nền — Redis/BullMQ, Drizzle migration, Sentry
- **Status:** MINOR GAP
- **Gaps:**
  - GAP-1 (MINOR): Stale legacy `docker-compose.dev.yml` ở repo root (`/docker-compose.dev.yml`) — cấu hình Twenty CRM cũ (postgres:16 container `twenty-postgres`, redis:latest container `twenty-redis`), không phải của bdsai. bdsai Redis chạy qua `docker run redis:7-alpine` (per `apps/api/.env.example`). File stale có thể gây nhầm lẫn dev mới. Suggested fix: Xóa hoặc move file legacy ra khỏi repo bdsai scope; thêm `docker-compose.bdsai.yml` cho Redis 7 nếu muốn chuẩn hóa.
- **Implemented:**
  - **Redis + BullMQ:** `QueueModule` (`apps/api/src/queue/queue.module.ts`) — `@Global`, ioredis connection dùng chung (REDIS_CONNECTION token), `BullModule.forRootAsync` + `registerQueue` (echo + email). `QueueService` (`queue.service.ts`): `onModuleInit` ping Redis, graceful degradation E1 (disabled nếu down, app vẫn boot), `addEchoJob` (attempts 3 + exponential backoff). `EchoProcessor` (`queue.processor.ts`): worker echo log + return. `POST /queue/test` endpoint. `GET /health/redis` healthcheck. Live: Redis PONG + job complete verified (per changelog).
  - **Drizzle migration:** Scripts `db:generate` / `db:migrate` (`apps/api/package.json`), `drizzle.config.ts`. `MIGRATIONS.md` (`apps/api/src/db/MIGRATIONS.md`) — tài liệu đầy đủ Luồng A (schema change) + Luồng B (custom SQL) + verify + rollback (Drizzle 0.36 không auto-rollback) + lưu ý Supabase. 9 migration đã apply (0000–0008).
  - **Sentry:** API — `main.ts` `Sentry.init` trước NestFactory (DSN optional E2), `redactSecrets` beforeSend (`apps/api/src/common/sentry/sentry.util.ts` — strip Authorization/Cookie + redact secret keys + PII email/phone). Web — `sentry.client.config.ts` (NEXT_PUBLIC_SENTRY_DSN), `sentry.server.config.ts` (SENTRY_DSN), `instrumentation.ts`, `next.config.ts` `withSentryConfig` (source map upload CI only).
  - **Structured JSON logging:** `LoggerModule` (`apps/api/src/common/logger/logger.module.ts`) — nestjs-pino, prod JSON compact / dev pino-pretty, redact secret fields (AD-8/E9). `app.useLogger` trong `main.ts`.
  - **Error shape chuẩn:** `AllExceptionsFilter` (`apps/api/src/common/filters/all-exceptions.filter.ts`) — global `APP_FILTER`, shape `{ statusCode, message, error?, details? }`. HttpException giữ shape, ZodError → 400 + details, non-HttpException → 500 generic (không leak stack). `Sentry.captureException` trước response.
  - **Monitoring (NFR5):** `MonitoringService` (`apps/api/src/health/monitoring.service.ts`) — `@Cron(EVERY_HOUR)` check `pg_database_size` (Drizzle) + Supabase Storage sum object sizes. Threshold DB 400MB / Storage 800MB (env configurable DB_SIZE_ALERT_MB/STORAGE_SIZE_ALERT_MB). Vượt → log warn + `Sentry.captureMessage`. `GET /monitoring` trigger thủ công. `ScheduleModule.forRoot` trong app.module.
  - Test: 25 unit + 17 e2e (queue, sentry, health, monitoring) per changelog.

## Summary table

| Story | Status | # Gaps | Priority |
|-------|--------|--------|----------|
| 1.1 Monorepo Turborepo | NO GAP | 0 | — |
| 1.2 Kết nối Supabase | NO GAP | 0 | — |
| 1.3 CI/CD GitHub Actions | MINOR GAP | 2 | LOW (branch trigger + lighthouse scope — đều chấp nhận được, theo dõi) |
| 1.4 Base UI layout/nav | NO GAP | 0 | — |
| 1.5 Vietnamese FTS | NO GAP | 0 | — |
| 1.6 Redis/BullMQ/Drizzle/Sentry | MINOR GAP | 1 | LOW (stale legacy docker-compose file) |

## Tổng quan
Epic 1 (Foundation & Infrastructure) ở trạng thái **rất tốt** — 4/6 story NO GAP, 2/6 MINOR GAP với gap đều LOW severity (cosmetic/housekeeping, không ảnh hưởng chức năng). Tất cả AC chức năng đều được implement + verify (live curl search API pass, CI workflow đúng stages, e2e test thật với Supabase/Redis). Không có MAJOR GAP. Hai minor gap (CI branch trigger, stale docker-compose) là item dọn dẹp, không block Epic 2+.
