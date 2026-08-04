---
story: 7.1e
epic: 7
status: done
spec: _bmad-output/planning-artifacts/specs/spec-nowing-engine-client-7.1e-2026-08-04.md
---

# Story 7.1e: Nowing Engine Client — Cache & Resilience

## User Story

As a bdsai backend,
I want cache kết quả Nowing engine và có fallback đồng nhất,
So that tôi giảm chi phí AI và không vỡ flow khi engine lỗi.

## Acceptance Criteria

**AC-1:** Given service gọi AI cho 1 listing, when kết quả trả về, then bdsai cache kết quả theo `contentHash` để tránh gọi lại.

**AC-2:** Given service gọi AI với `contentHash` đã cache, when request đến, then client trả kết quả từ cache, không gọi Nowing.

**AC-3:** Given Nowing engine trả lỗi hoặc timeout, when bất kỳ endpoint AI (rewrite, market-summary, match) được gọi, then client trả fallback đồng nhất, log lỗi, và không crash user flow.

## Challenge Log

- What if Redis is down? Fallback to calling Nowing directly (no cache).
- What if content hash collision? Use SHA-256 of sorted JSON.
- What if cached value is corrupted? Validate on read, evict if invalid.
- What if TTL expires mid-request? Use SET NX/EX with 24h.
- What if input contains PII? Hash should not be reversible but input should not be cached raw.
