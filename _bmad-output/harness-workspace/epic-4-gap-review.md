# Epic 4 Gap Review — AI Intelligence Phase 1

## Story 4.1: AI Summary — GPT-4 phân tích tin đăng
- **Status:** MINOR GAP
- **Gaps:**
  - GAP-1 (MINOR): Model mismatch — AC specifies "GPT-4" but implementation uses `gpt-4o-mini`. File: `bdsai/apps/api/src/ai/ai.service.ts:15`. Suggested fix: Update AC to accept gpt-4o-mini (cost constraint AD-6).
  - GAP-2 (MINOR): No AI job re-enqueue on listing edit. File: `bdsai/apps/api/src/marketplace/marketplace.service.ts:117-157`. Suggested fix: Add AI job re-enqueue in updateListing() when PUBLISHED + content changes.
- **Implemented:**
  - GPT-4o-mini call with fallback to gpt-3.5-turbo
  - Rate limit ≤ 100 calls/hour (in-memory tracking)
  - Cache via contentHash (SHA-256)
  - Background job via BullMQ (ai-summary queue)
  - Graceful failure (returns null, listing still displays)
  - API endpoint: GET /ai/listings/:id
  - UI displays AI summary on listing detail page

## Story 4.2a: Trust Score Phase 1
- **Status:** MAJOR GAP
- **Gaps:**
  - GAP-1 (MAJOR): Trust score never calculated/saved — `computeTrustScore()` and `saveTrustScore()` exist but NEVER CALLED. File: `bdsai/apps/api/src/ai/ai.service.ts:155-233`. Suggested fix: Call in `approveListing()` after AI summary job enqueue.
  - GAP-2 (MAJOR): isEvaluating flag not exposed to API/UI — not saved to DB, not returned by GET /ai/listings/:id, not displayed in UI. Files: `bdsai/apps/api/src/ai/ai.service.ts:202`, `bdsai/apps/api/src/db/schema/ai-results.ts`, `bdsai/apps/web/app/listings/[id]/page.tsx:217-278`. Suggested fix: Add isEvaluating column, save in saveTrustScore(), return in API, display "Đang đánh giá" in UI.
  - GAP-3 (MAJOR): Trust score not recalculated on listing edit. File: `bdsai/apps/api/src/marketplace/marketplace.service.ts:117-157`. Suggested fix: Re-calculate in updateListing() when content fields change.
- **Implemented:**
  - computeTrustScore() with correct factors (phone_verified: 30, has_images: 20, legal_status: 15, etc.)
  - Score capped at 100
  - isEvaluating logic (score < 20 && !phoneVerified)
  - saveTrustScore() function exists
  - DB schema has trust_score and trust_score_factors columns
  - UI displays trust score progress bar
  - Disclaimer displayed

## Story 4.3: Smart Spam Filter
- **Status:** MAJOR GAP
- **Gaps:**
  - GAP-1 (MAJOR): No admin configuration for blacklist — hardcoded SPAM_KEYWORDS, no CRUD endpoints. File: `bdsai/apps/api/src/marketplace/moderation.service.ts:8-22`. Suggested fix: Create spam_keywords table + CRUD endpoints + admin UI.
  - GAP-2 (MAJOR): No admin configuration for heuristic thresholds — hardcoded thresholds. File: `bdsai/apps/api/src/marketplace/moderation.service.ts:58-90`. Suggested fix: Create spam_config table + PUT endpoint + admin UI.
  - GAP-3 (MAJOR): No admin override for false positives. File: `bdsai/apps/api/src/marketplace/moderation.service.ts`. Suggested fix: Add POST /marketplace/listings/:id/override-spam endpoint with audit log.
  - GAP-4 (MINOR): Rule-engine not modular for Epic 5 reuse. File: `bdsai/apps/api/src/marketplace/moderation.service.ts:50-96`. Suggested fix: Extract into SpamFilterService module.
- **Implemented:**
  - Keyword blacklist (hardcoded)
  - Heuristic rules: price anomaly, ALL CAPS, repeated text, suspicious URLs, multiple phones, no images + high price
  - Spam flags displayed in admin moderation queue
  - Spam reasons shown in UI tooltip
  - Unit tests for spam filter (12 test cases)

## Story 4.4: Hiển thị AI insights + disclaimer + appeal
- **Status:** MAJOR GAP
- **Gaps:**
  - GAP-1 (MAJOR): Appeal button is non-functional placeholder — shows alert only, no appeal_requests table, no API, no admin UI, no workflow. File: `bdsai/apps/web/app/listings/[id]/page.tsx:268-274`. Suggested fix: Create appeal_requests table + POST /ai/appeals + GET /admin/appeals + admin UI + update appeal button.
  - GAP-2 (MINOR): isEvaluating state not displayed in UI. File: `bdsai/apps/web/app/listings/[id]/page.tsx:237-256`. Suggested fix: Add conditional rendering for isEvaluating=true.
- **Implemented:**
  - AI insights block displayed on listing detail page
  - Graceful hide if no AI data
  - Disclaimer displayed
  - Trust score progress bar
  - AI summary text displayed
  - Appeal button exists (placeholder only)
  - SSR-compatible

## Summary
| Story | Status | # Gaps | Priority |
|-------|--------|--------|----------|
| 4.1 | MINOR GAP | 2 | LOW |
| 4.2a | MAJOR GAP | 3 | HIGH |
| 4.3 | MAJOR GAP | 4 | HIGH |
| 4.4 | MAJOR GAP | 2 | HIGH |
