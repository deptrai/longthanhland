---
story: 7.1d
epic: 7
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Spec — Story 7.1d: Nowing Engine Client — Deal-Radar Matching

## Overview

Bdsai gọi Nowing `POST /agent/match-listings` để match filter Deal-Radar với danh sách tin.

## User Story

As a bdsai backend,
I want gọi Nowing engine để match filter với danh sách tin,
So that Deal-Radar tìm được tin khớp.

## Acceptance Criteria

1. Service gọi `POST /agent/match-listings` với `{filter, listings}`.
2. Nhận về `{matches[]}` với mỗi item có `listingId`, `score`, `reason`.
3. Khi Nowing lỗi/timeout, trả fallback `{matches: [], error: "AI không khả dụng"}`.
4. Kết quả được cache theo `contentHash`.

## API Contract

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/agent/match-listings` | POST | `{filter, listings[]}` | `{matches[]}` |

## Service API

```typescript
class NowingService {
  async matchListings(input: MatchListingsDto): Promise<MatchListingsResponse>
}
```

## Error Handling

- Timeout → fallback + log.
- 4xx/5xx → fallback + log.

## Open Questions

- Nên dùng Nowing để match hoàn toàn hay chỉ fallback khi local matching không đủ? Để P0 có thể dùng local matching trước, Nowing match deferred.
