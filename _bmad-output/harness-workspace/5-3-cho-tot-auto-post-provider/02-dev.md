# Dev Log — Story 5.3: Chợ Tốt Auto-Post Provider (Assisted MVP)

## Summary
Implemented ChoTotProvider with "assisted posting" approach — Chợ Tốt không có public API + Cloudflare anti-bot mạnh → MVP dùng semi-automated flow: format listing + generate posting URL → seller manually posts → PATCH confirm với ad URL.

## Files Created (NEW)
1. `xaction/cho-tot-listing-formatter.ts` — ChoTotListingFormatter (format listing → structured fields + posting URL)
2. `xaction/providers/cho-tot.provider.ts` — ChoTotProvider implements IPromotionProvider (assisted mode)
3. `xaction/providers/cho-tot.provider.spec.ts` — 8 tests
4. `xaction/cho-tot-listing-formatter.spec.ts` — 12 tests
5. `db/migrations/0014_cross_post_assisted_status.sql` — Add 'assisted' to cross_post_status enum

## Files Updated
1. `db/schema/cross-posts.ts` — Add 'assisted' to crossPostStatus enum
2. `xaction/providers/promotion-provider.interface.ts` — PostResult.assisted?: boolean + PostListingInput.propertyType/listingType
3. `xaction/cross-post.processor.ts` — Handle assisted result → status='assisted' + send propertyType/listingType
4. `xaction/provider-registry.ts` — cho_tot → ChoTotProvider (4th constructor arg)
5. `xaction/xaction.module.ts` — Add ChoTotProvider + ChoTotListingFormatter
6. `xaction/xaction.controller.ts` — Add PATCH /xaction/cross-posts/:id endpoint + confirmSchema
7. `xaction/promotion.service.ts` — Add confirmAssistedPost method + update removeActive/removeCrossPost to include 'assisted' status
8. `config/env.validation.ts` — Add CHOTOT_POSTING_URL env var
9. `.env.example` — Add CHOTOT_POSTING_URL
10. `xaction/provider-registry.spec.ts` — Update for 4-arg constructor + cho_tot→ChoTotProvider test
11. `xaction/cross-post.processor.spec.ts` — Add assisted status test + propertyType/listingType in mock listing
12. `xaction/promotion.service.spec.ts` — Add confirmAssistedPost tests (4 tests) + _setReturnRows/_getUpdateSet mock helpers
13. `xaction/providers/facebook.provider.spec.ts` — Add propertyType/listingType to makeInput
14. `xaction/listing-formatter.spec.ts` — Add propertyType/listingType to makeListing

## Verification
- typecheck: 0 errors ✅
- test: 319/319 pass (294 cũ + 25 mới) ✅
- build: success ✅
- migration 0014: applied + idempotent ✅ (6 enum values: pending/posted/assisted/failed/removed/removal_failed)

## Key Decisions
1. **Assisted posting** (not full Puppeteer) — Chợ Tốt anti-bot quá mạnh cho MVP, no public API
2. **New 'assisted' status** — clean separation from 'posted' (seller chưa confirm vs đã confirm)
3. **PATCH endpoint** — seller confirm manual posting với ad URL
4. **PostResult.assisted flag** — processor checks flag → sets 'assisted' instead of 'posted'
5. **PostListingInput extended** — added propertyType + listingType (needed for Chợ Tốt formatter)
6. **Upgrade path** — replace postListing() with Puppeteer automation post-MVP (interface unchanged)
