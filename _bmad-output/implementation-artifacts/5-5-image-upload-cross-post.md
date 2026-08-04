# Story 5.5: Image Upload Cross-Post (Forward-Compatible Plumbing)

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-5-image-upload-cross-post
- epic: 5
- track: B

## User Story
**As a** seller on bdsai.vn
**I want** my listing images to be included in cross-posts
**So that** posts are more attractive and get more engagement

## Context
XActions FB API hiện text-only — `mediaUrls` field tồn tại nhưng "reserved for future use" (không implement upload). Story này làm plumbing:
- FacebookProvider: pass `mediaUrls` array to XActions API (forward-compatible — khi XActions thêm upload, tự động hoạt động)
- ChoTot/Zalo formatters: include image URLs trong formatted text (seller xem/copy images khi manual post)
- PostListingInput đã có `images[]` — chỉ cần wire through

## Acceptance Criteria

### AC1: FacebookProvider passes mediaUrls to XActions
- GIVEN a listing with images is promoted to facebook
- WHEN FacebookProvider.postListing() calls XactionsClient.automateFacebook()
- THEN request body includes `mediaUrls: string[]` (array of image URLs)
- AND if listing has no images → mediaUrls = [] (empty array, not undefined)

### AC2: XactionsClient.automateFacebook accepts mediaUrls param
- GIVEN XactionsClient.automateFacebook() is called
- THEN accepts optional `mediaUrls?: string[]` parameter
- AND includes in request body if provided

### AC3: ListingFormatter includes image URLs in FB post text
- GIVEN a listing with 3 images is formatted for FB
- WHEN ListingFormatter.format() is called
- THEN post text includes image URLs section (📷 Images: url1, url2, url3)
- AND if no images → no image section

### AC4: ChoTotListingFormatter includes image URLs
- GIVEN a listing with images is formatted for Chợ Tốt
- WHEN formatForChoTot() is called
- THEN description includes image URLs section
- AND image URLs counted toward 3000 char limit

### AC5: ZaloListingFormatter includes image URLs
- GIVEN a listing with images is formatted for Zalo
- WHEN formatForZalo() is called
- THEN postText includes image URLs section
- AND image URLs counted toward 2000 char limit

### AC6: Cover image first
- GIVEN a listing with images (1 cover + 2 non-cover)
- WHEN formatted by any formatter
- THEN cover image URL appears first in image list

### AC7: Image URL limit (max 10)
- GIVEN a listing with 15 images
- WHEN formatted by any formatter
- THEN only first 10 image URLs included (FB limit, conservative)

### AC8: Tests
- facebook.provider.spec.ts — update for mediaUrls assertion
- xactions-client.spec.ts — update for mediaUrls param
- listing-formatter.spec.ts — update for image URLs in text
- cho-tot-listing-formatter.spec.ts — update for image URLs
- zalo-listing-formatter.spec.ts — update for image URLs

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-1 Module Isolation | Image handling trong XactionModule |
| AD-8 No PII in cross_posts | Image URLs là public listing images, không PII |

## Edge Cases
- E1: No images → no image section, mediaUrls=[]
- E2: 15 images → truncate to 10
- E3: Image URL with special chars → URL encoding (URL-safe)
- E4: Cover image null → all images equal, no reordering

## Dev Notes
- No new dependencies
- No DB migration (images already in PostListingInput)
- XActions `mediaUrls` field: validated for type (array) but not used for upload yet
- Forward-compatible: when XActions adds image upload, FB posts will automatically include images
