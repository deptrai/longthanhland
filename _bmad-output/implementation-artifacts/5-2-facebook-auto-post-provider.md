---
baseline_commit: TBD-by-developer
---

# Story 5.2: Facebook Auto-Post Provider

Status: review

<!-- Track B (Epic 5 — Xaction integration) — Story thứ 2. Story 5.1 DONE:
     IPromotionProvider interface + cross_posts table + BullMQ queue +
     ProviderRegistry + PromotionService + CrossPostProcessor + StubProvider.
     Story 5.2 thay stub Facebook bằng FacebookProvider thật — gọi XActions REST
     API (POST /api/facebook/automate action:'post') để đăng tin BĐS lên Facebook
     Page/timeline. Text-only (image upload = Story 5.5 GAP). -->

## Story

As a **seller**,
I want **tin BĐS của mình được tự động đăng lên Facebook (Page/timeline) với nội dung định dạng đẹp (tiêu đề, giá, địa điểm, mô tả, link bdsai.vn), qua XActions browser automation — không cần copy-paste thủ công**,
so that **tin tiếp cận hàng triệu user Facebook mà không tốn công đăng từng nền tảng, với trạng thái đăng được theo dõi và tự gỡ khi tin hết hiệu lực (AD-9)**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 5 (FR10 Xaction Auto-Post) + ARCHITECTURE-SPINE.md AD-3 (Xaction as External Service) + AD-8 (No raw PII) + AD-9 (Cross-Post Lifecycle).
> Story 5.1 đã tạo foundation (interface + table + queue + registry + processor). Story 5.2 thay StubProvider bằng FacebookProvider thật — interface IPromotionProvider KHÔNG đổi (AD-3).
> Quy ước test: lint+typecheck+build+test qua Turborepo phải pass (Story 1.3 gate). Edge case phải có test tương ứng.

1. **AC1 — FacebookProvider implements IPromotionProvider (gọi XActions REST API thật).**
   Given Story 5.1 đã định nghĩa `IPromotionProvider` (postListing, removePost, getPostStatus) + StubProvider verify pattern,
   When tạo `apps/api/src/xaction/providers/facebook.provider.ts` (`@Injectable()`, `readonly platform = 'facebook'`),
   Then FacebookProvider implement 3 method:
   - `postListing(input)` — gọi `XactionsClient.postToFacebook(content, accountId)` với content = `ListingFormatter.formatForFacebook(input)`. Trả `{ externalUrl, providerJobId }` từ XActions response. externalUrl = postUrl từ XActions (best-effort — có thể null, xem E3). providerJobId = operationId từ XActions.
   - `removePost(input)` — throw `Error('FB removal not supported — gỡ thủ công')` (FB không có delete-post API dễ; AD-9 best-effort → processor set `removal_failed`).
   - `getPostStatus(providerJobId)` — gọi `XactionsClient.getOperationStatus(operationId)` → map XActions status (`pending`/`running`/`completed`/`failed`/`cancelled`) → `ProviderPostStatus` (`pending`/`posted`/`failed`/`removed`).
   Provider inject `XactionsClient` + `ConfigService` (đọc `XACTIONS_FB_ACCOUNT_ID`). Logger structured (pino). KHÔNG lưu PII raw (AD-8).
   Verify: `FacebookProvider implements IPromotionProvider` compile pass. Unit test mock XactionsClient — assert postListing gọi client với formatted content, removePost throws, getPostStatus maps status đúng.

2. **AC2 — XactionsClient (HTTP client wrapping XActions REST API).**
   Given FacebookProvider cần gọi XActions REST API (Express.js self-hosted),
   When tạo `apps/api/src/xaction/xactions-client.ts` (`@Injectable()`),
   Then client expose 2 method:
   - `postToFacebook(content: string, accountId?: string): Promise<{ operationId: string; postUrl: string | null }>` — POST `${XACTIONS_API_URL}/api/facebook/automate` với body `{ action: 'post', text: content, dryRun: false, authCookie: { accountId } }` (hoặc `{ c_user, xs }` nếu dùng raw cookie). Header `Authorization: Bearer ${XACTIONS_API_TOKEN}`. Parse response `{ ok, operationId, postUrl }` → return. Throw trên `ok: false` hoặc HTTP 4xx/5xx.
   - `getOperationStatus(operationId: string): Promise<{ status: string; error?: string }>` — GET `${XACTIONS_API_URL}/api/operations/status/${operationId}` với Bearer token. Return `{ status, error }`.
   Config: `XACTIONS_API_URL` (default `http://localhost:3001`), `XACTIONS_API_TOKEN` (JWT — required khi FB enabled, throw startup warn nếu empty + FB enabled). `XACTIONS_FB_ACCOUNT_ID` (XActions account ID — stored account path) HOẶC `XACTIONS_FB_C_USER` + `XACTIONS_FB_XS` (raw cookie path — MVP).
   Error handling: timeout 30s (AbortController), retry 5xx max 2 lần (exponential 1s/2s), throw trên 4xx (không retry — client error). Logger structured.
   Verify: unit test mock fetch — assert POST body đúng shape (action:'post', dryRun:false, authCookie), GET status path đúng, 4xx throw, 5xx retry, timeout throw.

3. **AC3 — ListingFormatter (format listing → Facebook post text).**
   Given Facebook post cần nội dung định dạng đẹp (tiêu đề, giá, địa điểm, mô tả, link),
   When tạo `apps/api/src/xaction/listing-formatter.ts` (pure function, `@Injectable()` optional),
   Then `formatForFacebook(input: PostListingInput): string` trả text theo format:
   ```
   🏠 [title]
   💰 [price] VND
   📍 [province], [district]

   [description — truncate 500 chars + '...' nếu dài hơn]

   🔗 https://bdsai.vn/listings/[id]

   #bdsai.vn #batdongsan
   ```
   Max 5000 chars (FB limit) — nếu tổng vượt 5000, truncate description thêm (giữ title + price + location + link + hashtags nguyên). Price format với thousand separator (VD `2.500.000.000`). Location: `province, district` (bỏ ward/street nếu null). URL dùng `BDSAI_WEB_URL` env (default `https://bdsai.vn`).
   Verify: unit test — format listing đầy đủ → đúng text shape. Description dài → truncate 500 chars. Tổng > 5000 → truncate description thêm. Price format đúng. Location null ward → vẫn hiện province, district.

4. **AC4 — ProviderRegistry update (register FacebookProvider khi facebook enabled).**
   Given Story 5.1 ProviderRegistry map mọi enabled platform → StubProvider,
   When update `apps/api/src/xaction/provider-registry.ts`,
   Then registry:
   - Inject `FacebookProvider` (thêm vào constructor).
   - `onModuleInit` — nếu `facebook` ∈ enabledPlatforms → `providers.set('facebook', facebookProvider)` (KHÔNG dùng stub cho facebook nữa). Platform khác (cho_tot, zalo) vẫn map → stub (story 5.x sau).
   - Validate config: nếu `facebook` enabled NHƯNG `XACTIONS_API_TOKEN` empty → log error + KHÔNG register facebook (graceful — `getProvider('facebook')` sẽ throw "chưa bật"). Hoặc throw startup error (dev quyết định — author chốt log error + skip, graceful).
   Verify: unit test — `XACTION_ENABLED_PROVIDERS=facebook` + token set → `getProvider('facebook')` returns FacebookProvider. Token empty → facebook không register → getProvider throw.

5. **AC5 — XactionModule update (provide FacebookProvider + XactionsClient + ListingFormatter).**
   Given FacebookProvider + XactionsClient + ListingFormatter cần inject qua DI,
   When update `apps/api/src/xaction/xaction.module.ts`,
   Then module `providers` thêm: `FacebookProvider`, `XactionsClient`, `ListingFormatter` (giữ StubProvider cho cho_tot/zalo). `exports` giữ nguyên (chỉ PromotionService — provider internals private, AD-1).
   Verify: app boot OK, `GET /health/supabase` vẫn 200 (không phá Story 1.2). FacebookProvider inject thành công (no DI error).

6. **AC6 — Env config (XACTIONS_API_URL, XACTIONS_API_TOKEN, XACTIONS_FB_*).**
   Given FacebookProvider + XactionsClient cần config từ env,
   When update `apps/api/src/config/env.validation.ts`,
   Then thêm env vars:
   - `XACTIONS_API_URL: z.string().url().default('http://localhost:3001')` — XActions REST API base URL.
   - `XACTIONS_API_TOKEN: z.string().default('')` — JWT Bearer token cho XActions auth (optional — required khi facebook enabled, registry validate).
   - `XACTIONS_FB_ACCOUNT_ID: z.string().default('')` — XActions stored account ID (preferred path).
   - `XACTIONS_FB_C_USER: z.string().default('')` — FB c_user cookie (raw path — MVP fallback).
   - `XACTIONS_FB_XS: z.string().default('')` — FB xs cookie (raw path — MVP fallback).
   - `BDSAI_WEB_URL: z.string().url().default('https://bdsai.vn')` — base URL cho listing link trong formatter.
   Update `.env.example` với mô tả + default. KHÔNG log value của token/cookie (AD-8 — pino redact).
   Verify: env validation pass với default. `.env.example` có đủ vars. Grep — không có raw token/cookie trong log.

7. **AC7 — CrossPostProcessor KHÔNG thay đổi (already calls provider interface).**
   Given Story 5.1 CrossPostProcessor đã gọi `provider.postListing()` / `provider.removePost()` qua interface,
   When FacebookProvider thay stub,
   Then processor hoạt động KHÔNG thay đổi — chỉ provider implementation đổi (AD-3: thay provider không sửa marketplace/processor). Processor vẫn: post job → provider.postListing → update status posted/failed; remove job → provider.removePost → throw → retry → removal_failed.
   Verify: integration test — enqueue post job với facebook platform → FacebookProvider.postListing gọi → cross_posts status posted (mock XactionsClient). remove job → FacebookProvider.removePost throw → status removal_failed.

8. **AC8 — dryRun=false enforcement (XActions default dryRun=true).**
   Given XActions `POST /api/facebook/automate` mặc định `dryRun=true` (chỉ explicit `dryRun:false` mới đăng thật),
   When XactionsClient.postToFacebook gọi API,
   Then body LUÔN chứa `dryRun: false` — KHÔNG bao giờ dry-run (bdsai.vn muốn đăng thật). Nếu response `dryRun: true` (misconfig) → log warn + throw (defensive — không return fake postUrl).
   Verify: unit test — assert request body `dryRun: false`. Test response dryRun:true → throw.

9. **AC9 — Operation status mapping (XActions → ProviderPostStatus).**
   Given XActions operation status: `pending` | `running` | `completed` | `failed` | `cancelled`,
   When FacebookProvider.getPostStatus map sang `ProviderPostStatus` (`pending` | `posted` | `failed` | `removed`),
   Then mapping:
   - `pending` → `pending` (vẫn đang chạy)
   - `running` → `pending` (vẫn đang chạy)
   - `completed` → `posted` (đăng thành công)
   - `failed` → `failed`
   - `cancelled` → `failed` (treat cancel as failed — bài không đăng)
   - unknown → `failed` (defensive)
   Verify: unit test — mỗi XActions status map đúng. Unknown status → failed.

10. **AC10 — Test tự động (unit + integration + edge case).**
    Given quy ước test toàn dự án + Story 1.3 CI gate,
    When chạy test, Then:
    (a) **Unit test:** `facebook.provider.spec.ts` (mock XactionsClient + ListingFormatter — assert postListing gọi client.postToFacebook với formatted content, removePost throws "not supported", getPostStatus maps 5 status đúng), `listing-formatter.spec.ts` (format đầy đủ, truncate description 500 chars, total > 5000 truncate thêm, price format, location null, URL đúng), `xactions-client.spec.ts` (mock fetch — POST body shape, GET status path, 4xx throw, 5xx retry 2x, timeout throw, dryRun:false enforcement).
    (b) **Integration test:** `facebook-provider.e2e-spec.ts` (mock XActions HTTP server — hoặc nock — postListing → assert HTTP call thật đến /api/facebook/automate, getPostStatus → assert GET /api/operations/status/:id). Skip nếu `XACTIONS_API_URL` không reach (env guard — KHÔNG fail CI khi XActions không chạy).
    (c) **Edge case test:** postUrl null (E3) → externalUrl null + providerJobId vẫn set, XActions 500 → retry → fail, XActions timeout → throw, token empty + facebook enabled → graceful skip.
    (d) `yarn test` (unit) PASS. Test hiện có (Story 5.1 + 1.x-6.x) vẫn pass — KHÔNG phá.
    (e) `yarn build && yarn lint && yarn typecheck` PASS (Story 1.3 gate).

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-1 (Module Isolation)** | FacebookProvider + XactionsClient + ListingFormatter nằm trong `xaction/` module. Provider internals private — chỉ PromotionService public. XactionModule provide 3 class mới, KHÔNG export chúng (chỉ export PromotionService). |
| **AD-3 (Xaction as External Service)** | AC1/AC2 — FacebookProvider gọi XActions REST API qua XactionsClient. Xaction calls vẫn async via BullMQ (Story 5.1 queue — KHÔNG đổi). Provider thay stub = thay implementation, interface không đổi. 1 provider fail ≠ total failure (processor catch per-platform). |
| **AD-8 (PII/secret)** | XACTIONS_API_TOKEN + XACTIONS_FB_C_USER + XACTIONS_FB_XS = secret — KHÔNG log raw value (pino redact). cross_posts KHÔNG lưu cookie/token (chỉ externalUrl + providerJobId). XactionsClient header Authorization không log. ListingFormatter KHÔNG chứa PII seller (chỉ listing public content). |
| **AD-9 (Cross-Post Lifecycle Integrity)** | AC1 removePost throw "not supported" → processor retry 3x → hết retry → `status='removal_failed'` + errorMessage. UI hiển thị "gỡ thủ công" (story FE sau). KHÔNG hứa gỡ thành công — best-effort. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — XActions API không reach (service down).** XactionsClient POST timeout 30s → throw → BullMQ retry 3x → hết retry → cross_posts `status='failed'` + errorMessage "XActions API timeout". KHÔNG crash app. Test: mock fetch reject (timeout) → assert throw. Integration test skip nếu XACTIONS_API_URL không reach.
- **E2 — XActions 4xx (bad request — VD text rỗng, account invalid).** XactionsClient throw ngay (KHÔNG retry 4xx) → cross_posts `status='failed'`. Test: mock fetch 400 → assert throw, KHÔNG retry.
- **E3 — postUrl null/undefined (FB composer submit via XHR, không navigate).** XActions `createFacebookPost` trả `postUrl` "frequently undefined even on success" (XHR submit, no navigation). FacebookProvider.postListing → `externalUrl = postUrl ?? null` (nullable — cross_posts.externalUrl là text nullable). providerJobId (operationId) vẫn set. cross_posts `status='posted'` (operation completed = đăng thành công, dù không có URL). Test: mock XactionsClient trả postUrl=null → assert externalUrl=null, providerJobId set, status posted.
- **E4 — XActions 5xx (server error).** XactionsClient retry 2x (exponential 1s/2s) → vẫn 5xx → throw → BullMQ retry 3x → failed. Test: mock fetch 500 3 lần → assert retry 2x rồi throw.
- **E5 — Token empty + facebook enabled.** ProviderRegistry onModuleInit: facebook ∈ enabled NHƯNG `XACTIONS_API_TOKEN` empty → log error "XACTIONS_API_TOKEN missing — facebook provider disabled" + KHÔNG register facebook. `getProvider('facebook')` throw "chưa bật". Test: config facebook + token empty → getProvider throw.
- **E6 — Account config missing (cả accountId lẫn c_user/xs empty).** XactionsClient.postToFacebook: nếu cả `XACTIONS_FB_ACCOUNT_ID` lẫn `XACTIONS_FB_C_USER`/`XACTIONS_FB_XS` empty → throw "FB account not configured — set XACTIONS_FB_ACCOUNT_ID or XACTIONS_FB_C_USER+XACTIONS_FB_XS". Test: config empty → postToFacebook throw.
- **E7 — Content vượt 5000 chars (FB limit).** ListingFormatter truncate description để tổng ≤ 5000. Nếu title + price + location + link + hashtags đã > 5000 (edge cực) → truncate title тоже (giữ link + hashtags nguyên — quan trọng nhất). Test: listing title 6000 chars → truncate.
- **E8 — XActions operation status 'cancelled'.** Map → `failed` (bài không đăng). Test: getPostStatus với 'cancelled' → return 'failed'.
- **E9 — XActions response `ok: false`.** XactionsClient.postToFacebook: response `{ ok: false, error: '...' }` → throw Error(error). KHÔNG return fake operationId. Test: mock response ok:false → assert throw.
- **E10 — removePost throw (FB removal not supported).** FacebookProvider.removePost LUÔN throw `Error('FB removal not supported — gỡ thủ công trên Facebook')`. Processor catch → retry 3x (cùng throw mỗi lần) → hết retry → `status='removal_failed'`. Test: assert removePost throws. Integration: remove job → status removal_failed.
- **E11 — Concurrent post same listing (race).** 2 BullMQ job post cùng listingId+platform gần như đồng thời → unique index `(listingId, platform)` (Story 5.1) catch → 1 thành công, 1 fail. FacebookProvider KHÔNG cần xử lý (processor + DB handle). Test: Story 5.1 đã cover.
- **E12 — XActions auth fail (401 — token expired/invalid).** XactionsClient 401 → throw "XActions auth failed — check XACTIONS_API_TOKEN" → cross_posts failed. Test: mock 401 → assert throw với message rõ.

## UX Spec tham chiếu

Story 5.2 là backend-only (provider implementation) — KHÔNG có UI user-facing. Seller promote UI (FR12) ở story FE 5.x sau. API response shape KHÔNG đổi (Story 5.1 đã định — 202 + cross_posts row). Chỉ thay đổi internal: StubProvider → FacebookProvider (transparent qua interface).

## Dev Notes

### XActions API verified (repo exploration)

XActions REST API (Express.js, self-hosted) — verified từ source code `/Users/luisphan/Documents/GitHub/xactions`:

1. **`POST /api/facebook/automate`** (`api/routes/facebook.js` dòng 178-492):
   - Body: `{ action: 'post', text: '<content>', dryRun: false, authCookie: { c_user, xs } }` HOẶC `{ action: 'post', text, dryRun: false, authCookie: { accountId } }` (stored account path — server-side decrypt).
   - **dryRun defaults to TRUE** — phải explicit `dryRun: false` để đăng thật (AC8).
   - Auth: `authMiddleware` — JWT Bearer token, `Authorization: Bearer <token>`, verify với `JWT_SECRET`.
   - Response thành công: `{ ok: true, action, dryRun: false, userId, operationId, ...result }` (dòng 479-486). `result` từ `createFacebookPost` = `{ posted: true, postUrl }` — **postUrl frequently undefined** (XHR submit, no navigation — E3).
   - Response fail: `{ ok: false, error: 'Facebook automate failed. See server logs.' }` (HTTP 500).
   - Rate limit: `fbAutomateLimiter` (dòng 193).

2. **`GET /api/operations/status/:operationId`** (`api/routes/operations.js` dòng 142-162):
   - Auth: `authMiddleware` (JWT).
   - Response: operation row `{ id, userId, type, status, config, result, error, startedAt, completedAt, createdAt }`. `status`: `pending` | `running` | `completed` | `failed` | `cancelled`.
   - 404 nếu operation không thuộc user.

3. **`createFacebookPost`** (`api/services/facebookAutomation.js` dòng 690-730):
   - Puppeteer: loginWithCookie → navigate composer → type text → submit.
   - Return `{ posted: true, postUrl }` — postUrl best-effort (capture từ URL sau submit, thường undefined vì XHR không navigate).
   - Text-only (KHÔNG upload image — GAP, Story 5.5).

4. **Auth middleware** (`api/middleware/auth.js`): `jwt.verify(token, JWT_SECRET)` → `req.user = { id, ... }`. 401 nếu token missing/invalid.

### Versions (khớp ARCHITECTURE-SPINE.md Stack)

| Package | Version | Note |
|---------|---------|------|
| NestJS | 11.1.27 (đã có) | KHÔNG nâng cấp |
| BullMQ | 5.x (đã có — Story 1.6/5.1) | Queue `cross-post` (KHÔNG đổi) |
| Drizzle ORM | 0.36.4 (đã có) | KHÔNG thêm schema (5.1 đã có cross_posts) |
| fetch / undici | Node 18+ built-in | XactionsClient dùng global fetch (KHÔNG thêm axios) |
| zod | (đã có — env.validation) | Env vars validation |

KHÔNG thêm dependency mới — dùng `fetch` built-in (Node 18+). AbortController built-in cho timeout.

### Source tree (NEW/UPDATE)

```
bdsai/apps/api/
├── src/
│   ├── xaction/
│   │   ├── xaction.module.ts                 # UPDATE — thêm FacebookProvider, XactionsClient, ListingFormatter vào providers
│   │   ├── provider-registry.ts              # UPDATE — inject FacebookProvider, map facebook→FacebookProvider (cho_tot/zalo vẫn stub)
│   │   ├── xactions-client.ts                # NEW — HTTP client wrapping XActions REST API (AC2)
│   │   ├── listing-formatter.ts              # NEW — format listing → FB post text (AC3)
│   │   ├── providers/
│   │   │   ├── facebook.provider.ts          # NEW — FacebookProvider implements IPromotionProvider (AC1)
│   │   │   └── stub.provider.ts              # KHÔNG đổi (cho_tot/zalo vẫn dùng — story 5.x sau)
│   │   ├── xactions-client.spec.ts           # NEW — unit test (AC10a)
│   │   ├── listing-formatter.spec.ts         # NEW — unit test (AC10a)
│   │   └── providers/
│   │       └── facebook.provider.spec.ts     # NEW — unit test (AC10a)
│   ├── config/
│   │   └── env.validation.ts                 # UPDATE — thêm XACTIONS_API_URL, XACTIONS_API_TOKEN, XACTIONS_FB_*, BDSAI_WEB_URL (AC6)
│   └── ...
├── test/
│   └── facebook-provider.e2e-spec.ts         # NEW — integration test (AC10b — mock XActions HTTP)
├── package.json                              # KHÔNG thêm dep mới (fetch built-in)
└── .env.example                              # UPDATE — XACTIONS_API_URL, XACTIONS_API_TOKEN, XACTIONS_FB_*, BDSAI_WEB_URL
```

### XactionsClient reference (AC2)

```typescript
@Injectable()
export class XactionsClient {
  private readonly logger = new Logger(XactionsClient.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async postToFacebook(content: string, accountId?: string): Promise<{ operationId: string; postUrl: string | null }> {
    const baseUrl = this.config.get('XACTIONS_API_URL', { infer: true });
    const token = this.config.get('XACTIONS_API_TOKEN', { infer: true });
    // ... build body { action: 'post', text: content, dryRun: false, authCookie: { accountId } }
    // ... fetch với Authorization header, 30s timeout, retry 5xx 2x
    // ... parse { ok, operationId, postUrl } → throw if ok:false
  }

  async getOperationStatus(operationId: string): Promise<{ status: string; error?: string }> {
    // GET ${baseUrl}/api/operations/status/${operationId} với Bearer token
  }
}
```

### ListingFormatter reference (AC3)

```typescript
export function formatForFacebook(input: PostListingInput): string {
  const webUrl = process.env.BDSAI_WEB_URL ?? 'https://bdsai.vn';
  const price = formatVnd(input.price); // 2500000000 → '2.500.000.000'
  const location = `${input.province}, ${input.district}`;
  const desc = truncate(input.description, 500);
  const link = `${webUrl}/listings/${input.listingId}`;
  let text = `🏠 ${input.title}\n💰 ${price} VND\n📍 ${location}\n\n${desc}\n\n🔗 ${link}\n\n#bdsai.vn #batdongsan`;
  // Truncate tổng nếu > 5000 (giữ link + hashtags)
  if (text.length > 5000) { /* truncate title/desc thêm */ }
  return text;
}
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **Text-only cho MVP** — XActions `createFacebookPost` text-only (KHÔNG upload image). GAP — Story 5.5 handle image upload separately. Listing images (input.images) KHÔNG dùng trong 5.2 — formatter bỏ qua.
2. **removePost throw (KHÔNG navigate-delete)** — FB không có delete-post API dễ; navigate-to-post + delete via Puppeteer phức tạp + fragile (selector đổi). MVP: throw "not supported" → processor set `removal_failed` → UI "gỡ thủ công" (AD-9). Story 5.x sau có thể implement Puppeteer delete nếu cần.
3. **Env vars cho FB account (MVP)** — `XACTIONS_FB_ACCOUNT_ID` (preferred — stored account, server-side decrypt) HOẶC `XACTIONS_FB_C_USER` + `XACTIONS_FB_XS` (raw cookie fallback). Production: dedicated `xaction_facebook_accounts` table với encrypted credentials (post-MVP). MVP simplicity = env vars.
4. **fetch built-in (KHÔNG axios)** — Node 18+ có global fetch + AbortController. KHÔNG thêm dependency. Retry 5xx implement thủ công (loop 2 lần, exponential 1s/2s).
5. **dryRun=false hardcode** — bdsai.vn LUÔN đăng thật (KHÔNG dry-run). XactionsClient body luôn `dryRun: false`. Defensive: nếu response `dryRun: true` → throw (misconfig).
6. **postUrl nullable (E3)** — XActions postUrl thường undefined (XHR submit). externalUrl = postUrl ?? null. cross_posts.externalUrl đã nullable (Story 5.1 schema). status='posted' dựa trên operation completed (KHÔNG dựa trên postUrl).
7. **Operation status mapping** — XActions `pending`/`running` → `pending`; `completed` → `posted`; `failed`/`cancelled`/unknown → `failed`. KHÔNG map sang `removed` (FB removal not supported).

### Patterns to follow (from existing codebase)

- **Provider pattern:** `facebook.provider.ts` — `@Injectable()`, `readonly platform = 'facebook' as const`, implement 3 method (khớp `stub.provider.ts`).
- **Service pattern:** `xactions-client.ts` — `@Injectable()`, `ConfigService<Env, true>`, Logger structured, try/catch (khớp `marketplace.service.ts`).
- **Pure function:** `listing-formatter.ts` — export function, KHÔNG cần @Injectable (nhưng có thể @Injectable nếu dev muốn inject ConfigService cho BDSAI_WEB_URL — author chốt pure function đọc env trực tiếp cho đơn giản).
- **Env validation:** `env.validation.ts` — thêm z.string().default('') vars (khớp pattern hiện tại).
- **Test pattern:** `.spec.ts` unit test (mock dependency), `.e2e-spec.ts` integration (khớp Story 5.1 test pattern).

## Test Plan

### Unit tests (AC10a — mock XactionsClient + fetch)

1. **`facebook.provider.spec.ts`:**
   - `postListing` — mock XactionsClient.postToFacebook return `{ operationId: 'op-123', postUrl: 'https://fb.com/post/123' }` → assert return `{ externalUrl: 'https://fb.com/post/123', providerJobId: 'op-123' }`.
   - `postListing` — mock XactionsClient return `postUrl: null` (E3) → assert `externalUrl: null`, `providerJobId: 'op-123'`.
   - `postListing` — assert ListingFormatter.formatForFacebook called với input, content truyền cho client.
   - `removePost` — assert throw Error("FB removal not supported").
   - `getPostStatus` — mock client return status `completed` → assert return `posted`.
   - `getPostStatus` — 5 status mapping: pending→pending, running→pending, completed→posted, failed→failed, cancelled→failed.
   - `getPostStatus` — unknown status → `failed`.

2. **`listing-formatter.spec.ts`:**
   - Format listing đầy đủ (title, price, description, province, district) → đúng text shape (🏠/💰/📍/🔗/hashtags).
   - Description 1000 chars → truncate 500 chars + '...'.
   - Description 200 chars → nguyên (không truncate).
   - Total > 5000 chars → truncate description thêm, tổng ≤ 5000.
   - Price 2500000000 → '2.500.000.000 VND'.
   - Price 0 → '0 VND'.
   - Location: province + district → 'Hồ Chí Minh, Quận 1'.
   - URL: `https://bdsai.vn/listings/{id}`.
   - BDSAI_WEB_URL custom → URL dùng custom base.

3. **`xactions-client.spec.ts`:**
   - `postToFacebook` — mock fetch 200 `{ ok: true, operationId: 'op-1', postUrl: 'url' }` → assert return `{ operationId: 'op-1', postUrl: 'url' }`.
   - `postToFacebook` — assert request body `{ action: 'post', text: content, dryRun: false, authCookie: { accountId } }`.
   - `postToFacebook` — assert header `Authorization: Bearer <token>`.
   - `postToFacebook` — response `ok: false` → throw (E9).
   - `postToFacebook` — response `dryRun: true` → throw (AC8 defensive).
   - `postToFacebook` — 400 → throw, KHÔNG retry (E2).
   - `postToFacebook` — 500 → retry 2x rồi throw (E4).
   - `postToFacebook` — timeout (AbortError) → throw (E1).
   - `postToFacebook` — accountId empty + c_user/xs empty → throw (E6).
   - `getOperationStatus` — mock fetch 200 `{ status: 'completed' }` → return `{ status: 'completed' }`.
   - `getOperationStatus` — 404 → throw.
   - `getOperationStatus` — assert path `/api/operations/status/:id`.

### Integration tests (AC10b — mock XActions HTTP, env guard skip if down)

1. **`facebook-provider.e2e-spec.ts`:**
   - Start mock HTTP server (nock hoặc http mock) trả `/api/facebook/automate` 200 `{ ok: true, operationId: 'op-1', postUrl: null }`.
   - FacebookProvider.postListing → assert HTTP call đến mock server, cross_posts update status posted + externalUrl null + providerJobId 'op-1'.
   - getPostStatus('op-1') → mock `/api/operations/status/op-1` 200 `{ status: 'completed' }` → return 'posted'.
   - Skip nếu `XACTIONS_API_URL` không reach (env guard — `describe.skip` khi không có XACTIONS_API_URL test env).
   - removePost → throw → processor → status removal_failed (verify qua CrossPostProcessor integration).

### E2E tests (real browser — story FE sau)

Story 5.2 là backend-only — KHÔNG có E2E browser test. E2E cho seller promote UI ở story FE 5.x sau. Integration test (`facebook-provider.e2e-spec.ts`) cover provider flow end-to-end (mock XActions HTTP).

## References

- [Source: AD-3] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 51-67 — Xaction as External Service (async BullMQ, provider pattern, independent failure).
- [Source: AD-8] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 81-85 — PII/secret (no raw cookie/token in logs/cross_posts).
- [Source: AD-9] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 87-91 — Cross-Post Lifecycle Integrity (removal best-effort, removal_failed → gỡ thủ công).
- [Source: FR10] `_bmad-output/planning-artifacts/epics.md` dòng 27-28 — Xaction Auto-Post.
- [Source: Story 5.1] `_bmad-output/implementation-artifacts/5-1-xaction-module-provider-pattern-cross-posts.md` — IPromotionProvider interface + cross_posts table + BullMQ queue + ProviderRegistry + CrossPostProcessor (foundation cho 5.2).
- [Source: Interface] `bdsai/apps/api/src/xaction/providers/promotion-provider.interface.ts` — IPromotionProvider (postListing, removePost, getPostStatus), PostListingInput, PostResult, ProviderPostStatus.
- [Source: Pattern] `bdsai/apps/api/src/xaction/providers/stub.provider.ts` — stub provider pattern (Injectable, platform, 3 method).
- [Source: Registry] `bdsai/apps/api/src/xaction/provider-registry.ts` — ProviderRegistry (config-based, onModuleInit, getProvider).
- [Source: Module] `bdsai/apps/api/src/xaction/xaction.module.ts` — XactionModule (providers, exports).
- [Source: Processor] `bdsai/apps/api/src/xaction/cross-post.processor.ts` — CrossPostProcessor (KHÔNG đổi — calls provider interface).
- [Source: Schema] `bdsai/apps/api/src/db/schema/public-listings.ts` — listing schema (title, description, price, area, province, district, address, images).
- [Source: XActions API] `/Users/luisphan/Documents/GitHub/xactions/api/routes/facebook.js` dòng 178-492 — POST /api/facebook/automate (action:'post', dryRun default true, authCookie, response { ok, operationId, ...result }).
- [Source: XActions API] `/Users/luisphan/Documents/GitHub/xactions/api/routes/operations.js` dòng 142-162 — GET /api/operations/status/:operationId (operation row, status pending/running/completed/failed/cancelled).
- [Source: XActions] `/Users/luisphan/Documents/GitHub/xactions/api/services/facebookAutomation.js` dòng 690-730 — createFacebookPost (Puppeteer, text-only, postUrl frequently undefined).
- [Source: XActions auth] `/Users/luisphan/Documents/GitHub/xactions/api/middleware/auth.js` — authMiddleware (JWT Bearer, jwt.verify with JWT_SECRET).
- [Source: Env] `bdsai/apps/api/src/config/env.validation.ts` dòng 72-76 — XACTION_ENABLED_PROVIDERS (existing, 5.2 thêm XACTIONS_API_URL/TOKEN/FB_*).

## Dev Agent Record

| Field | Value |
|-------|-------|
| Story ID | 5-2-facebook-auto-post-provider |
| Epic | 5 — Xaction Integration (Track B) |
| Status | review |
| Estimate | ~10-14h (FacebookProvider + XactionsClient + ListingFormatter + registry/module update + env + tests) |
| Gate | Story 5.1 DONE (interface + table + queue + registry + processor + stub) |
| Dependencies | Story 5.1 (IPromotionProvider, cross_posts, BullMQ queue, ProviderRegistry, CrossPostProcessor), Story 1.6 (BullMQ/Redis/pino), Story 2.2 (JwtAuthGuard for API), Story 3.1 (public_listings schema) |
| Blocks | Story 5.5 (image upload — GAP), Story 5.x (ChoTot/Zalo provider), Story 5.x (seller promote UI FE) |
