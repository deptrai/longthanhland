# Code Review — Story 1.5: Vietnamese Full-Text Search setup

- **Story key:** `1-5-vietnamese-full-text-search`
- **Agent:** code-reviewer (opus)
- **Ngày:** 2026-06-26
- **Verdict:** **APPROVED** (0 critical / 0 high / 4 low — tất cả non-blocking)
- **Baseline commit:** `307a4a4959`

## Tóm tắt

Review adversarial code Story 1.5 — migration Drizzle 0000 đầu tiên bật extension `unaccent` + `pg_trgm` + 2 SQL function IMMUTABLE (`f_unaccent_to_tsvector`, `f_unaccent_query`) cho FTS tiếng Việt. Đã tự đọc toàn bộ code thật (migration SQL, snapshot, journal, test file, schema barrel), tự chạy CI gate (build/lint/typecheck/test unit) — PASS. Không re-run e2e trên DB thật vì Supabase bdsai đã stop sau teardown của dev (e2e-tester sẽ verify ở trạm sau).

Migration SQL đúng cú pháp, idempotent, function IMMUTABLE thật sự (unaccent + lower + to_tsvector/plainto_tsquery với regconfig đều immutable). Quyết định dùng `plainto_tsquery` thay `to_tsquery` là **đúng** — `to_tsquery` reject plain text `"long thanh"` (có space, thiếu `&`), `plainto_tsquery` auto-AND → thỏa AC3. Không SQL injection (text param truyền thẳng vào built-in, không concat string). 0 bảng nghiệp vụ (schema barrel vẫn `export {}`, migration chỉ extension + function).

## Findings

### LOW-1 — Header comment test file sai lệch với implementation thật
- **File:line:** `bdsai/apps/api/test/vietnamese-fts.e2e-spec.ts:17-18`
- **Mô tả:** Comment header ghi "Test dùng TEMP TABLE (session-scoped, tự drop khi connection end) — KHÔNG tạo bảng nghiệp vụ persist (AC6)". Nhưng test AC3 (line 96-124) thực tế dùng **regular table** `fts_test` (CREATE TABLE + DROP TABLE IF EXISTS trong try/finally), KHÔNG phải TEMP TABLE. Dev log (line 185) giải thích lý do kỹ thuật: postgres.js `prepare:false` dùng connection khác nhau cho mỗi `db.execute` → TEMP table (session-scoped) không persist qua calls → phải dùng regular table + cleanup. Code đúng, chỉ comment header stale/misleading.
- **Cách sửa:** Đổi comment line 17-18 thành: `Test dùng regular table fts_test (CREATE + DROP trong try/finally) — KHÔNG persist (AC6). (postgres.js prepare:false dùng connection khác nhau cho mỗi db.execute → TEMP table session-scoped không persist qua calls → dùng regular table + cleanup try/finally.)`
- **Severity:** LOW (documentation drift, không ảnh hưởng correctness).

### LOW-2 — Số test case trong file e2e là 9, không phải 12
- **File:line:** `bdsai/apps/api/test/vietnamese-fts.e2e-spec.ts` (toàn file)
- **Mô tả:** File có 9 `it()` block (AC1, AC2×3, AC3, AC4, edge, AC5, AC6). Dev log line 152 ghi "Tests: 12 passed, 12 total" — đây là **tổng 3 suite e2e** (app.e2e + health.e2e + vietnamese-fts.e2e), không phải 12 test trong file này. Dev log honest (ghi rõ 3 suite), nhưng leader prompt ghi "12 test case" cho file này là hiểu nhầm. Coverage đầy đủ cho AC1–AC6 + edge case (query rỗng). AC7 + AC8 là meta (comment + test framework), không cần test case riêng.
- **Cách sửa:** Không cần sửa code. Note cho leader: file này 9 test, tổng e2e 12 (gồm app + health).
- **Severity:** LOW (informational, không defect).

### LOW-3 — AC6 test fragile: assert public tables = 0 sẽ break khi Story 3.1 thêm bảng
- **File:line:** `bdsai/apps/api/test/vietnamese-fts.e2e-spec.ts:166-171`
- **Mô tả:** Test AC6 assert `SELECT tablename FROM pg_tables WHERE schemaname='public'` trả `toHaveLength(0)`. Đúng cho Story 1.5 (schema rỗng, migration chỉ extension+function). Nhưng khi Story 3.1 tạo `public_listings` (và Story 2.1 `public_users`), test này sẽ FAIL vì public schema có bảng nghiệp vụ. Test scoped cho invariant Story 1.5 — đúng lúc này, nhưng sẽ cần update/remove khi story sau thêm bảng.
- **Cách sửa:** Không sửa ngay. Ghi TODO trong test: `// NOTE: test này scoped cho Story 1.5 (schema rỗng). Khi Story 2.1/3.1 thêm bảng public_users/public_listings, update assertion (VD: expect không chứa fts_test) thay vì expect 0 table.` Hoặc chuyển sang assert `fts_test` không tồn tại sau teardown (scoped hơn).
- **Severity:** LOW (future-tech-debt, không block Story 1.5).

### LOW-4 — AC5 test không chạy migrate 2 lần thật, chỉ verify không duplicate hash
- **File:line:** `bdsai/apps/api/test/vietnamese-fts.e2e-spec.ts:152-163`
- **Mô tả:** Test AC5 kiểm `drizzle.__drizzle_migrations` không có duplicate hash (`GROUP BY hash HAVING count(*) > 1` = 0) + `count >= 1`. Không spawn `yarn db:migrate` 2 lần trong test. Story AC8 (line 35) cho phép: "test idempotent (AC5): migration apply 2 lần không lỗi (có thể skip nếu Drizzle journal đã handle — Drizzle track migration đã apply trong `__drizzle_migrations`, chạy lại skip tự động)". Nên acceptable per story. Dev log (line 120-126) đã chạy `yarn db:migrate` 2 lần thật ngoài test → verify thủ công. Test tự động chỉ verify indirect (no duplicate).
- **Cách sửa:** Không bắt buộc. Nếu muốn mạnh hơn: thêm test spawn `yarn db:migrate` qua child_process + assert exit 0 — nhưng tăng complexity + dependency CI. Giữ hiện tại OK.
- **Severity:** LOW (verification indirect, story cho phép).

## Bảng verify AC1–AC8

| AC | Mô tả | Status | Verify (code review) |
|----|-------|--------|----------------------|
| AC1 | Extension unaccent + pg_trgm bật (Supabase PG15) | PASS | `0000_vietnamese_fts.sql:19-20` — `CREATE EXTENSION IF NOT EXISTS unaccent;` + `pg_trgm;`. Idempotent. Dev log psql verify 2 rows (line 62-69). |
| AC2 | f_unaccent_to_tsvector + f_unaccent_query IMMUTABLE | PASS | `0000_vietnamese_fts.sql:40-46, 61-66` — `LANGUAGE sql IMMUTABLE`, `RETURNS tsvector`/`RETURNS tsquery`. `unaccent(lower(input))` + `to_tsvector('simple',...)` / `plainto_tsquery('simple',...)` — tất cả immutable built-in → function immutable. Dev log psql `provolatile='i'` (line 76-82). |
| AC3 | "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền" | PASS | Test `e2e-spec.ts:96-124` — 3 query `@@` match, assert contain. Dev log psql `t/t/t` (line 103-107). `plainto_tsquery` auto-AND plain text → match 2 token. |
| AC4 | pg_trgm similarity > 0 + operator `%` | PASS | Test `e2e-spec.ts:127-141` — `set_limit(0.3)` + `similarity(...) > 0` + `% operator = true`. Dev log sim=1 (line 114). |
| AC5 | Migration idempotent | PASS | SQL: `CREATE EXTENSION IF NOT EXISTS` + `CREATE OR REPLACE FUNCTION`. Journal entry đúng format (idx 0, tag 0000_vietnamese_fts). Test LOW-4 verify indirect. Dev log migrate run 2+3 exit 0 (line 120-126). |
| AC6 | Không phá 1.1-1.4, 0 bảng nghiệp vụ | PASS | CI gate tự chạy: build 3/3, lint 4/4, typecheck 4/4, test unit 3/3 — EXIT 0. `schema/index.ts` vẫn `export {}`. Migration chỉ extension+function (0 CREATE TABLE). Test AC6 assert public tables=0. |
| AC7 | Comment giới hạn ranking + Deferred ES | PASS | `0000_vietnamese_fts.sql:29-39` — comment giải thích simple config tách 2 token, ts_rank yếu với từ ghép, pg_trgm fallback hạn chế, ES DEFERRED trigger = user complaint, tham chiếu ARCHITECTURE-SPINE.md. Verify ARCHITECTURE-SPINE.md row "Search engine (Elasticsearch)" khớp nội dung. |
| AC8 | Test tự động (integration e2e) | PASS | `vietnamese-fts.e2e-spec.ts` 9 test case (AC1, AC2×3, AC3, AC4, edge, AC5, AC6). Dùng `DRIZZLE` token + AppModule + DB thật. `jest.setTimeout(120_000)` cold-start. Cleanup try/finally. Dev log e2e 12/12 PASS (3 suite). |

## Bảng verify invariant AD

| Invariant | Status | Verify |
|-----------|--------|--------|
| AD-1 (Module Isolation) | PASS | Story 1.5 chỉ DDL (extension + SQL function ở DB layer). KHÔNG tạo SearchModule/SearchService/NestJS business logic. `schema/index.ts` không đụng. Search service thật ở Story 3.3. |
| AD-2 (Single Data Mutation Path) | PASS | Migration chỉ DDL (CREATE EXTENSION + CREATE FUNCTION), không insert/update/delete nghiệp vụ. Test insert dùng regular table `fts_test` CREATE+DROP try/finally (không persist). Không thêm mutation path NestJS. |
| NFR8 (Vietnamese search có dấu/không dấu) | PASS | `unaccent(lower(input))` bỏ dấu → "Long Thành"→"long thanh", "Căn hộ"→"can ho". Query side `plainto_tsquery` plain text match. Test AC3 verify 3 case. |

## SQL correctness (CRITICAL check)

| Check | Status | Verify |
|-------|--------|--------|
| Function IMMUTABLE thật | PASS | `unaccent(text)` IMMUTABLE + `lower(text)` IMMUTABLE + `to_tsvector(regconfig,text)` IMMUTABLE + `plainto_tsquery(regconfig,text)` IMMUTABLE → composite `LANGUAGE sql IMMUTABLE` đúng. Dev log psql `provolatile='i'` confirm. |
| `CREATE EXTENSION IF NOT EXISTS` | PASS | Line 19-20. Idempotent. |
| `plainto_tsquery` vs `to_tsquery` | PASS | `plainto_tsquery` đúng cho plain text (`"long thanh"` auto-AND). `to_tsquery` reject space → syntax error. Dev đổi đúng, rationale ghi trong SQL comment line 49-58. |
| Function signature + return type | PASS | `f_unaccent_to_tsvector(input text) RETURNS tsvector`, `f_unaccent_query(input text) RETURNS tsquery`. |
| SQL injection | PASS | Function dùng text param truyền thẳng vào built-in (unaccent/lower/to_tsvector/plainto_tsquery), KHÔNG concat string, KHÔNG dynamic SQL. Safe. |
| `unaccent()` usage | PASS | `unaccent(lower(input))` — `unaccent(text)` returns text (single-arg variant, default dictionary). Correct. |

## Migration correctness

| Check | Status | Verify |
|-------|--------|--------|
| Drizzle journal format | PASS | `_journal.json`: idx 0, version 7, when 1782406788242, tag "0000_vietnamese_fts", breakpoints true. Đúng format Drizzle 0.36. |
| Snapshot 0000 | PASS | `0000_snapshot.json`: tables/enums/schemas/views rỗng, prevId zero, id uuid. Đúng cho schema rỗng + custom migration. |
| SQL syntax | PASS | `CREATE EXTENSION`, `CREATE OR REPLACE FUNCTION ... LANGUAGE sql IMMUTABLE AS $$ ... $$` — hợp lệ PG15. |
| Idempotent | PASS | `IF NOT EXISTS` (extension) + `CREATE OR REPLACE` (function). Re-run không lỗi. |
| 0 bảng nghiệp vụ | PASS | Không có `CREATE TABLE` trong migration. Chỉ extension + function. |

## CI gate (tự chạy — AC6)

```
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test
```
- `yarn build` → Tasks: 3 successful, 3 total. EXIT 0.
- `yarn lint` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn typecheck` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn test` (unit) → Tasks: 3 successful, 3 total. EXIT 0.

→ KHÔNG phá Story 1.1-1.4. ✓

## Giới hạn review

- **Không re-run e2e trên DB thật:** Supabase bdsai đã stop sau teardown của dev (`supabase stop`, dev log line 176). Không start lại để tránh rủi ro + thời gian. E2e real-data verify là trách nhiệm e2e-tester agent (trạm sau). Code review verify static + CI gate + SQL correctness bằng đọc code.
- **Function IMMUTABLE:** Trust dev log psql output `provolatile='i'` (line 76-82). Static reasoning confirm (composite immutable built-in). E2e-tester có thể re-verify trên DB thật.

## Kết luận + recommendation

**APPROVED.** Code Story 1.5 đúng 8/8 AC, tuân invariant AD-1/AD-2/NFR8, SQL correct (IMMUTABLE thật, plainto_tsquery đúng choice, không injection), migration idempotent, 0 bảng nghiệp vụ, CI gate pass. 4 finding LOW đều non-blocking (3 documentation/verification + 1 future-tech-debt).

**Recommendation:**
1. Fix LOW-1 (stale TEMP TABLE comment) — trivial, có thể fix trong commit hoặc để story-developer polish.
2. LOW-3 (AC6 test fragile) — ghi TODO, update khi Story 2.1/3.1 thêm bảng.
3. LOW-2, LOW-4 — informational, không cần action.
4. Forward cho **e2e-tester** verify real-data: start Supabase bdsai → `yarn db:migrate` → `yarn test:e2e` → psql verify `provolatile='i'` + `@@` match + similarity. Confirm 12/12 e2e PASS trên DB thật.
