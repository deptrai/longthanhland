# Dev Log — Story 5.5: Image Upload Cross-Post (Forward-Compatible Plumbing)

## Summary
Implemented image URL plumbing across all 3 providers. XActions FB API doesn't support image upload yet (`mediaUrls` field exists but "reserved for future use") — this story prepares the pipes so when XActions adds upload, FB posts automatically include images. For assisted platforms (Chợ Tốt/Zalo), image URLs included in formatted text.

## Files Updated (no new files)
1. `xaction/xactions-client.ts` — PostToFacebookParams.mediaUrls?: string[] + pass in request body
2. `xaction/providers/facebook.provider.ts` — Extract image URLs (cover first, max 10) + pass to client
3. `xaction/listing-formatter.ts` — Add 📷 Images section to FB post text + extractImageUrls helper (exported)
4. `xaction/cho-tot-listing-formatter.ts` — Add 📷 Hình ảnh section to description + truncateDescription accepts imageText
5. `xaction/zalo-listing-formatter.ts` — Add 📷 Images section to postText
6. `xaction/listing-formatter.spec.ts` — +7 image tests (no images, with images, cover first, max 10, extractImageUrls helper)
7. `xaction/cho-tot-listing-formatter.spec.ts` — +4 image tests
8. `xaction/zalo-listing-formatter.spec.ts` — +4 image tests
9. `xaction/providers/facebook.provider.spec.ts` — +3 mediaUrls tests + update existing assertions

## Verification
- typecheck: 0 errors ✅
- test: 355/355 pass (337 cũ + 18 mới) ✅
- build: success ✅

## Key Decisions
1. **Forward-compatible** — XActions `mediaUrls` field exists, validated for type, but upload not implemented. When XActions adds upload, FB posts automatically include images.
2. **Cover first, max 10** — FB image limit, conservative. extractImageUrls shared helper (exported from listing-formatter.ts).
3. **Assisted platforms** — image URLs in formatted text (seller can see/copy when manual post)
4. **No new infrastructure** — PostListingInput already had images[], just wired through
5. **No DB migration** — no schema changes needed
