# ATDD Checklist — story-5-1-deal-radar-mvp

## AC-1: Parse và lưu filter bằng lời

### Pattern 1 — Mirror
- [ ] should return filter with `propertyType`, `location`, `minPrice`, `maxPrice`, `minArea`, `maxArea` parsed
- [ ] should NOT return internal `sellerId` in response

### Pattern 2 — Over-Mocking
- [ ] should handle parser returning null → throw `BadRequestException`
- [ ] should handle DB insert fail → throw `InternalServerErrorException`

### Pattern 3 — Edge cases
- [ ] should handle empty raw query → 400
- [ ] should handle minPrice > maxPrice → 400
- [ ] should handle location with typo → parse best effort
- [ ] should handle negative price → 400

### Pattern 4 — Arithmetic
- [ ] should compute price range ±10% from parsed values

### Pattern 5 — Error message
- [ ] should throw `BadRequestException` with message containing "raw_query"

### Pattern 6 — SQL / Integration
- [ ] (integration) should insert filter and return with generated `id`

---

## AC-2: List filters của seller

### Pattern 1 — Mirror
- [ ] should return only filters belonging to the authenticated seller
- [ ] should return `isActive` and `createdAt`

### Pattern 2 — Over-Mocking
- [ ] should handle DB query fail → throw

### Pattern 3 — Edge cases
- [ ] should handle seller with no filters → return empty array

### Pattern 4 — Arithmetic
- [ ] should return filters sorted by `createdAt` desc

### Pattern 5 — Error message
- [ ] should throw with message "Không thể lấy danh sách filter"

### Pattern 6 — SQL / Integration
- [ ] (integration) should query `deal_radar_filters` where `seller_id = ?`

---

## AC-3: Rule-based matching

### Pattern 1 — Mirror
- [ ] should return listings with matching `propertyType`
- [ ] should return listings within price range ±10%
- [ ] should return listings matching keywords in title/description

### Pattern 2 — Over-Mocking
- [ ] should handle `publicListings` table empty → return empty `matches`
- [ ] should handle parser returning null → throw

### Pattern 3 — Edge cases
- [ ] should handle listing with price exactly at minPrice boundary
- [ ] should handle listing with price exactly at maxPrice boundary
- [ ] should handle keyword not found → not match
- [ ] should handle location fuzzy match (e.g., "Bình Thạnh" matches "P. 25, Bình Thạnh")

### Pattern 4 — Arithmetic
- [ ] should compute score based on number of matching criteria

### Pattern 5 — Error message
- [ ] should throw `NotFoundException` with message "Filter not found" for invalid filter id

### Pattern 6 — SQL / Integration
- [ ] (integration) should query real DB and return matched listings

---

## AC-4: Tạo alert và gửi Zalo qua Nowing automation

### Pattern 1 — Mirror
- [ ] should create `deal_radar_alerts` row with `sourceId`, `sourceType`, `title`, `price`, `area`, `location`
- [ ] should call `NowingAutomationClient.invoke()` with correct `automation_id`
- [ ] should set `sentToZalo=true` after success callback

### Pattern 2 — Over-Mocking
- [ ] should handle Nowing automation 5xx → alert still created, `sentToZalo=false`
- [ ] should handle Nowing automation timeout → alert still created, `sentToZalo=false`

### Pattern 3 — Edge cases
- [ ] should handle listing matching multiple filters → create multiple alerts
- [ ] should handle seller without `nowing_automation_id` → log warning, skip Zalo

### Pattern 4 — Arithmetic
- [ ] should compute `sourceUrl` from listing id

### Pattern 5 — Error message
- [ ] should log "Nowing automation unavailable" without leaking PAT

### Pattern 6 — SQL / Integration
- [ ] (integration) should insert alert and call automation in transaction

---

## AC-5: Mark alert as read

### Pattern 1 — Mirror
- [ ] should set `isRead=true` for owned alert

### Pattern 2 — Over-Mocking
- [ ] should handle DB update fail → throw

### Pattern 3 — Edge cases
- [ ] should handle alert not owned by seller → 403
- [ ] should handle alert already read → idempotent

### Pattern 4 — Arithmetic
- [ ] should return updated alert with `isRead=true`

### Pattern 5 — Error message
- [ ] should throw `ForbiddenException` with message "Không có quyền" for other seller's alert

### Pattern 6 — SQL / Integration
- [ ] (integration) should update `is_read` in real DB
