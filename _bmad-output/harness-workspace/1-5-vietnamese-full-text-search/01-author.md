# Story 1.5 — Author Log (story-author)

**Story:** 1-5-vietnamese-full-text-search
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-26
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/1-5-vietnamese-full-text-search.md` | ✅ Đã ghi (8 AC + 7 Task + Dev Notes + edge case + References [Source:]) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `1-5-vietnamese-full-text-search: ready-for-dev` (dòng 53), `last_updated: 2026-06-26` (dòng 38, đã đúng từ trước) |
| 3 | Author log | `_bmad-output/harness-workspace/1-5-vietnamese-full-text-search/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `docs/bdsai/planning/epics.md` (dòng 211-224) — Epic 1, Story 1.5 AC gốc Given/When/Then + quy ước test toàn dự án (dòng 144: Story 1.3 CI gate). Đọc thêm Story 3.3 (dòng 70) — sẽ dùng FTS function này cho search thật.
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-1 (Module Isolation), AD-2 (Single Data Mutation Path), Stack (PostgreSQL 15, Drizzle 0.36.x), Consistency Conventions (kebab-case, snake_case tables, UUID), Deferred (dòng 330: ES migrate khi user complaint về relevance, FTS tiếng Việt ranking từ ghép yếu).
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` — story queue: 1.1 done, 1.2 done, 1.3 done, 1.4 done, 1.5 backlog → nâng ready-for-dev.
4. `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md` — Drizzle setup (drizzle.config, database.module, postgres.js `prepare:false`, migrations folder `apps/api/src/db/migrations/` rỗng, port 5435x, PG 15.8, scripts `db:generate`/`db:migrate`, deps drizzle-orm 0.36.4/postgres 3.4.9/drizzle-kit 0.31.10).
5. `_bmad-output/harness-workspace/1-2-ket-noi-supabase/03-review.md` — LOW-5: journal migration rỗng (`entries: []`), migration 0000 sinh khi có thay đổi schema đầu. Story 1.5 có thể là migration 0000 đầu tiên (raw SQL cho extension).
6. Code thật `bdsai/apps/api/src/db/`:
   - `drizzle.config.ts` — `dialect: 'postgresql'`, `schema: './src/db/schema/*'`, `out: './src/db/migrations'`, `dbCredentials.url = process.env.DATABASE_URL` (dotenv CLI).
   - `database.module.ts` — `@Global`, provide `PG_CLIENT` (postgres.js `prepare:false`/`max`/`idle_timeout`) + `DRIZZLE`, export `DRIZZLE` only (LOW-3 fix), `OnModuleDestroy` đóng pool.
   - `database.tokens.ts` — `DRIZZLE`/`PG_CLIENT` Symbol, `DrizzleDB = PostgresJsDatabase<Record<string, never>>` (schema rỗng), `InjectDrizzle()` decorator.
   - `schema/index.ts` — `export {}` (CỐ Ý RỖNG, comment bảng thêm ở story sau: public_users → 2.1, public_listings → 3.1).
   - `migrations/` — chỉ `.gitkeep` + `meta/_journal.json` = `{"version":"7","dialect":"postgresql","entries":[]}` (journal rỗng, 0 file SQL).
7. `bdsai/apps/api/package.json` — scripts `db:generate`/`db:migrate`/`test`/`test:e2e`, deps drizzle-orm 0.36.4/postgres 3.4.9, devDeps drizzle-kit 0.31.10.
8. `bdsai/supabase/config.toml` — `major_version=15` (dòng 37, AC6 Story 1.2), `db.port=54352` (dòng 29), `extra_search_path=["public","extensions"]` (dòng 15 — extensions schema available).
9. `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md` — Flow 2 (chị Lan lọc "Long Thành" + giá 1-3 tỷ, dòng 114-120), State Patterns (search empty "Không tìm thấy tin phù hợp" dòng 61, error "Lỗi tải kết quả" dòng 71).
10. `.claude/agents/story-author.md` — persona + protocol (3 output bắt buộc, tự verify trước khi kết thúc).
11. Story 1.4 file + author log — convention AC đánh số + Dev Notes + References [Source:] + Dev Agent Record + output table format.

---

## Quyết định kiến trúc (tự chốt — ghi trong story Dev Notes)

1. **Extension setup qua Drizzle migration raw SQL:** Tạo migration 0000 trong `apps/api/src/db/migrations/` chạy `CREATE EXTENSION IF NOT EXISTS unaccent;` + `CREATE EXTENSION IF NOT EXISTS pg_trgm;`. Drizzle là nguồn chân lý duy nhất cho schema (tách khỏi `supabase/migrations`). ⚠️ Rủi ro kỹ thuật chính: Drizzle 0.36 `generate` sinh SQL từ schema diff — schema vẫn rỗng (AC6) nên cần tạo raw SQL migration thủ công (`--custom` flag hoặc viết file + journal entry thủ công). Dev phải verify mechanism thật.
2. **Vietnamese FTS — kết hợp unaccent + pg_trgm:**
   - `f_unaccent_to_tsvector(text)` = `to_tsvector('simple', unaccent(lower(text)))` — bỏ dấu + lowercase + simple config (không stem, Postgres không có Vietnamese stemmer). `IMMUTABLE` → safe cho GIN index (Story 3.3 tạo index khi có bảng).
   - `f_unaccent_query(text)` = `to_tsquery('simple', unaccent(lower(text)))` — query side khớp index side.
   - pg_trgm `similarity()` + operator `%` (threshold 0.3 default) — fuzzy fallback khi FTS `@@` miss (typo, từ ghép).
   - Chốt: cả 2 cùng tồn tại. Story 3.3 search service dùng FTS primary + pg_trgm fallback/re-rank.
3. **Test với temp table (không bảng nghiệp vụ):** Chưa có `public_listings` (Story 3.1). Test dùng `CREATE TEMP TABLE fts_test(title text)` (session-scoped, tự drop) — không vi phạm AC6. Hoặc transaction rollback.
4. **Supabase extension availability:** `unaccent` + `pg_trgm` là extension chuẩn PostgreSQL, supported trên Supabase (local + cloud). Local: superuser `CREATE EXTENSION` OK. Prod: có thể cần enable qua Dashboard nếu role restrict — ghi note.
5. **Deferred ES note (AC7):** Ranking từ ghép với `simple` config yếu (2 token riêng, ts_rank không hiểu phrase proximity). pg_trgm similarity với từ ghép cũng hạn chế. ES migrate DEFERRED — trigger khi user complaint về relevance (tham chiếu ARCHITECTURE-SPINE.md dòng 330). Code comment trong migration SQL.

---

## AC tóm tắt (8 AC)

- **AC1:** Migration bật extension `unaccent` + `pg_trgm` (PG15, `IF NOT EXISTS`, migration 0000 đầu tiên).
- **AC2:** Hàm `f_unaccent_to_tsvector(text)` + `f_unaccent_query(text)` — `IMMUTABLE`, simple config, bỏ dấu.
- **AC3:** Test FTS: "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền" (temp table).
- **AC4:** pg_trgm fuzzy match (`similarity` > 0, operator `%`, threshold 0.3).
- **AC5:** Migration idempotent (chạy 2 lần không lỗi, `IF NOT EXISTS` + `CREATE OR REPLACE`).
- **AC6:** Không phá 1.1-1.4 (build/lint/typecheck/test pass, 0 bảng nghiệp vụ, schema vẫn `export {}`).
- **AC7:** Ghi nhận giới hạn ranking từ ghép + Deferred ES (code comment + tham chiếu ARCHITECTURE-SPINE.md).
- **AC8:** Test tự động (integration test `apps/api/test/vietnamese-fts.e2e-spec.ts`, cần Supabase local chạy).

---

## Invariant AD áp dụng

- **AD-1 (Module Isolation):** FTS function ở DB layer (SQL), không thêm NestJS business logic. Search service thật ở Story 3.3.
- **AD-2 (Single Data Mutation Path):** Story chỉ DDL (extension + function). Test dùng temp table/rollback, không persist data nghiệp vụ.
- **NFR8 (Vietnamese search):** Core story — có dấu + không dấu qua unaccent.

---

## Handoff tới story-developer

**Story-developer (opus, skill bmad-dev-story):**
1. Đọc story file `_bmad-output/implementation-artifacts/1-5-vietnamese-full-text-search.md` (8 AC + 7 Task + Dev Notes + edge case).
2. ⚠️ **Rủi ro kỹ thuật chính:** Drizzle 0.36 custom SQL migration mechanism. Schema rỗng → `drizzle-kit generate` không sinh file. Dev phải verify: (a) `drizzle-kit generate --custom --name vietnamese_fts` có hỗ trợ không, (b) hoặc viết file `0000_*.sql` + cập nhật `meta/_journal.json` + `meta/0000_snapshot.json` thủ công. Giải điểm này trước khi viết function.
3. Supabase local phải chạy (`supabase start`, port 5435x, PG 15.8) + `apps/api/.env` có `DATABASE_URL`.
4. Test e2e cần DB live — đặt `jest.setTimeout(120_000)` (cold start, bài học Story 1.2).
5. KHÔNG tạo: SearchModule, SearchService, bảng public_listings, GIN index (tất cả Story 3.3). Story 1.5 chỉ DB extension + function + test.
6. Verify 8 AC thật (psql query + e2e test pass + build/lint/typecheck/test qua Turborepo).
7. Ghi dev log `02-dev.md` (baseline_commit, file tạo/sửa, lệnh + output thật, bảng verify AC).
