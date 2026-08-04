---
story: 7.1a
epic: 7
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Spec — Story 7.1a: Nowing Engine Client — Base Client & Health Check

## Overview

Bdsai có một HTTP client để gọi Nowing engine API một cách đáng tin cậy. Story này chỉ xây base client + health check; các endpoint AI cụ thể ở 7.1b-7.1e.

## User Story

As a bdsai backend,
I want có một HTTP client để gọi Nowing engine API một cách đáng tin cậy,
So that tôi có thể kiểm tra kết nối và gọi các endpoint AI sau này.

## Acceptance Criteria

1. Cấu hình `NOWING_ENGINE_URL` và `NOWING_ENGINE_API_KEY`.
2. Client gọi `GET /health` và nhận `{status}`.
3. Client set header `Authorization: Bearer <NOWING_ENGINE_API_KEY>`.
4. Client throw typed error (`NowingEngineError`) khi lỗi mạng/5xx.
5. Timeout 30s.

## API Contract

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/health` | GET | — | `{status}` |

## NestJS Module

```
apps/api/src/nowing/
├── nowing.module.ts
├── nowing.client.ts
└── errors/
    └── nowing-engine.error.ts
```

## Service API

```typescript
class NowingClient {
  async health(): Promise<{ status: string }>
  async request<T>(method: string, path: string, body?: unknown): Promise<T>
}
```

## Error Handling

- Network error → `NowingEngineNetworkError`.
- 5xx → `NowingEngineServerError` với status code.
- Timeout → `NowingEngineTimeoutError`.

## Open Questions

- Nowing engine đã có `/health` chưa? Nếu chưa, dùng `GET /` làm fallback.
- Rate limit Nowing là bao nhiêu?
