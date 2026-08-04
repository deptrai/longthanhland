---
baseline_commit: TBD-by-developer
---

# Story 5.1: XactionModule + Provider Pattern + cross_posts table

Status: review

<!-- Track B (Epic 5 — Xaction integration) — Story ĐẦU TIÊN. Gate đã gỡ:
     (1) XActions API docs available (/Users/luisphan/Documents/GitHub/xactions — REST API + MCP server, Puppeteer browser automation);
     (2) ToS compliance decided — browser automation approach (accept risk);
     (3) AD-8 phone hash — already in architecture.
     Story 5.1 đặt nền móng: IPromotionProvider interface + cross_posts table + XactionModule + BullMQ queue + lifecycle removal + API endpoints. -->

## Story

As a **seller**,
I want **quảng bá tin BĐS của mình lên nhiều nền tảng (Facebook, Chợ Tốt, Zalo) bằng 1-click, với trạng thái cross-post được theo dõi và tự động gỡ khi tin hết hiệu lực**,
so that **tin tiếp cận được nhiều người hơn mà không cần đăng thủ công từng nền tảng, và không bị "orphan" trên platform ngoài khi tin đã bán/hết hạn**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 5 (FR10 Xaction Auto-Post, FR12 Seller promotion dashboard) + ARCHITECTURE-SPINE.md AD-3 (Xaction as External Service) + AD-9 (Cross-Post Lifecycle Integrity).
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC10.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.

1. **AC1 — IPromotionProvider interface (common contract cho mọi platform).**
   Given XactionModule cần hỗ trợ nhiều platform (FB, Chợ Tốt, Zalo) mà không couple vào internals của từng,
   When tạo interface `IPromotionProvider` tại `apps/api/src/xaction/providers/promotion-provider.interface.ts`,
   Then interface định nghĩa 3 method:
   - `postListing(input: PostListingInput): Promise<PostResult>` — đăng tin lên platform, trả `{ externalUrl, providerJobId }`.
   - `removePost(input: RemovePostInput): Promise<void>` — gỡ bài trên platform (best-effort).
   - `getPostStatus(providerJobId: string): Promise<ProviderPostStatus>` — poll trạng thái bài đăng.
   Mỗi platform = 1 provider class implement interface (VD `FacebookProvider`, `ChoTotProvider`, `ZaloProvider`). Provider có thể bật/tắt qua config (`XACTION_ENABLED_PROVIDERS=facebook,cho_tot`). 1 channel fail KHÔNG kéo sập promotion khác (AD-3 independent failure). Story 5.1 tạo interface + 1 **stub provider** (mock/no-op) để verify registry hoạt động — provider thật (FB/Chợ Tốt/Zalo) ở story sau (5.x).
   Verify: `FacebookProvider implements IPromotionProvider` compile pass, registry resolve provider theo platform name.

2. **AC2 — cross_posts DB table (Drizzle schema + migration).**
   Given cần persist trạng thái cross-post cho mỗi listing × platform,
   When tạo schema `apps/api/src/db/schema/cross-posts.ts` + chạy `yarn db:generate` + `yarn db:migrate`,
   Then bảng `cross_posts` tồn tại với column:
   - `id` uuid PK defaultRandom,
   - `listingId` uuid FK → `public_listings.id` (ON DELETE CASCADE),
   - `platform` enum `cross_post_platform` (facebook, cho_tot, zalo),
   - `externalUrl` text (nullable — set sau khi post thành công),
   - `providerJobId` text (nullable — ID từ Xaction/provider job),
   - `status` enum `cross_post_status` (pending, posted, failed, removed, removal_failed),
   - `errorMessage` text (nullable — lý do fail nếu có),
   - `createdAt` timestamptz notNull defaultNow,
   - `updatedAt` timestamptz notNull defaultNow.
   Index: `idx_cross_posts_listing` trên `listingId`, `idx_cross_posts_listing_platform` unique trên `(listingId, platform)` — chống duplicate promotion (Edge Case E1). Export schema trong `schema/index.ts` barrel. Migration file sinh bởi drizzle-kit, apply idempotent.
   Verify: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cross_posts'` trả đủ column. `yarn db:migrate` idempotent (chạy 2 lần không lỗi).

3. **AC3 — XactionModule (NestJS module owning all cross-post communication).**
   Given AD-1 (Module Isolation) yêu cầu module riêng + AD-3 yêu cầu XactionModule sở hữu mọi Xaction communication,
   When tạo `apps/api/src/xaction/xaction.module.ts` + register trong `app.module.ts`,
   Then XactionModule:
   - `imports: BullModule.registerQueue({ name: 'cross-post' })` — queue riêng cho cross-post job (AD-3 async).
   - `providers: PromotionService, CrossPostProcessor, ProviderRegistry, [stub provider(s)]`.
   - `controllers: XactionController`.
   - `exports: PromotionService` — marketplace module có thể inject để enqueue removal khi listing status change (AD-9).
   Module KHÔNG expose provider internals — chỉ PromotionService là public interface. ProviderRegistry resolve provider theo platform name từ config.
   Verify: `app.module.ts` import XactionModule, app boot OK, `GET /health/supabase` vẫn 200 (không phá Story 1.2).

4. **AC4 — BullMQ queue `cross-post` (async job, retry 3x exponential backoff).**
   Given AD-3 yêu cầu Xaction calls ALWAYS async via BullMQ, KHÔNG sync trong request path (NFR7: retry 3x exponential backoff, never block user),
   When tạo `apps/api/src/xaction/cross-post.processor.ts` (`@Processor('cross-post')` extends WorkerHost),
   Then processor xử lý 2 job type:
   - `post` — gọi `provider.postListing()`, thành công → update `cross_posts.status='posted'` + set externalUrl/providerJobId; fail → retry (BullMQ attempts=3, backoff exponential delay=5000ms); hết retry → `status='failed'` + errorMessage.
   - `remove` — gọi `provider.removePost()`, thành công → `status='removed'`; fail hết retry → `status='removal_failed'` (AD-9 — không hứa gỡ thành công, chỉ best-effort).
   Job data: `{ crossPostId, platform, listingId, action: 'post'|'remove' }`. HTTP handler KHÔNG `await` job — chỉ enqueue + return 202 (AD-3).
   Verify: enqueue post job → processor gọi provider stub → cross_posts.status update. Test: processor throw → job retry 3x → status='failed'. Test: remove job fail → status='removal_failed'.

5. **AC5 — Cross-post lifecycle removal (AD-9 — enqueue removal on listing status change).**
   Given AD-9 yêu cầu khi listing chuyển REJECTED/DELETED/SOLD/EXPIRED, mọi cross_post active phải được enqueue best-effort removal,
   When MarketplaceService thực hiện status transition sang REJECTED/DELETED/SOLD/EXPIRED,
   Then service query `cross_posts WHERE listingId=? AND status IN ('posted','pending')` → enqueue removal job cho mỗi row (inject PromotionService vào MarketplaceService, gọi `removeCrossPost(crossPostId)`).
   Removal là best-effort — nếu fail sau retry → `status='removal_failed'`, UI hiển thị "gỡ thủ công" (story FE sau). KHÔNG block listing transition (transition hoàn tất trước, removal enqueue sau — non-blocking `.catch()`).
   Verify: unit test mock — listing transition PUBLISHED→SOLD → assert `removeCrossPost` called cho mỗi active cross_post. Test: removal fail → status='removal_failed', listing transition vẫn thành công.

6. **AC6 — PromotionService (createCrossPost + removeCrossPost).**
   Given cần service layer encapsulate cross-post business logic (AD-2 mutation qua service),
   When tạo `apps/api/src/xaction/promotion.service.ts`,
   Then service expose 2 method public:
   - `createCrossPost(listingId, platform, sellerId): Promise<CrossPost>` — validate listing là PUBLISHED (Edge Case E2: non-PUBLISHED → reject 400), validate chưa có cross_post cho (listingId, platform) (Edge Case E1: duplicate → reject 409), insert row `status='pending'`, enqueue BullMQ `post` job, return row.
   - `removeCrossPost(crossPostId, sellerId?): Promise<void>` — validate cross_post tồn tại + ownership (nếu sellerId cung cấp), enqueue BullMQ `remove` job. KHÔNG await job.
   - `listCrossPosts(listingId): Promise<CrossPost[]>` — list cross-posts cho seller dashboard (FR12).
   Service inject Drizzle + `@InjectQueue('cross-post')` + ProviderRegistry. Logger structured (pino).
   Verify: unit test `createCrossPost` — PUBLISHED listing → insert + enqueue. Non-PUBLISHED → throw BadRequest. Duplicate platform → throw Conflict. `removeCrossPost` → enqueue remove job.

7. **AC7 — API endpoints (POST promote, GET cross-posts, DELETE cross-post).**
   Given seller cần API để quảng bá + xem trạng thái + gỡ cross-post (FR10, FR12),
   When tạo `apps/api/src/xaction/xaction.controller.ts` với 3 endpoint (JwtAuthGuard — seller phải đăng nhập),
   Then:
   - `POST /xaction/promote` — body `{ listingId: string, platforms: CrossPostPlatform[] }` → validate ownership (seller owns listing) → call `createCrossPost` cho mỗi platform → return `{ crossPosts: CrossPost[], enqueued: number }` (202 Accepted). Nếu 1 platform fail (duplicate/non-PUBLISHED) → skip + return error detail cho platform đó, KHÔNG fail toàn request (AD-3 independent failure).
   - `GET /xaction/cross-posts?listingId=` — query param listingId → validate ownership → return `CrossPost[]` cho seller dashboard.
   - `DELETE /xaction/cross-posts/:id` — path param id → validate ownership → call `removeCrossPost` → return 202 Accepted.
   DTO validation (Zod/class-validator): `listingId` uuid, `platforms` array of enum, non-empty. Error shape chuẩn `{ statusCode, message, error?, details? }` (Story 1.6 filter).
   Verify: curl `POST /xaction/promote` với valid PUBLISHED listing → 202 + cross_posts row pending. curl non-PUBLISHED → 400. curl duplicate → 409. curl `GET /xaction/cross-posts?listingId=X` → list. curl `DELETE /xaction/cross-posts/:id` → 202.

8. **AC8 — ProviderRegistry (config-based, enable/disable provider).**
   Given AD-3 yêu cầu provider có thể bật/tắt qua config + fail độc lập,
   When tạo `apps/api/src/xaction/provider-registry.ts` (injectable, đọc config `XACTION_ENABLED_PROVIDERS`),
   Then registry:
   - `onModuleInit` — parse `XACTION_ENABLED_PROVIDERS` (comma-separated, VD `facebook,cho_tot`), instantiate chỉ provider enabled.
   - `getProvider(platform): IPromotionProvider` — return provider cho platform, throw nếu platform không enabled (clear error: "Platform X chưa được bật — kiểmtra XACTION_ENABLED_PROVIDERS").
   - `getEnabledPlatforms(): CrossPostPlatform[]` — list platform đang enabled (cho FE hiển thị option).
   Provider disabled = KHÔNG instantiate (tiết kiệm resource). Env `XACTION_ENABLED_PROVIDERS` thêm `env.validation.ts` (optional, default empty — 5.1 chỉ stub provider, prod enable sau).
   Verify: config `XACTION_ENABLED_PROVIDERS=facebook` → registry có FacebookProvider. Config empty → `getProvider('facebook')` throw. Unit test mock config.

9. **AC9 — Validation + edge case enforcement (non-PUBLISHED, duplicate, ownership).**
   Given cần guard chống promote sai trạng thái + duplicate + unauthorized,
   When PromotionService + XactionController validate input,
   Then:
   - Promote non-PUBLISHED listing (DRAFT/PENDING/REJECTED/EXPIRED/SOLD) → `400 BadRequest` "Chỉ quảng bá được tin đang hiển thị (PUBLISHED)".
   - Promote platform đã có cross_post (status pending/posted) → `409 Conflict` "Tin đã quảng bá trên nền tảng này" (unique index `(listingId, platform)` + service check).
   - Promote listing không thuộc seller → `403 Forbidden` (ownership check).
   - DELETE cross-post không thuộc seller → `403 Forbidden`.
   - Promote platform không enabled → `400 BadRequest` "Nền tảng X chưa được bật".
   Mỗi edge case có test tương ứng (xem Edge Case section).
   Verify: 5 test case trên pass (unit + integration).

10. **AC10 — Test tự động (unit + integration + edge case).**
    Given quy ước test toàn dự án + Story 1.3 CI gate,
    When chạy test, Then:
    (a) **Unit test:** `promotion.service.spec.ts` (mock Drizzle + queue + registry — assert createCrossPost PUBLISHED→insert+enqueue, non-PUBLISHED→throw, duplicate→throw, removeCrossPost→enqueue), `provider-registry.spec.ts` (mock config — assert enabled/disabled provider resolve), `cross-post.processor.spec.ts` (mock provider — assert post success→status posted, post fail→retry→status failed, remove fail→status removal_failed).
    (b) **Integration test:** `xaction.e2e-spec.ts` (cần Redis + Supabase live — POST /xaction/promote PUBLISHED listing → 202 + cross_posts row pending, GET cross-posts → list, DELETE → 202; skip nếu REDIS_URL không reach — env guard, KHÔNG fail CI khi Redis không có).
    (c) **Edge case test:** promote non-PUBLISHED → 400, promote duplicate platform → 409, promote unauthorized → 403, removal fail → removal_failed status, concurrent promote same platform → unique index catch.
    (d) `yarn test` (unit) + `yarn test:e2e` (integration) PASS. Test hiện có (Story 1.2-6.2) vẫn pass — KHÔNG phá.
    (e) `yarn build && yarn lint && yarn typecheck` PASS (Story 1.3 gate).

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-1 (Module Isolation)** | `xaction/` module riêng — KHÔNG lẫn logic marketplace. XactionModule expose chỉ PromotionService (public interface), provider internals private. MarketplaceModule inject PromotionService để enqueue removal (AD-9) — KHÔNG truy cập cross_posts table trực tiếp. |
| **AD-2 (Single Data Mutation Path)** | Mọi cross_posts mutation qua PromotionService → Drizzle. Controller chỉ validate + gọi service. KHÔNG frontend direct write. |
| **AD-3 (Xaction as External Service)** | AC4 — BullMQ queue `cross-post`, job async NGÒAI request path. HTTP handler KHÔNG `await` job (return 202). Retry 3x exponential backoff (NFR7). Provider pattern — mỗi platform độc lập, 1 fail ≠ total failure. Provider bật/tắt qua config. |
| **AD-8 (PII/secret)** | cross_posts KHÔNG lưu PII raw (chỉ listingId + platform + externalUrl + status). errorMessage KHÔNG chứa credential. Logger redact secret (Story 1.6 pino redact). |
| **AD-9 (Cross-Post Lifecycle Integrity)** | AC5 — listing transition REJECTED/DELETED/SOLD/EXPIRED → enqueue best-effort removal cho active cross_posts. Removal fail sau retry → `status='removal_failed'`, UI "gỡ thủ công". `cross_posts.status` luôn phản ánh trạng thái thực. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Duplicate promotion (cùng listing + platform).** Unique index `(listingId, platform)` trên cross_posts. Service check trước insert: nếu đã có row status `pending`/`posted` → throw `409 Conflict`. Test: promote FB cho listing X 2 lần → lần 2 throw 409. Edge: row status `failed`/`removed`/`removal_failed` → cho promote lại (không block retry). Test: promote lại sau fail → OK.
- **E2 — Promote non-PUBLISHED listing.** Listing DRAFT/PENDING/REJECTED/EXPIRED/SOLD → throw `400 BadRequest`. Test: promote DRAFT → 400. Test: promote PUBLISHED → OK. Edge: listing transition PUBLISHED→EXPIRED giữa lúc promote → race condition: service check status tại thời điểm insert, nếu đã EXPIRED → reject (không enqueue post cho tin hết hạn).
- **E3 — Removal fail sau retry (AD-9).** Provider.removePost() throw (bài bị khóa, account chết, platform đổi API) → BullMQ retry 3x → hết retry → processor set `status='removal_failed'` + errorMessage. KHÔNG throw ra user — listing transition vẫn thành công. Test: mock provider throw → assert status='removal_failed' sau retry. UI story sau hiển thị "gỡ thủ công".
- **E4 — Concurrent promote same platform (race condition).** 2 request promote FB cho cùng listing gần như đồng thời → unique index `(listingId, platform)` catch → 1 thành công, 1 throw 409 (Postgres unique violation → service map sang ConflictException). Test: integration test 2 concurrent request → 1 OK, 1 conflict.
- **E5 — Provider không enabled.** `XACTION_ENABLED_PROVIDERS` không chứa platform → `getProvider` throw → controller return 400 "Nền tảng X chưa được bật". Test: config empty → promote bất kỳ platform → 400. Edge: config `facebook` → promote zalo → 400 (zalo chưa enable).
- **E6 — Promote listing không thuộc seller (ownership).** Seller A promote listing của seller B → `403 Forbidden`. Test: seller A token + listing B → 403. DELETE cross-post của seller khác → 403.
- **E7 — Cross-post job khi listing đã bị xóa (ON DELETE CASCADE).** Listing delete → cross_posts cascade delete → BullMQ job vẫn chạy (job data có crossPostId) → processor query cross_posts → not found → log warn + return (KHÔNG throw, không retry — row đã không tồn tại). Test: delete listing → cross_posts empty → job processor → graceful skip.
- **E8 — BullMQ job fail + Redis down.** Redis down → enqueue throw → controller catch → return 500 "Hệ thống quảng bá tạm không khả dụng" (KHÔNG crash app — Story 1.6 graceful degradation). cross_posts row vẫn pending (sẽ enqueue lại khi Redis lên — story sau có re-enqueue cron, 5.1 chỉ log). Test: mock queue.add throw → controller 500, cross_posts row vẫn pending.
- **E9 — Multiple platforms trong 1 request, 1 fail.** `POST /xaction/promote` body `platforms: [facebook, zalo]` — facebook OK, zalo duplicate → return `{ crossPosts: [fb], errors: [{ platform: 'zalo', message: 'duplicate' }] }` (AD-3 independent failure — 1 fail ≠ total fail). Test: promote 2 platform, 1 duplicate → 202 + partial success.
- **E10 — Provider stub (5.1 không có provider thật).** Stub provider `postListing()` return `{ externalUrl: 'https://stub.example/post/123', providerJobId: 'stub-123' }` sau 100ms delay (simulate async). `removePost()` resolve void. `getPostStatus()` return 'posted'. Story 5.x sau thay stub bằng provider thật (FB/Chợ Tốt/Zalo) — interface không đổi (AD-3 thay provider không sửa marketplace).

## UX Spec tham chiếu

Story 5.1 là API-only (backend foundation) — KHÔNG có UI user-facing. Seller dashboard UI (FR12) ở story FE sau (5.x). API response shape ảnh hưởng FE story sau — khớp Consistency Conventions error shape (Story 1.6 filter).

## Dev Notes

### Gate lift justification (Track B unblocked)

1. **XActions API docs available** — repo tại `/Users/luisphan/Documents/GitHub/xactions`: REST API (Express.js backend `api/server.js`), MCP server (`src/mcp/server.js` — 140+ tools), Puppeteer browser automation (`src/scrapers/`, `src/agents/browserDriver.js`). API reference tại `docs/api-reference.md`. XActions là toolkit automation Twitter/FB — không cần API key, dùng browser automation (Puppeteer + stealth plugin).
2. **ToS compliance decided** — browser automation approach (accept risk). Platform ToS có thể cấm automation, nhưng bdsai.vn chọn approach này cho MVP (giống XActions philosophy: "No API keys. No monthly fees."). Risk: account proxy có thể bị ban — xử lý qua AD-9 (removal_failed → gỡ thủ công).
3. **AD-8 phone hash** — đã trong architecture (phone → sha256 hash cho dedup, không lưu raw). Story 5.1 cross_posts KHÔNG lưu PII — chỉ listingId + platform + externalUrl.

### Versions (khớp ARCHITECTURE-SPINE.md Stack)

| Package | Version | Note |
|---------|---------|------|
| NestJS | 11.1.27 (đã có) | KHÔNG nâng cấp |
| BullMQ | 5.x (đã có — Story 1.6) | Queue `cross-post` mới |
| Drizzle ORM | 0.36.4 (đã có) | Schema cross-posts + migration |
| drizzle-kit | 0.31.10 (đã có) | `yarn db:generate` sinh migration |
| ioredis | (đã có — Story 1.6) | BullMQ dependency |
| class-validator + class-transformer | (đã có nếu dùng) | DTO validation — hoặc Zod pipe |

### XActions integration approach (5.1 stub, 5.x thật)

Story 5.1 tạo **stub provider** (mock/no-op) để verify provider pattern + registry + queue + lifecycle hoạt động. Provider thật (FB/Chợ Tốt/Zalo gọi XActions API/MCP) ở story 5.x sau. Lý do: 5.1 tập trung vào **foundation** (interface + table + module + queue + lifecycle + API), không phụ thuộc XActions API cụ thể. Stub provider:

```typescript
// Stub provider — simulate async post/remove, return fake data.
@Injectable()
export class StubProvider implements IPromotionProvider {
  async postListing(input: PostListingInput): Promise<PostResult> {
    await delay(100); // simulate async
    return {
      externalUrl: `https://stub.example/post/${input.listingId}`,
      providerJobId: `stub-${input.listingId}-${Date.now()}`,
    };
  }
  async removePost(input: RemovePostInput): Promise<void> {
    await delay(100);
    // resolve void — simulate success
  }
  async getPostStatus(providerJobId: string): Promise<ProviderPostStatus> {
    return 'posted';
  }
}
```

Story 5.x thay stub bằng `FacebookProvider` (gọi XActions API/MCP post to FB page/group), `ChoTotProvider`, `ZaloProvider` — interface `IPromotionProvider` không đổi (AD-3: thay provider không sửa marketplace module).

### Source tree (NEW/UPDATE)

```
bdsai/apps/api/
├── src/
│   ├── xaction/                              # NEW directory (AD-1 module riêng)
│   │   ├── xaction.module.ts                 # NEW — BullModule.registerQueue('cross-post') + providers
│   │   ├── xaction.controller.ts             # NEW — POST /xaction/promote, GET /xaction/cross-posts, DELETE /xaction/cross-posts/:id
│   │   ├── promotion.service.ts              # NEW — createCrossPost, removeCrossPost, listCrossPosts (AC6)
│   │   ├── cross-post.processor.ts           # NEW — BullMQ @Processor('cross-post') — post + remove job (AC4)
│   │   ├── provider-registry.ts              # NEW — config-based provider resolve (AC8)
│   │   ├── providers/
│   │   │   ├── promotion-provider.interface.ts # NEW — IPromotionProvider interface (AC1)
│   │   │   ├── stub.provider.ts              # NEW — stub/no-op provider (5.1 verify pattern)
│   │   │   ├── facebook.provider.ts          # NEW (stub — 5.x thay bằng XActions call thật)
│   │   │   ├── cho-tot.provider.ts           # NEW (stub — 5.x thay)
│   │   │   └── zalo.provider.ts              # NEW (stub — 5.x thay)
│   │   ├── dto/
│   │   │   ├── promote.dto.ts                # NEW — { listingId, platforms[] } validation
│   │   │   └── cross-post.dto.ts             # NEW — response shape
│   │   ├── xaction.types.ts                  # NEW — CrossPostPlatform, CrossPostStatus, PostListingInput, PostResult, etc.
│   │   ├── promotion.service.spec.ts         # NEW — unit test (AC10a)
│   │   ├── provider-registry.spec.ts         # NEW — unit test (AC10a)
│   │   └── cross-post.processor.spec.ts      # NEW — unit test (AC10a)
│   ├── db/
│   │   ├── schema/
│   │   │   ├── cross-posts.ts                # NEW — Drizzle schema (AC2)
│   │   │   └── index.ts                      # UPDATE — export cross-posts
│   │   └── migrations/
│   │       └── NNNN_cross_posts.sql          # NEW — sinh bởi drizzle-kit generate
│   ├── marketplace/
│   │   └── marketplace.service.ts            # UPDATE — inject PromotionService, enqueue removal on REJECTED/DELETED/SOLD/EXPIRED (AC5, AD-9)
│   ├── config/
│   │   └── env.validation.ts                 # UPDATE — thêm XACTION_ENABLED_PROVIDERS
│   └── app.module.ts                         # UPDATE — import XactionModule
├── test/
│   └── xaction.e2e-spec.ts                   # NEW — integration test (AC10b)
├── package.json                              # KHÔNG thêm dep mới (BullMQ/Drizzle đã có)
└── .env.example                              # UPDATE — XACTION_ENABLED_PROVIDERS

bdsai/apps/api/src/db/schema/cross-posts.ts (AC2 — schema reference):
```

```typescript
import { pgTable, uuid, text, timestamp, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { publicListings } from './public-listings';

export const crossPostPlatform = pgEnum('cross_post_platform', ['facebook', 'cho_tot', 'zalo']);
export const crossPostStatus = pgEnum('cross_post_status', ['pending', 'posted', 'failed', 'removed', 'removal_failed']);

export const crossPosts = pgTable(
  'cross_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => publicListings.id, { onDelete: 'cascade' }),
    platform: crossPostPlatform('platform').notNull(),
    externalUrl: text('external_url'),
    providerJobId: text('provider_job_id'),
    status: crossPostStatus('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cross_posts_listing').on(table.listingId),
    uniqueIndex('idx_cross_posts_listing_platform').on(table.listingId, table.platform),
  ],
);
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **Stub provider cho 5.1** — KHÔNG gọi XActions API thật trong 5.1. Lý do: 5.1 = foundation (interface + table + queue + lifecycle + API). Provider thật (FB/Chợ Tốt/Zalo) ở 5.x sau khi có XActions session/credential setup. Stub verify pattern hoạt động end-to-end.
2. **Unique index `(listingId, platform)`** — chống duplicate promotion ở DB level (defense in depth — service check + DB unique). Cho phép promote lại nếu status = `failed`/`removed`/`removal_failed` (service check status, DB unique chỉ trên column không phải status — quyết định: unique trên `(listingId, platform)` nghĩa là 1 listing-platform chỉ 1 row. Nếu muốn promote lại → reuse existing row (update status pending) thay vì insert mới. Dev có thể chọn: (a) unique `(listingId, platform)` + update existing row, hoặc (b) unique `(listingId, platform, status)` partial — author chốt (a) cho đơn giản).
3. **BullMQ queue `cross-post` riêng** — KHÔNG dùng queue `ai-summary` hay `inquiry-notification` (AD-1 module isolation). Mỗi module register queue riêng.
4. **HTTP return 202 Accepted** — promote/remove return 202 (not 200/201) vì job async, chưa hoàn tất. Response body chứa cross_posts row (status pending) + enqueued count.
5. **MarketplaceService inject PromotionService** — cho AD-9 lifecycle removal. Dependency direction: MarketplaceModule → XactionModule (marketplace phụ thuộc xaction cho removal). KHÔNG circular (XactionModule KHÔNG inject MarketplaceService — xaction chỉ query cross_posts + public_listings qua Drizzle trực tiếp nếu cần, hoặc nhận listing data qua job data).
6. **`XACTION_ENABLED_PROVIDERS` default empty** — 5.1 chỉ stub, prod enable sau. Empty = mọi promote return 400 "chưa bật platform" (graceful — KHÔNG crash). Dev có thể set `XACTION_ENABLED_PROVIDERS=facebook,cho_tot,zalo` để test stub provider end-to-end.

### Patterns to follow (from existing codebase)

- **Module pattern:** `xaction.module.ts` — `@Module({ imports: [BullModule.registerQueue({ name: 'cross-post' })], controllers, providers, exports })` (khớp `inquiry.module.ts`).
- **Service pattern:** `promotion.service.ts` — `@Injectable()`, `@InjectDrizzle()`, `@InjectQueue('cross-post')`, Logger structured, try/catch + safeErr (khớp `marketplace.service.ts`).
- **Processor pattern:** `cross-post.processor.ts` — `@Processor('cross-post', { concurrency: 2 }) extends WorkerHost`, `process(job: Job<{...}>)` (khớp `inquiry.processor.ts`).
- **Schema pattern:** `cross-posts.ts` — `pgTable` + `pgEnum` + `references(() => publicListings.id, { onDelete: 'cascade' })` + index (khớp `inquiries.ts`).
- **Controller pattern:** `xaction.controller.ts` — `@Controller('xaction')`, `@UseGuards(JwtAuthGuard)`, DTO validation, error shape chuẩn (khớp marketplace controller).
- **Migration:** `yarn db:generate` (sinh từ schema) → review SQL → `yarn db:migrate` → verify journal (khớp Story 1.5/1.6 MIGRATIONS.md).

## Test Plan

### Unit tests (AC10a — mock Drizzle + queue + registry)

1. **`promotion.service.spec.ts`:**
   - `createCrossPost` — PUBLISHED listing + no existing cross_post → insert row pending + enqueue post job. Assert row.status='pending', queue.add called.
   - `createCrossPost` — non-PUBLISHED listing (DRAFT/PENDING/REJECTED/EXPIRED/SOLD) → throw BadRequestException.
   - `createCrossPost` — duplicate (existing row status pending/posted) → throw ConflictException.
   - `createCrossPost` — duplicate but status failed/removed → allow (update existing row status pending + enqueue).
   - `removeCrossPost` — existing cross_post → enqueue remove job. Assert queue.add called with action='remove'.
   - `removeCrossPost` — not found → throw NotFoundException.
   - `removeCrossPost` — wrong seller → throw ForbiddenException.
   - `listCrossPosts` — return rows for listingId.

2. **`provider-registry.spec.ts`:**
   - `XACTION_ENABLED_PROVIDERS=facebook` → `getProvider('facebook')` returns FacebookProvider.
   - `XACTION_ENABLED_PROVIDERS=facebook` → `getProvider('zalo')` throws.
   - Empty config → `getProvider` throws for any platform.
   - `getEnabledPlatforms()` returns parsed list.

3. **`cross-post.processor.spec.ts`:**
   - `post` job — provider.postListing success → update cross_posts status='posted' + externalUrl + providerJobId.
   - `post` job — provider throw → retry 3x → update status='failed' + errorMessage.
   - `remove` job — provider.removePost success → update status='removed'.
   - `remove` job — provider throw → retry 3x → update status='removal_failed' + errorMessage.
   - Job with non-existent crossPostId → log warn + return (graceful skip — E7).

### Integration tests (AC10b — Redis + Supabase live, env guard skip if Redis down)

1. **`xaction.e2e-spec.ts`:**
   - POST /xaction/promote — valid PUBLISHED listing + enabled platform → 202 + cross_posts row pending in DB.
   - POST /xaction/promote — non-PUBLISHED listing → 400.
   - POST /xaction/promote — duplicate platform → 409.
   - POST /xaction/promote — unauthorized (wrong seller) → 403.
   - POST /xaction/promote — multiple platforms, 1 duplicate → 202 + partial success (E9).
   - GET /xaction/cross-posts?listingId=X → list cross-posts.
   - DELETE /xaction/cross-posts/:id → 202 + enqueue remove job.
   - Listing transition PUBLISHED→SOLD → cross_posts removal jobs enqueued (AD-9 — verify via spy on queue.add or cross_posts status change after processor runs).

### E2E tests (real browser — story FE sau, 5.1 API-only)

Story 5.1 là API-only — KHÔNG có E2E browser test. E2E cho seller promote UI ở story FE 5.x sau. Integration test (`xaction.e2e-spec.ts`) cover API flow end-to-end.

## References

- [Source: AD-3] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 51-67 — Xaction as External Service (async BullMQ, provider pattern, independent failure, retry 3x).
- [Source: AD-9] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 87-91 — Cross-Post Lifecycle Integrity (enqueue removal on status change, removal_failed → gỡ thủ công).
- [Source: AD-1] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 39-43 — Module Isolation (xaction module riêng, expose service interface only).
- [Source: AD-2] `_bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md` dòng 45-49 — Single Data Mutation Path (cross_posts mutation qua NestJS service).
- [Source: FR10/FR12] `_bmad-output/planning-artifacts/epics.md` dòng 27-28, 79-81 — Xaction Auto-Post + Seller promotion dashboard.
- [Source: Epic 5] `_bmad-output/planning-artifacts/epics.md` dòng 124-131 — Epic 5 Xaction integration, gate conditions.
- [Source: Pattern] `bdsai/apps/api/src/inquiry/inquiry.module.ts` — BullModule.registerQueue pattern.
- [Source: Pattern] `bdsai/apps/api/src/inquiry/inquiry.processor.ts` — @Processor WorkerHost pattern.
- [Source: Pattern] `bdsai/apps/api/src/marketplace/marketplace.service.ts` — Drizzle service + queue.add + status transition pattern.
- [Source: Pattern] `bdsai/apps/api/src/db/schema/inquiries.ts` — Drizzle pgTable + pgEnum + references + index pattern.
- [Source: Pattern] `bdsai/apps/api/src/db/schema/public-listings.ts` — pgEnum + listingStatus workflow.
- [Source: XActions] `/Users/luisphan/Documents/GitHub/xactions` — REST API + MCP server + Puppeteer browser automation (gate lift justification #1).
- [Source: XActions API] `/Users/luisphan/Documents/GitHub/xactions/docs/api-reference.md` — createBrowser, scrapeProfile, postTweet, etc. (reference cho provider thật 5.x).

## Dev Agent Record

| Field | Value |
|-------|-------|
| Story ID | 5-1-xaction-module-provider-pattern-cross-posts |
| Epic | 5 — Xaction Integration (Track B) |
| Status | backlog → ready-for-dev |
| Estimate | ~16-20h (interface + table + module + queue + lifecycle + API + tests) |
| Gate | Track B unblocked — XActions docs + ToS decided + AD-8 phone hash |
| Dependencies | Story 1.6 (BullMQ/Redis), Story 3.1 (public_listings + status workflow), Story 2.2 (JwtAuthGuard) |
| Blocks | Story 5.x (provider thật FB/Chợ Tốt/Zalo), Story 5.x (seller promote UI), Story 5.x (dedup) |
