# Story 5.1 — Dev Log

**Story:** XactionModule + Provider Pattern + cross_posts table
**Status:** ready-for-dev → review
**Date:** 2026-06-27

## Summary

Implemented the XactionModule foundation (backend only, no UI) — IPromotionProvider interface, cross_posts DB table, ProviderRegistry, PromotionService, CrossPostProcessor (BullMQ), XactionController, XactionModule, and AD-9 lifecycle removal integration into MarketplaceService. Stub provider only (no real XActions API calls — real providers in story 5.x).

## Files Created (10 new)

| # | File | Purpose |
|---|------|---------|
| 1 | `bdsai/apps/api/src/xaction/providers/promotion-provider.interface.ts` | AC1 — IPromotionProvider interface + types (PostListingInput, PostResult, RemovePostInput, ProviderPostStatus, CrossPostPlatform, CrossPostStatus) |
| 2 | `bdsai/apps/api/src/xaction/providers/stub.provider.ts` | AC1/E10 — StubProvider (mock/no-op, 100ms delay, fake data) |
| 3 | `bdsai/apps/api/src/db/schema/cross-posts.ts` | AC2 — Drizzle pgTable cross_posts + pgEnum (cross_post_platform, cross_post_status) + indexes (idx_cross_posts_listing, unique idx_cross_posts_listing_platform) |
| 4 | `bdsai/apps/api/src/xaction/provider-registry.ts` | AC8 — ProviderRegistry (config-based, OnModuleInit, getProvider/getEnabledPlatforms/isEnabled) |
| 5 | `bdsai/apps/api/src/xaction/promotion.service.ts` | AC6 — PromotionService (createCrossPost, removeCrossPost, listCrossPosts, removeActiveCrossPosts) |
| 6 | `bdsai/apps/api/src/xaction/cross-post.processor.ts` | AC4 — CrossPostProcessor (@Processor('cross-post'), post + remove job types, retry 3x, terminal status on last attempt) |
| 7 | `bdsai/apps/api/src/xaction/xaction.controller.ts` | AC7 — XactionController (POST /xaction/promote 202, GET /xaction/cross-posts, DELETE /xaction/cross-posts/:id 202) |
| 8 | `bdsai/apps/api/src/xaction/xaction.module.ts` | AC3 — XactionModule (BullModule.registerQueue('cross-post'), exports PromotionService) |
| 9 | `bdsai/apps/api/src/db/migrations/0013_cross_posts.sql` | AC2 — Manual migration (cross_posts table + enums + indexes + RLS policies) |
| 10 | `bdsai/apps/api/src/xaction/promotion.service.spec.ts` | AC10a — Unit test (15 tests) |
| 11 | `bdsai/apps/api/src/xaction/provider-registry.spec.ts` | AC10a — Unit test (9 tests) |
| 12 | `bdsai/apps/api/src/xaction/cross-post.processor.spec.ts` | AC10a — Unit test (9 tests) |

## Files Updated (6 existing)

| # | File | Change |
|---|------|--------|
| 1 | `bdsai/apps/api/src/app.module.ts` | Import XactionModule |
| 2 | `bdsai/apps/api/src/db/schema/index.ts` | Export cross-posts schema (barrel) |
| 3 | `bdsai/apps/api/src/marketplace/marketplace.service.ts` | Inject PromotionService, call removeActiveCrossPosts() in transitionStatus() when target status is REJECTED/SOLD/EXPIRED (AD-9, non-blocking .catch()) |
| 4 | `bdsai/apps/api/src/marketplace/marketplace.module.ts` | Import XactionModule (for PromotionService DI — one-way dependency) |
| 5 | `bdsai/apps/api/src/config/env.validation.ts` | Add XACTION_ENABLED_PROVIDERS (optional, default empty) |
| 6 | `bdsai/apps/api/.env.example` | Add XACTION_ENABLED_PROVIDERS documentation |
| 7 | `bdsai/apps/api/src/marketplace/marketplace.create.spec.ts` | Add mock PromotionService provider (constructor change) |
| 8 | `bdsai/apps/api/src/marketplace/marketplace.delete-status.spec.ts` | Add mock PromotionService provider |
| 9 | `bdsai/apps/api/src/marketplace/marketplace.moderation.spec.ts` | Add mock PromotionService provider |

## Verification Results

### 1. Typecheck — PASS
```
yarn workspace @bdsai/api run typecheck
→ 0 errors
```

### 2. Tests — PASS
```
yarn workspace @bdsai/api run test
→ Test Suites: 27 passed, 27 total
→ Tests: 233 passed, 233 total
```
New xaction tests: 33 tests across 3 suites (promotion.service 15, provider-registry 9, cross-post.processor 9).
Existing tests (200) still pass — no regressions.

### 3. Build — PASS
```
yarn workspace @bdsai/api run build
→ Exit code 0 (success)
```

### 4. Lint — PASS (new files)
```
yarn workspace @bdsai/api run lint
→ 1 error (pre-existing in admin.list-users.spec.ts — NOT from this story)
→ 0 errors in xaction/ files
```

### 5. Drizzle Migration
- `yarn db:generate` was run but produced a **broken migration** (recreated all 9 tables) because the drizzle snapshot (0002) is stale — only tracks `public_users`. Migrations 0003-0012 were hand-written and never snapshotted.
- **Decision:** Wrote manual migration `0013_cross_posts.sql` following the existing hand-written pattern (idempotent `DO $$ ... IF NOT EXISTS` for enums, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, RLS policies matching inquiries/ai_results pattern).
- Reverted the broken generated file + journal entry to keep repo clean.
- Migration is idempotent (uses `IF NOT EXISTS` throughout).

## AC Coverage

| AC | Status | Evidence |
|----|--------|----------|
| AC1 — IPromotionProvider interface | ✅ | `promotion-provider.interface.ts` — 3 methods (postListing, removePost, getPostStatus) + types. StubProvider implements it. |
| AC2 — cross_posts DB table | ✅ | `cross-posts.ts` schema + `0013_cross_posts.sql` migration (idempotent, enums, indexes, RLS). Exported in schema/index.ts. |
| AC3 — XactionModule | ✅ | `xaction.module.ts` — BullModule.registerQueue('cross-post'), providers, controllers, exports PromotionService. Imported in app.module.ts. |
| AC4 — BullMQ queue cross-post | ✅ | `cross-post.processor.ts` — @Processor('cross-post'), post + remove jobs, retry 3x (attempts=3, exponential backoff 5000ms), terminal status on last attempt. Tests verify success/fail/retry paths. |
| AC5 — AD-9 lifecycle removal | ✅ | `marketplace.service.ts` transitionStatus() — calls removeActiveCrossPosts() non-blocking .catch() when toStatus is REJECTED/SOLD/EXPIRED. |
| AC6 — PromotionService | ✅ | `promotion.service.ts` — createCrossPost (validate PUBLISHED, check duplicate, insert/update pending, enqueue), removeCrossPost (validate + enqueue), listCrossPosts, removeActiveCrossPosts. |
| AC7 — API endpoints | ✅ | `xaction.controller.ts` — POST /xaction/promote (202, partial success E9), GET /xaction/cross-posts, DELETE /xaction/cross-posts/:id (202). JwtAuthGuard. |
| AC8 — ProviderRegistry | ✅ | `provider-registry.ts` — OnModuleInit parses XACTION_ENABLED_PROVIDERS, getProvider throws if not enabled (E5), getEnabledPlatforms. |
| AC9 — Validation + edge cases | ✅ | E1 duplicate (409), E2 non-PUBLISHED (400), E5 platform not enabled (400), E6 ownership (403), E7 graceful skip (not found), E9 partial success. All covered in tests. |
| AC10 — Tests | ✅ | 33 unit tests (3 suites). All pass. E2e integration test (xaction.e2e-spec.ts) deferred — requires live Redis + Supabase (env guard skip pattern); covered by unit tests for AC verification. |

## Edge Cases Covered (in tests)

- **E1** — Duplicate promotion (status pending/posted → 409; status failed → allow re-promote via row update)
- **E2** — Non-PUBLISHED listing → 400 BadRequest
- **E3** — Removal fail after retry → status='removal_failed' + errorMessage
- **E5** — Platform not enabled → 400 BadRequest
- **E6** — Wrong seller (createCrossPost + removeCrossPost) → 403 Forbidden
- **E7** — crossPostId/listing not found → graceful skip (no throw, no update)
- **E9** — Multiple platforms, 1 fail → partial success (controller catches per-platform)
- **E10** — Stub provider (100ms delay, fake externalUrl/providerJobId)
- **AD-3 independent failure** — removeActiveCrossPosts: 1 enqueue fail ≠ total fail (others still enqueued)
- **AD-9 non-blocking** — lifecycle removal uses .then().catch() — doesn't block listing transition

## Issues Encountered

### Issue 1: drizzle-kit generate produced broken migration
- **Problem:** `yarn db:generate` generated `0003_unusual_the_initiative.sql` that tried to CREATE all 9 tables (ai_results, appeal_requests, public_listings, etc.) because the latest drizzle snapshot (0002_snapshot.json) only tracks `public_users`. Migrations 0003-0012 were hand-written and never snapshotted.
- **Resolution:** Deleted the broken generated file + snapshot + journal entry. Wrote manual migration `0013_cross_posts.sql` following the existing hand-written pattern (idempotent, RLS policies). This matches the established codebase convention (0008_inquiries.sql, 0007_ai_results.sql were also hand-written).
- **Impact:** Migration is correct and idempotent. The drizzle snapshot/journal mismatch is a pre-existing tech debt issue (not introduced by this story).

### Issue 2: onModuleInit not called in Test.createTestingModule
- **Problem:** ProviderRegistry DI integration test failed because `onModuleInit()` is called by NestJS during `app.init()`, not during `compile()`.
- **Resolution:** Added explicit `registry.onModuleInit()` call in the DI integration test after `module.get()`.

## Key Decisions

1. **Stub provider only** — No real XActions API calls (per spec). StubProvider returns fake data after 100ms delay.
2. **Unique index (listingId, platform)** — DB-level duplicate prevention. Re-promote after fail reuses existing row (update status pending) instead of insert.
3. **BullMQ queue 'cross-post' separate** — AD-1 module isolation (separate from ai-summary, inquiry-notification queues).
4. **HTTP 202 Accepted** — Async job, not yet complete. Response body includes cross_posts row (status pending) + enqueued count + errors array.
5. **MarketplaceService injects PromotionService** — One-way dependency (MarketplaceModule → XactionModule). No circular dependency.
6. **XACTION_ENABLED_PROVIDERS default empty** — Graceful when no providers enabled. All promote requests return 400 "platform not enabled".
7. **AD-9 removal non-blocking** — `.then().catch()` pattern in transitionStatus; removal failure doesn't block listing transition.
8. **Manual migration** — Written by hand (not drizzle-kit generated) due to stale snapshot state. Idempotent with `IF NOT EXISTS`.

## Review Fix Round

**Date:** 2026-06-27
**Trigger:** Code review CHANGES REQUESTED (3 HIGH + 5 MEDIUM). Fix all 3 HIGH + M1/M3/M4/M5 (M2 deferred — documented).

### Fixes Applied

#### H1 — IDOR: GET /xaction/cross-posts không check ownership
- **File:** `bdsai/apps/api/src/xaction/promotion.service.ts` — `listCrossPosts(listingId, sellerId)` now accepts `sellerId`, fetches listing, throws 404 (not found) / 403 (sellerId mismatch) before returning cross-posts.
- **File:** `bdsai/apps/api/src/xaction/xaction.controller.ts` — `listCrossPosts` endpoint now passes `user.id` to service.
- **Tests:** `promotion.service.spec.ts` — updated listCrossPosts test (owner OK), added wrong-seller → 403 + not-found → 404 tests.

#### H2 — Promote chôn lỗi 403/400 vào errors[] rồi trả 202
- **File:** `bdsai/apps/api/src/xaction/promotion.service.ts` — added `validatePromoteRequest(listingId, sellerId, platforms)` method: pre-validates all platforms enabled (400), listing exists (404), ownership (403), PUBLISHED (400) — fail-fast, throws immediately.
- **File:** `bdsai/apps/api/src/xaction/xaction.controller.ts` — `promote()` now calls `validatePromoteRequest` BEFORE the loop. Loop only catches `ConflictException` (duplicate 409) → `errors[]` (E9 partial success). All other exceptions rethrow (proper HTTP code). Removed CJK comment + incorrect "fast-fail" comment.
- **Tests:** `promotion.service.spec.ts` — added 4 validatePromoteRequest tests (OK, wrong seller 403, non-PUBLISHED 400, disabled platform 400).

#### H3 — AD-9 thủng: hard-delete listing không gỡ cross-post
- **File:** `bdsai/apps/api/src/marketplace/marketplace.service.ts` — `deleteListing()` now AWAITs `removeActiveCrossPosts(listingId)` (best-effort, try/catch) BEFORE the hard delete. Jobs carry externalUrl/providerJobId so provider can remove post even after cascade deletes the row.
- **File:** `bdsai/apps/api/src/xaction/cross-post.processor.ts` — `processRemove()` now handles row-gone + job-data case: if cross_post row not found BUT job data has externalUrl/providerJobId (delete-listing flow), proceeds with `provider.removePost()` using job data (AD-9 orphan prevention). Only graceful-skips when row gone AND no job data.
- **Tests:** `marketplace.delete-status.spec.ts` — added H3 test (deleteListing → removeActiveCrossPosts called) + wrong-seller 403 (NOT called). `cross-post.processor.spec.ts` — added H3 test (row gone + job data → provider.removePost called).

#### M1 — E4 concurrent không map 409 + rò rỉ raw PG error
- **File:** `bdsai/apps/api/src/xaction/promotion.service.ts` — `createCrossPost` insert now wrapped in try/catch. Added `isUniqueViolation(e)` helper (checks PG code `23505` + message regex). Unique violation → `ConflictException('Tin đã quảng bá trên nền tảng này')` (no raw constraint name leak).
- **Tests:** `promotion.service.spec.ts` — added M1 test (insert rejects with code 23505 → ConflictException).

#### M3 — Migration không idempotent (CREATE POLICY bare)
- **File:** `bdsai/apps/api/src/db/migrations/0013_cross_posts.sql` — both `CREATE POLICY` statements wrapped in `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies ...) THEN CREATE POLICY ... END IF; END $$;` (idempotent — running 2x no error).

#### M4 — Integration test AC10b chưa có
- **File:** NEW `bdsai/apps/api/test/xaction.e2e-spec.ts` — integration test with env guard (skip if Redis not reachable OR Supabase not available). Sets `XACTION_ENABLED_PROVIDERS=facebook` before app boot. Tests: POST /xaction/promote → 202, GET cross-posts → list, DELETE → 202, H1 non-owner GET → 403, H2 non-owner promote → 403, H2/E9 duplicate → 202 + errors[], E1 no-token → 401, E2 invalid UUID → 400. Follows existing e2e pattern (marketplace.e2e-spec.ts + queue.e2e-spec.ts).

#### M5 — AC5 trigger AD-9 không được assert trong test
- **File:** `bdsai/apps/api/src/marketplace/marketplace.delete-status.spec.ts` — exposed `mockPromotionService` at describe scope. Added tests: markAsSold PUBLISHED→SOLD → removeActiveCrossPosts called; rejectListing PENDING→REJECTED → removeActiveCrossPosts called; deleteListing → removeActiveCrossPosts called (H3); deleteListing wrong seller → 403 + NOT called.

### M2 (deferred — documented, not blocking)
E8 Redis-down status code (202 vs 503) + raw error leak. Accepted temporarily per review recommendation ("M2 có thể chấp nhận tạm nếu document"). After H2 fix, Redis-down enqueue failure now propagates as 500 (no longer buried in errors[]). Full 503 mapping deferred to story 5.x.

### Verification Results

| Check | Result |
|-------|--------|
| `yarn workspace @bdsai/api run typecheck` | **PASS** (0 errors) |
| `yarn workspace @bdsai/api run test` | **PASS** — 245/245 tests (27 suites) — existing + new (M1/H1/H2/H3/M5 + processor H3) all green |
| `yarn workspace @bdsai/api run build` | **PASS** (build success) |
| `eslint src/xaction src/marketplace/marketplace.service.ts` | **PASS** (0 errors) |

### Test Count Delta
- Before: 233 tests (per review: 33 xaction + 41 marketplace + others)
- After: 245 tests (+12 new: 4 validatePromoteRequest, 1 M1 unique-violation, 2 H1 listCrossPosts ownership, 1 H3 processor row-gone, 4 M5/H3 marketplace transitions)

### Files Changed (8)

| # | File | Change |
|---|------|--------|
| 1 | `bdsai/apps/api/src/xaction/promotion.service.ts` | + validatePromoteRequest, + isUniqueViolation helper, listCrossPosts ownership check, M1 insert catch |
| 2 | `bdsai/apps/api/src/xaction/xaction.controller.ts` | H2 pre-validate before loop, H1 ownership in GET, ConflictException import |
| 3 | `bdsai/apps/api/src/xaction/cross-post.processor.ts` | H3 processRemove row-gone + job-data handling |
| 4 | `bdsai/apps/api/src/marketplace/marketplace.service.ts` | H3 deleteListing enqueue removal before hard delete |
| 5 | `bdsai/apps/api/src/db/migrations/0013_cross_posts.sql` | M3 idempotent CREATE POLICY |
| 6 | `bdsai/apps/api/test/xaction.e2e-spec.ts` | NEW — M4 integration test (AC10b) |
| 7 | `bdsai/apps/api/src/xaction/promotion.service.spec.ts` | + H1/H2/M1 tests |
| 8 | `bdsai/apps/api/src/xaction/cross-post.processor.spec.ts` | + H3 test |
| 9 | `bdsai/apps/api/src/marketplace/marketplace.delete-status.spec.ts` | + M5/H3 tests, mockPromotionService exposed |

**Story status:** left at "review" for re-review (NOT changed).
