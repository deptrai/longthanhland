# Code Review — Story 5.2: Facebook Auto-Post Provider

## Verdict: APPROVED (2 MEDIUM non-blocking + 4 LOW)

## Verification đã chạy
- typecheck: 0 errors ✅
- test: 294/294 pass (245 cũ + 49 mới) ✅
- build: success ✅

## AC Compliance
| AC | Status | Notes |
|----|--------|-------|
| AC1 FacebookProvider implements IPromotionProvider | ✅ | postListing/removePost/getPostStatus |
| AC2 XactionsClient (timeout 30s, retry 5xx) | ✅ | AbortController + 1 retry |
| AC3 ListingFormatter (truncate 5000) | ✅ | E7 fix verified — giữ link+hashtags |
| AC4 ProviderRegistry update | ✅ | facebook→FacebookProvider, cho_tot/zalo→Stub |
| AC5 XactionModule update | ✅ | 3 new providers added |
| AC6 Env config (6 new vars) | ✅ | env.validation.ts + .env.example |
| AC7 CrossPostProcessor unchanged | ✅ | AD-3 transparent |
| AC8 dryRun=false enforcement | ✅ | Hardcode false + defensive response check |
| AC9 Status mapping | ✅ | pending/running→pending, completed→posted, failed/cancelled→failed |
| AC10 Tests | ✅ | 49 new tests (17+19+13), all pass |

## AD Invariants
| AD | Status | Notes |
|----|--------|-------|
| AD-1 Module Isolation | ✅ | XactionModule owns all cross-post |
| AD-3 Xaction async BullMQ | ✅ | Processor unchanged, provider gọi async |
| AD-8 No PII/secret in cross_posts | ⚠️ | cross_posts chỉ lưu externalUrl+providerJobId ✅, NHƯNG redact config gap (MEDIUM-1) |
| AD-9 Cross-Post Lifecycle | ✅ | removePost throw → removal_failed (best-effort) |

## Findings

### MEDIUM-1: Pino redact config thiếu XACTIONS_FB_C_USER/XACTIONS_FB_XS/XACTIONS_API_TOKEN
**File:** `common/logger/logger.module.ts:28-54`
**Severity:** MEDIUM (defense-in-depth)
**Mô tả:** Pino redact paths không cover 3 secret mới:
- `*.token` match exact last segment "token" — KHÔNG match `XACTIONS_API_TOKEN` (key là `XACTIONS_API_TOKEN`, không phải `token`)
- `XACTIONS_FB_C_USER` và `XACTIONS_FB_XS` (FB session cookies — cực kỳ nhạy cảm, full account takeover nếu leak) không match bất kỳ pattern nào

Code hiện tại KHÔNG log trực tiếp các giá trị này (ConfigService private field, chỉ log error message). Nhưng defense-in-depth — nếu env object hoặc config object lỡ leak vào log context (VD: debug log, error stack), sẽ không bị redact.

**Fix gợi ý:** Thêm vào redact paths:
```
'*.XACTIONS_API_TOKEN',
'*.XACTIONS_FB_C_USER',
'*.XACTIONS_FB_XS',
'*.XACTIONS_FB_ACCOUNT_ID',
```

### MEDIUM-2: Sentry SECRET_PATTERNS thiếu c_user/xs
**File:** `common/sentry/sentry.util.ts:11-37`
**Severity:** MEDIUM (defense-in-depth)
**Mô tả:** `/token/i` match `XACTIONS_API_TOKEN` (contains "token") ✅. Nhưng `c_user` và `xs` (FB session cookies) không match bất kỳ regex nào. Nếu Sentry event lỡ chứa key `c_user` hoặc `xs`, giá trị sẽ gửi lên Sentry không redact.

**Fix gợi ý:** Thêm vào SECRET_PATTERNS:
```ts
/XACTIONS_FB_C_USER/i,
/XACTIONS_FB_XS/i,
/c_user/i,
```
(Không thêm `/xs/i` — quá ngắn, false-positive cao.)

### LOW-1: StubProvider.platform = 'facebook' as const — misleading cho cho_tot/zalo
**File:** `providers/stub.provider.ts:21`
**Severity:** LOW (cosmetic)
**Mô tả:** StubProvider có `platform = 'facebook' as const`. Khi registry dùng StubProvider cho `cho_tot`/`zalo`, provider.platform vẫn báo 'facebook'. Registry dùng map key (không dùng provider.platform), nên không bug. Nhưng có thể confuse debugging.

**Fix gợi ý:** Cho StubProvider nhận platform qua constructor hoặc dùng generic. Non-blocking — story 5.3/5.4 sẽ thay StubProvider anyway.

### LOW-2: XactionsClient gửi Authorization header ngay cả khi token empty
**File:** `xactions-client.ts:214`
**Severity:** LOW (cosmetic)
**Mô tả:** Khi `XACTIONS_API_TOKEN=''` (default), client gửi `Authorization: Bearer ` (empty). XActions auth middleware sẽ 401 — đã handle (E12 test pass). Sạch hơn: skip header nếu token empty.

**Fix gợi ý:** `headers: this.token ? { authorization: \`Bearer ${this.token}\`, ... } : { ... }`. Non-blocking.

### LOW-3: RETRY_DELAY_MS = 1000 hardcoded
**File:** `xactions-client.ts:53`
**Severity:** LOW (config flexibility)
**Mô tả:** 1s retry delay hardcoded. Production có thể cần configurable. MVP acceptable.

### LOW-4: OperationStatusResult.result = unknown
**File:** `xactions-client.ts:48`
**Severity:** LOW (typing)
**Mô tả:** `result: unknown` — XActions operation result shape varies, `unknown` là safe. Có thể typed cụ thể hơn sau khi XActions API stabilize.

## Edge Cases Coverage
| Edge | Test | Status |
|------|------|--------|
| E1 timeout (AbortError) | xactions-client.spec.ts | ✅ throw, no retry |
| E2 4xx | xactions-client.spec.ts | ✅ throw, no retry |
| E3 postUrl null/undefined | facebook.provider.spec.ts | ✅ externalUrl null |
| E4 5xx retry | xactions-client.spec.ts | ✅ retry once |
| E5 token empty | provider-registry.spec.ts | ✅ graceful skip |
| E6 account missing | xactions-client.spec.ts | ✅ throw |
| E7 content >5000 | listing-formatter.spec.ts | ✅ truncate, giữ link+hashtags |
| E8 cancelled status | facebook.provider.spec.ts | ✅ → failed |
| E9 ok:false | xactions-client.spec.ts | ✅ throw |
| E10 removePost | facebook.provider.spec.ts | ✅ throw "not supported" |
| E11 concurrent | BullMQ handles | ✅ (concurrency: 2) |
| E12 401 auth fail | xactions-client.spec.ts | ✅ clear message |

## Interface Change Impact
`PostResult.externalUrl: string → string | null`:
- StubProvider: returns `string` — still compatible (string assignable to string | null) ✅
- CrossPostProcessor: `externalUrl: result.externalUrl` — DB column already nullable ✅
- No breaking impact ✅

## Test Quality
- xactions-client.spec.ts (17 tests): mock fetch, assert body shape + headers + error handling ✅
- listing-formatter.spec.ts (19 tests): format + truncate + helpers ✅
- facebook.provider.spec.ts (13 tests): mock client + formatter, assert all 3 methods ✅
- provider-registry.spec.ts (updated): E5 + facebook+token + DI integration ✅
- xaction.e2e-spec.ts: switched facebook→cho_tot (justified — facebook needs real XActions) ✅

## Conclusion
Story 5.2 APPROVED. Code sạch, AC đầy đủ, AD invariants giữ, edge cases cover, test quality tốt. 2 MEDIUM findings (redact config) là defense-in-depth — code hiện tại không leak secret nhưng nên fix để prevent future regression. 4 LOW non-blocking.

Recommendation: Fix MEDIUM-1 + MEDIUM-2 trước merge (quick fix — thêm redact paths). LOW có thể defer.
