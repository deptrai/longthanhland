# ATDD Checklist — story-7.1a-nowing-engine-client-base

## AC-1: Client gọi `GET /health` và trả về trạng thái Nowing

### Pattern 1 — Mirror Test
- [ ] should return exactly field `{status}` from `/health`
- [ ] should NOT return internal fields like `apiKey` or `pat`
- [ ] should classify `"up"` as healthy and `"down"` as unhealthy

### Pattern 2 — Over-Mocking
- [ ] should handle `httpService.get` throwing `HttpException`
- [ ] should handle `httpService.get` returning `null` body
- [ ] should handle `httpService.get` returning empty object `{}`

### Pattern 3 — Edge cases
- [ ] should handle `NOWING_ENGINE_URL` missing → throw `NowingEngineConfigError`
- [ ] should handle `NOWING_ENGINE_API_KEY` missing → throw `NowingEngineConfigError`
- [ ] should handle `NOWING_ENGINE_URL` with trailing slash
- [ ] should handle `NOWING_ENGINE_URL` without trailing slash
- [ ] should handle Nowing returning 200 with non-JSON text body
- [ ] should handle Nowing returning 200 with `{status: "degraded"}`

### Pattern 4 — Arithmetic
- [ ] should compute request URL as `${NOWING_ENGINE_URL}/health` (no double slash)

### Pattern 5 — Error message
- [ ] should throw `NowingEngineConfigError` with message containing "NOWING_ENGINE_URL"
- [ ] should throw `NowingEngineError` with message containing status code "5xx" when 5xx

### Pattern 6 — SQL / Integration
- [ ] (integration) should call real `GET /health` and return status

---

## AC-2: Client throw typed error khi lỗi mạng/5xx

### Pattern 1 — Mirror Test
- [ ] should throw `NowingEngineError` (not generic Error)
- [ ] should include `statusCode` field in error
- [ ] should include `message` field in error

### Pattern 2 — Over-Mocking
- [ ] should handle `axios` network timeout
- [ ] should handle `axios` connection refused
- [ ] should handle `axios` DNS failure
- [ ] should handle 4xx response from Nowing
- [ ] should handle 5xx response from Nowing

### Pattern 3 — Edge cases
- [ ] should handle 401 Unauthorized from Nowing (invalid API key)
- [ ] should handle 403 Forbidden from Nowing
- [ ] should handle 503 Service Unavailable from Nowing
- [ ] should handle response body with HTML error page

### Pattern 4 — Arithmetic
- [ ] should set `statusCode` to exact HTTP status (e.g., 503, not 500)

### Pattern 5 — Error message
- [ ] should throw `NowingEngineError` with message containing "Nowing engine unavailable" for 5xx
- [ ] should throw `NowingEngineAuthError` with message containing "Invalid API key" for 401

### Pattern 6 — SQL / Integration
- [ ] (integration) should call real Nowing with wrong API key and throw 401
- [ ] (integration) should call real Nowing when down and throw typed error
