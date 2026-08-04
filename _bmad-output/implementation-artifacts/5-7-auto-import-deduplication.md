# Story 5.7: Auto-Import Deduplication (Admin Manual Import MVP)

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-7-auto-import-deduplication
- epic: 5
- track: B

## User Story
**As an** admin of bdsai.vn
**I want** to import listings from external sources (CSV/JSON) with automatic deduplication
**So that** listings from partner feeds don't create duplicates on the marketplace

## Context
PRD specifies auto-import from FB pages/groups but that's blocked (XActions API docs + ToS compliance). This story delivers the core dedup engine + admin manual import (CSV/JSON upload) as MVP. When auto-scrape is unblocked, the dedup engine will be reused.

## Acceptance Criteria

### AC1: imported_listings table
- GIVEN DB migration runs
- THEN table `imported_listings` exists with: id, sourceType, sourceUrl, sourceId, dedupHash, sellerPhoneHash, rawPayload (jsonb), listingId (FK nullable), status, createdAt
- AND unique index on dedupHash

### AC2: Dedup hash computation
- GIVEN an import item with title + province + district + price + phoneHash
- WHEN dedupHash is computed
- THEN dedupHash = sha256(normalized_title + '|' + province + '|' + district + '|' + price + '|' + phoneHash)
- AND normalized_title = lower(unaccent(trim(title)))

### AC3: Dedup service — exact hash match
- GIVEN an import item arrives
- WHEN dedupService.checkDuplicate() is called
- AND a listing with same dedupHash already exists
- THEN return { isDuplicate: true, existingListingId }
- AND do NOT create new listing

### AC4: Dedup service — fuzzy similarity match
- GIVEN an import item arrives
- WHEN no exact hash match but pg_trgm similarity(title) > 0.85 AND same district AND price within 5%
- THEN return { isDuplicate: true, existingListingId, matchType: 'fuzzy' }

### AC5: Admin import endpoint — CSV
- GIVEN admin POSTs to /api/admin/import with CSV file
- WHEN CSV has columns: title, description, price, area, province, district, address, phone, propertyType, listingType
- THEN parse CSV → for each row: compute dedupHash → checkDuplicate → insert if not dup
- AND return { imported: N, duplicates: M, errors: [...] }

### AC6: Admin import endpoint — JSON
- GIVEN admin POSTs to /api/admin/import with JSON body
- WHEN body has `listings: [{...}]` array
- THEN same dedup flow as CSV

### AC7: Phone hashing (AD-8)
- GIVEN phone number in import data
- WHEN stored in imported_listings
- THEN phone is sha256 hashed (NOT stored in plaintext)
- AND hash uses salt = SUPABASE_PROJECT_ID (env)

### AC8: Import status tracking
- GIVEN import creates imported_listings row
- THEN status = 'imported' (if new) or 'duplicate' (if dedup hit)
- AND if new → listingId set to created public_listings.id
- AND if duplicate → listingId set to existing listing's id

### AC9: Admin guard
- GIVEN non-admin user calls /api/admin/import
- THEN 403 Forbidden

### AC10: Tests
- dedup.service.spec.ts — hash computation, exact match, fuzzy match, no match
- import.service.spec.ts — CSV parse, JSON parse, dedup integration
- admin.import.controller.spec.ts — endpoint guard, CSV/JSON accept

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-2 Single Mutation Path | Import qua ImportService → Drizzle |
| AD-8 No PII plaintext | Phone sha256 hashed with salt |
| AD-9 Lifecycle | Imported listings start as PENDING (admin approve) |

## Edge Cases
- E1: Empty CSV → 400 "File rỗng"
- E2: CSV missing required columns → 400 "Thiếu cột: title, price, ..."
- E3: 1000+ rows → process in batches of 100
- E4: Phone with country code (+84) → normalize to 0xxxxxxxxx before hash
- E5: Title with special chars → unaccent + lower before hash
- E6: Price = 0 → still valid (land gift edge case)
- E7: Fuzzy match: same title diff district → NOT duplicate (location matters)

## Dev Notes
- pg_trgm similarity() already available (Story 1.5)
- unaccent extension already installed
- Admin guard pattern from existing admin module
- CSV parse: use papaparse (add dependency) OR simple split (no dep)
- Import creates listings as PENDING (admin must approve — AD-9)
