# Dev Log — Story 5.7: Auto-Import Deduplication (Admin Manual Import MVP)

## Summary
Dedup engine + admin manual import (CSV/JSON). PRD specifies auto-import from FB pages/groups but that's blocked (XActions API docs + ToS compliance). This story delivers the core dedup engine + admin manual import as MVP. When auto-scrape is unblocked, the dedup engine will be reused.

## Files Created (7 new)
1. `db/schema/imported-listings.ts` — imported_listings table (dedupHash, sellerPhoneHash, rawPayload, status)
2. `db/migrations/0015_imported_listings.sql` — Migration with unique index on dedupHash
3. `import/dedup.service.ts` — Dedup engine (exact hash + fuzzy pg_trgm similarity)
4. `import/import.service.ts` — CSV/JSON parse + batch import with dedup
5. `import/import.controller.ts` — POST /admin/import/csv + /admin/import/json (AdminGuard)
6. `import/import.module.ts` — ImportModule
7. `import/dedup.service.spec.ts` — 13 tests (hash computation, phone normalization, dedup logic)
8. `import/import.service.spec.ts` — 12 tests (CSV parse, JSON parse, dedup integration)

## Files Updated (2)
1. `db/schema/index.ts` — Export imported-listings
2. `app.module.ts` — Register ImportModule

## Verification
- typecheck: 0 errors ✅
- test: 382/382 pass (355 cũ + 27 mới) ✅
- build: success ✅
- migration: 0015 applied to DB (table + 3 indexes verified) ✅

## Key Decisions
1. **MVP approach** — Admin manual import (CSV/JSON) instead of auto-scrape from FB (blocked)
2. **Dedup engine** — Two-tier: exact hash match + fuzzy pg_trgm similarity (>0.85 + same district + price ±5%)
3. **Phone hashing (AD-8)** — sha256(normalizedPhone + SUPABASE_URL salt) — NEVER plaintext
4. **Dedup hash** — sha256(normalized_title + '|' + province + '|' + district + '|' + price + '|' + phoneHash)
5. **Normalized title** — lower + unaccent (remove Vietnamese diacritics) before hash
6. **Import status** — 'imported' (new) or 'duplicate' (dedup hit)
7. **No auto-listing creation** — Import records raw data; admin reviews and manually creates listings (AD-9 — admin must approve)
8. **Batch processing** — 100 rows per batch for large imports
9. **CSV parser** — Custom parser with quoted value support (no papaparse dependency)

## AC Coverage
- AC1: imported_listings table ✅
- AC2: Dedup hash computation ✅
- AC3: Exact hash match ✅
- AC4: Fuzzy similarity match ✅
- AC5: CSV import ✅
- AC6: JSON import ✅
- AC7: Phone hashing (AD-8) ✅
- AC8: Import status tracking ✅
- AC9: Admin guard ✅
- AC10: Tests ✅ (25 tests written)

## Edge Cases
- E1: Empty CSV → 400 "File rỗng" ✅
- E2: Missing columns → 400 ✅
- E3: 1000+ rows → batch processing ✅
- E4: Phone +84 → normalized to 0xxxxxxxxx ✅
- E5: Vietnamese diacritics → unaccent before hash ✅
- E6: Price = 0 → valid ✅
- E7: Fuzzy match different district → NOT duplicate ✅
