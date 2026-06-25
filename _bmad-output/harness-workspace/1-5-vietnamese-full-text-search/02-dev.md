# Dev Log — Story 1.5: Vietnamese Full-Text Search setup

- **Story key:** `1-5-vietnamese-full-text-search`
- **Agent:** story-developer (opus)
- **Ngày:** 2026-06-26
- **Kết quả:** PASS (8/8 AC thỏa, real-data verify)
- **Baseline commit:** `307a4a4959`

## Tóm tắt

Implement Story 1.5 — setup Vietnamese Full-Text Search trên PostgreSQL 15 (Supabase local) qua Drizzle custom migration 0000. Migration bật 2 extension (`unaccent` + `pg_trgm`) + tạo 2 SQL function IMMUTABLE (`f_unaccent_to_tsvector`, `f_unaccent_query`) cho FTS tiếng Việt có dấu/không dấu. KHÔNG tạo bảng nghiệp vụ (AC6), KHÔNG thêm NestJS module (AD-1). Test e2e integration 12 case PASS trên DB thật.

## File tạo/sửa

**NEW:**
- `bdsai/apps/api/src/db/migrations/0000_vietnamese_fts.sql` — migration SQL: `CREATE EXTENSION IF NOT EXISTS unaccent/pg_trgm` + `CREATE OR REPLACE FUNCTION f_unaccent_to_tsvector/f_unaccent_query` (IMMUTABLE, LANGUAGE sql). Comment AC7 (giới hạn ranking từ ghép + Deferred ES, tham chiếu ARCHITECTURE-SPINE.md dòng 330).
- `bdsai/apps/api/src/db/migrations/meta/0000_snapshot.json` — Drizzle snapshot 0000 (sinh tự động bởi `drizzle-kit generate --custom`).
- `bdsai/apps/api/test/vietnamese-fts.e2e-spec.ts` — integration test 12 case (AC1-AC6 + edge case).

**UPDATE:**
- `bdsai/apps/api/src/db/migrations/meta/_journal.json` — thêm entry 0000 (sinh tự động bởi `drizzle-kit generate --custom`).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status `1-5-vietnamese-full-text-search: ready-for-dev → review`.

**KHÔNG ĐỔI:**
- `bdsai/apps/api/src/db/schema/index.ts` — vẫn `export {}` (AC6, không bảng nghiệp vụ).
- `drizzle.config.ts`, `database.module.ts`, `database.tokens.ts` — không đụng.

## Quyết định kiến trúc nhỏ (dev resolve)

1. **Drizzle custom migration mechanism:** `drizzle-kit generate --custom --name vietnamese_fts` hoạt động với schema rỗng — sinh file `0000_vietnamese_fts.sql` (empty placeholder) + tự cập nhật `_journal.json` (entry idx 0) + `0000_snapshot.json`. Rủi ro kỹ thuật chính của story (LOW-5) đã giải: KHÔNG cần viết journal/snapshot thủ công. Dev chỉ fill SQL vào file placeholder.

2. **`plainto_tsquery` thay `to_tsquery` cho `f_unaccent_query`:** Story AC2 gốc ghi `to_tsquery('simple', unaccent(lower(input)))`. Nhưng `to_tsquery` yêu cầu cú pháp toán tử (`'long & thanh'`) → plain text `"long thanh"` (có space, không `&`) syntax error. AC3 test yêu cầu plain text `"long thanh"` match `"Long Thành"`. Dev Notes của chính story flag giới hạn này ("to_tsquery yêu cầu cú pháp hợp lệ... Input user cần sanitize ở app layer"). Quyết định: dùng `plainto_tsquery('simple', text)` — auto-parse plain text thành AND query (`"long thanh" → 'long' & 'thanh'`), IMMUTABLE (provolatile='i' với regconfig, verified qua `pg_proc`). Loại bỏ nhu cầu sanitize cú pháp ở app layer (Story 3.3 chỉ truyền plain text). Thỏa ý đồ AC2 (tsquery không dấu) + AC3 (plain text match). Ghi rõ rationale trong SQL comment.

## Lệnh đã chạy + output thật

### 1. CI gate (AC6 — không phá 1.1-1.4)
```
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test
```
- `yarn build` → Tasks: 3 successful, 3 total (web/api/shared). EXIT 0.
- `yarn lint` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn typecheck` → Tasks: 4 successful, 4 total. EXIT 0.
- `yarn test` (unit) → @bdsai/api: 11 passed (2 suites). Tasks: 3 successful. EXIT 0.

### 2. Start Supabase local
```
cd bdsai && supabase start --ignore-health-check
```
→ Started. DB URL `postgresql://postgres:postgres@127.0.0.1:54352/postgres`. Studio 54353. EXIT 0.

### 3. Run migration thật
```
cd bdsai/apps/api && yarn db:migrate
```
→ `[✓] migrations applied successfully!` EXIT 0. (NOTICE: schema "drizzle" already exists — expected.)

### 4. Verify extension thật (AC1)
```
docker exec supabase_db_bdsai psql -U postgres -c "SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm') ORDER BY extname;"
```
Output:
```
 extname
----------
 pg_trgm
 unaccent
(2 rows)
```
→ Cả 2 extension enabled. ✓ AC1.

### 5. Verify function IMMUTABLE (AC2)
```
SELECT proname, provolatile FROM pg_proc WHERE proname IN ('f_unaccent_to_tsvector','f_unaccent_query');
```
Output:
```
        proname         | provolatile
------------------------+-------------
 f_unaccent_to_tsvector | i
 f_unaccent_query       | i
(2 rows)
```
→ Cả 2 IMMUTABLE ('i') — safe cho GIN index (Story 3.3). ✓ AC2.

### 6. Verify tsvector + tsquery (AC2)
```
SELECT f_unaccent_to_tsvector('Long Thành đất nền căn hộ');
```
→ `'can':5 'dat':3 'ho':6 'long':1 'nen':4 'thanh':2` (bỏ dấu, simple config, 6 token). ✓
```
SELECT f_unaccent_query('long thanh');
```
→ `'long' & 'thanh'` (plainto_tsquery auto-AND). ✓

### 7. Test FTS query thật (AC3)
```
SELECT f_unaccent_query('long thanh') @@ f_unaccent_to_tsvector('Long Thành') AS m1,
       f_unaccent_query('can ho') @@ f_unaccent_to_tsvector('Căn hộ chung cư') AS m2,
       f_unaccent_query('dat nen') @@ f_unaccent_to_tsvector('Đất nền Đồng Nai') AS m3;
```
Output:
```
 m1 | m2 | m3
----+----+----
 t  | t  | t
(1 row)
```
→ "long thanh"→"Long Thành" (t), "can ho"→"Căn hộ" (t), "dat nen"→"Đất nền" (t). ✓ AC3.

### 8. pg_trgm similarity (AC4)
```
SELECT set_limit(0.3); SELECT similarity(unaccent(lower('Long Thành')), unaccent(lower('long thanh'))) AS sim;
```
→ `sim = 1` (sau unaccent+lower cả 2 = "long thanh" → identical → similarity 1.0). ✓ > 0.
```
SELECT unaccent(lower('Long Thành')) % unaccent(lower('long thanh')) AS trgm_match;
```
→ `t` (operator `%` match, threshold 0.3). ✓ AC4.

### 9. Idempotent (AC5)
```
yarn db:migrate  # run 2
yarn db:migrate  # run 3
SELECT count(*) FROM drizzle.__drizzle_migrations;
```
→ Cả 2 lần exit 0, `[✓] migrations applied successfully!`. `migration_count = 1` (không duplicate). ✓ AC5.

### 10. 0 bảng nghiệp vụ (AC6)
```
SELECT tablename FROM pg_tables WHERE schemaname='public';
```
→ `(0 rows)`. Schema `schema/index.ts` vẫn `export {}`. ✓ AC6.

### 11. Edge case — query rỗng
```
SELECT f_unaccent_query('') AS q;
```
→ empty tsquery (NOTICE `text-search query doesn't contain lexemes: ""` nhưng KHÔNG crash). ✓

### 12. e2e integration test (AC8)
```
cd bdsai/apps/api && yarn test:e2e
```
Output:
```
PASS  test/app.e2e-spec.ts
PASS  test/health.e2e-spec.ts
PASS  test/vietnamese-fts.e2e-spec.ts
Test Suites: 3 passed, 3 total
Tests:       12 passed, 12 total
```
→ 12/12 PASS (AC1, AC2×2, AC3, AC4, edge, AC5, AC6 + existing app/health). ✓ AC8.

## AC checklist (8/8)

| AC | Mô tả | Status | Verify |
|----|-------|--------|--------|
| AC1 | Extension unaccent + pg_trgm bật | PASS | psql extname = 2 rows |
| AC2 | f_unaccent_to_tsvector + f_unaccent_query IMMUTABLE | PASS | provolatile='i', tsvector/tsquery đúng |
| AC3 | "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền" | PASS | @@ match t/t/t + e2e |
| AC4 | pg_trgm similarity > 0 + % operator | PASS | sim=1, trgm_match=t |
| AC5 | Migration idempotent | PASS | migrate run 2+3 exit 0, count=1 |
| AC6 | Không phá 1.1-1.4, 0 bảng nghiệp vụ | PASS | build/lint/typecheck/test pass, public tables=0 |
| AC7 | Comment giới hạn ranking + Deferred ES | PASS | SQL comment tham chiếu ARCHITECTURE-SPINE.md dòng 330 |
| AC8 | Test tự động (e2e integration) | PASS | 12/12 e2e PASS |

## Bảo mật / invariant

- **AD-1 (Module Isolation):** KHÔNG tạo SearchModule/SearchService — chỉ DB extension+function (DDL). Search service thật ở Story 3.3. ✓
- **AD-2 (Single Data Mutation Path):** Migration chỉ DDL. Test insert dùng regular table `fts_test` CREATE+DROP trong try/finally (KHÔNG persist — postgres.js prepare:false dùng connection khác nhau nên TEMP table không persist qua execute calls; regular table với cleanup try/finally đảm bảo không leak). ✓
- **NFR8 (Vietnamese search):** "long thanh" (không dấu) → "Long Thành" (có dấu) qua unaccent. ✓
- **KHÔNG commit .env, KHÔNG push.** ✓ (git status chỉ migration + test + journal + snapshot + sprint-status + story file + dev log; .env gitignored, không stage.)

## Dọn dẹp (teardown)

- `cd bdsai && supabase stop` → "Stopped supabase local development setup." EXIT 0. Data backed up to docker volume (`com.supabase.cli.project=bdsai`) — giữ cho story sau.
- Port check: `lsof -i :54351 -i :54352` → rỗng (exit 1, free). ✓
- Test table `fts_test`: đã DROP trong finally (public tables = 0 sau test). ✓
- Migration 0000 đã apply trên DB local volume (giữ cho story sau — Story 3.1 sẽ thêm migration 0001).

## Phân biệt lỗi môi trường vs lỗi story

- **Lỗi story (đã fix):**
  1. `to_tsquery('simple', 'long thanh')` syntax error → fix dùng `plainto_tsquery` (quyết định kiến trúc, ghi rationale trong SQL comment).
  2. TEMP table `ON COMMIT DROP` không persist qua `db.execute` (postgres.js prepare:false, connection khác nhau) → fix dùng regular table + try/finally DROP (AC6 vẫn thỏa: không persist).
  3. TypeScript strict null-check `rows[0]` possibly undefined → fix helper `firstRow<T>()`.
- **Lỗi môi trường:** KHÔNG có. Supabase start OK, Drizzle `--custom` hoạt động, extension available trên PG15 contrib.

## Kết luận

Story 1.5 PASS 8/8 AC. Migration 0000 là migration Drizzle đầu tiên (LOW-5 từ review 1.2 đã giải). Setup Vietnamese FTS sẵn sàng cho Story 3.3 (search service sẽ inject DRIZZLE + gọi `f_unaccent_to_tsvector`/`f_unaccent_query` + tạo GIN index trên `public_listings`). ES migrate DEFERRED (trigger = user complaint về relevance, tham chiếu ARCHITECTURE-SPINE.md dòng 330).
