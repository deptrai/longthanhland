# Code Review — Story 2.2 (Đăng nhập / Đăng xuất JWT)

- **Story key:** 2-2-dang-nhap-dang-xuat-jwt
- **Agent:** code-reviewer (opus)
- **Date:** 2026-06-26
- **Verdict:** **CHANGES REQUESTED** (1 HIGH, 3 MEDIUM, 5 LOW)

Review adversarial — đọc code thật (không tin dev log), chạy build/lint/typecheck/test, grep security invariants.

## Build / Lint / Typecheck / Test (verify thật)

| Task | Kết quả |
|------|---------|
| `yarn build` (3 pkg) | PASS (FULL TURBO, cache hit) |
| `yarn lint` (4 task) | PASS |
| `yarn typecheck` (4 task) | PASS |
| `yarn test` api | 79/79 PASS (9 suite) |
| `yarn test` web | 18/18 PASS (5 suite) |

Không phá Story 1.1–2.1. E2e suite (auth.e2e-spec.ts) gated bởi `supabaseAvailable` — skip khi Supabase local không chạy (không verify được ở review này, leader nên chạy e2e-tester).

## Security grep (verify thật)

- `localStorage` trong apps/web → chỉ 2 hit trong **comment** (auth-context.ts:8, auth-provider.tsx:10) — KHÔNG dùng cho token. ✓
- `SUPABASE_JWT_SECRET|service-role|SERVICE_ROLE` trong apps/web → chỉ trong sentry.server.config.ts (redact pattern), .env.example (comment), lib/supabase/* (comment "KHÔNG service-role ở FE"). KHÔNG expose secret ra web. ✓
- `console.(log|error|warn)` trong apps/api/src/auth → 0 hit. ✓
- Cookie helper: httpOnly + Secure(prod) + SameSite=Lax + Path=/api/auth + Max-Age=7d. ✓
- Login generic error: sai password + email không tồn tại → cùng `UnauthorizedException('Email hoặc mật khẩu không đúng')` (auth.service.ts:243-248). ✓

---

## Findings

### HIGH-1 — Logout dùng `jwt.decode` (KHÔNG verify signature) để extract userId → admin.signOut → DoS forced-logout

- **File:** `bdsai/apps/api/src/auth/auth.service.ts:325-328` + `bdsai/apps/api/src/auth/auth.controller.ts:76-91`
- **Mô tả:** Endpoint `POST /auth/logout` KHÔNG có `@UseGuards(JwtAuthGuard)` (chỉ /auth/me có guard — verified bằng grep). Trong `AuthService.logout`, userId được extract bằng `jwt.decode(accessToken)` — **`jwt.decode` KHÔNG verify signature**, chỉ parse payload. Bất kỳ ai cũng có thể decode JWT của mình, sửa claim `sub` thành UUID của nạn nhân (không cần secret), gửi `POST /auth/logout` với JWT đã sửa → `supabase.auth.admin.signOut(victimSub, 'global')` → **revoke toàn bộ session của nạn nhân (global)**. Đây là server-side forced-logout DoS.
- **Điều kiện khai thác:** Attacker cần biết UUID của nạn nhân. UUID là random 128-bit (không đoán được), NHƯNG nếu bất kỳ endpoint nào expose user id (vd /auth/me trả `id`, listing agent id, comment author id...) thì attacker có được UUID → khai thác được. Comment trong code (auth.service.ts:324) nói "KHÔNG verify lại — guard đã verify nếu có" nhưng thực tế guard KHÔNG apply cho logout.
- **Severity:** HIGH (DoS, yêu cầu biết UUID — exploitability medium, impact high: global session revoke).
- **Cách sửa:** Verify JWT trước khi tin `sub`. Giữ E6 idempotent (no-token → 200):
  ```typescript
  async logout(accessToken?: string): Promise<{ message: string }> {
    if (!accessToken) return { message: 'Đăng xuất thành công' }; // E6
    // Verify JWT (hybrid giống guard) — nếu fail, skip signOut nhưng vẫn 200 + clear cookie.
    const userId = await this.extractVerifiedUserId(accessToken);
    if (userId) {
      try { await this.supabase.auth.admin.signOut(userId, 'global'); }
      catch (e) { this.logger.warn({ action: 'logout', reason: 'supabase-fail', err: this.safeErr(e) }, '...'); }
    }
    return { message: 'Đăng xuất thành công' };
  }
  ```
  `extractVerifiedUserId` = thử `jwt.verify(token, SUPABASE_JWT_SECRET)` (lấy sub), fallback `supabase.auth.getUser(token)` (lấy user.id); cả hai fail → trả undefined (skip signOut, vẫn 200). Hoặc đơn giản hơn: apply `JwtAuthGuard` lên logout nhưng cho phép missing-token pass (custom guard hoặc try/catch guard).

### MEDIUM-1 — JwtAuthGuard KHÔNG validate claim `iss` (issuer)

- **File:** `bdsai/apps/api/src/auth/guards/jwt-auth.guard.ts:54-64`
- **Mô tả:** AC6b yêu cầu "check signature + `exp` (expiry) + `iss` (issuer = Supabase URL)". Guard verify signature + exp qua `jwt.verify` nhưng KHÔNG check `payload.iss === SUPABASE_URL`. Một token signed với cùng HS256 secret nhưng issuer khác (vd từ một Supabase project khác, hoặc một service dùng chung secret) sẽ được chấp nhận. Defense-in-depth gap.
- **Severity:** MEDIUM.
- **Cách sửa:** Sau `jwt.verify`, assert issuer:
  ```typescript
  const expectedIss = this.config.get('SUPABASE_URL', { infer: true });
  if (payload.iss !== expectedIss && !payload.iss?.startsWith(expectedIss)) {
    throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
  }
  ```

### MEDIUM-2 — ThrottlerModule dùng in-memory storage — rate limit KHÔNG share giữa instance

- **File:** `bdsai/apps/api/src/auth/auth.module.ts:27-32`
- **Mô tả:** `ThrottlerModule.forRoot` mặc định dùng in-memory storage. Story 1.6 đã provision Redis. Khi API scale ngang (multi-instance), mỗi instance đếm riêng → giới hạn brute-force (E9, 5/15min/IP) trở thành 5×N (N = số instance) → bảo vệ suy giảm. Story 1.3 hiện deploy single container nên chưa break ngay, nhưng không nhất quán với hạ tầng Redis đã có.
- **Severity:** MEDIUM (latent — thành HIGH nếu API scale).
- **Cách sửa:** Dùng `throttler-storage-redis` (hoặc custom storage) với `REDIS_URL` đã có. Hoặc document ràng buộc single-instance trong ARCHITECTURE-SPINE.

### MEDIUM-3 — Login orphan user trả 404 (khác 401) — việt intent anti-enumeration AC3

- **File:** `bdsai/apps/api/src/auth/auth.service.ts:267-274`
- **Mô tả:** Khi `signInWithPassword` thành công (password ĐÚNG) nhưng `public_users` row thiếu (orphan — Story 2.1 R1), login throw `NotFoundException('Hồ sơ người dùng không tồn tại')` (404). Điều này phân biệt "credential đúng, account tồn tại trong Supabase Auth nhưng thiếu profile" với generic 401. Attacker có password đúng sẽ biết account tồn tại — việt intent anti-enumeration của AC3/AC1d. Orphan là edge case nhưng code path tồn tại.
- **Severity:** MEDIUM (exploitability thấp — cần password đúng — nhưng việt AC3 intent).
- **Cách sửa:** Trong login path, orphan → trả generic 401 "Email hoặc mật khẩu không đúng" (không tiết lộ account tồn tại). Giữ 404 chỉ cho /auth/me (user đã authenticated, không phải enumeration vector). Hoặc đảm bảo orphan không xảy ra (Story 2.1 compensate rollback đã có — accept residual risk + document).

### LOW-1 — CORS origin đọc `process.env` trực tiếp, KHÔNG trong env schema

- **File:** `bdsai/apps/api/src/main.ts:48`
- **Mô tả:** `process.env['NEXT_PUBLIC_WEB_URL']` đọc trực tiếp, KHÔNG có trong `env.validation.ts` schema. Không nhất quán với AC2 (ConfigService) + AD-8 fail-fast. Nếu unset ở prod → default `http://localhost:3100` (sai origin → CORS block prod web). Single-string origin không support multi-origin.
- **Cách sửa:** Thêm `WEB_URL` (hoặc `NEXT_PUBLIC_WEB_URL`) vào envSchema + đọc qua ConfigService.

### LOW-2 — Refresh proxy forward toàn bộ Cookie header tới NestJS

- **File:** `bdsai/apps/web/app/api/auth/refresh/route.ts:23`
- **Mô tả:** Forward nguyên `cookie` header (tất cả cookie) thay vì chỉ `refresh_token`. NestJS cookie-parser parse hết nhưng chỉ đọc refresh_token. Over-sharing không cần thiết.
- **Cách sửa:** Construct `Cookie: refresh_token=<value>` tối thiểu.

### LOW-3 — Refresh interceptor race condition — concurrent 401 trigger nhiều refresh call

- **File:** `bdsai/apps/web/lib/auth-fetch.ts:30-52`
- **Mô tả:** Nếu nhiều request concurrent cùng trả 401, mỗi request độc lập gọi `/api/auth/refresh`. Supabase refresh token rotation → refresh đầu rotate token, các refresh sau dùng cookie cũ (đã invalid) → fail → force logout. Có thể gây logout giả dưới concurrent token expiry.
- **Cách sửa:** Dedupe bằng singleton in-flight refresh promise (nhiều caller await cùng 1 promise).

### LOW-4 — `refreshToken` trả trong login response body (JS-readable)

- **File:** `bdsai/apps/api/src/auth/auth.service.ts:292`
- **Mô tả:** AC1c yêu cầu response gồm `refreshToken` → per-spec. Nhưng intent AC4 (httpOnly cookie cho refresh) bị partial undermine vì refresh token cũng trong body (JS-readable via XSS). Web client ignore nó (login-form.tsx:70 chỉ dùng accessToken+user) → không expose thực tế. Non-browser client (curl) benefit từ body.
- **Cách sửa:** None required (spec-compliant). Optional: omit `refreshToken` khỏi body khi caller là browser (Accept header), hoặc document body refresh_token chỉ cho non-browser.

### LOW-5 — `act()` warning trong auth-context test

- **File:** `bdsai/apps/web/tests/auth-context.test.tsx`
- **Mô tả:** Test output: "An update to AuthProvider inside a test was not wrapped in act(...))". Test pass nhưng emit warning. Cosmetic.
- **Cách sửa:** Wrap restoreSession trigger trong `act()` hoặc dùng `waitFor`.

---

## Bảng verify AC1–AC9

| AC | Status | Ghi chú |
|----|--------|---------|
| AC1 — POST /auth/login → signInWithPassword + access_token + httpOnly cookie | ✓ | auth.service.ts:224, auth.controller.ts:72 setRefreshCookie. Banned check (E7) ✓ |
| AC2 — POST /auth/logout → signOut global + clear cookie | ⚠ | signOut global ✓, clear cookie ✓, idempotent ✓ — NHƯNG userId extract via `jwt.decode` unverified → **HIGH-1** |
| AC3 — Generic error anti-enumeration | ✓ | sai password + email không tồn tại → cùng 401 message (auth.service.ts:243-248). E2e test assert identical. KHÔNG log email raw |
| AC4 — httpOnly cookie + access_token in memory | ✓ | cookie.helper.ts: httpOnly+Secure(prod)+SameSite=Lax+Path=/api/auth+7d. access_token in useState (KHÔNG localStorage — grep confirm) |
| AC5 — POST /auth/refresh → refreshSession + rotated cookie | ✓ | auth.service.ts:359, controller setRefreshCookie rotated. 401 on fail ✓ |
| AC6 — JwtAuthGuard verify JWT + extract sub | ⚠ | Hybrid HS256+ES256 fallback ✓, extract sub ✓, attach request.user ✓ — NHƯNG **KHÔNG check iss** → **MEDIUM-1** |
| AC7 — GET /auth/me → public_users row | ✓ | getMe query public_users (KHÔNG auth.users), 404 orphan ✓ |
| AC8 — Web /login + AuthContext + refresh interceptor | ✓ | /login page + LoginForm (Zod), AuthProvider restore via refresh on mount, useAuthFetch 401→refresh→retry→/login. Race condition **LOW-3** |
| AC9 — PII redact + không phá 1.1-2.1 | ✓ | pino redact accessToken/refreshToken/access_token/refresh_token/SUPABASE_JWT_SECRET ✓, Sentry redact ✓, no console in auth, build/lint/typecheck/test PASS |

## Bảng verify invariant AD

| AD | Status | Ghi chú |
|----|--------|---------|
| AD-2 (Single Data Mutation Path) | ✓ | login/logout/refresh qua Supabase Auth (auth.* exception). public_users chỉ read (check banned, getMe). KHÔNG mutate |
| AD-5 (Auth Separation) | ✓ | SupabaseService service-role client (persistSession:false). JwtAuthGuard verify JWT server-side. KHÔNG service-role key ở web (grep clean) |
| AD-8 (PII/Secret) | ✓ | pino redact + Sentry redact + safeErr redact email/phone. Generic error no email leak. KHÔNG log token raw |
| AD-10 (Next API mỏng) | ✓ | 4 Next API routes (login/logout/refresh/me) — pure forward, zero business logic. JWT verify/banned check/public_users query đều ở NestJS |
| AD-1 (Module Isolation) | ✓ | auth/ module mở rộng, JwtAuthGuard trong auth/guards, cookie.helper trong auth, AuthContext trong web/components/auth |
| AD-4 (SSR Boundary) | ✓ | /login page server wrapper + client island form. AuthContext 'use client'. KHÔNG ảnh hưởng SSR public pages |

## Test quality

- **Unit (79):** auth.service.spec.ts cover AC1 happy, AC3/E1 sai password, AC3/E2 email không tồn tại, E3 email chưa verify, E7 banned, AC2 logout, E6 idempotent, AC5 refresh happy + no-token + revoked, AC7 getMe + orphan. jwt-auth.guard.spec.ts cover HS256 valid, ES256 fallback, no-header, malformed, expired, wrong-secret. ✓ Cover edge case tốt.
- **E2e (auth.e2e-spec.ts):** AC1 login + Set-Cookie httpOnly assert, AC3/E1+E2 identical message assert, AC6 me + no-JWT + malformed, AC5 refresh + no-cookie, AC2 logout + clear cookie, E6 idempotent, E9 rate limit (6 lần → 429). Gated bởi supabaseAvailable (skip nếu Supabase không chạy). Dùng Supabase real. ✓
- **Gap:** E2e KHÔNG test E8 (concurrent login multi-tab global logout), E12 (CSRF SameSite — document only, OK). E4 (expired JWT) chỉ unit test, không e2e. Acceptable.

## Kết luận + Recommendation

Code Story 2.2 chất lượng cao, tuân AC + AD tốt, security hygiene mạnh (redact, anti-enumeration, httpOnly cookie, no localStorage, no service-role leak). Build/lint/typecheck/test toàn bộ PASS.

**CHANGES REQUESTED** do 1 finding HIGH:

1. **HIGH-1 (block):** Logout unverified `jwt.decode` → admin.signOut DoS. **Bắt buộc fix trước merge** — verify JWT trong logout path (giữ E6 idempotent).

3 finding MEDIUM (iss check, throttler Redis storage, orphan 404) + 5 LOW — recommend fix trong cùng PR hoặc follow-up, không block nhưng nên xử lý trước e2e-tester.

**Recommend cho leader:**
- Gửi lại story-developer fix HIGH-1 (verify JWT trong logout).
- Sau fix, chạy lại `yarn build && yarn lint && yarn typecheck && yarn test` + e2e-tester (Supabase real) để verify AC2/E6/E8.
- MEDIUM-1 (iss) nên fix cùng (cheap, defense-in-depth). MEDIUM-2 (throttler Redis) có thể follow-up. MEDIUM-3 (orphan 404) discuss với architect.
