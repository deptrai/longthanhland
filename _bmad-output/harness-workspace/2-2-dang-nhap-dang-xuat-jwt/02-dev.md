# Story 2.2 — Dev Log (Fix Review Findings — Trạm 2b)

**Date:** 2026-06-26
**Agent:** story-developer (opus)
**Task:** Fix 2 findings từ code-reviewer (CHANGES REQUESTED) — HIGH-1 + MEDIUM-1

## Fix review findings (trạm 2b)

### HIGH-1 — Logout dùng jwt.decode (KHÔNG verify signature) → DoS

**Vấn đề:** POST /auth/logout không có JwtAuthGuard. AuthService.logout dùng `jwt.decode` (không verify signature) để extract userId → `admin.signOut(sub, 'global')`. Attacker sửa claim `sub` trong JWT (decode không cần secret) → force global logout nạn nhân (DoS).

**Fix (Option A — JwtAuthGuard):**
1. `auth.controller.ts:76-91`: Thêm `@UseGuards(JwtAuthGuard)` cho POST /auth/logout. Controller lấy `req.user.id` (guard đã verify JWT signature) → truyền cho service. KHÔNG extract token từ header nữa.
2. `auth.service.ts:301-330`: Đổi signature `logout(accessToken?: string)` → `logout(userId: string)`. Xóa `jwt.decode`, xóa `import jwt from 'jsonwebtoken'`. Service nhận userId đã verify từ guard.
3. Giữ E6 idempotent: nếu `admin.signOut` fail (đã logout) → catch error, vẫn return 200 + clear cookie.
4. E6 behavior thay đổi: logout không token → 401 (guard reject) thay vì 200. Điều này đúng — không token = không có session để logout.

**Files thay đổi:**
- `bdsai/apps/api/src/auth/auth.service.ts` — xóa jwt.decode, logout(userId)
- `bdsai/apps/api/src/auth/auth.controller.ts` — thêm @UseGuards(JwtAuthGuard) cho logout

### MEDIUM-1 — JwtAuthGuard không validate iss (issuer)

**Vấn đề:** AC6b yêu cầu validate `iss` (issuer) nhưng guard chỉ verify signature + exp, không check iss. Token signed với cùng HS256 secret nhưng issuer khác (vd Supabase project khác) sẽ được chấp nhận.

**Fix:**
1. `jwt-auth.guard.ts:51-77`: Đọc `SUPABASE_URL` từ ConfigService → `expectedIss = ${SUPABASE_URL}/auth/v1`. Sau `jwt.verify` (HS256 path), check `payload.iss !== expectedIss` → throw UnauthorizedException. Không fallback ES256 khi iss mismatch (reject immediately).
2. ES256 fallback (supabase.auth.getUser) đã validate iss server-side → không cần check thêm.

**Files thay đổi:**
- `bdsai/apps/api/src/auth/guards/jwt-auth.guard.ts` — thêm iss validation

### Test updates

- `auth.service.spec.ts`: Xóa test "logout với token" (jwt.decode), thêm "logout với userId (guard đã verify)" + "E6: signOut fail → vẫn 200 idempotent". Xóa unused `import jwt`.
- `jwt-auth.guard.spec.ts`: Thêm SUPABASE_URL mock. Thêm test "AC6b: HS256 JWT iss sai → 401 (KHÔNG fallback ES256)".
- `auth.e2e-spec.ts`: Đổi "E6: logout không JWT → 200" thành "E6: logout không JWT → 401 (guard reject)".

## Verify (trạm 2b)

### Build / Lint / Typecheck / Unit Test

```
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test
```

| Task | Kết quả |
|------|---------|
| `yarn build` (3 pkg) | PASS (3 successful, 3 total) |
| `yarn lint` (4 task) | PASS (4 successful, 4 total) |
| `yarn typecheck` (4 task) | PASS (4 successful, 4 total) |
| `yarn test` api | 80/80 PASS (9 suite) — was 79, +1 new iss mismatch test |
| `yarn test` web | 18/18 PASS (5 suite) |

### Curl verify (Supabase + Redis + API real)

Setup: `supabase start` + `docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine` + `yarn dev` (apps/api, port 3101).

Register + login test user (email auto-confirm via Supabase admin API):

```
POST /auth/register → 201 { userId, email, phoneVerified, emailVerified }
PUT /auth/v1/admin/users/{userId} { email_confirm: true } → 200
POST /auth/login → 200 { accessToken, refreshToken, user }
```

**Test 1 — GET /auth/me với JWT valid (ES256 từ Supabase) → 200:**
```
curl -s http://localhost:3101/auth/me -H "Authorization: Bearer <valid_token>"
→ HTTP 200 { id, email, phone, phoneVerified, role, banned, createdAt }
```

**Test 2 — POST /auth/logout với JWT valid → 200 + clear cookie (HIGH-1 fix):**
```
curl -s -X POST http://localhost:3101/auth/logout -H "Authorization: Bearer <valid_token>"
→ HTTP 200 { message: "Đăng xuất thành công" }
```

**Test 3 — POST /auth/logout không token → 401 (HIGH-1 fix):**
```
curl -s -X POST http://localhost:3101/auth/logout
→ HTTP 401 { statusCode: 401, message: "Thiếu token xác thực", error: "Unauthorized" }
```

**Test 4 — POST /auth/logout với JWT modified sub (signature invalid) → 401 (HIGH-1 fix):**
```
# Decode JWT payload, change sub to 00000000-0000-0000-0000-000000000000, re-encode (KHÔNG re-sign)
curl -s -X POST http://localhost:3101/auth/logout -H "Authorization: Bearer <modified_jwt>"
→ HTTP 401 { statusCode: 401, message: "Token hết hạn hoặc không hợp lệ", error: "Unauthorized" }
```

**Test 5 — GET /auth/me với HS256 JWT correct iss → 200 (MEDIUM-1 fix):**
```
# Manually sign HS256 JWT with SUPABASE_JWT_SECRET, iss = http://127.0.0.1:54351/auth/v1
curl -s http://localhost:3101/auth/me -H "Authorization: Bearer <hs256_correct_iss>"
→ HTTP 200 { id, email, phone, ... }
```

**Test 6 — GET /auth/me với HS256 JWT WRONG iss → 401 (MEDIUM-1 fix):**
```
# Manually sign HS256 JWT with SUPABASE_JWT_SECRET, iss = http://evil-supabase.example.com/auth/v1
curl -s http://localhost:3101/auth/me -H "Authorization: Bearer <hs256_wrong_iss>"
→ HTTP 401 { statusCode: 401, message: "Token hết hạn hoặc không hợp lệ", error: "Unauthorized" }
```

### E2e test

```
cd bdsai/apps/api && npx jest --config ./test/jest-e2e.json --testPathPatterns=auth
```

```
PASS test/auth.e2e-spec.ts
  ✓ AC4: register hợp lệ → 201
  ✓ AC4: public_users row tồn tại
  ✓ AC7: trùng email → 409
  ✓ AC3: email sai format → 400
  ✓ AC3: phone sai format → 400
  ✓ AC3: password ngắn → 400
  ✓ AC5: phone +84 normalize
  ✓ AC1: login hợp lệ → 200 + Set-Cookie httpOnly
  ✓ AC3/E1: sai password → 401
  ✓ AC3/E2: email không tồn tại → 401 same message
  ✓ AC7: GET /auth/me với JWT → 200
  ✓ AC6: GET /auth/me không JWT → 401
  ✓ AC6/E10: GET /auth/me với JWT malformed → 401
  ✓ AC5: POST /auth/refresh với cookie → 200
  ✓ AC5: POST /auth/refresh không cookie → 401
  ✓ AC2: POST /auth/logout với JWT → 200 + clear cookie
  ✓ E6: POST /auth/logout không JWT → 401 (guard reject — HIGH-1 fix)
  ✓ E9: 6 login sai liên tiếp → 429

Test Suites: 1 passed, 1 total
Tests:       18 passed, 18 total
```

### Teardown

- Deleted test user from Supabase Auth (admin API)
- `docker stop bdsai-redis && docker rm bdsai-redis` — Redis stopped + removed
- `supabase stop` — Supabase local stopped
- Kill API dev server — port 3101 free (lsof confirm)

### Re-verify (trạm 2b — session 2, 2026-06-26)

Re-run full verification để confirm fixes còn đúng:

```
cd bdsai && yarn build && yarn lint && yarn typecheck && yarn test
```

| Task | Kết quả |
|------|---------|
| `yarn build` (3 pkg) | PASS (FULL TURBO, cache hit) |
| `yarn lint` (4 task) | PASS |
| `yarn typecheck` (4 task) | PASS |
| `yarn test` api | 80/80 PASS (9 suite) |
| `yarn test` web | 18/18 PASS (5 suite) |

Curl verify (Supabase + Redis + API real — start fresh):

| Test | Expected | Actual |
|------|----------|--------|
| GET /auth/me valid JWT (ES256) | 200 | **HTTP 200** { id, email, role } |
| POST /auth/logout valid JWT | 200 + clear cookie | **HTTP 200** { message: "Đăng xuất thành công" } |
| POST /auth/logout no token | 401 | **HTTP 401** { message: "Thiếu token xác thực" } |
| POST /auth/logout modified JWT (sub changed, no re-sign) | 401 | **HTTP 401** { message: "Token hết hạn hoặc không hợp lệ" } |
| GET /auth/me HS256 JWT correct iss | 200 | **HTTP 200** { id, email } |
| GET /auth/me HS256 JWT wrong iss | 401 | **HTTP 401** { message: "Token hết hạn hoặc không hợp lệ" } |

E2e (Supabase real — 18/18 PASS):
```
PASS test/auth.e2e-spec.ts (5.985 s)
  ✓ AC2: POST /auth/logout với JWT → 200 + clear cookie
  ✓ E6: POST /auth/logout không JWT → 401 (guard reject — HIGH-1 fix)
  ✓ AC6: GET /auth/me không JWT → 401
  ✓ AC7: GET /auth/me với JWT → 200
  ... (18 total)
Tests: 18 passed, 18 total
```

Teardown: test user deleted (Supabase Auth + public_users), Redis stopped+removed, Supabase stopped, API killed, port 3101 free.

## Findings KHÔNG fix (defer — non-blocking)

- MEDIUM-2 (ThrottlerModule in-memory, không Redis): defer — cần story riêng
- MEDIUM-3 (Login orphan trả 404): defer — discuss với architect
- LOW-1 (CORS origin process.env): defer
- LOW-2 (refresh proxy forward toàn bộ cookie): defer
- LOW-3 (refresh interceptor race condition): defer
- LOW-4 (refreshToken trong body): per-spec, note only
- LOW-5 (act() warning trong test): defer
