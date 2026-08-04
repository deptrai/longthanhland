# Dev Log — Story 5.6: Seller Promotion Dashboard

## Summary
Frontend UI for seller cross-post management. Promote dialog, cross-posts list, confirm assisted, remove. All via API proxy routes to NestJS XactionModule.

## Files Created (4 new)
1. `app/api/xaction/cross-posts/route.ts` — POST (promote) + GET (list) thin proxy
2. `app/api/xaction/cross-posts/[id]/route.ts` — PATCH (confirm assisted) + DELETE (remove) thin proxy
3. `app/(dashboard)/dashboard/cross-posts/page.tsx` — Server wrapper with Suspense boundary
4. `app/(dashboard)/dashboard/cross-posts/cross-posts-view.tsx` — Client component (main UI)

## Files Updated (2)
1. `app/(dashboard)/layout.tsx` — Add "Quảng bá đa kênh" nav item
2. `app/(dashboard)/dashboard/my-listings/page.tsx` — Add "Quảng bá" button on PUBLISHED listings

## Verification
- typecheck: 0 errors ✅
- test: 36/36 web tests pass ✅
- build: success (37/37 static pages, new routes visible) ✅

## Key Decisions
1. **No new UI components** — use native HTML + Tailwind (matches my-listings pattern)
2. **Server wrapper + client component** — Suspense boundary required for useSearchParams (Next.js 16)
3. **Auto-open promote dialog** — `?promote=listingId` query param auto-opens dialog (from my-listings "Quảng bá" button)
4. **Platform/status badges** — Vietnamese labels, color-coded (yellow/green/blue/red/gray/orange)
5. **Confirm assisted flow** — modal dialog asks for ad URL → PATCH → status='posted'
6. **Remove flow** — confirm() dialog → DELETE → 202
7. **Parallel cross-post fetch** — Promise.all for all listings' cross-posts

## AC Coverage
- AC1: API proxy routes ✅
- AC2: Sidebar nav item ✅
- AC3: Cross-posts page lists all ✅
- AC4: Promote dialog on my-listings ✅
- AC5: Status badges Vietnamese ✅
- AC6: Confirm assisted flow ✅
- AC7: Remove cross-post ✅
- AC8: Platform badges ✅
- AC9: Error handling ✅
- AC10: Loading states ✅
