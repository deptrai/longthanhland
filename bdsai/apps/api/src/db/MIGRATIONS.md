# Drizzle Migration Guide — bdsai.vn API

> Story 1.6 AC3 — tài liệu hướng dẫn thêm migration Drizzle (không tạo migration mới trong story này).
> Tham chiếu: Story 1.2 (setup Drizzle) + Story 1.5 (custom migration thực tế — `0000_vietnamese_fts`).

## Tổng quan

- **ORM:** Drizzle 0.36.4 + drizzle-kit 0.31.10.
- **Driver:** postgres.js (porsager) — `prepare: false` cho Supavisor (prod 6543).
- **Nguồn chân lý schema:** `apps/api/src/db/schema/*.ts` (hiện rỗng — `export {}`).
- **Thư mục migration:** `apps/api/src/db/migrations/` (TÁCH khỏi `supabase/migrations` để Drizzle là nguồn chân lý duy nhất cho schema nghiệp vụ).
- **Metadata table:** `drizzle.__drizzle_migrations` (schema `drizzle`).
- **Journal:** `apps/api/src/db/migrations/meta/_journal.json` (Drizzle tự cập nhật).

## Scripts

```bash
# Sinh migration từ schema (so sánh diff schema/*.ts vs snapshot trước).
yarn db:generate

# Sinh custom migration (SQL tay — extension/function/raw SQL).
yarn db:generate -- --custom --name <name>

# Apply migration lên DB (idempotent — chỉ chạy migration chưa apply).
yarn db:migrate
```

Cả hai script đọc `apps/api/src/db/drizzle.config.ts` (dotenv load `.env` → `DATABASE_URL`).

## Luồng A — Schema change (table/column)

Khi thêm/sửa bảng trong `src/db/schema/*.ts`:

1. **Sửa schema:** tạo/sửa file `src/db/schema/<entity>.ts` (vd `public-listings.ts`), export table definition. Thêm vào barrel `src/db/schema/index.ts`.
2. **Sinh migration:**
   ```bash
   yarn db:generate
   ```
   Drizzle diff schema hiện tại vs snapshot trước → sinh `NNNN_<name>.sql` + cập nhật `meta/_journal.json` + `meta/NNNN_snapshot.json`.
3. **Review SQL sinh:** mở `migrations/NNNN_<name>.sql` — kiểm tra `CREATE TABLE`, `ALTER TABLE`, index, constraint đúng ý. **KHÔNG sửa file sinh tự động** (snapshot sẽ lệch).
4. **Apply:**
   ```bash
   yarn db:migrate
   ```
5. **Verify:**
   ```sql
   -- Kiểm tra migration đã apply.
   SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
   -- Kiểm tra journal khớp.
   cat apps/api/src/db/migrations/meta/_journal.json
   ```
   Số entry trong `__drizzle_migrations` phải khớp số entry trong `_journal.json`.

## Luồng B — Custom SQL (extension/function/raw)

Khi cần SQL không sinh từ schema (extension, function, trigger, raw DDL):

1. **Sinh custom migration:**
   ```bash
   yarn db:generate -- --custom --name <name>
   ```
   Drizzle tạo file `NNNN_<name>.sql` rỗng + cập nhật journal. **KHÔNG sinh snapshot mới** (custom migration không có schema diff).
2. **Edit SQL:** viết SQL tay vào `migrations/NNNN_<name>.sql`. Ví dụ (Story 1.5):
   ```sql
   CREATE EXTENSION IF NOT EXISTS unaccent;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE OR REPLACE FUNCTION f_unaccent_to_tsvector(input text) RETURNS tsvector ...
   ```
   - **Idempotent:** dùng `IF NOT EXISTS` / `CREATE OR REPLACE` để `db:migrate` không fail khi re-run (Supabase có thể pre-install extension).
3. **Apply:**
   ```bash
   yarn db:migrate
   ```
4. **Verify:** như Luồng A — kiểm tra `__drizzle_migrations` + journal.

> **Story 1.5 đã verify mechanism này:** migration `0000_vietnamese_fts` sinh bằng `--custom`, apply thành công, journal có 1 entry, extension `unaccent` + `pg_trgm` present.

## Verify chung

```bash
# 1. Migration idempotent — chạy lại không tạo mới, exit 0.
yarn db:migrate

# 2. Đếm migration đã apply.
docker exec supabase_db_bdsai psql -U postgres -c \
  "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;"

# 3. Journal khớp DB.
cat apps/api/src/db/migrations/meta/_journal.json

# 4. (Story 1.5) Extension FTS vẫn present.
docker exec supabase_db_bdsai psql -U postgres -c \
  "SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm');"
# → 2 rows
```

## Rollback

> ⚠️ **Drizzle 0.36 KHÔNG có auto-rollback.** Không có `drizzle-kit rollback`.

Rollback = **viết migration ngược thủ công**:

1. Tạo custom migration mới (`yarn db:generate -- --custom --name revert_<name>`).
2. Viết SQL ngược: `DROP TABLE`, `DROP COLUMN`, `DROP FUNCTION`, `DROP EXTENSION` (cẩn thận `CASCADE`).
3. Apply: `yarn db:migrate`.

**KHÔNG xóa file migration đã apply** — journal sẽ lệch DB. Luôn thêm migration ngược.

## Lưu ý Supabase

- **Local (54352):** kết nối trực tiếp DB. `db:migrate` chạy với role `postgres` (superuser) → `CREATE EXTENSION` OK.
- **Prod (Supabase Cloud):** dùng Supavisor pooler 6543 (`prepare: false` bắt buộc). Nếu migration `CREATE EXTENSION` bị restrict (role non-superuser) → enable extension qua Dashboard → Database → Extensions trước, rồi `db:migrate` (extension đã tồn tại → `IF NOT EXISTS` skip).
- **Free tier limit:** DB 500MB, Storage 1GB. Monitoring (Story 1.6 AC7) cảnh báo 80% (400MB/800MB) → trigger nâng Pro.

## Trạng thái hiện tại (sau Story 1.6)

- Migration `0000_vietnamese_fts` (Story 1.5) — đã apply, journal 1 entry.
- Schema `src/db/schema/index.ts` vẫn `export {}` (0 bảng nghiệp vụ — Story 1.6 KHÔNG tạo migration mới, chỉ docs).
- Bảng nghiệp vụ đầu tiên (`public_users`) sẽ thêm ở Story 2.1 (Luồng A).
