# Story 5.1 — Author Log (story-author)

**Story:** 5-1-xaction-module-provider-pattern-cross-posts
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-26
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`
**Vai trò:** Story ĐẦU TIÊN Epic 5 (Xaction Integration — Track B). Gate đã gỡ: (1) XActions API docs available, (2) ToS compliance decided (browser automation, accept risk), (3) AD-8 phone hash đã trong architecture. Đặt nền móng: IPromotionProvider interface + cross_posts table + XactionModule + BullMQ queue + lifecycle removal + API endpoints.

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/5-1-xaction-module-provider-pattern-cross-posts.md` | ✅ Đã ghi (10 AC + Invariant AD table + 10 Edge Case + Dev Notes + Source tree NEW/UPDATE + schema reference + References [Source:] + Dev Agent Record) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ⚠️ KHÔNG update (file có thể không tồn tại cho Track B — Track A 22 story done, Track B mới unblocked. Parent agent quyết định có update sprint-status hay không) |
| 3 | Author log | `_bmad-output/harness-workspace/5-1-xaction-module-provider-pattern-cross-posts/01-author.md` | ✅ File này |

---

## Gate lift justification (Track B unblocked)

1. **XActions API docs available** — repo tại `/Users/luisphan/Documents/GitHub/xactions`: REST API (Express.js `api/server.js`), MCP server (`src/mcp/server.js` — 140+ tools), Puppeteer browser automation (`src/scrapers/`, `src/agents/browserDriver.js`). API reference `docs/api-reference.md` — createBrowser, scrapeProfile, postTweet, etc. XActions philosophy: "No API keys. No monthly fees. 100% open source." — browser automation approach.
2. **ToS compliance decided** — browser automation approach (accept risk). Platform ToS có thể cấm automation, bdsai.vn chọn approach này cho MVP. Risk: account proxy có thể bị ban → xử lý qua AD-9 (removal_failed → gỡ thủ công).
3. **AD-8 phone hash** — đã trong architecture (phone → sha256 hash cho dedup). Story 5.1 cross_posts KHÔNG lưu PII — chỉ listingId + platform + externalUrl + status.

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `_bmad-output/planning-artifacts/epics.md` — Epic 5 (dòng 124-131): FR10 Xaction Auto-Post, FR12 Seller promotion dashboard, gate conditions, stories bổ sung (dedup, news feed FE, provider pattern AD-3, cross-post lifecycle AD-9). FR coverage map (dòng 79-86).
2. `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md`:
   - AD-1 (Module Isolation, dòng 39-43) — xaction module riêng, expose service interface only.
   - AD-2 (Single Data Mutation Path, dòng 45-49) — cross_posts mutation qua NestJS service.
   - AD-3 (Xaction as External Service, dòng 51-67) — async BullMQ, provider pattern, independent failure, retry 3x, enable/disable qua config.
   - AD-8 (PII/secret, dòng 81-85) — cross_posts KHÔNG lưu PII raw.
   - AD-9 (Cross-Post Lifecycle Integrity, dòng 87-91) — enqueue removal on REJECTED/DELETED/SOLD/EXPIRED, removal_failed → gỡ thủ công.
   - Dependency direction (dòng 315) — M5 Xaction Integration binds AD-3, AD-8, AD-9.
3. `_bmad-output/implementation-artifacts/1-6-ha-tang-nen-redis-bullmq-drizzle-sentry.md` — format reference (story metadata, AC Given/When/Then, Invariant AD table, Edge Case, Dev Notes, Source tree, References, Dev Agent Record). Story 1.6 đã setup BullMQ + Redis + Drizzle migration process + pino logger + exception filter — 5.1 reuse hạ tầng này.
4. Code thật `bdsai/apps/api/src/`:
   - `inquiry/inquiry.module.ts` — BullModule.registerQueue pattern (queue tên + providers + exports).
   - `inquiry/inquiry.processor.ts` — @Processor WorkerHost pattern (concurrency, process(job), Drizzle query, graceful not-found skip).
   - `marketplace/marketplace.module.ts` — module pattern (imports BullModule.registerQueue, controllers, providers, exports).
   - `marketplace/marketplace.service.ts` — Drizzle service pattern (@InjectDrizzle, @InjectQueue, Logger, try/catch + safeErr, status transition VALID_TRANSITIONS, queue.add với attempts/backoff, .catch() non-blocking).
   - `marketplace/marketplace-cron.service.ts` — @Cron pattern (ScheduleModule, @Cron(CronExpression.EVERY_HOUR)).
   - `db/schema/inquiries.ts` — Drizzle pgTable + references + index pattern (FK ON DELETE CASCADE, index trên listingId).
   - `db/schema/public-listings.ts` — pgEnum (listingStatus, listingType, propertyType) + pgTable + jsonb + timestamp pattern. listingStatus workflow: DRAFT→PENDING→PUBLISHED→EXPIRED/SOLD/REJECTED.
   - `db/schema/index.ts` — barrel export (public-users, public-listings, moderation-audit-logs, ai-results, inquiries). 5.1 thêm cross-posts export.
   - `app.module.ts` — module registration pattern (ConfigModule, LoggerModule, DatabaseModule, QueueModule, ScheduleModule, HealthModule, AuthModule, MarketplaceModule, AiModule, InquiryModule, NotificationModule). 5.1 thêm XactionModule.
5. `/Users/luisphan/Documents/GitHub/xactions` — XActions repo (gate lift justification):
   - `README.md` — toolkit overview (browser automation, no API key, MCP server 140+ tools, CLI, dashboard).
   - `CLAUDE.md` — architecture (3 runtime contexts: browser scripts, Node.js library/CLI/MCP, API server Express + Prisma + Bull + Redis). Puppeteer + stealth plugin.
   - `docs/api-reference.md` — createBrowser, createPage, scrapeProfile, postTweet, postThread, etc. (reference cho provider thật 5.x).
   - `docs/AGENTS.md` — Thought Leader Agent architecture (BrowserDriver, AntiDetection, postTweet/postThread methods — reference cho FB provider 5.x).

---

## Quyết định kiến trúc (author chốt)

1. **Stub provider cho 5.1** — KHÔNG gọi XActions API thật. Lý do: 5.1 = foundation (interface + table + queue + lifecycle + API). Provider thật (FB/Chợ Tốt/Zalo) ở 5.x sau. Stub verify pattern end-to-end.
2. **Unique index `(listingId, platform)`** — chống duplicate ở DB level + service check. Promote lại nếu status failed/removed → reuse existing row (update status pending).
3. **BullMQ queue `cross-post` riêng** — AD-1 module isolation, KHÔNG dùng queue ai-summary hay inquiry-notification.
4. **HTTP return 202 Accepted** — async job, chưa hoàn tất. Response body chứa cross_posts row (status pending) + enqueued count.
5. **MarketplaceService inject PromotionService** — cho AD-9 lifecycle removal. Dependency: MarketplaceModule → XactionModule (KHÔNG circular).
6. **`XACTION_ENABLED_PROVIDERS` default empty** — 5.1 chỉ stub, prod enable sau. Empty = promote return 400 (graceful).

---

## AC coverage summary (10 AC)

| AC | Topic | AD |
|----|-------|-----|
| AC1 | IPromotionProvider interface (postListing, removePost, getPostStatus) | AD-3 |
| AC2 | cross_posts DB table (Drizzle schema + migration + unique index) | AD-2 |
| AC3 | XactionModule (NestJS module, provider registry, exports PromotionService) | AD-1 |
| AC4 | BullMQ queue cross-post (async, retry 3x exponential backoff, post + remove job) | AD-3, NFR7 |
| AC5 | Cross-post lifecycle removal (AD-9 — enqueue removal on REJECTED/DELETED/SOLD/EXPIRED) | AD-9 |
| AC6 | PromotionService (createCrossPost, removeCrossPost, listCrossPosts) | AD-2 |
| AC7 | API endpoints (POST /xaction/promote, GET /xaction/cross-posts, DELETE /xaction/cross-posts/:id) | FR10, FR12 |
| AC8 | ProviderRegistry (config-based, enable/disable provider) | AD-3 |
| AC9 | Validation + edge case (non-PUBLISHED, duplicate, ownership, disabled platform) | AD-2 |
| AC10 | Test tự động (unit + integration + edge case) | Story 1.3 gate |

---

## Edge case coverage (10 edge case)

E1 duplicate promotion, E2 non-PUBLISHED, E3 removal fail, E4 concurrent promote, E5 provider không enabled, E6 ownership, E7 listing delete cascade, E8 Redis down, E9 multiple platforms 1 fail, E10 stub provider.

---

## Next steps (parent agent)

1. **Sprint status update** — kiểm tra `_bmad-output/implementation-artifacts/sprint-status.yaml` có tồn tại không. Nếu có → thêm dòng `5-1-xaction-module-provider-pattern-cross-posts: ready-for-dev`. Nếu không → parent agent quyết định.
2. **Story-developer** — implement story 5.1 theo spec. Stub provider + interface + table + module + queue + lifecycle + API + tests.
3. **Code-reviewer** — review implementation.
4. **E2E-tester** — integration test (Redis + Supabase live), API curl verify.
