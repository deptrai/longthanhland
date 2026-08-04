# Story 5.3: Chợ Tốt Auto-Post Provider (Assisted MVP)

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-3-cho-tot-auto-post-provider
- epic: 5
- track: B

## User Story
**As a** seller on bdsai.vn
**I want** to cross-post my listing to Chợ Tốt
**So that** I reach Vietnam's largest classifieds audience

## Context
Chợ Tốt (chotot.com) là nền tảng rao vặt lớn nhất VN. Không có public API cho third-party posting. Cloudflare anti-bot mạnh → full Puppeteer automation fragile. MVP dùng "assisted posting": format listing + generate pre-filled posting URL → seller manually posts → confirm với ad URL. Upgrade path: Puppeteer automation sau (post-MVP).

## Acceptance Criteria

### AC1: ChoTotProvider implements IPromotionProvider
- GIVEN ChoTotProvider is registered for platform 'cho_tot'
- WHEN ProviderRegistry.getProvider('cho_tot') is called
- THEN returns ChoTotProvider instance with platform='cho_tot'

### AC2: postListing returns assisted result
- GIVEN a PUBLISHED listing is promoted to cho_tot
- WHEN CrossPostProcessor calls provider.postListing(input)
- THEN provider formats listing for Chợ Tốt + generates posting URL
- AND returns { externalUrl: postingUrl, providerJobId: 'chotot-assisted-{listingId}', assisted: true }

### AC3: New 'assisted' status in cross_post_status enum
- GIVEN migration 0014 runs
- WHEN cross_post_status enum is queried
- THEN includes 'assisted' value (in addition to pending/posted/failed/removed/removal_failed)

### AC4: Processor sets status='assisted' for assisted results
- GIVEN provider.postListing() returns { assisted: true }
- WHEN CrossPostProcessor processes the job
- THEN sets cross_post.status='assisted' (NOT 'posted')
- AND sets externalUrl to the assisted posting URL

### AC5: PATCH /xaction/cross-posts/:id — seller confirms manual posting
- GIVEN a cross_post with status='assisted'
- WHEN seller PATCHes { status: 'posted', externalUrl: 'https://chotot.com/ad/...' }
- THEN cross_post.status='posted' + externalUrl updated
- AND response 200 with updated cross_post

### AC6: PATCH validation
- GIVEN seller PATCHes a cross_post
- WHEN status is not 'posted' → 400
- WHEN externalUrl is not a valid URL → 400
- WHEN cross_post status is not 'assisted' → 409 (can only confirm assisted posts)
- WHEN seller is not the owner → 403

### AC7: ChoTotListingFormatter
- GIVEN a listing input
- WHEN formatForChoTot(input) is called
- THEN returns object with: title, description, price, area, province, district, propertyType, listingType
- AND price formatted in VND (Chợ Tốt expects raw number)
- AND description max 3000 chars (Chợ Tốt limit)

### AC8: Chợ Tốt posting URL generation
- GIVEN a formatted listing
- WHEN generatePostingUrl(formatted, listingId) is called
- THEN returns https://www.chotot.com/dang-tin?... with query params for pre-fill (if supported)
- OR returns https://www.chotot.com/dang-tin (base URL — manual form fill)
- AND includes a reference parameter for tracking (bdsai_listing_id)

### AC9: removePost — throw "not supported"
- GIVEN seller requests removal of a Chợ Tốt cross_post
- WHEN provider.removePost() is called
- THEN throws "Chợ Tốt removal not supported — gỡ thủ công"
- AND processor sets status='removal_failed' after 3 retries

### AC10: getPostStatus — always 'posted' for confirmed, 'pending' for assisted
- GIVEN a cross_post with status='assisted'
- WHEN provider.getPostStatus(providerJobId) is called
- THEN returns 'pending' (not yet confirmed)
- GIVEN a cross_post with status='posted'
- WHEN provider.getPostStatus(providerJobId) is called
- THEN returns 'posted'

### AC11: Env config
- GIVEN env validation runs
- THEN CHOTOT_POSTING_URL (default https://www.chotot.com/dang-tin) is accepted
- AND BDSAI_WEB_URL is reused for tracking reference

### AC12: Tests
- cho-tot.provider.spec.ts — unit test (mock formatter, assert postListing/removePost/getPostStatus)
- cho-tot-listing-formatter.spec.ts — unit test (format, truncate, field mapping)
- promotion.service.spec.ts — update for PATCH endpoint
- cross-post.processor.spec.ts — update for assisted status

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-1 Module Isolation | ChoTotProvider trong XactionModule, private |
| AD-3 Xaction async BullMQ | postListing qua BullMQ processor (assisted = fast resolve) |
| AD-8 No PII in cross_posts | Chỉ lưu externalUrl + providerJobId, không lưu listing content |
| AD-9 Cross-Post Lifecycle | removePost throw → removal_failed (best-effort) |

## Edge Cases
- E1: Chợ Tốt posting URL unreachable → assisted still works (URL is just a link)
- E2: Seller PATCHes invalid URL → 400
- E3: Seller PATCHes non-assisted cross_post → 409
- E4: Non-owner PATCH → 403
- E5: Description > 3000 chars → truncate
- E6: Price 0 → still valid (Chợ Tốt accepts "thỏa thuận")
- E7: Concurrent PATCH → DB row lock, last write wins (acceptable)

## Dev Notes
- No new dependencies (no Puppeteer for MVP)
- DB migration: ALTER TYPE cross_post_status ADD VALUE 'assisted' (before 'removed' to respect enum ordering)
- PostResult interface: add optional `assisted?: boolean` field
- CrossPostProcessor: check result.assisted → set 'assisted' instead of 'posted'
- PATCH endpoint in XactionController: new @Patch('cross-posts/:id')
- ChoTotListingFormatter: different from FB formatter (structured fields, not text post)
- Chợ Tốt posting URL: base URL + optional query params (Chợ Tốt may not support URL pre-fill, so manual fill is fallback)

## Test Plan
1. cho-tot.provider.spec.ts — 12+ tests (postListing assisted, removePost throw, getPostStatus)
2. cho-tot-listing-formatter.spec.ts — 10+ tests (format, truncate, field mapping, price)
3. cross-post.processor.spec.ts — update for assisted status (3+ new tests)
4. promotion.service.spec.ts — update for PATCH confirm (3+ new tests)
5. xaction.e2e-spec.ts — update for cho_tot assisted flow (if real data available)
