-- Migration 0000: Vietnamese Full-Text Search setup (Story 1.5).
--
-- AC1: Bật extension unaccent + pg_trgm trên Supabase PostgreSQL 15.
-- AC2: Hàm f_unaccent_to_tsvector + f_unaccent_query (IMMUTABLE) cho FTS tiếng Việt.
-- AC5: Idempotent — CREATE EXTENSION IF NOT EXISTS + CREATE OR REPLACE FUNCTION.
-- AC7: Giới hạn ranking + Deferred ES (xem comment chi tiết dưới).
--
-- AD-1 (Module Isolation): Story 1.5 chỉ setup DB extension + function (DDL),
-- KHÔNG thêm logic nghiệp vụ vào NestJS module. Search service thật ở Story 3.3.
-- AD-2 (Single Data Mutation Path): chỉ DDL, chưa có mutation nghiệp vụ.
-- AC6: KHÔNG tạo bảng nghiệp vụ (public_listings ở Story 3.1). Migration này
-- chỉ bật extension + tạo function — 0 table.

-- AC1: Extension unaccent (bỏ dấu tiếng Việt) + pg_trgm (fuzzy trigram match).
-- Cả 2 là extension chuẩn PostgreSQL contrib, available trên Supabase (local + cloud).
-- IF NOT EXISTS → idempotent (AC5): Supabase có thể pre-install pg_trgm → skip OK.
-- NOTE prod (Supabase cloud): nếu migration chạy với role non-superuser bị restrict,
-- enable unaccent + pg_trgm qua Dashboard → Database → Extensions.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AC2: f_unaccent_to_tsvector(input text) -> tsvector
-- Bỏ dấu (unaccent) + lowercase + to_tsvector('simple', ...).
-- Dùng 'simple' config (KHÔNG stem — Postgres không có Vietnamese stemmer):
--   giữ token nguyên, "Long Thành" -> 'long':1 'thanh':2 (2 token riêng).
-- IMMUTABLE: unaccent + lower + to_tsvector('simple',...) đều immutable →
--   safe cho GIN index (Story 3.3 sẽ tạo CREATE INDEX ... USING gin(f_unaccent_to_tsvector(col))).
--
-- AC7 — Giới hạn ranking từ ghép (xem ARCHITECTURE-SPINE.md Deferred dòng 330):
--   'simple' config tách "Long Thành" thành 2 token riêng ("long","thanh").
--   ts_rank cho query 2 từ ghép ('long' & 'thanh') match nhưng rank có thể YẾU
--   (không hiểu phrase proximity — "Long Thành" không được treat là 1 phrase).
--   pg_trgm là fallback fuzzy nhưng similarity với từ ghép cũng hạn chế
--   (trigram overlap một phần, không phải match hoàn toàn).
--   ES (Elasticsearch) migrate là DEFERRED — trigger KHÔNG chỉ >10K listings
--   mà còn user complaint về relevance. Tham chiếu ARCHITECTURE-SPINE.md Deferred.
-- TODO Story 3.3: tạo GIN index trên public_listings khi bảng tồn tại:
--   CREATE INDEX idx_listings_title_fts ON public_listings
--     USING gin (f_unaccent_to_tsvector(title));
CREATE OR REPLACE FUNCTION f_unaccent_to_tsvector(input text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_tsvector('simple', unaccent(lower(input)));
$$;

-- AC2: f_unaccent_query(input text) -> tsquery
-- Query side khớp index side. Dùng plainto_tsquery (KHÔNG to_tsquery) vì:
--   - to_tsquery yêu cầu cú pháp toán tử ('long & thanh') → plain text "long thanh"
--     (có space, không có &) sẽ syntax error. AC3 test query plain text "long thanh"
--     phải match "Long Thành" → cần function chấp nhận plain text.
--   - plainto_tsquery('simple', text) auto-parse plain text thành AND query:
--     "long thanh" -> 'long' & 'thanh'. IMMUTABLE (provolatile='i' với regconfig).
--   - Đây là quyết định kiến trúc nhỏ: story AC2 gốc ghi to_tsquery nhưng Dev Notes
--     của chính story flag giới hạn syntax ("to_tsquery yêu cầu cú pháp hợp lệ...
--     Input user cần sanitize ở app layer"). plainto_tsquery loại bỏ nhu cầu sanitize
--     cú pháp ở app layer — app chỉ cần truyền plain text user input (Story 3.3).
-- "long thanh" -> 'long' & 'thanh' (AND). IMMUTABLE (plainto_tsquery+unaccent+lower).
-- Edge case: query rỗng '' -> plainto_tsquery('simple','') trả về empty tsquery (không crash).
CREATE OR REPLACE FUNCTION f_unaccent_query(input text)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT plainto_tsquery('simple', unaccent(lower(input)));
$$;
