---
story: 7.1c
epic: 7
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Spec — Story 7.1c: Nowing Engine Client — Market Summary

## Overview

Bdsai gọi Nowing `POST /agent/market-summary` để lấy tóm tắt thị trường theo khu vực, loại BĐS, và khoảng giá.

## User Story

As a bdsai backend,
I want gọi Nowing engine để lấy tóm tắt thị trường,
So that Deal-Radar có context khi cần.

## Acceptance Criteria

1. Service gọi `POST /agent/market-summary` với `{location, propertyType, priceRange}`.
2. Nhận về `{summary, highlights}` với `summary` 3-5 dòng tiếng Việt.
3. Khi Nowing lỗi/timeout, trả fallback `{summary: null, highlights: [], error: "AI không khả dụng"}`.
4. Kết quả được cache theo `contentHash`.

## API Contract

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/agent/market-summary` | POST | `{location, propertyType, priceRange}` | `{summary, highlights}` |

## Service API

```typescript
class NowingService {
  async getMarketSummary(input: MarketSummaryDto): Promise<MarketSummaryResponse>
}
```

## Error Handling

- Timeout → fallback + log.
- 4xx/5xx → fallback + log.

## Open Questions

- `highlights` là `string[]` hay structured object? Cần confirm schema.
