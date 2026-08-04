---
story: 7.1a
epic: 7
status: done
spec: _bmad-output/planning-artifacts/specs/spec-nowing-engine-client-7.1a-2026-08-04.md
---

# Story 7.1a: Nowing Engine Client — Base Client & Health Check

## User Story

As a bdsai backend,
I want có một HTTP client để gọi Nowing engine API một cách đáng tin cậy,
So that tôi có thể kiểm tra kết nối và gọi các endpoint AI sau này.

## Acceptance Criteria

**AC-1:** Given bdsai đã cấu hình `NOWING_ENGINE_URL` và `NOWING_ENGINE_API_KEY`, when service gọi `GET /health`, then client trả về trạng thái health của Nowing (up/down).

**AC-2:** Given Nowing engine trả lỗi mạng hoặc 5xx, when client gọi bất kỳ endpoint, then client throw typed error (`NowingEngineError`) với status code và message, không crash process.

## Challenge Log

- What if `NOWING_ENGINE_URL` is missing or empty?
- What if `NOWING_ENGINE_API_KEY` is missing?
- What if Nowing returns non-JSON body?
- What if Nowing health endpoint returns 200 but body is `{status: "degraded"}`?
- What if network timeout happens?
- What if Nowing returns 401/403 due to invalid API key?
