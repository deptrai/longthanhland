# Code Review — Story 5.1: XactionModule + Provider Pattern + cross_posts table

- **Story key:** 5-1-xaction-module-provider-pattern-cross-posts
- **Agent:** code-reviewer (adversarial)
- **Ngày:** 2026-06-27
- **Verdict:** **CHANGES REQUESTED**

## Verify đã chạy (không tin log dev)

| Check | Kết quả |
|-------|---------|
| `tsc --noEmit` (apps/api) | PASS (exit 0) |
| `eslint src/xaction src/marketplace/marketplace.service.ts` | PASS (exit 0) |
| `jest src/xaction` | PASS — 33/33 test |
| `jest src/marketplace` | PASS — 41/41 test (không phá story 3.x) |
| Integration `xaction.e2e-spec.ts` | **KHÔNG TỒN TẠI** (AC10b chưa giao) |
| `app.module.ts` import XactionModule | OK (dòng 20, 66) |
| Schema barrel export cross-posts | OK (index.ts:16) |

---

## Findings

### CRITICAL (block release)
Không có finding critical (app boot OK, không crash, không lộ secret credential).

### HIGH (fix before done)

- **[H1] IDOR — `GET /xaction/cross-posts` KHÔNG kiểm ownership.**
  `xaction.controller.ts:106-118`. Bất kỳ user đăng nhập nào cũng list được cross-posts (kèm `externalUrl`, `providerJobId`, `status`, `errorMessage`) của **bất kỳ** listing chỉ bằng `listingId`. Dev tự thừa nhận skip trong comment (dòng 113-116). Vi phạm **AC7** ("validate ownership → return CrossPost[]") và **E6**. Đây là rò rỉ dữ liệu cross-platform giữa các seller.
  **Fix:** fetch listing theo `listingId`, verify `listing.sellerId === req.user.id` (hoặc admin) trước khi trả; sai → `403 Forbidden`. (Service `listCrossPosts` cần nhận `sellerId` hoặc controller tự check qua listing.)

- **[H2] Promote chôn lỗi ownership (403) và validation (400) vào `errors[]` rồi trả 202.**
  `xaction.controller.ts:88-100`. Vòng lặp catch MỌI exception per-platform → push vào `errors[]` → luôn return `202 Accepted`. Hệ quả: promote listing không thuộc seller (**E6** → đáng lẽ 403), promote tin non-PUBLISHED (**E2** → đáng lẽ 400), promote platform chưa enabled (**E5** → đáng lẽ 400) đều trả **202** với lỗi bị chôn. Trả 202 cho request unauthorized là sai về bảo mật (mất tín hiệu từ chối) và vi phạm **AC9**. Comment dòng 82-83 còn nói "fast-fail cho toàn bộ" nhưng code KHÔNG hề fast-fail (comment sai + lẫn ký tự CJK "但仍").
  **Fix:** validate request-level MỘT LẦN trước vòng lặp — listing tồn tại + ownership + PUBLISHED → throw 403/400 thật. Chỉ lỗi *per-platform* (duplicate, platform disabled) mới gom vào `errors[]` (AD-3 independent failure).

- **[H3] AD-9 thủng: hard-delete listing KHÔNG gỡ cross-post ngoài → orphan vĩnh viễn.**
  `marketplace.service.ts:198-216` (`deleteListing`) chạy `DELETE` cứng. FK `ON DELETE CASCADE` xóa sạch row `cross_posts` **trước khi** có job removal nào được enqueue → bài trên FB/Chợ Tốt/Zalo còn sống mãi mãi. Đây đúng là kịch bản "orphan trên platform ngoài" mà story muốn chặn. **AC5/AD-9 liệt kê rõ DELETED** trong nhóm trigger removal, nhưng `transitionStatus` chỉ xử lý `['REJECTED','SOLD','EXPIRED']` và `deleteListing` hoàn toàn không gọi `removeActiveCrossPosts`. Lưu ý: kể cả enqueue trước khi delete, `processRemove` query row → not found (đã cascade) → graceful skip (E7) → KHÔNG gọi `provider.removePost`. Cần xử lý riêng cho luồng delete.
  **Fix:** trong `deleteListing`, gỡ active cross-posts (best-effort) TRƯỚC khi DELETE, và đảm bảo job remove luồng-delete mang đủ data (externalUrl/providerJobId) để provider gỡ được mà không phụ thuộc row DB; hoặc soft-delete + lifecycle removal.

### MEDIUM (should fix)

- **[M1] E4 concurrent duplicate KHÔNG map sang 409 + rò rỉ raw PG error.**
  `promotion.service.ts:102-111`. Insert không có try/catch. Khi race (2 request qua được service-check), 1 insert ném lỗi unique violation Postgres (code 23505) thô → propagate → controller chôn vào `errors[].message` với chuỗi `duplicate key value violates unique constraint "idx_cross_posts_listing_platform"` (rò rỉ tên constraint cho client). Spec E4 yêu cầu map sang `ConflictException`.
  **Fix:** try/catch quanh insert, bắt code `23505` → `ConflictException('Tin đã quảng bá trên nền tảng này')`.

- **[M2] E8 Redis-down: status code lệch spec + lộ raw error.**
  `promotion.service.ts:115-124`. Insert row pending rồi `queue.add`; nếu Redis down, `queue.add` ném → (luồng promote) bị chôn vào `errors[]` trả 202, KHÔNG phải 500/503 "Hệ thống quảng bá tạm không khả dụng" như spec E8. Row pending thì đúng spec, nhưng status + message chưa đạt.
  **Fix:** phân biệt lỗi hạ tầng (enqueue fail) → trả 503 với message an toàn, không lộ chi tiết.

- **[M3] Migration KHÔNG idempotent đầy đủ (vi phạm AC2 "chạy 2 lần không lỗi").**
  `0013_cross_posts.sql:41-50`. Enum (`DO $$ EXCEPTION`), table + index (`IF NOT EXISTS`) đã guard, nhưng `CREATE POLICY` (dòng 42, 45) là bare statement — chạy lại trực tiếp file SQL → lỗi `42710 policy already exists`. Migration `0004_listings_bucket.sql` đã có mẫu đúng (check `pg_policies` trong `DO $$ ... IF NOT EXISTS`).
  **Fix:** bọc 2 `CREATE POLICY` theo mẫu `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_policies ...)`. (Lưu ý: drizzle journal chặn re-run qua `db:migrate`, nhưng AC2 verify yêu cầu idempotent ở mức SQL.)

- **[M4] AC10b — integration test `xaction.e2e-spec.ts` CHƯA giao.**
  Không tồn tại file nào. Test Plan + AC10b bắt buộc (env-guard skip nếu Redis không reach). Các edge E4 (concurrent), E8 (Redis down), E9 (multi-platform partial) chỉ định test ở integration đều thiếu. Chỉ có 33 unit test.

- **[M5] AC5 — trigger AD-9 KHÔNG được assert trong test.**
  `marketplace.delete-status.spec.ts` mock `removeActiveCrossPosts` nhưng test `markAsSold` (dòng 211-215) chỉ assert `status==='SOLD'`, KHÔNG assert `removeActiveCrossPosts` được gọi. AC5 verify yêu cầu rõ "transition PUBLISHED→SOLD → assert removeCrossPost called". Việc "transition kích hoạt removal" hiện không test ở đâu (chỉ test method độc lập trong promotion.service.spec).

### LOW (nice to have)

- **[L1]** `stub.provider.ts:21` — `platform` hardcode `'facebook'`. Registry map cả `cho_tot`/`zalo` → cùng instance stub → `getProvider('zalo').platform === 'facebook'` (sai). Vô hại ở 5.1 (processor không đọc `provider.platform`), cần sửa khi có provider thật 5.x.
- **[L2]** `xaction.controller.ts:83` — comment lẫn ký tự CJK "但仍" + mô tả sai hành vi (nói fast-fail nhưng code không fast-fail).
- **[L3]** Validation không nhất quán: `promote` dùng Zod, `listCrossPosts` dùng regex UUID inline (`xaction.controller.ts:110`). Nên thống nhất.
- **[L4]** `removeCrossPost` khi status không active → return im lặng (service.ts:163-169), controller vẫn trả 202 "removal enqueued" dù không enqueue gì — semantics dễ gây hiểu nhầm.

---

## AC Coverage

| AC | Kết quả | Ghi chú |
|----|---------|---------|
| AC1 — IPromotionProvider interface + stub | **PASS** | Interface đủ 3 method, StubProvider implement, compile OK |
| AC2 — cross_posts schema + migration | **PARTIAL** | Schema + index + FK CASCADE đúng; migration idempotency thiếu policy (M3) |
| AC3 — XactionModule | **PASS** | registerQueue('cross-post'), exports chỉ PromotionService, app boot OK |
| AC4 — BullMQ queue retry 3x backoff | **PASS** | attempts=3 + exponential delay 5000, last-attempt → terminal status, không await job |
| AC5 — Lifecycle removal (AD-9) | **PARTIAL/FAIL** | REJECTED/SOLD/EXPIRED non-blocking OK; **DELETED thiếu (H3)**; trigger không test (M5) |
| AC6 — PromotionService | **PASS** | create/remove/list/removeActive đầy đủ, validate PUBLISHED/duplicate/ownership |
| AC7 — API endpoints | **FAIL** | GET thiếu ownership (H1); promote chôn 403/400 trả 202 (H2) |
| AC8 — ProviderRegistry config-based | **PASS** | parse config, enable/disable, getProvider throw, tested kỹ |
| AC9 — Validation/edge enforcement | **PARTIAL/FAIL** | service throw đúng exception nhưng controller promote chôn (H2); E4 không map 409 (M1) |
| AC10 — Test tự động | **PARTIAL** | 33 unit PASS; integration thiếu (M4); AD-9 trigger không assert (M5); CI gate (tsc/eslint) PASS |

## Edge Case Coverage

| Edge | Kết quả | Ghi chú |
|------|---------|---------|
| E1 — Duplicate (unique idx + service check) | **PASS** | Tested, cho promote lại khi failed/removed |
| E2 — Promote non-PUBLISHED → 400 | **PARTIAL** | Service throw 400 (tested) nhưng promote trả 202 (H2) |
| E3 — Removal fail → removal_failed | **PASS** | Tested last-attempt → removal_failed + errorMessage |
| E4 — Concurrent → 409 | **FAIL** | Không map unique-violation → 409 + rò rỉ raw PG error (M1); không test |
| E5 — Provider không enabled → 400 | **PARTIAL** | Registry throw (tested) nhưng promote trả 202 (H2) |
| E6 — Ownership 403 | **FAIL/PARTIAL** | GET không check (H1); promote trả 202 không 403 (H2); DELETE PASS |
| E7 — Job khi listing đã xóa → graceful skip | **PASS** | Tested post + remove not-found → skip (nhưng liên quan H3) |
| E8 — Redis down → 500 + row pending | **PARTIAL** | Row pending OK; nhưng trả 202 không 500 + lộ error (M2); không test |
| E9 — Multi-platform 1 fail → partial | **PASS** | Thiết kế errors[] hoạt động cho duplicate; thiếu integration test |
| E10 — Stub provider interface đúng | **PASS** | OK; caveat platform hardcode (L1) |

---

## Bảng verify Invariant AD

| AD | Kết quả | Ghi chú |
|----|---------|---------|
| AD-1 Module Isolation | PASS | xaction module riêng, export chỉ PromotionService, không circular |
| AD-2 Single Mutation Path | PASS | Mọi mutation qua PromotionService/processor → Drizzle; RLS chặn anon write |
| AD-3 Xaction External Service | PASS | Async BullMQ, không await job, retry 3x backoff, provider config-based, independent failure |
| AD-8 PII/secret | PARTIAL | cross_posts không lưu PII; nhưng raw PG error có thể lộ ra client (M1) — không phải credential |
| AD-9 Cross-Post Lifecycle | **FAIL** | DELETED không gỡ → orphan (H3); status phản ánh thực OK cho post/remove |

---

## Kết luận + Recommendation

**Verdict: CHANGES REQUESTED.** Foundation (interface, schema, module, queue, processor, registry) chắc; 33 unit test pass, build/lint/typecheck PASS, không phá story 3.x. Tuy nhiên có **3 HIGH** phải fix trước khi Done:

1. **H1** — thêm ownership check cho `GET /xaction/cross-posts` (IDOR).
2. **H2** — validate request-level (ownership/PUBLISHED) trước vòng lặp promote, trả 403/400 thật; chỉ lỗi per-platform mới vào `errors[]`.
3. **H3** — gỡ cross-post ngoài khi hard-delete listing (AD-9 orphan).

Và nên fix MEDIUM trước khi gọi e2e: **M1** (map 409 + chặn rò rỉ raw PG error), **M3** (migration idempotent policy), **M4** (viết `xaction.e2e-spec.ts`), **M5** (assert AD-9 trigger). M2 có thể chấp nhận tạm nếu document.

Recommend: trả về story-developer fix H1/H2/H3 + M1/M3/M4/M5, sau đó re-review rồi mới chuyển e2e-tester.
