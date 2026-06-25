---
baseline_commit: 307a4a4959
---

# Story 1.5: Vietnamese Full-Text Search setup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **buyer**,
I want **hệ thống search hỗ trợ tiếng Việt có dấu và không dấu**,
so that **gõ "long thanh" vẫn tìm ra tin "Long Thành" (NFR8)**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 1 → Story 1.5 (dòng 211-224, AC gốc Given/When/Then). AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC8. Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.

1. **AC1 — Migration bật extension `unaccent` + `pg_trgm` trên Supabase PostgreSQL 15.** Given Supabase local đang chạy (dải port 5435x, DB ở `54352`, PG 15.8 — pin từ Story 1.2 `config.toml major_version=15`) và Drizzle migration pipeline từ Story 1.2 (`yarn db:generate` / `yarn db:migrate` ở `apps/api`, `out: ./src/db/migrations`), When chạy migration Drizzle mới, Then extension `unaccent` và `pg_trgm` được bật trên database (`SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm')` trả về cả 2). Migration dùng `CREATE EXTENSION IF NOT EXISTS` → idempotent. Đây là migration 0000 đầu tiên (LOW-5 từ review 1.2: journal rỗng, file 0000 sinh khi có thay đổi schema đầu — story này thêm SQL raw cho extension).

2. **AC2 — Hàm SQL `f_unaccent_to_tsvector(text)` bỏ dấu + `to_tsvector('simple', ...)` cho FTS tiếng Việt.** Given PostgreSQL không có built-in Vietnamese text search config, When tạo SQL function trong migration, Then có hàm `f_unaccent_to_tsvector(input text)` trả về `tsvector` = `to_tsvector('simple', unaccent(lower(input)))` (bỏ dấu + lowercase + simple config để giữ token nguyên không stem). Hàm `IMMUTABLE` (unaccent + lower + to_tsvector đều immutable → safe cho index). Tạo thêm hàm `f_unaccent_query(text)` trả về `tsquery` = `to_tsquery('simple', unaccent(lower(input)))` (cho query side khớp index side). Cả 2 hàm `LANGUAGE sql IMMUTABLE`. Verify: `SELECT f_unaccent_to_tsvector('Long Thành')` = `'long':1 'thanh':2` (bỏ dấu, 2 token).

3. **AC3 — Test query FTS: "long thanh" khớp "Long Thành", "căn hộ" khớp "can ho".** Given chưa có bảng `public_listings` (tạo ở Story 3.1 — AC6 cấm tạo bảng nghiệp vụ ở story này), When tạo temp table test (hoặc table mẫu đơn giản `fts_test(title text)` — tạo + drop trong test, KHÔNG phải bảng nghiệp vụ), insert sample rows ("Long Thành", "Căn hộ chung cư", "Đất nền"), query `WHERE f_unaccent_to_tsvector(title) @@ f_unaccent_query('long thanh')`, Then: (a) "long thanh" khớp được "Long Thành", (b) "căn hộ" khớp "can ho" (query "can ho" khớp row "Căn hộ"), (c) "đất nền" → "dat nen" khớp. Test tự động (integration test `apps/api` hoặc SQL test script chạy qua `psql`/Drizzle).

4. **AC4 — pg_trgm fuzzy match hoạt động (similarity threshold).** Given `pg_trgm` bật (AC1), When query `similarity(unaccent(lower(title)), unaccent(lower('long thanh')))`, Then "Long Thành" cho similarity > 0 (trigram overlap). Cấu hình threshold: `SELECT set_limit(0.3)` (default pg_trgm 0.3) — ghi note threshold tune được. Test: `SELECT title FROM fts_test WHERE unaccent(lower(title)) % unaccent(lower('long thanh'))` trả về row "Long Thành" (operator `%` = similarity ≥ threshold). Verify similarity score thật trong test (assert > 0, không hardcode giá trị chính xác vì phụ thuộc tokenizer).

5. **AC5 — Migration idempotent (chạy lại không lỗi).** Given migration dùng `CREATE EXTENSION IF NOT EXISTS` + `CREATE OR REPLACE FUNCTION`, When chạy `yarn db:migrate` lần 2 (hoặc apply migration lên DB đã có extension/function), Then KHÔNG lỗi, KHÔNG tạo bản duplicate. Extension đã tồn tại (Supabase có thể pre-install `pg_trgm`) → `IF NOT EXISTS` xử lý. Function `CREATE OR REPLACE FUNCTION` cập nhật định nghĩa nếu đã có. Verify: chạy migrate 2 lần liên tiếp, exit 0 cả 2.

6. **AC6 — Không phá Story 1.1-1.4 (build/lint/typecheck/test pass, 0 bảng nghiệp vụ mới ngoài temp test).** Given Story 1.3 CI gate (lint+typecheck+build+test qua Turborepo phải pass), When chạy `yarn build && yarn lint && yarn typecheck && yarn test` ở `bdsai/` (cả 3 package), Then PASS (không phá 1.1 monorepo, 1.2 Drizzle/Supabase, 1.3 CI, 1.4 web UI). KHÔNG tạo bảng nghiệp vụ mới trong `schema/index.ts` (vẫn `export {}` — bảng `public_listings` tạo ở Story 3.1). Temp test table `fts_test` chỉ tồn tại trong test (CREATE + DROP trong cùng session, hoặc dùng transaction rollback) — KHÔNG persist vào DB prod.

7. **AC7 — Ghi nhận giới hạn ranking từ ghép + Deferred ES (note trong story + code comment).** Given ARCHITECTURE-SPINE.md Deferred section: "FTS tiếng Việt trên Postgres có giới hạn thật (ranking yếu với từ ghép, không hiểu ngữ nghĩa 'căn hộ'≈'chung cư'). Trigger migrate KHÔNG chỉ là >10K listings mà còn là user complaint về relevance", When viết migration + function, Then có code comment giải thích: (a) `simple` config treat "Long Thành" thành 2 token riêng ("long", "thanh") → ranking `ts_rank` cho query 2 từ ghép có thể yếu (không hiểu phrase proximity tốt), (b) pg_trgm là fallback fuzzy nhưng similarity với từ ghép cũng hạn chế, (c) ES migrate là DEFERRED — trigger khi có user complaint về relevance (tham chiếu ARCHITECTURE-SPINE.md Deferred). Comment ở file migration SQL + reference story file AC7.

8. **AC8 — Test tự động (integration test apps/api hoặc SQL test script).** Given quy ước test toàn dự án (dòng 144) + Story 1.3 CI gate, When chạy test, Then: (a) tạo integration test `apps/api/test/vietnamese-fts.e2e-spec.ts` (hoặc `.spec.ts` unit nếu không cần DB live — nhưng FTS cần DB thật → e2e/integration) kết nối DB qua Drizzle (`@InjectDrizzle`/`DRIZZLE` token từ Story 1.2), (b) test setup: CREATE temp table + insert sample, test teardown: DROP temp table (hoặc transaction rollback), (c) assert AC3 (FTS match "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền") + AC4 (pg_trgm similarity > 0, `%` operator match), (d) test idempotent (AC5): migration apply 2 lần không lỗi (có thể skip nếu Drizzle journal đã handle — Drizzle track migration đã apply trong `__drizzle_migrations`, chạy lại skip tự động), (e) `yarn test:e2e` PASS (cần Supabase local chạy + `apps/api/.env` có `DATABASE_URL`). Test đặt `jest.setTimeout` rộng (cold start DB connection — bài học Story 1.2).

## Tasks / Subtasks

- [ ] **Task 1 — Tạo Drizzle migration 0000 bật extension (AC1, AC5)**
  - [ ] Tạo file SQL migration raw trong `apps/api/src/db/migrations/`. Vì Drizzle `generate` chỉ sinh migration từ schema diff (schema vẫn rỗng — AC6), cần tạo migration SQL thủ công: đặt file `0000_vietnamese_fts_extensions.sql` trong `migrations/` + cập nhật `migrations/meta/_journal.json` thêm entry (hoặc dùng `drizzle-kit generate --custom` nếu hỗ trợ custom SQL — verify Drizzle 0.36 capability). ⚠️ Verify cách Drizzle 0.36 handle raw SQL migration (không qua schema diff) — có thể cần `--custom` flag hoặc viết thẳng file + journal entry.
  - [ ] Nội dung SQL: `CREATE EXTENSION IF NOT EXISTS unaccent;` + `CREATE EXTENSION IF NOT EXISTS pg_trgm;` (idempotent — AC5).
  - [ ] Verify `yarn db:migrate` apply thành công + `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm')` trả về cả 2.
  - [ ] Verify idempotent: chạy `yarn db:migrate` lần 2 → exit 0, không lỗi (AC5).
- [ ] **Task 2 — Tạo SQL function `f_unaccent_to_tsvector` + `f_unaccent_query` (AC2, AC7)**
  - [ ] Thêm vào cùng migration 0000 (hoặc migration 0001 riêng nếu tách): `CREATE OR REPLACE FUNCTION f_unaccent_to_tsvector(input text) RETURNS tsvector LANGUAGE sql IMMUTABLE AS $$ SELECT to_tsvector('simple', unaccent(lower(input))); $$;`
  - [ ] `CREATE OR REPLACE FUNCTION f_unaccent_query(input text) RETURNS tsquery LANGUAGE sql IMMUTABLE AS $$ SELECT to_tsquery('simple', unaccent(lower(input))); $$;`
  - [ ] Comment trong SQL giải thích AC7: simple config, ranking từ ghép yếu, ES deferred (tham chiếu ARCHITECTURE-SPINE.md Deferred).
  - [ ] Verify: `SELECT f_unaccent_to_tsvector('Long Thành')` = `'long':1 'thanh':2`. `SELECT f_unaccent_query('long thanh')` = `'long' & 'thanh'`.
- [ ] **Task 3 — Integration test FTS match (AC3, AC8)**
  - [ ] Tạo `apps/api/test/vietnamese-fts.e2e-spec.ts` (jest e2e config `test/jest-e2e.json` đã có từ Story 1.2).
  - [ ] Test setup: inject `DRIZZLE` token (hoặc kết nối trực tiếp qua `DATABASE_URL` cho test), `CREATE TEMP TABLE fts_test (id serial, title text);` + insert sample: `('Long Thành')`, `('Căn hộ chung cư')`, `('Đất nền Đồng Nai')`. TEMP table tự drop khi session end (PostgreSQL behavior) — không persist (AC6).
  - [ ] Test case 1: query `WHERE f_unaccent_to_tsvector(title) @@ f_unaccent_query('long thanh')` → assert chứa "Long Thành".
  - [ ] Test case 2: query `'can ho'` → assert khớp "Căn hộ chung cư".
  - [ ] Test case 3: query `'dat nen'` → assert khớp "Đất nền Đồng Nai".
  - [ ] Test teardown: TEMP table tự drop (session end) — không cần DROP explicit, nhưng ghi comment. Hoặc dùng transaction rollback nếu muốn explicit.
  - [ ] `jest.setTimeout(120_000)` (cold start — bài học Story 1.2).
- [ ] **Task 4 — Test pg_trgm fuzzy match (AC4, AC8)**
  - [ ] Trong cùng e2e spec: `SELECT set_limit(0.3);` + `SELECT similarity(unaccent(lower('Long Thành')), unaccent(lower('long thanh')))` → assert > 0.
  - [ ] `SELECT title FROM fts_test WHERE unaccent(lower(title)) % unaccent(lower('long thanh'))` → assert chứa "Long Thành" (operator `%`).
  - [ ] Ghi note: threshold 0.3 default, tune được qua `set_limit()` hoặc `pg_trgm.similarity_threshold` GUC.
- [ ] **Task 5 — Test idempotent migration (AC5, AC8)**
  - [ ] Test case: chạy `yarn db:migrate` 2 lần liên tiếp trong test setup (hoặc verify Drizzle journal đã track migration 0000 → lần 2 skip). Assert exit 0 cả 2, không lỗi.
  - [ ] Hoặc: assert `SELECT count(*) FROM drizzle.__drizzle_migrations WHERE hash = ...` = 1 (không duplicate).
- [ ] **Task 6 — Verify không phá 1.1-1.4 (AC6)**
  - [ ] `yarn build` (cả monorepo) → 3 successful.
  - [ ] `yarn typecheck` → 4 successful.
  - [ ] `yarn lint` → 4 successful.
  - [ ] `yarn test` (unit) → PASS. `yarn test:e2e` (apps/api, Supabase chạy) → PASS.
  - [ ] Verify `schema/index.ts` vẫn `export {}` (không bảng nghiệp vụ). `pg_tables WHERE schemaname='public'` không có `fts_test` (temp table, session-scoped).
- [ ] **Task 7 — Code comment + Deferred note (AC7)**
  - [ ] Comment trong file migration SQL: giải thích simple config, ranking từ ghép, ES deferred, tham chiếu ARCHITECTURE-SPINE.md Deferred + story 3.3 (sẽ dùng FTS này cho search thật).
  - [ ] Comment trong `f_unaccent_to_tsvector` function: "bỏ dấu + simple config — KHÔNG stem tiếng Việt (Postgres không có Vietnamese stemmer), ranking ts_rank cho từ ghép có thể yếu, xem AC7 + Deferred".
  - [ ] Ghi TODO: Story 3.3 sẽ tạo GIN index `CREATE INDEX ... USING gin (f_unaccent_to_tsvector(title))` trên `public_listings` khi bảng tồn tại. Story 1.5 chỉ setup function + extension, chưa index (vì chưa có bảng).

## Dev Notes

### Bối cảnh dự án
- Dự án **bdsai.vn** — sàn rao vặt BĐS AI Long Thành. KHÔNG phải Twenty CRM (Twenty trong `packages/twenty-*` chỉ tham khảo, KHÔNG đụng).
- Code sống ở `bdsai/apps/api/` (NestJS 11 Application layer). Story 1.5 thuộc Epic 1 Track A — hợp lệ, KHÔNG đụng Track B (Epic 5/4-2b blocked).

### Trạng thái từ Story 1.1 + 1.2 (KHÔNG làm lại)
- **Monorepo** `bdsai/` (Turborepo): `apps/web` (Next 16), `apps/api` (NestJS 11), `packages/shared`. [Source: 1-1.../00-infra-decisions.md]
- **apps/api DB setup (Story 1.2):**
  - `src/db/drizzle.config.ts` — `dialect: 'postgresql'`, `schema: './src/db/schema/*'`, `out: './src/db/migrations'`, `dbCredentials.url = process.env.DATABASE_URL` (dotenv, CLI được phép). [Source: bdsai/apps/api/src/db/drizzle.config.ts]
  - `src/db/database.module.ts` — `@Global` Module, provide `PG_CLIENT` (postgres.js, `prepare:false`, `max`, `idle_timeout`) + `DRIZZLE` (drizzle-orm/postgres-js). Export `DRIZZLE` only (LOW-3 fix: PG_CLIENT không export). `OnModuleDestroy` đóng pool. [Source: bdsai/apps/api/src/db/database.module.ts]
  - `src/db/database.tokens.ts` — `DRIZZLE = Symbol('DRIZZLE')`, `PG_CLIENT = Symbol('PG_CLIENT')`, `DrizzleDB = PostgresJsDatabase<Record<string, never>>` (schema rỗng), `InjectDrizzle()` decorator. [Source: bdsai/apps/api/src/db/database.tokens.ts]
  - `src/db/schema/index.ts` — `export {}` (CỐ Ý RỖNG, AC4 Story 1.2). Comment: bảng thêm ở story sau (public_users → 2.1, public_listings → 3.1). [Source: bdsai/apps/api/src/db/schema/index.ts]
  - `src/db/migrations/` — chỉ `.gitkeep` + `meta/_journal.json` = `{"version":"7","dialect":"postgresql","entries":[]}` (journal rỗng, LOW-5). **Chưa có file SQL migration nào.** [Source: bdsai/apps/api/src/db/migrations/]
  - `package.json` scripts: `db:generate: drizzle-kit generate --config src/db/drizzle.config.ts`, `db:migrate: drizzle-kit migrate --config src/db/drizzle.config.ts`, `test: jest --config ./jest.config.cjs --passWithNoTests`, `test:e2e: jest --config ./test/jest-e2e.json --passWithNoTests`. [Source: bdsai/apps/api/package.json]
  - Deps: `drizzle-orm 0.36.4`, `postgres 3.4.9`, `@nestjs/config 4.0.4`, `zod 3.25.76`. DevDeps: `drizzle-kit 0.31.10`. [Source: bdsai/apps/api/package.json]
- **Supabase local (Story 1.2):** PG 15.8, dải port 5435x (API 54351 / DB 54352 / Studio 54353 / Inbucket 54354). `config.toml` `major_version=15` (dòng 37). `apps/api/.env` có `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54352/postgres` (gitignored). [Source: 1-2.../02-dev.md, bdsai/supabase/config.toml]

### Quyết định kiến trúc (tự chốt trong story này)
1. **Extension setup qua Drizzle migration raw SQL:** Tạo migration 0000 trong `apps/api/src/db/migrations/` chạy `CREATE EXTENSION IF NOT EXISTS unaccent;` + `CREATE EXTENSION IF NOT EXISTS pg_trgm;`. Drizzle là nguồn chân lý duy nhất cho schema (drizzle.config comment Story 1.2: "TÁCH khỏi supabase/migrations"). ⚠️ Drizzle 0.36 `generate` sinh migration từ schema diff — schema vẫn rỗng (AC6) nên cần tạo raw SQL migration thủ công. Verify cách Drizzle handle custom SQL: có thể `drizzle-kit generate --custom` (nếu hỗ trợ) hoặc viết file `.sql` + cập nhật `_journal.json` + `meta/0000_snapshot.json` thủ công. Dev phải verify mechanism thật (đây là điểm kỹ thuật cần giải trong dev).
2. **Vietnamese FTS approach — kết hợp unaccent + pg_trgm:**
   - **unaccent** cho FTS: `f_unaccent_to_tsvector(text)` = `to_tsvector('simple', unaccent(lower(text)))`. Bỏ dấu + lowercase + `simple` config (không stem — Postgres không có Vietnamese stemmer; simple giữ token nguyên). Query side: `f_unaccent_query(text)` = `to_tsquery('simple', unaccent(lower(text)))`. Cả 2 `IMMUTABLE` → safe cho GIN index (Story 3.3 sẽ tạo index khi có bảng).
   - **pg_trgm** cho fuzzy fallback: `similarity()` + operator `%` (similarity ≥ threshold). Hỗ trợ "long thanh" ~ "Long Thành" qua trigram overlap khi FTS `@@` có thể miss (VD typo nhẹ, 1 từ ghép).
   - **Chốt:** cả 2 cùng tồn tại. Search service (Story 3.3) sẽ dùng FTS `@@` làm primary + pg_trgm `%` làm fallback/re-rank.
3. **Test với temp table (không bảng nghiệp vụ):** Chưa có `public_listings` (Story 3.1). Test dùng `CREATE TEMP TABLE fts_test(title text)` (session-scoped, tự drop) — KHÔNG vi phạm AC6 (temp table không phải bảng nghiệp vụ persist). Hoặc transaction rollback.
4. **Supabase extension availability:** `unaccent` + `pg_trgm` là extension chuẩn PostgreSQL, available trên Supabase (local + cloud). Supabase cloud có thể cần enable qua Dashboard → Database → Extensions (nếu `CREATE EXTENSION` từ client bị restrict — verify). Local: `CREATE EXTENSION` chạy trực tiếp qua postgres superuser OK. Ghi note: prod có thể cần enable qua Dashboard nếu migration chạy với role non-superuser.
5. **Deferred ES note (AC7):** Ranking từ ghép ("long thanh" 2 từ) với `simple` config: `ts_rank` tính dựa trên match frequency, không hiểu phrase proximity tốt → 2 từ ghép match nhưng rank có thể thấp hơn 1 từ khớp hoàn toàn. pg_trgm similarity với từ ghép cũng hạn chế (trigram của "long thanh" vs "Long Thành" = overlap một phần). ES migrate DEFERRED — trigger khi user complaint về relevance (không chỉ >10K listings). Tham chiếu ARCHITECTURE-SPINE.md dòng 330.

### Invariant AD liên quan (áp dụng)
- **AD-1 (Module Isolation):** FTS function ở DB layer (SQL function trong DB, không phải NestJS module). Story 1.5 KHÔNG thêm logic nghiệp vụ vào module NestJS — chỉ setup DB extension + function. Search service thật sống ở Story 3.3 (marketplace module) sẽ inject `DRIZZLE` + gọi function. KHÔNG tạo `SearchModule` ở story này.
- **AD-2 (Single Data Mutation Path):** Story 1.5 chỉ setup extension + function (DDL), chưa có mutation nghiệp vụ. Test insert dùng TEMP table (session-scoped, tự drop) hoặc transaction rollback — KHÔNG persist data nghiệp vụ. KHÔNG thêm `insert/update/delete` vào NestJS service.
- **NFR8 (Vietnamese search):** FTS hỗ trợ có dấu + không dấu — core của story. "long thanh" (không dấu) → "Long Thành" (có dấu) qua unaccent. "căn hộ" → "can ho" tương tự.

### Edge case (phải có test tương ứng — dòng 144 epics.md)
- **"Long Thành" (2 từ ghép):** `simple` config tách thành 2 token "long" + "thanh" riêng. Query `f_unaccent_query('long thanh')` = `'long' & 'thanh'` (AND) → match nhưng `ts_rank` có thể yếu (không hiểu "Long Thành" là phrase). Test: assert match OK, ghi note ranking yếu (AC7). pg_trgm fallback: `similarity('long thanh', 'long thanh')` (sau unaccent) — trigram overlap cao nhưng vẫn là fuzzy.
- **"căn hộ" → "can ho":** unaccent("Căn hộ") = "Can ho" → lower = "can ho". Query "can ho" match. Test case 2 (AC3).
- **"đất nền" → "dat nen":** tương tự. Test case 3 (AC3).
- **Query rỗng `''`:** `f_unaccent_query('')` = `to_tsquery('simple', '')` → trả về empty tsquery (không crash). `f_unaccent_to_tsvector('')` = empty tsvector. Test: query rỗng không throw, trả về 0 match (không crash). Edge case test.
- **Extension đã tồn tại:** Supabase có thể pre-install `pg_trgm` (Supabase dùng cho một số feature). `CREATE EXTENSION IF NOT EXISTS` → skip nếu đã có, không lỗi. Test idempotent (AC5).
- **pg_trgm similarity threshold (0.3 default):** `set_limit(0.3)`. Nếu threshold quá cao → "long thanh" vs "Long Thành" (sau unaccent giống nhau) similarity ~1.0 → match. Nhưng nếu query ngắn ("long" 1 từ) vs title dài → similarity thấp. Ghi note tune được qua `pg_trgm.similarity_threshold` GUC hoặc `set_limit()`. Test: assert similarity > 0, không hardcode giá trị.
- **Supabase local vs prod extension availability:** Local: postgres superuser → `CREATE EXTENSION` OK. Prod (Supabase cloud): role `postgres` có superuser nhưng Supabase có thể restrict một số extension qua Dashboard. Verify `unaccent` + `pg_trgm` trong danh sách Supabase-supported extensions (cả 2 đều standard, supported). Ghi note: nếu prod cần enable qua Dashboard, document trong README/migration comment.
- **Function IMMUTABLE + index safety:** `f_unaccent_to_tsvector` phải `IMMUTABLE` để dùng được trong `CREATE INDEX ... USING gin (f_unaccent_to_tsvector(col))`. unaccent + lower + to_tsvector('simple',...) đều immutable → function immutable OK. Verify `SELECT provolatile FROM pg_proc WHERE proname='f_unaccent_to_tsvector'` = 'i' (immutable). Story 3.3 sẽ dựa vào này để tạo index.
- **Drizzle custom SQL migration mechanism:** Drizzle 0.36 `generate` sinh SQL từ schema diff. Schema rỗng → không sinh file. Cần verify cách thêm raw SQL migration: (a) `drizzle-kit generate --custom --name vietnamese_fts` (nếu có flag custom), (b) hoặc viết file `0000_*.sql` + cập nhật `meta/_journal.json` (thêm entry với `idx`, `when`, `tag`, `breakpoints`) + `meta/0000_snapshot.json` thủ công. Dev phải giải điểm này — đây là rủi ro kỹ thuật chính của story.

### Versions / port / path (khớp code thật)
- **PostgreSQL:** 15.8 (Supabase local, `config.toml major_version=15`).
- **Drizzle ORM:** 0.36.4, drizzle-kit 0.31.10.
- **postgres.js:** 3.4.9.
- **DB port:** 54352 (local Supabase).
- **Migration folder:** `bdsai/apps/api/src/db/migrations/` (journal hiện rỗng, `entries: []`).
- **Schema folder:** `bdsai/apps/api/src/db/schema/` (`index.ts` = `export {}`).
- **Test config:** `bdsai/apps/api/test/jest-e2e.json` (có từ Story 1.2).
- **Env:** `bdsai/apps/api/.env` (gitignored) có `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54352/postgres`.

### Source tree (NEW/UPDATE)
```
bdsai/apps/api/
├── src/db/
│   ├── migrations/
│   │   ├── 0000_vietnamese_fts_extensions.sql   # NEW — CREATE EXTENSION unaccent + pg_trgm + function f_unaccent_to_tsvector/f_unaccent_query (AC1, AC2, AC5, AC7)
│   │   └── meta/
│   │       ├── _journal.json                    # UPDATE — thêm entry 0000 (idx 0, tag 0000, breakpoints)
│   │       └── 0000_snapshot.json               # NEW — snapshot Drizzle cho migration 0000 (schema rỗng + extension — verify Drizzle format)
│   ├── schema/index.ts                          # KHÔNG ĐỔI — vẫn export {} (AC6, không bảng nghiệp vụ)
│   ├── drizzle.config.ts                        # KHÔNG ĐỔI
│   ├── database.module.ts                       # KHÔNG ĐỔI
│   └── database.tokens.ts                       # KHÔNG ĐỔI
└── test/
    └── vietnamese-fts.e2e-spec.ts               # NEW — integration test FTS match + pg_trgm + idempotent (AC3, AC4, AC5, AC8)
```
⚠️ KHÔNG tạo: `SearchModule`, `SearchService`, `search.controller.ts`, bảng `public_listings`, GIN index (tất cả ở Story 3.3). Story 1.5 chỉ DB extension + function + test.

## References

- [Source: docs/bdsai/planning/epics.md#Story-1.5] (dòng 211-224) — AC gốc Given/When/Then + quy ước test toàn dự án (dòng 144: Story 1.3 CI gate)
- [Source: docs/bdsai/planning/epics.md#Story-3.3] (dòng 70) — `3-3-duyet-tim-kiem-filter-sort-phan-trang` sẽ dùng FTS function này cho search thật (tin đã duyệt + filter + sort + phân trang)
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-1] — Module Isolation (FTS ở DB layer, không thêm NestJS business logic)
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-2] — Single Data Mutation Path (story chỉ DDL, test dùng temp table/rollback)
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Stack] — PostgreSQL 15, Drizzle ORM 0.36.x
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Deferred] (dòng 330) — Search engine (Elasticsearch) deferred: PostgreSQL FTS (unaccent + pg_trgm) đủ cho MVP, ranking từ ghép yếu, trigger migrate ES = user complaint về relevance
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Consistency-Conventions] — kebab-case files, snake_case DB tables, UUID v4, error shape
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — story queue (1.1-1.4 done, 1.5 backlog → ready-for-dev)
- [Source: _bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md] — Drizzle setup (drizzle.config, database.module, postgres.js, migrations folder rỗng, port 5435x, PG 15.8, db:generate/db:migrate scripts)
- [Source: _bmad-output/harness-workspace/1-2-ket-noi-supabase/03-review.md] — LOW-5: journal migration rỗng, migration 0000 sinh khi có thay đổi schema đầu (Story 1.5 có thể là migration 0000 đầu tiên)
- [Source: bdsai/apps/api/src/db/drizzle.config.ts] — dialect postgresql, schema ./src/db/schema/*, out ./src/db/migrations, dbCredentials.url
- [Source: bdsai/apps/api/src/db/database.module.ts] — @Global, provide DRIZZLE + PG_CLIENT, export DRIZZLE only, OnModuleDestroy
- [Source: bdsai/apps/api/src/db/database.tokens.ts] — DRIZZLE/PG_CLIENT Symbol, DrizzleDB type, InjectDrizzle decorator
- [Source: bdsai/apps/api/src/db/schema/index.ts] — export {} (rỗng có chủ đích, comment bảng thêm ở story sau)
- [Source: bdsai/apps/api/src/db/migrations/meta/_journal.json] — {"version":"7","dialect":"postgresql","entries":[]} (journal rỗng)
- [Source: bdsai/apps/api/package.json] — scripts db:generate/db:migrate/test/test:e2e, deps drizzle-orm 0.36.4/postgres 3.4.9/drizzle-kit 0.31.10
- [Source: bdsai/supabase/config.toml] — major_version=15 (dòng 37), db port 54352 (dòng 29), extra_search_path includes extensions
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Flow-2] (dòng 114-120) — chị Lan lọc "Long Thành" + giá, search behavior buyer
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#State-Patterns] (dòng 61, 71) — search empty state "Không tìm thấy tin phù hợp", error state "Lỗi tải kết quả"
- [Source: .claude/agents/story-author.md] — persona + protocol (3 output bắt buộc, tự verify trước khi kết thúc)
- [Source: _bmad-output/implementation-artifacts/1-4-base-ui-layout-navigation.md] — story file convention (AC đánh số + Dev Notes + References [Source:] + Dev Agent Record)
- [Source: _bmad-output/implementation-artifacts/1-2-ket-noi-supabase.md] — story file convention (AC Given/When/Then + Drizzle/Supabase context)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
