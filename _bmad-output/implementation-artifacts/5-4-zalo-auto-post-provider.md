# Story 5.4: Zalo Auto-Post Provider (Assisted MVP)

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-4-zalo-auto-post-provider
- epic: 5
- track: B

## User Story
**As a** seller on bdsai.vn
**I want** to cross-post my listing to Zalo
**So that** I reach Zalo's large Vietnamese user base

## Context
Zalo không có public API cho third-party posting. Zalo OA (Official Account) có API nhưng chỉ cho enterprise +审批 khó. MVP dùng "assisted posting" giống Chợ Tốt: format listing + generate Zalo posting URL → seller manually posts → confirm với ad URL.

## Acceptance Criteria

### AC1: ZaloProvider implements IPromotionProvider
- GIVEN ZaloProvider is registered for platform 'zalo'
- WHEN ProviderRegistry.getProvider('zalo') is called
- THEN returns ZaloProvider instance with platform='zalo'

### AC2: postListing returns assisted result
- GIVEN a PUBLISHED listing is promoted to zalo
- WHEN CrossPostProcessor calls provider.postListing(input)
- THEN provider formats listing for Zalo + generates posting URL
- AND returns { externalUrl: postingUrl, providerJobId: 'zalo-assisted-{listingId}', assisted: true }

### AC3: Processor sets status='assisted' for assisted results
- GIVEN provider.postListing() returns { assisted: true }
- WHEN CrossPostProcessor processes the job
- THEN sets cross_post.status='assisted' (reuse Story 5.3 logic)

### AC4: PATCH /xaction/cross-posts/:id — seller confirms manual posting
- GIVEN a cross_post with status='assisted'
- WHEN seller PATCHes { status: 'posted', externalUrl: 'https://zalo.me/...' }
- THEN cross_post.status='posted' + externalUrl updated (reuse Story 5.3 endpoint)

### AC5: ZaloListingFormatter
- GIVEN a listing input
- WHEN formatForZalo(input) is called
- THEN returns object with: title, description, price, area, location, link
- AND description max 2000 chars (Zalo limit)
- AND format: "🏠 [title]\n💰 [price] VND\n📍 [location]\n\n[desc]\n\n🔗 [link]"

### AC6: Zalo posting URL generation
- GIVEN a formatted listing
- WHEN generatePostingUrl(formatted, listingId) is called
- THEN returns https://zalo.me/dang-tin or https://chat.zalo.me/ (base URL)
- AND includes reference parameter for tracking

### AC7: removePost — throw "not supported"
- GIVEN seller requests removal of a Zalo cross_post
- WHEN provider.removePost() is called
- THEN throws "Zalo removal not supported — gỡ thủ công"

### AC8: getPostStatus — always 'pending' for assisted
- GIVEN a cross_post with status='assisted'
- WHEN provider.getPostStatus(providerJobId) is called
- THEN returns 'pending'

### AC9: Env config
- GIVEN env validation runs
- THEN ZALO_POSTING_URL (default https://chat.zalo.me/) is accepted

### AC10: Tests
- zalo.provider.spec.ts — unit test (mock formatter, assert postListing/removePost/getPostStatus)
- zalo-listing-formatter.spec.ts — unit test (format, truncate, field mapping)

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-1 Module Isolation | ZaloProvider trong XactionModule, private |
| AD-3 Xaction async BullMQ | postListing qua BullMQ processor |
| AD-8 No PII in cross_posts | Chỉ lưu externalUrl + providerJobId |
| AD-9 Cross-Post Lifecycle | removePost throw → removal_failed |

## Edge Cases
- E1: Description > 2000 chars → truncate
- E2: Seller PATCHes invalid URL → 400 (reuse Story 5.3 validation)
- E3: Non-owner PATCH → 403 (reuse Story 5.3 ownership check)
- E4: Price 0 → still valid
