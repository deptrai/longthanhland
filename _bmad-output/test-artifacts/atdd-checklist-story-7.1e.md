# ATDD Checklist — story-7.1e-nowing-engine-client-cache-resilience

## AC-1: Cache kết quả Nowing theo contentHash

### Pattern 1 — Mirror
- [ ] should cache result with key `nowing:rewrite-listing:{contentHash}`
- [ ] should set TTL to 24h (86400 seconds)
- [ ] should compute contentHash from sorted JSON input

### Pattern 2 — Over-Mocking
- [ ] should handle Redis SET failure gracefully (log + continue)
- [ ] should handle Redis down → call Nowing directly

### Pattern 3 — Edge cases
- [ ] should handle empty input → still compute hash
- [ ] should handle input with different key order → same hash
- [ ] should not cache fallback/error responses

### Pattern 4 — Arithmetic
- [ ] should compute SHA-256 hash deterministically for same input
- [ ] should compute different hashes for different inputs

### Pattern 5 — Error message
- [ ] should log cache write failure with message "Failed to cache Nowing result"

### Pattern 6 — SQL / Integration
- [ ] (integration) should write to Redis and read back the same value

---

## AC-2: Trả kết quả từ cache nếu hit

### Pattern 1 — Mirror
- [ ] should return cached result without calling Nowing
- [ ] should return exactly the cached fields

### Pattern 2 — Over-Mocking
- [ ] should handle Redis GET returning null → call Nowing
- [ ] should handle Redis GET failure → call Nowing

### Pattern 3 — Edge cases
- [ ] should handle cache hit after 1 hour (still within TTL)
- [ ] should handle cache miss after TTL expires
- [ ] should handle corrupted cached JSON → call Nowing and overwrite

### Pattern 4 — Arithmetic
- [ ] should skip one Nowing API call per cache hit (count fetch calls)

### Pattern 5 — Error message
- [ ] should log cache read failure with message "Failed to read Nowing cache"

### Pattern 6 — SQL / Integration
- [ ] (integration) should hit Redis first, then Nowing on miss

---

## AC-3: Fallback đồng nhất khi Nowing lỗi

### Pattern 1 — Mirror
- [ ] should return `{description: null, error: "AI không khả dụng"}` for rewrite failure
- [ ] should return `{summary: null, highlights: [], error: "AI không khả dụng"}` for market-summary failure
- [ ] should return `{matches: [], error: "AI không khả dụng"}` for match-listings failure

### Pattern 2 — Over-Mocking
- [ ] should handle 5xx from Nowing → fallback
- [ ] should handle timeout from Nowing → fallback
- [ ] should handle network error from Nowing → fallback

### Pattern 3 — Edge cases
- [ ] should handle 401 from Nowing → fallback (not crash)
- [ ] should handle invalid JSON from Nowing → fallback

### Pattern 4 — Arithmetic
- [ ] should return `matches: []` (empty array, not null) for match fallback

### Pattern 5 — Error message
- [ ] should log error with message "Nowing engine unavailable" but not leak API key

### Pattern 6 — SQL / Integration
- [ ] (integration) should return fallback when Nowing returns 503
