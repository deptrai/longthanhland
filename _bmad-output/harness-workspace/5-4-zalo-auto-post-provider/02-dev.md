# Dev Log — Story 5.4: Zalo Auto-Post Provider (Assisted MVP)

## Summary
Implemented ZaloProvider with "assisted posting" approach — same as Chợ Tốt (Story 5.3). Zalo không có public API cho third-party posting → format listing + generate Zalo posting URL → seller manually posts → PATCH confirm với ad URL (reuse Story 5.3 endpoint).

## Files Created (NEW)
1. `xaction/zalo-listing-formatter.ts` — ZaloListingFormatter (format listing → Zalo post text + posting URL)
2. `xaction/providers/zalo.provider.ts` — ZaloProvider implements IPromotionProvider (assisted mode)
3. `xaction/providers/zalo.provider.spec.ts` — 8 tests
4. `xaction/zalo-listing-formatter.spec.ts` — 11 tests

## Files Updated
1. `xaction/provider-registry.ts` — zalo → ZaloProvider (5th constructor arg) + update doc
2. `xaction/xaction.module.ts` — Add ZaloProvider + ZaloListingFormatter
3. `config/env.validation.ts` — Add ZALO_POSTING_URL env var
4. `.env.example` — Add ZALO_POSTING_URL
5. `xaction/provider-registry.spec.ts` — Update for 5-arg constructor + zalo→ZaloProvider test + DI integration

## Verification
- typecheck: 0 errors ✅
- test: 337/337 pass (319 cũ + 18 mới) ✅
- build: success ✅

## Key Decisions
1. **Same assisted approach as Chợ Tốt** — Zalo không có public API, Zalo OA enterprise-only
2. **Reuse Story 5.3 PATCH endpoint** — no new endpoint needed (confirmAssistedPost works for any platform)
3. **Reuse 'assisted' status** — no new migration needed
4. **Zalo post format** — similar to FB (🏠💰📍🔗) but 2000 chars limit (vs FB 5000)
5. **Price clamping** — negative/NaN → "0" (defensive)
6. **All 3 platforms now have real providers** — StubProvider kept only as test fallback
