---
story: 7.1e
epic: 7
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Spec — Story 7.1e: Nowing Engine Client — Cache & Resilience

## Overview

Cache kết quả Nowing engine theo `contentHash` và cung cấp fallback đồng nhất cho tất cả endpoint AI.

## User Story

As a bdsai backend,
I want cache kết quả Nowing engine và có fallback đồng nhất,
So that tôi giảm chi phí AI và không vỡ flow khi engine lỗi.

## Acceptance Criteria

1. Kết quả từ các endpoint AI (`rewrite-listing`, `market-summary`, `match-listings`) được cache theo `contentHash`.
2. TTL cache: 24h.
3. Store: Redis (qua QueueModule/BullMQ Redis hoặc dedicated Redis client).
4. Trước khi gọi Nowing, kiểm tra cache; nếu hit, trả kết quả từ cache.
5. Fallback đồng nhất khi Nowing lỗi/timeout: trả object với `error: "AI không khả dụng"` và các output fields = null/default.
6. Log lỗi qua pino mà không leak `NOWING_ENGINE_API_KEY`.

## Caching Strategy

- `contentHash` = SHA-256 của input JSON (keys sorted).
- Cache key prefix: `nowing:{endpoint}:{contentHash}`.
- TTL: 24h.

## Service API

```typescript
class NowingService {
  async rewriteListing(input: RewriteListingDto): Promise<RewriteListingResponse>
  async getMarketSummary(input: MarketSummaryDto): Promise<MarketSummaryResponse>
  async matchListings(input: MatchListingsDto): Promise<MatchListingsResponse>
}
```

## Error Handling

- Cache miss + Nowing success → cache kết quả, trả kết quả.
- Cache miss + Nowing fail → trả fallback, log lỗi.
- Cache hit → trả kết quả, không gọi Nowing.

## Security

- KHÔNG log `NOWING_ENGINE_API_KEY`.
- KHÔNG cache credentials hoặc PII.

## Open Questions

- Redis cache dùng instance nào? (QueueModule Redis hoặc dedicated?)
- Có cần cache fallback responses không? (No — fallback không nên cache.)
