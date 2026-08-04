---
story: 7.1b
epic: 7
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Spec — Story 7.1b: Nowing Engine Client — AI Viết Tin

## Overview

Bdsai gọi Nowing `POST /agent/rewrite-listing` để viết lại mô tả tin đăng từ thông tin cơ bản.

## User Story

As a bdsai backend,
I want gọi Nowing engine để viết lại mô tả tin đăng,
So that seller có mô tả chuẩn SEO từ thông tin cơ bản.

## Acceptance Criteria

1. Service gọi `POST /agent/rewrite-listing` với payload `{title, price, area, location, propertyType}`.
2. Nhận về `{description, seoScore}` với `description` tiếng Việt, 150-300 từ, SEO-friendly.
3. Khi Nowing lỗi/timeout, trả fallback `{description: null, error: "AI không khả dụng"}`.
4. Kết quả được cache theo `contentHash` (nếu Story 7.1e đã implement; nếu chưa, hard-coded TTL hoặc no-op cache).

## API Contract

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/agent/rewrite-listing` | POST | `{title, price, area, location, propertyType}` | `{description, seoScore}` |

## Service API

```typescript
class NowingService {
  async rewriteListing(input: RewriteListingDto): Promise<RewriteListingResponse>
}
```

## Error Handling

- Timeout → fallback + log.
- 4xx/5xx → fallback + log.

## Open Questions

- `seoScore` là số 0-100 hay chuỗi? Cần confirm schema.
