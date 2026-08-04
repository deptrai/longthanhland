# Re-Review — Story 5.1 (Round 2)

- **Story key:** 5-1-xaction-module-provider-pattern-cross-posts
- **Agent:** code-reviewer (adversarial)
- **Ngày:** 2026-06-27
- **Round:** 2 (sau fix 3 HIGH + 4 MEDIUM)

## Verdict: **APPROVED**

3/3 HIGH + 4/4 MEDIUM đã FIXED và verify thật (đọc code + chạy typecheck/test/lint).
Không phát sinh finding critical/high mới. 1 finding LOW mới (lint error ngoài
phạm vi story — không phải lỗi 5.1, xem bên dưới).

---

## Previous findings status

### HIGH

- **H1 (IDOR — GET cross-posts không check ownership): FIXED**
  - `promotion.service.ts:258-275` — `listCrossPosts(listingId, sellerId)` nay fetch listing,
    throw `NotFoundException` (404) nếu không tồn tại, `ForbiddenException` (403) nếu
    `listing.sellerId !== sellerId`. Chỉ trả `crossPosts` sau khi pass ownership.
  - `xaction.controller.ts:117-128` — controller truyền `user.id` vào service.
  - Evidence test: `test/xaction.e2e-spec.ts:201-206` (non-owner → 403),
    `:240-244` (no token → 401), `:247-252` (invalid UUID → 400).

- **H2 (Promote chôn lỗi 403/400 vào errors[] rồi trả 202): FIXED**
  - `promotion.service.ts:65-90` — `validatePromoteRequest()` mới: validate mọi platform
    enabled (E5, `registry.getProvider` throw), listing tồn tại (404), ownership (403),
    PUBLISHED (400) — **fail-fast TRƯỚC vòng lặp**, throw thật.
  - `xaction.controller.ts:88` gọi `validatePromoteRequest` trước loop;
    `:94-108` loop **chỉ** catch `ConflictException` (duplicate 409) → `errors[]`,
    mọi exception khác `throw` (propagate → status đúng). Comment CJK rác cũ đã được dọn.
  - Evidence test: `xaction.e2e-spec.ts:209-215` (non-owner → 403, KHÔNG 202),
    `:218-228` (duplicate → 202 + errors[] chứa 409, crossPosts=0, enqueued=0).

- **H3 (AD-9 hard-delete không gỡ cross-post ngoài → orphan): FIXED**
  - `marketplace.service.ts:213-231` — `deleteListing` nay `await removeActiveCrossPosts(listingId)`
    TRƯỚC `db.delete` (dòng 233). Best-effort: lỗi enqueue → catch + warn, KHÔNG block delete.
  - `cross-post.processor.ts:161-228` — `processRemove` xử lý row-gone + job-data case:
    nếu row đã cascade-deleted NHƯNG job mang `externalUrl`/`providerJobId` → vẫn gọi
    `provider.removePost()` (dòng 170-192). Nếu row gone + không có data → graceful skip (E7).
    Update status `removed`/`removal_failed` affects 0 rows khi row đã xóa (OK).
  - Hành vi pending-row (chưa post, externalUrl null) → enqueue remove → processor skip
    (đúng: chưa có bài ngoài để gỡ).
  - Evidence test: `marketplace.delete-status.spec.ts:244-249` (deleteListing owner → 
    removeActiveCrossPosts called BEFORE delete), `:252-258` (wrong seller → 403, NOT called),
    `cross-post.processor.spec.ts` (removal_failed last-attempt PASS).

### MEDIUM

- **M1 (E4 concurrent duplicate không map 409 + rò rỉ raw PG error): FIXED**
  - `promotion.service.ts:23-29` — helper `isUniqueViolation()` check PG code `23505`
    (+ fallback regex message). `:158-174` insert wrapped trong try/catch → unique violation
    map sang `ConflictException('Tin đã quảng bá trên nền tảng này')` (KHÔNG lộ constraint name).

- **M3 (Migration CREATE POLICY không idempotent): FIXED**
  - `0013_cross_posts.sql:44-51` + `:53-63` — cả 2 `CREATE POLICY` bọc trong
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE ... policyname=...) THEN ... END IF; END $$;`.
    Chạy lại file → không lỗi `42710`. Enum + table + index đã guard từ trước.

- **M4 (Integration test xaction.e2e-spec.ts chưa giao): FIXED**
  - `test/xaction.e2e-spec.ts` (253 dòng) đã tạo. Env guard SYNC `describe.skip` nếu
    Redis (`redis-cli ping`) hoặc Supabase local không reach (`:27-52`) — không fail CI.
    Bao phủ: promote 202 (AC10b), list owner, H1 non-owner 403, H2 non-owner 403,
    E9 duplicate 202+errors, DELETE 202, no-token 401, invalid UUID 400. Teardown sạch (`:152-172`).

- **M5 (AC5 trigger AD-9 không được assert): FIXED**
  - `marketplace.delete-status.spec.ts:226-233` (markAsSold PUBLISHED→SOLD → assert
    `removeActiveCrossPosts` called với listingId), `:236-241` (rejectListing PENDING→REJECTED
    → assert called), `:244-249` (deleteListing → assert called before delete),
    `:252-258` (wrong seller → NOT called). Dùng `setImmediate` flush microtask cho luồng
    non-blocking `.then/.catch`.

**M2 (E8 Redis-down status 503 + message an toàn):** vẫn ở trạng thái cũ (không nằm trong
batch fix — leader đã chấp nhận tạm). Không phải HIGH, không block. Khuyến nghị document.

---

## New findings

### LOW

- **[L-new1] Lint gate toàn package FAIL do file ngoài story 5.1.**
  `apps/api/src/admin/admin.list-users.spec.ts:36` — `'findUserSelect' is defined but never used`
  (`@typescript-eslint/no-unused-vars`). File này thuộc story admin khác (untracked), KHÔNG phải
  5.1. Tất cả file 5.1 (`src/xaction/**`, `marketplace.service.ts`, `marketplace.delete-status.spec.ts`,
  `test/xaction.e2e-spec.ts`) lint **PASS exit 0** khi chạy riêng. Tuy nhiên `yarn lint` cấp package
  fail → CI gate có thể đỏ. **Khuyến nghị leader:** xoá biến `findUserSelect` thừa (1 dòng) ở admin spec
  trước khi e2e — không thuộc trách nhiệm 5.1 nhưng chặn gate chung.

(Các LOW cũ L1 stub.platform hardcode, L3 validation regex vs Zod, L4 silent return —
vẫn tồn tại, non-blocking, không cần fix ở 5.1.)

---

## Verification results (tự chạy — không tin log dev)

| Check | Lệnh | Kết quả |
|-------|------|---------|
| typecheck | `yarn workspace @bdsai/api run typecheck` | **PASS** (exit 0) |
| unit tests | `yarn workspace @bdsai/api run test` | **PASS — 245/245** (27 suites) |
| lint (5.1 files) | `eslint src/xaction marketplace.service.ts ... test/xaction.e2e-spec.ts` | **PASS** (exit 0) |
| lint (toàn package) | `yarn workspace @bdsai/api run lint` | **FAIL** — 1 error ở admin spec ngoài 5.1 (L-new1) |

- typecheck: **PASS**
- tests: **245/245 pass** (gồm `promotion.service.spec`, `cross-post.processor.spec`,
  `provider-registry.spec`, `marketplace.delete-status.spec` với M5/H3 assertions)

---

## AC / Invariant re-check (các mục từng FAIL/PARTIAL ở round 1)

| Mục | Round 1 | Round 2 |
|-----|---------|---------|
| AC5 — Lifecycle removal (AD-9) DELETED | PARTIAL/FAIL (H3) | **PASS** — deleteListing gỡ trước delete + processor row-gone case |
| AC7 — API endpoints ownership | FAIL (H1, H2) | **PASS** — GET check ownership; promote fail-fast 403/400 |
| AC9 — Validation/edge | PARTIAL/FAIL (H2, M1) | **PASS** — validate request-level; E4 map 409 |
| AC2 — Migration idempotent | PARTIAL (M3) | **PASS** — policy bọc IF NOT EXISTS |
| AC10b — Integration test | FAIL (M4) | **PASS** — e2e-spec env-guarded delivered |
| E4 — Concurrent → 409 | FAIL (M1) | **PASS** — isUniqueViolation → ConflictException |
| E6 — Ownership 403 | FAIL/PARTIAL (H1/H2) | **PASS** |
| AD-9 — Cross-Post Lifecycle | FAIL (H3) | **PASS** |

---

## Recommendation

**APPROVED.** Cả 3 HIGH + 4 MEDIUM trong batch đã fix đúng và verify thật (typecheck PASS,
245/245 unit test PASS, lint 5.1 files clean). Logic H1/H2/H3 chắc, có test đối ứng (e2e +
unit) chứng minh hành vi 403/409/AD-9. Có thể chuyển sang **e2e-tester** (real Redis + Supabase)
để chạy `xaction.e2e-spec.ts` thật.

**Lưu ý trước khi e2e:** xoá biến thừa `findUserSelect` ở `admin.list-users.spec.ts:36` (L-new1)
để `yarn lint` cấp package xanh — không thuộc 5.1 nhưng chặn CI gate chung. M2 (Redis-down 503)
nên được document là known-gap nếu chưa fix.
