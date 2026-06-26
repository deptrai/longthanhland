-- Story 3.3 — GIN index cho FTS tiếng Việt trên public_listings.
-- Dùng f_unaccent_to_tsvector (Story 1.5) trên composite (title || ' ' || description || ' ' || province || ' ' || district).
-- Idempotent: CREATE INDEX IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_listings_fts_unaccent
  ON public_listings
  USING gin (f_unaccent_to_tsvector(
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(province, '') || ' ' ||
    COALESCE(district, '') || ' ' ||
    COALESCE(ward, '') || ' ' ||
    COALESCE(street, '') || ' ' ||
    COALESCE(address, '')
  ));

-- Composite index cho filter phổ biến: status + province + property_type + listing_type.
CREATE INDEX IF NOT EXISTS idx_listings_status_prov_type
  ON public_listings (status, province, property_type, listing_type);

-- Index cho sort theo price (đã có idx_listings_price từ 0003, nhưng thêm composite cho filter+sort).
CREATE INDEX IF NOT EXISTS idx_listings_status_price
  ON public_listings (status, price);

-- Index cho sort theo createdAt (đã có idx_listings_created_at từ 0003).
