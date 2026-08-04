# Story 5.2 — Author Log (story-author)

**Story:** 5-2-facebook-auto-post-provider
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-27
**Kết quả:** Story file tạo xong, status `ready-for-dev`
**Vai trò:** Story thứ 2 Epic 5 (Xaction Integration — Track B). Story 5.1 DONE (foundation: interface + table + queue + registry + processor + stub). Story 5.2 thay StubProvider bằng FacebookProvider thật — gọi XActions REST API (POST /api/facebook/automate action:'post') để đăng tin BĐS lên Facebook.

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/5-2-facebook-auto-post-provider.md` | ✅ Đã ghi (10 AC + Invariant AD table + 12 Edge Case + Dev Notes + Source tree NEW/UPDATE + XactionsClient/ListingFormatter reference + Quyết định kiến trúc + Test Plan + References [Source:] + Dev Agent Record) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ⚠ KHÔNG update (parent agent quyết định — Track B story, sprint-status có thể cho Track A only) |
| 3 | Author log | `_bmad-output/harness-workspace/5-2-facebook-auto-post-provider/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. **Story 5.1 artifact** — `_bmad-output/implementation-artifacts/5-1-xaction-module-provider-pattern-cross-posts.md` — format reference (metadata, AC Given/When/Then, Invariant AD table, Edge Case, Dev Notes, Source tree, Test Plan, References, Dev Agent Record). 5.1 đã tạo: IPromotionProvider interface, cross_posts table, BullMQ queue, ProviderRegistry, PromotionService, CrossPostProcessor, StubProvider.

2. **Code thật `bdsai/apps/api/src/xaction/`:**
   - `providers/promotion-provider.interface.ts` — IPromotionProvider (postListing, removePost, getPostStatus), PostListingInput (listingId, title, description, price, area, province, district, address, images), PostResult (externalUrl, providerJobId), ProviderPostStatus (pending|posted|failed|removed), CrossPostPlatform (facebook|cho_tot|zalo).
   - `providers/stub.provider.ts` — StubProvider pattern (@Injectable, readonly platform, 3 method, delay simulate async). 5.2 thay bằng FacebookProvider cùng pattern.
   - `provider-registry.ts` — ProviderRegistry (onModuleInit parse XACTION_ENABLED_PROVIDERS, getProvider, getEnabledPlatforms, isEnabled). 5.2 update: inject FacebookProvider, map facebook→FacebookProvider (cho_tot/zalo vẫn stub).
   - `xaction.module.ts` — XactionModule (BullModule.registerQueue('cross-post'), providers: PromotionService, CrossPostProcessor, ProviderRegistry, StubProvider, exports: PromotionService). 5.2 thêm FacebookProvider, XactionsClient, ListingFormatter vào providers.
   - `cross-post.processor.ts` — CrossPostProcessor (processPost, processRemove, isLastAttempt). KHÔNG đổi — calls provider interface (AD-3).
   - `db/schema/public-listings.ts` — listing schema (title, description, price integer VND, area numeric, province, district, ward nullable, street nullable, address, images jsonb). ListingFormatter dùng các field này.
   - `config/env.validation.ts` dòng 72-76 — XACTION_ENABLED_PROVIDERS đã có (z.string().default('')). 5.2 thêm XACTIONS_API_URL, XACTIONS_API_TOKEN, XACTIONS_FB_ACCOUNT_ID, XACTIONS_FB_C_USER, XACTIONS_FB_XS, BDSAI_WEB_URL.

3. **XActions repo `/Users/luisphan/Documents/GitHub/xactions` (verified từ source):**
   - `api/routes/facebook.js` dòng 178-492 — POST /api/facebook/automate. Body: `{ action, text, dryRun, authCookie, ... }`. **dryRun defaults to TRUE** (dòng 280: `resolvedDryRun = dryRun === false ? false : true`). Valid actions: like, comment, post, messenger-share, share, schedule, join-groups, batch-post-groups, etc. Response success: `{ ok: true, action, dryRun, userId, operationId, ...result }` (dòng 479-486). Response fail: `{ ok: false, error: '...' }` (HTTP 500). authCookie: `{ c_user, xs }` (raw) hoặc `{ accountId }` (stored — server-side decrypt via resolveAccountCookie).
   - `api/routes/operations.js` dòng 142-162 — GET /api/operations/status/:operationId. Auth: authMiddleware. Response: operation row `{ id, userId, type, status, config, result, error, startedAt, completedAt }`. status: pending|running|completed|failed|cancelled. 404 nếu not found.
   - `api/services/facebookAutomation.js` dòng 690-730 — createFacebookPost(page, content, options). Puppeteer: loginWithCookie → composer → type → submit. Return `{ posted: true, postUrl }`. **postUrl "frequently undefined even on success"** (dòng 728-730 — XHR submit, no navigation). Text-only (KHÔNG image upload).
   - `api/middleware/auth.js` — authMiddleware: `jwt.verify(token, JWT_SECRET)` → req.user. 401 nếu token missing/invalid. Bearer token scheme.
   - `api/server.js` — app.use('/api/facebook', facebookRoutes) dòng 314, app.use('/api/operations', operationRoutes) dòng 311. PORT default 3001 (dòng 103). Rate limiter: fbAutomateLimiter (dòng 193), operationsLimiter (dòng 184).

---

## Quyết định kiến trúc (author chốt)

1. **Text-only cho MVP** — XActions createFacebookPost text-only (KHÔNG upload image). GAP — Story 5.5 handle image. Listing images (input.images) bỏ qua trong formatter.
2. **removePost throw (KHÔNG navigate-delete)** — FB không có delete-post API dễ. Puppeteer delete phức tạp + fragile. MVP: throw "not supported" → processor set removal_failed → UI "gỡ thủ công" (AD-9).
3. **Env vars cho FB account (MVP)** — XACTIONS_FB_ACCOUNT_ID (preferred — stored account) HOẶC XACTIONS_FB_C_USER + XACTIONS_FB_XS (raw cookie fallback). Production: dedicated table encrypted (post-MVP).
4. **fetch built-in (KHÔNG axios)** — Node 18+ global fetch + AbortController. KHÔNG thêm dependency. Retry 5xx thủ công (2x exponential).
5. **dryRun=false hardcode** — bdsai.vn LUÔN đăng thật. Body luôn dryRun:false. Defensive: response dryRun:true → throw.
6. **postUrl nullable (E3)** — XActions postUrl thường undefined. externalUrl = postUrl ?? null. status='posted' dựa trên operation completed (KHÔNG dựa postUrl).
7. **Operation status mapping** — pending/running→pending, completed→posted, failed/cancelled/unknown→failed. KHÔNG map sang removed (FB removal not supported).

---

## AC coverage summary (10 AC)

| AC | Topic | AD |
|----|-------|-----|
| AC1 | FacebookProvider implements IPromotionProvider (postListing, removePost, getPostStatus) | AD-3 |
| AC2 | XactionsClient (HTTP client — postToFacebook, getOperationStatus, timeout, retry) | AD-3 |
| AC3 | ListingFormatter (formatForFacebook — title/price/location/desc/link/hashtags, truncate 5000) | — |
| AC4 | ProviderRegistry update (facebook→FacebookProvider, cho_tot/zalo vẫn stub) | AD-3 |
| AC5 | XactionModule update (provide FacebookProvider + XactionsClient + ListingFormatter) | AD-1 |
| AC6 | Env config (XACTIONS_API_URL, XACTIONS_API_TOKEN, XACTIONS_FB_*, BDSAI_WEB_URL) | AD-8 |
| AC7 | CrossPostProcessor KHÔNG thay đổi (calls provider interface — AD-3 transparent) | AD-3 |
| AC8 | dryRun=false enforcement (XActions default true → must explicit false) | — |
| AC9 | Operation status mapping (XActions → ProviderPostStatus) | — |
| AC10 | Test tự động (unit + integration + edge case) | — |

---

## Edge case summary (12 edge cases)

| EC | Topic | Test |
|----|-------|------|
| E1 | XActions API không reach (timeout 30s) | mock fetch reject |
| E2 | XActions 4xx (bad request — no retry) | mock 400 |
| E3 | postUrl null/undefined (FB XHR submit) | mock postUrl:null → externalUrl:null |
| E4 | XActions 5xx (retry 2x) | mock 500 ×3 |
| E5 | Token empty + facebook enabled (graceful skip) | config facebook + token empty |
| E6 | Account config missing (accountId + c_user/xs empty) | config empty → throw |
| E7 | Content > 5000 chars (truncate) | listing title 6000 chars |
| E8 | Operation status 'cancelled' → failed | getPostStatus cancelled |
| E9 | Response ok:false → throw | mock ok:false |
| E10 | removePost throw (FB not supported) | assert throws |
| E11 | Concurrent post (unique index — Story 5.1 cover) | — |
| E12 | XActions 401 (auth fail) | mock 401 |

---

## Ghi chú cho developer

1. **KHÔNG thêm dependency mới** — dùng fetch built-in (Node 18+), AbortController built-in.
2. **KHÔNG thay đổi CrossPostProcessor** — AC7, chỉ verify nó vẫn hoạt động với FacebookProvider (integration test).
3. **KHÔNG thay đổi IPromotionProvider interface** — AD-3, FacebookProvider implement interface có sẵn.
4. **KHÔNG thêm DB schema/migration** — cross_posts table đã có (Story 5.1). 5.2 chỉ code-level (provider + client + formatter).
5. **postUrl nullable là FEATURE, không phải bug** — XActions design (XHR submit). externalUrl null + status posted = đăng thành công (operation completed).
6. **dryRun=false là BẮT BUỘC** — XActions default dryRun=true (safety). bdsai.vn phải explicit false. Defensive check response.
7. **Token/cookie = secret (AD-8)** — pino redact, KHÔNG log raw value. XactionsClient header Authorization không log. cross_posts KHÔNG lưu cookie.
8. **ListingFormatter pure function** — đọc BDSAI_WEB_URL từ env trực tiếp (process.env) hoặc inject ConfigService. Author chốt pure function cho đơn giản (testable, no DI).
