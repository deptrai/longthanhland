---
baseline_commit: TBD-by-dev
---

# Story 2.2: Đăng nhập / đăng xuất với JWT session

Status: ready-for-dev

<!-- Story THỨ 2 Epic 2 (User Authentication & Profiles). Story 2.1 (register) DONE — AuthModule + public_users + Supabase Auth đã sẵn. -->
<!-- Dependencies: Story 2.1 (AuthModule + public_users + register endpoint), Story 1.2 (Supabase client + ConfigService + env validation), Story 1.4 (Base UI header + route groups), Story 1.6 (BullMQ queue + pino logger + exception filter + Sentry redact). -->

## Story

As a **người dùng đã đăng ký**,
I want **đăng nhập và đăng xuất an toàn**,
so that **tôi truy cập được tính năng cần xác thực và bảo vệ phiên của mình**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 2 → Story 2.2 (dòng 262-275, AC gốc Given/When/Then) + FR2 (dòng 19: "User đăng nhập, quản lý profile") + AD-5 (Auth Separation, ARCHITECTURE-SPINE.md dòng 63) + Auth token convention (dòng 132: "Supabase JWT in Authorization: Bearer header, verified server-side").
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC9.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.

1. **AC1 — API endpoint `POST /auth/login` xác thực qua Supabase Auth, trả JWT session.**
   Given tài khoản đã tạo từ Story 2.1 (Supabase Auth user + `public_users` row),
   When `POST /auth/login { email, password }` (body đã validate Zod — email format + password non-empty),
   Then:
   (a) **Supabase Auth signInWithPassword:** `supabase.auth.signInWithPassword({ email, password })` (service-role client, `persistSession: false` — session trả trong response, KHÔNG persist server-side). Trả `{ access_token, refresh_token, user }`.
   (b) **public_users read:** query `public_users` row bằng `user.id` (Drizzle — AD-2 read path, KHÔNG mutate). Kiểm tra `banned = false` — nếu banned → từ chối login (403 Forbidden, xem E7).
   (c) **Response:** 200 `{ accessToken, refreshToken, user: { id, email, role, phoneVerified } }` (KHÔNG trả password). `refresh_token` cũng set trong httpOnly cookie (xem AC4).
   (d) **Generic error:** sai mật khẩu HOẶC email không tồn tại → cùng message "Email hoặc mật khẩu không đúng" (401, AD-5 — KHÔNG tiết lộ email tồn tại hay không, xem AC3 + E1/E2).
   Verify: `curl -X POST http://localhost:3101/auth/login -H 'Content-Type-Type: application/json' -d '{"email":"test@bdsai.vn","password":"Abc12345"}'` → 200 + JWT. Set-Cookie header có `refresh_token` httpOnly.

2. **AC2 — API endpoint `POST /auth/logout` xóa phiên server + clear cookie.**
   Given user đã đăng nhập (có access_token),
   When `POST /auth/logout` với `Authorization: Bearer <access_token>` header,
   Then:
   (a) **Supabase Auth signOut:** `supabase.auth.signOut({ scope: 'global' })` — revoke tất cả refresh token của user (Supabase Auth admin API). HOẶC dùng `supabase.auth.admin.signOut(userId)` (service-role — revoke session server-side).
   (b) **Clear cookie:** response set `Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0` (xóa cookie client-side).
   (c) **Response:** 200 `{ message: 'Đăng xuất thành công' }`.
   (d) **Idempotent:** logout khi chưa đăng nhập (không Authorization header) → vẫn 200 (không lỗi — xem E6).
   Verify: `curl -X POST http://localhost:3101/auth/logout -H 'Authorization: Bearer <jwt>'` → 200 + Set-Cookie clear. Request tiếp theo với JWT cũ → guard reject (401) nếu Supabase đã revoke.

3. **AC3 — Generic error: sai mật khẩu / email không tồn tại → cùng message, không leak.**
   Given input login với (a) email tồn tại + sai mật khẩu, (b) email KHÔNG tồn tại,
   When `POST /auth/login`,
   Then:
   (a) Cả 2 trường hợp trả cùng response: 401 `{ statusCode: 401, message: 'Email hoặc mật khẩu không đúng', error: 'Unauthorized' }`.
   (b) KHÔNG tiết lộ email tồn tại hay không (AD-5 — anti-enumeration). KHÔNG có field `emailExists` hay message khác nhau.
   (c) Log server-side: log chỉ `reason: 'invalid-credentials'` + IP (cho rate limit), KHÔNG log email raw (AD-8 — pino redact `*.email` đã có từ Story 2.1).
   (d) Supabase Auth `signInWithPassword` trả error `Invalid credentials` cho cả 2 case → API catch → generic message.
   Verify: e2e — login email tồn tại sai password → 401 generic. Login email không tồn tại → 401 cùng message. So sánh 2 response → identical message.

4. **AC4 — Refresh token lưu httpOnly cookie + access token trong memory (client-side).**
   Given login thành công (AC1),
   Then:
   (a) **refresh_token:** set trong `Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800` (7 ngày — khớp Supabase refresh token expiry). HttpOnly → KHÔNG accessible JavaScript (XSS protection). SameSite=Lax → CSRF protection.
   (b) **access_token:** trả trong JSON response body, client lưu trong memory (React state/context) — KHÔNG cookie (ngắn hạn, 1h). Client gửi qua `Authorization: Bearer` header cho mỗi API request.
   (c) **Dev note:** local dev (HTTP, không HTTPS) — cookie `Secure` có thể bị browser block. Quyết định: `Secure` chỉ set khi `NODE_ENV=production`. Dev local: `Secure` omitted (httpOnly + SameSite=Lax vẫn có).
   (d) **Path=/api/auth:** cookie chỉ gửi cho route `/api/auth/*` (refresh, logout) — giảm exposure.
   Verify: `curl -v` login → inspect `Set-Cookie` header: `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`. `document.cookie` trong browser KHÔNG chứa `refresh_token` (HttpOnly).

5. **AC5 — API endpoint `POST /auth/refresh` đổi access token mới bằng refresh token.**
   Given access token hết hạn (1h) + refresh token còn hạn (7 ngày, trong httpOnly cookie),
   When `POST /auth/refresh` (KHÔNG cần Authorization header — đọc refresh_token từ cookie),
   Then:
   (a) **Đọc refresh_token** từ `req.cookies['refresh_token']` (cookie parser middleware). Nếu KHÔNG có cookie → 401 `{ message: 'Phiên hết hạn, vui lòng đăng nhập lại' }`.
   (b) **Supabase Auth refreshSession:** `supabase.auth.refreshSession({ refresh_token })` → trả new `{ access_token, refresh_token }` (Supabase rotate refresh token — `enable_refresh_token_rotation = true` trong config.toml).
   (c) **Response:** 200 `{ accessToken: <new> }` + set new `refresh_token` cookie (rotated).
   (d) **Refresh fail** (refresh token hết hạn / revoked / reuse interval exceeded) → 401 `{ message: 'Phiên hết hạn, vui lòng đăng nhập lại' }` + clear cookie. Client redirect `/login` (xem AC8).
   Verify: `curl -X POST http://localhost:3101/auth/refresh -b 'refresh_token=<jwt>'` → 200 + new access_token + new Set-Cookie. Refresh với token revoked → 401.

6. **AC6 — NestJS JwtAuthGuard verify Supabase JWT, extract user, attach request.user.**
   Given endpoint cần xác thực (ví dụ `GET /auth/me`),
   When request tới với `Authorization: Bearer <supabase_jwt>`,
   Then:
   (a) **JwtAuthGuard** extract Bearer token từ Authorization header. Nếu thiếu/malformed → 401 `{ message: 'Thiếu token xác thực', error: 'Unauthorized' }`.
   (b) **Verify JWT locally:** dùng `jsonwebtoken.verify(token, SUPABASE_JWT_SECRET)` — check signature + `exp` (expiry) + `iss` (issuer = Supabase URL). Nếu invalid/expired → 401 `{ message: 'Token hết hạn hoặc không hợp lệ', error: 'Unauthorized' }`.
   (c) **Extract user id:** từ JWT claim `sub` (Supabase user id). Attach `request.user = { id, email, role }` (role từ JWT `user_role` claim HOẶC query `public_users` — quyết định dev: query `public_users` cho role chính xác, vì JWT role claim có thể stale).
   (d) **SUPABASE_JWT_SECRET:** env var mới (thêm vào `env.validation.ts`). Local Supabase: JWT secret trong `supabase/config.toml` `[auth]` section (hoặc `supabase status` output). Demo local secret cố định (document trong `.env.example`).
   (e) **Apply guard:** `@UseGuards(JwtAuthGuard)` trên endpoint cần auth. `GET /auth/me` là endpoint test đầu tiên.
   Verify: `curl http://localhost:3101/auth/me -H 'Authorization: Bearer <jwt>'` → 200 `{ id, email, role, phoneVerified }`. Request không header → 401. Request JWT expired → 401.

7. **AC7 — API endpoint `GET /auth/me` trả profile user (cần JwtAuthGuard).**
   Given user đã đăng nhập (có valid JWT),
   When `GET /auth/me` với `Authorization: Bearer <jwt>`,
   Then:
   (a) JwtAuthGuard verify JWT + extract user id (AC6).
   (b) Query `public_users` row bằng `user.id` (Drizzle — AD-2 read).
   (c) Response: 200 `{ id, email, phone, phoneVerified, role, banned, createdAt }` (KHÔNG trả password — password nằm trong Supabase Auth, KHÔNG trong public_users).
   (d) Nếu `public_users` row không tồn tại (orphan — user có Supabase Auth nhưng thiếu public_users, từ Story 2.1 R1) → 404 `{ message: 'Hồ sơ người dùng không tồn tại' }`.
   Verify: e2e — login → GET /auth/me với JWT → 200 + profile. GET /auth/me không JWT → 401.

8. **AC8 — Web page `/login` (route group `(auth)`, form client component) + auth context + JWT refresh interceptor.**
   Given Story 1.4 đã có route group `(auth)` + header nút "Đăng nhập" (`/login`), Story 2.1 đã có `(auth)/register`,
   When tạo:
   (a) **`/login` page:** `apps/web/app/(auth)/login/page.tsx` (server wrapper) + `apps/web/app/(auth)/login/login-form.tsx` (client component). Form fields: email, password. Label tiếng Việt. Submit → `fetch('/api/auth/login', { method: 'POST', body })` (AD-10 — qua Next API thin proxy).
   (b) **Next API thin proxy:** `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/auth/logout/route.ts`, `apps/web/app/api/auth/refresh/route.ts` — forward tới NestJS (AD-10). Login route: forward response + pass-through `Set-Cookie` header (refresh_token cookie). Logout route: forward + clear cookie. Refresh route: đọc cookie `refresh_token` + forward.
   (c) **Auth context:** `apps/web/components/auth/auth-context.tsx` (client component, React context) — store `accessToken` in memory (useState), `user` profile, `isAuthenticated` boolean. Provider wrap app (hoặc wrap route groups cần auth). Login → set accessToken + user. Logout → clear. Token KHÔNG localStorage (XSS) — memory only.
   (d) **JWT refresh interceptor:** `apps/web/lib/api-client.ts` (hoặc hook) — fetch wrapper. Mỗi API request thêm `Authorization: Bearer <accessToken>`. Nếu response 401 (token expired) → tự gọi `/api/auth/refresh` (im lặng, dùng httpOnly cookie) → get new accessToken → retry original request. Nếu refresh cũng fail (401) → clear auth context + redirect `/login` (xem edge case JWT expire).
   (e) **Logout flow:** nút "Đăng xuất" (header, hiển thị khi authenticated) → call `/api/auth/logout` → clear auth context → redirect `/`.
   (f) **Success login:** redirect `/` (hoặc redirect-back URL nếu có `?redirect=` param).
   Verify: browser — navigate `/login`, fill form, submit → API call → success redirect. Header hiện "Đăng xuất" + email user. Refresh page → auth context restore (gọi `/auth/me` với token từ memory? — KHÔNG, token mất khi refresh page → cần gọi `/auth/refresh` để restore session từ httpOnly cookie). Vitest test form render + validation.

9. **AC9 — Không lộ PII/secret trong log (AD-8) + không phá Story 1.1-2.1.**
   Given Story 1.6 pino logger đã redact `*.email`, `*.phone`, `*.password`, `*.token` (Story 2.1 đã update) + Sentry redact PII,
   When login/logout/refresh/me flow log (info/warn/error),
   Then:
   (a) Email KHÔNG log raw trong login attempt (pino redact `*.email`). JWT/access_token/refresh_token KHÔNG log raw (pino redact `*.token` — đã có, thêm `*.accessToken`, `*.refreshToken` nếu cần).
   (b) Sentry beforeSend redact JWT khỏi request headers (Authorization header đã strip từ Story 1.6).
   (c) Exception filter (Story 1.6) KHÔNG leak stack — login error response chỉ `{ statusCode, message, error }`.
   (d) `yarn build && yarn lint && yarn typecheck && yarn test` (cả 3 package: shared, api, web) PASS — không phá 1.1-2.1.
   (e) Story 2.1 register endpoint vẫn hoạt động (KHÔNG break). Health endpoint (`GET /health/supabase`) vẫn 200. Migration 0000 + 0001 vẫn apply đúng.
   Verify: unit test — log object có `email: 'test@bdsai.vn'` → output `[Redacted]`. E2e — login → check pino log KHÔNG chứa email raw + KHÔNG chứa JWT raw.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-2 (Single Data Mutation Path)** | Login/logout/refresh là Supabase Auth flows (`auth.*` — exception AD-2, xem ARCHITECTURE-SPINE.md dòng 49). KHÔNG mutate `public_users` — chỉ read (check `banned`, query profile cho `/auth/me`). Business entity write vẫn qua NestJS API → Service → Drizzle. |
| **AD-5 (Auth Separation)** | Supabase Auth cho auth (signInWithPassword, signOut, refreshSession) — public user JWT. NestJS JwtAuthGuard verify JWT server-side (dòng 132: "Supabase JWT in Authorization: Bearer header, verified server-side"). Service-role key CHỈ backend (SupabaseService đã init — Story 1.2). `public_users.role` discriminator (user/admin) — admin auth flow (separate guard) là Story 2.5, KHÔNG story này. |
| **AD-8 (PII/secret)** | Email KHÔNG log raw trong login attempt (pino redact `*.email` — đã có từ 2.1). JWT/access_token/refresh_token KHÔNG log raw (pino redact `*.token` — đã có). Password KHÔNG log (redact `*.password`). Generic error KHÔNG leak email tồn tại (AC3). Sentry redact Authorization header (đã có từ 1.6). |
| **AD-10 (Next API Route Boundary)** | Web form gọi API qua Next API thin proxy (`apps/web/app/api/auth/login/route.ts`, `logout`, `refresh`) → forward tới NestJS. ZERO business logic trong web — JWT verify, banned check, public_users query đều ở NestJS. Next API route chỉ forward + pass-through cookie. |
| **AD-1 (Module Isolation)** | `auth/` module NestJS mở rộng (thêm login/logout/refresh/me vào AuthController + AuthService). `JwtAuthGuard` trong `auth/guards/` (hoặc `common/guards/` nếu dùng chung). Cookie helper trong `auth/` hoặc `common/`. AuthContext trong `apps/web/components/auth/`. |
| **AD-4 (SSR Boundary)** | `/login` page server component wrapper (server-rendered) + client island form. AuthContext là client component (cần `'use client'`). KHÔNG ảnh hưởng SSR cho public pages. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Sai mật khẩu (email tồn tại).** AC3 — Supabase `signInWithPassword` trả `Invalid credentials`. API catch → 401 generic "Email hoặc mật khẩu không đúng". KHÔNG leak email tồn tại. Test: e2e login sai password → 401 generic.
- **E2 — Email không tồn tại.** AC3 — Supabase `signInWithPassword` trả cùng `Invalid credentials` (KHÔNG "user not found"). API catch → 401 cùng message (identical E1). Test: e2e login email random → 401, so sánh message với E1 → identical.
- **E3 — Email chưa verify (email_confirmed=false).** Supabase config `enable_confirmations = true` → user chưa confirm email KHÔNG đăng nhập được. `signInWithPassword` trả error `Email not confirmed`. API catch → 403 `{ message: 'Vui lòng xác thực email trước khi đăng nhập' }` (message khác E1/E2 — OK vì user đã biết email của mình, KHÔNG leak enumeration). Test: e2e register → login ngay (chưa verify) → 403.
- **E4 — JWT hết hạn (access token 1h).** AC6/AC8 — JwtAuthGuard verify → `exp` check fail → 401. Client interceptor catch 401 → auto refresh (AC5) → retry. Nếu refresh OK → user không thấy gì. Test: unit test guard với expired JWT → 401. E2e: tạo JWT expired → GET /auth/me → 401.
- **E5 — Refresh token hết hạn / revoked.** AC5/AC8 — `refreshSession` fail → 401 + clear cookie. Client interceptor catch → clear auth context + redirect `/login`. Test: e2e refresh với token revoked → 401. E2e: login → logout → refresh với old token → 401.
- **E6 — Logout khi chưa đăng nhập (idempotent).** AC2 — `POST /auth/logout` không Authorization header → vẫn 200 (KHÔNG lỗi). Clear cookie (nếu có) → 200. Test: e2e logout không header → 200.
- **E7 — User bị banned (public_users.banned = true).** AC1b — login thành công Supabase Auth nhưng `public_users.banned = true` → API return 403 `{ message: 'Tài khoản đã bị khóa' }`. KHÔNG return JWT. Test: unit test mock banned → 403. E2e: admin ban user (Story 2.4) → login → 403. (Story 2.2 chỉ check banned flag, admin ban UI là Story 2.4.)
- **E8 — Concurrent login (multi-tab / multi-device).** Supabase Auth hỗ trợ multi-session. Login trên tab 2 → new JWT + refresh token. Tab 1 JWT vẫn valid (until expire). Logout global (AC2 `scope: 'global'`) → revoke tất cả. Test: e2e login 2 lần → 2 JWT khác nhau, cả 2 valid. Logout 1 → cả 2 invalidated (global).
- **E9 — Rate limit brute force (5 login attempt / 15 phút / IP).** AC3 — NestJS throttle: 5 login attempt / 15 phút / IP. Exceed → 429 `{ message: 'Quá nhiều lần thử, thử lại sau 15 phút' }`. Implement qua `@nestjs/throttler` (new dep) HOẶC Redis-based custom guard. Quyết định dev: `@nestjs/throttler` (simple, built-in NestJS). Test: e2e 6 login sai liên tiếp → lần 6 trả 429.
- **E10 — JWT malformed / signature invalid.** AC6 — JwtAuthGuard `jsonwebtoken.verify` throw `JsonWebTokenError` (malformed) hoặc `TokenExpiredError` (expired) hoặc `SignatureError` (wrong secret). Tất cả → 401 generic "Token hết hạn hoặc không hợp lệ". Test: unit test guard với JWT篡改 → 401.
- **E11 — Network timeout (web → API, API → Supabase).** AC1/AC8 — fetch timeout. Web form hiển thị "Lỗi mạng, thử lại". API: supabase client timeout. Test: mock fetch timeout → assert error message user-friendly.
- **E12 — CSRF (SameSite=Lax cookie).** AC4 — `SameSite=Lax` cookie → browser KHÔNG gửi cookie cho cross-site POST (CSRF protection). `GET` request có thể gửi (Lax) nhưng `/auth/refresh` là POST → protected. Test: document CSRF protection, KHÔNG cần automated test (browser-enforced).

## UX Spec tham chiếu

- Form đăng nhập: fields email, password. Label tiếng Việt ("Email", "Mật khẩu").
- Button "Đăng nhập" + link "Chưa có tài khoản? Đăng ký" (`/register`).
- Error inline dưới field (client validation) + toast/banner cho API error (generic "Email hoặc mật khẩu không đúng").
- Success → redirect `/` (hoặc `?redirect=` param nếu có).
- Loading state trên button (spinner + "Đang đăng nhập...").
- Responsive (mobile-first — Story 1.4 Tailwind 4). Touch target ≥ 44px (EXPERIENCE.md).
- Header: khi authenticated → hiện email user + nút "Đăng xuất" (thay "Đăng nhập" + "Đăng ký").
- Tham chiếu: `docs/bdsai/ux/UX-DESIGN.md` (nếu có) + `EXPERIENCE.md` (touch target, contrast AA).

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack + Story 1.2/1.6/2.1 pin)

| Package | Version | Note |
|---------|---------|------|
| @supabase/supabase-js | 2.108.2 (đã có) | `auth.signInWithPassword` / `signOut` / `refreshSession` |
| jsonwebtoken | 9.0.2 (NEW) | JWT verify local trong JwtAuthGuard (AC6) |
| @types/jsonwebtoken | 9.0.9 (NEW, devDep) | TypeScript types cho jsonwebtoken |
| @nestjs/throttler | 6.4.2 (NEW) | Rate limit login brute force (E9) |
| cookie-parser | 1.4.7 (NEW) | Parse httpOnly cookie cho /auth/refresh (AC5) |
| @types/cookie-parser | 1.4.9 (NEW, devDep) | TypeScript types |
| Zod | 3.25.76 (đã có) | Validation login DTO |
| nestjs-pino | 4.6.1 (đã có) | Logger + redact PII (đã có từ 2.1) |
| Next.js | 16.2.9 (đã có) | /login page + API thin proxy |
| React | 19.2.7 (đã có) | AuthContext client component |

### Env var mới — `SUPABASE_JWT_SECRET`

```typescript
// apps/api/src/config/env.validation.ts — UPDATE (thêm field)
export const envSchema = z.object({
  // ... existing fields ...
  // Story 2.2 AC6: Supabase JWT secret — verify JWT local trong JwtAuthGuard.
  // Local: supabase status output (hoặc config.toml [auth] jwt_secret).
  // Demo local secret cố định (document trong .env.example).
  SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET là bắt buộc (≥ 32 ký tự)'),
});
```

```bash
# apps/api/.env.example — THÊM
# --- Story 2.2: Supabase JWT secret (verify JWT local) ---
# Local: chạy `supabase status` → tìm "JWT secret" trong output.
# Demo local cố định (supabase start default):
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
```

Note: Supabase local demo JWT secret mặc định = `super-secret-jwt-token-with-at-least-32-characters-long` (khớp signing key cho anon/service-role demo key). Verify bằng `supabase status` trên máy dev.

### API endpoints — AuthController mở rộng

```
apps/api/src/auth/
├── auth.module.ts              # UPDATE — import JwtAuthGuard + ThrottlerModule
├── auth.controller.ts          # UPDATE — thêm login, logout, refresh, me
├── auth.service.ts             # UPDATE — thêm login(), logout(), refresh(), getMe()
├── dto/
│   ├── register.dto.ts         # (đã có — Story 2.1)
│   └── login.dto.ts            # NEW — Zod schema (email, password)
├── guards/
│   └── jwt-auth.guard.ts       # NEW — JwtAuthGuard (verify Supabase JWT)
├── strategies/
│   └── jwt.strategy.ts         # NEW (optional) — extract JWT từ Bearer header
├── auth.service.spec.ts        # UPDATE — unit test login/logout/refresh/getMe
├── jwt-auth.guard.spec.ts      # NEW — unit test guard
└── cookie.helper.ts            # NEW — set/clear refresh_token cookie helper
```

Flow `auth.service.login()`:
1. Validate input (Zod — login.dto.ts).
2. `supabase.auth.signInWithPassword({ email, password })` → `{ data: { session }, error }`.
3. If error → generic 401 "Email hoặc mật khẩu không đúng" (AC3 — KHÔNG phân biệt email tồn tại).
4. Query `public_users` bằng `session.user.id` → check `banned`. If banned → 403 (E7).
5. Return `{ accessToken: session.access_token, refreshToken: session.refresh_token, user: { id, email, role, phoneVerified } }`.
6. Controller set httpOnly cookie (refresh_token) — AC4.

Flow `auth.service.logout()`:
1. Extract access_token từ Authorization header (guard đã verify).
2. `supabase.auth.signOut({ scope: 'global' })` — revoke tất cả session. HOẶC `supabase.auth.admin.signOut(userId)`.
3. Controller clear cookie (Set-Cookie Max-Age=0).

Flow `auth.service.refresh()`:
1. Đọc refresh_token từ cookie (cookie-parser).
2. `supabase.auth.refreshSession({ refresh_token })` → new session.
3. If error → 401 + clear cookie (E5).
4. Return `{ accessToken: new }` + set new cookie (rotated).

Flow `auth.service.getMe()`:
1. Guard đã verify JWT + attach `request.user.id`.
2. Query `public_users` bằng `user.id` → return profile.
3. If row không tồn tại → 404 (orphan — E từ Story 2.1 R1).

### JwtAuthGuard — verify Supabase JWT local

```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { Env } from '../../config/env.validation';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực');
    }
    const token = authHeader.slice(7);
    const secret = this.config.get('SUPABASE_JWT_SECRET', { infer: true });
    try {
      const payload = jwt.verify(token, secret) as { sub: string; email?: string; exp: number; iss: string };
      // Attach user id (sub) — role query trong service (AC6c).
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
    }
  }
}
```

Note: JwtAuthGuard KHÔNG query `public_users` cho role (tránh DB call mỗi request). Role query trong `getMe()` hoặc service cụ thể khi cần. Guard chỉ verify JWT + extract id. Nếu cần role trong guard → query cache (Redis — future). Story 2.2: guard verify-only, service query role khi cần.

### Cookie helper — set/clear refresh_token

```typescript
// apps/api/src/auth/cookie.helper.ts
import type { Response } from 'express';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 ngày (giây)

export function setRefreshCookie(res: Response, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd, // dev HTTP → omit Secure
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE * 1000, // ms
  });
}

export function clearRefreshCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}
```

### main.ts — thêm cookie-parser + CORS

```typescript
// apps/api/src/main.ts — UPDATE
import cookieParser from 'cookie-parser';
// ...
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
app.use(cookieParser()); // Story 2.2 AC5 — parse refresh_token cookie
app.enableCors({
  origin: process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3100',
  credentials: true, // cho phép cookie cross-origin (web → api khác port)
});
app.enableShutdownHooks();
// ...
```

Note: CORS `credentials: true` cần thiết vì web (3100) → API (3101) cross-origin. Cookie `SameSite=Lax` + CORS credentials → browser gửi cookie. Dev local: web và API khác port = cross-origin.

### AuthModule — thêm ThrottlerModule (rate limit E9)

```typescript
// apps/api/src/auth/auth.module.ts — UPDATE
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 15 * 60 * 1000, // 15 phút
      limit: 5, // 5 request / 15 phút / IP — chỉ cho /auth/login
    }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    // E9: @Throttle trên login endpoint (override global nếu có)
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
```

Note: `@Throttle()` decorator trên `POST /auth/login` chỉ — KHÔNG global (register/me/refresh không cần limit 5/15p). Hoặc global ThrottlerGuard + override per-endpoint. Quyết định dev: `@Throttle(5, 900)` trên login endpoint only.

### Web — /login page + auth context + API client

```
apps/web/app/(auth)/login/
├── page.tsx                    # NEW — server wrapper → LoginForm
└── login-form.tsx              # NEW — client component form

apps/web/app/api/auth/
├── login/route.ts              # NEW — thin proxy → POST NestJS /auth/login (pass-through Set-Cookie)
├── logout/route.ts             # NEW — thin proxy → POST NestJS /auth/logout (clear cookie)
└── refresh/route.ts            # NEW — thin proxy → POST NestJS /auth/refresh (đọc cookie, pass-through new cookie)

apps/web/components/auth/
├── auth-context.tsx            # NEW — React context (accessToken in memory, user, isAuthenticated)
├── auth-provider.tsx           # NEW — provider wrap app (client component)
└── use-auth.ts                 # NEW — hook useAuth() → { user, isAuthenticated, login, logout }

apps/web/lib/
└── api-client.ts               # NEW — fetch wrapper + JWT refresh interceptor (AC8d)

apps/web/components/shared/
└── site-header.tsx             # UPDATE — hiện email + "Đăng xuất" khi authenticated (dùng useAuth)
```

### AuthContext — access token in memory

```typescript
// apps/web/components/auth/auth-context.tsx
'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface AuthState {
  user: { id: string; email: string; role: string } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthState['user']) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthState['user']>(null);
  // Restore session on mount: gọi /api/auth/refresh (httpOnly cookie) → get new accessToken + user.
  // ...

  const login = (token: string, userData: AuthState['user']) => {
    setAccessToken(token);
    setUser(userData);
  };
  const logout = () => {
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isAuthenticated: !!accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

Note: accessToken trong memory (useState) — KHÔNG localStorage (XSS). Refresh page → state mất → AuthProvider mount → gọi `/api/auth/refresh` (httpOnly cookie tự gửi) → restore session. Nếu refresh fail → unauthenticated (redirect login khi cần).

### API client — JWT refresh interceptor

```typescript
// apps/web/lib/api-client.ts
'use client';
import { useAuth } from '@/components/auth/auth-context';

export function useApiClient() {
  const { accessToken, logout } = useAuth();

  async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    let res = await fetch(url, { ...options, headers, credentials: 'include' });

    // 401 → auto refresh im lặng (AC8d)
    if (res.status === 401) {
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const { accessToken: newToken } = await refreshRes.json();
        // Cần update auth context — truyền setter hoặc dùng callback
        headers.set('Authorization', `Bearer ${newToken}`);
        res = await fetch(url, { ...options, headers, credentials: 'include' });
      } else {
        logout();
        window.location.href = '/login';
      }
    }
    return res;
  }

  return { apiFetch };
}
```

Note: Đây là pattern đơn giản. Dev có thể dùng TanStack Query interceptor hoặc axios interceptor nếu thêm dep. Story 2.2 ưu tiên fetch wrapper (KHÔNG thêm dep — dùng fetch native). Hook `useApiClient` trả function `apiFetch` có auto-refresh.

### Next API thin proxy — login (pass-through Set-Cookie)

```typescript
// apps/web/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ statusCode: 400, message: 'Body không hợp lệ' }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    // Pass-through Set-Cookie header (refresh_token httpOnly từ NestJS).
    const setCookie = res.headers.get('set-cookie');
    const response = NextResponse.json(data, { status: res.status });
    if (setCookie) response.headers.set('set-cookie', setCookie);
    return response;
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng' }, { status: 503 });
  }
}
```

Note: Next API route forward `Set-Cookie` header từ NestJS → browser. Cookie `Path=/api/auth` → browser gửi cookie cho `/api/auth/refresh` + `/api/auth/logout` (cùng path prefix). AD-10: zero business logic, chỉ forward.

### Login DTO — Zod schema

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});
export type LoginDto = z.infer<typeof loginSchema>;
```

Note: Login KHÔNG require password ≥ 8 (user có thể nhập sai password ngắn — generic error). Chỉ non-empty. Password strength validation chỉ cho register (Story 2.1).

### Test strategy

- **Unit (jest):**
  - `login.dto.spec.ts` — email sai, password empty → reject.
  - `jwt-auth.guard.spec.ts` — valid JWT → pass, expired JWT → 401, malformed JWT → 401, no header → 401, wrong secret → 401.
  - `auth.service.spec.ts` (UPDATE) — mock supabase.auth + db:
    - login happy path → 200 + tokens + user.
    - login sai password → 401 generic (E1).
    - login email không tồn tại → 401 generic (E2, identical message).
    - login banned user → 403 (E7).
    - logout → signOut called + cookie cleared.
    - refresh happy path → new accessToken + new cookie.
    - refresh fail → 401 + cookie cleared (E5).
    - getMe → profile from public_users.
    - getMe orphan (no public_users row) → 404.
- **Integration (jest e2e):**
  - `auth.e2e-spec.ts` (UPDATE — thêm login/logout/refresh/me tests):
    - Register user (Story 2.1) → login → 200 + JWT + cookie.
    - Login sai password → 401 generic.
    - Login email không tồn tại → 401 identical message.
    - GET /auth/me với JWT → 200 + profile.
    - GET /auth/me không JWT → 401.
    - GET /auth/me JWT expired → 401.
    - POST /auth/refresh với cookie → 200 + new token.
    - POST /auth/refresh không cookie → 401.
    - POST /auth/logout với JWT → 200 + cookie cleared.
    - POST /auth/logout không JWT → 200 (idempotent, E6).
    - Rate limit: 6 login sai → lần 6 trả 429 (E9).
  - Skip nếu Supabase không reach (env guard — pattern từ Story 2.1).
- **Web (vitest):**
  - `login-form.spec.tsx` — form render, validation inline, submit fetch mock, error display, success redirect.
  - `auth-context.spec.tsx` — provider render, useAuth login/logout, isAuthenticated toggle.
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3).

### Source tree (NEW/UPDATE)

```
bdsai/
├── apps/api/
│   ├── src/
│   │   ├── auth/                              # UPDATE directory (AD-1 module riêng)
│   │   │   ├── auth.module.ts                 # UPDATE — import ThrottlerModule + JwtAuthGuard
│   │   │   ├── auth.controller.ts             # UPDATE — thêm login, logout, refresh, me
│   │   │   ├── auth.service.ts                # UPDATE — thêm login(), logout(), refresh(), getMe()
│   │   │   ├── auth.service.spec.ts           # UPDATE — unit test login/logout/refresh/getMe
│   │   │   ├── dto/
│   │   │   │   ├── register.dto.ts            # (đã có — Story 2.1)
│   │   │   │   ├── register.dto.spec.ts       # (đã có)
│   │   │   │   ├── login.dto.ts               # NEW — Zod schema (email, password)
│   │   │   │   └── login.dto.spec.ts          # NEW — unit test
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts          # NEW — verify Supabase JWT (AC6)
│   │   │   │   └── jwt-auth.guard.spec.ts     # NEW — unit test
│   │   │   ├── cookie.helper.ts               # NEW — set/clear refresh_token cookie
│   │   │   └── cookie.helper.spec.ts          # NEW — unit test (optional)
│   │   ├── config/
│   │   │   └── env.validation.ts              # UPDATE — thêm SUPABASE_JWT_SECRET
│   │   ├── app.module.ts                      # UPDATE nếu cần (AuthModule đã import từ 2.1)
│   │   └── main.ts                            # UPDATE — thêm cookie-parser + CORS credentials
│   ├── test/
│   │   └── auth.e2e-spec.ts                   # UPDATE — thêm login/logout/refresh/me/rate-limit tests
│   ├── package.json                           # UPDATE — thêm jsonwebtoken, @nestjs/throttler, cookie-parser
│   └── .env.example                           # UPDATE — thêm SUPABASE_JWT_SECRET
├── apps/web/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                     # (đã có — Story 2.1, dùng chung cho login + register)
│   │   │   ├── register/                      # (đã có — Story 2.1)
│   │   │   └── login/
│   │   │       ├── page.tsx                   # NEW — login page (server wrapper)
│   │   │       └── login-form.tsx             # NEW — client component form
│   │   └── api/
│   │       └── auth/
│   │           ├── register/route.ts          # (đã có — Story 2.1)
│   │           ├── login/route.ts             # NEW — thin proxy (pass-through Set-Cookie)
│   │           ├── logout/route.ts            # NEW — thin proxy (clear cookie)
│   │           └── refresh/route.ts           # NEW — thin proxy (đọc cookie, pass-through)
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-context.tsx               # NEW — React context (accessToken in memory)
│   │   │   ├── auth-provider.tsx              # NEW — provider wrap app
│   │   │   └── use-auth.ts                    # NEW — hook useAuth()
│   │   └── shared/
│   │       └── site-header.tsx                # UPDATE — hiện email + "Đăng xuất" khi authenticated
│   ├── lib/
│   │   └── api-client.ts                      # NEW — fetch wrapper + JWT refresh interceptor
│   ├── tests/
│   │   ├── login-form.test.tsx                # NEW — vitest form test
│   │   └── auth-context.test.tsx              # NEW — vitest context test
│   ├── app/
│   │   └── layout.tsx                         # UPDATE — wrap AuthProvider (client boundary)
│   └── package.json                           # KHÔNG cần dep mới (fetch native, React context)
├── packages/shared/
│   └── src/schemas/
│       ├── index.ts                           # UPDATE — export loginSchema
│       └── login.ts                           # NEW — Zod login schema shared (optional, hoặc duplicate api)
└── supabase/
    └── config.toml                            # KHÔNG ĐỔI (jwt_expiry=3600, refresh rotation đã có)
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **JWT verify local (jsonwebtoken) thay vì supabase.auth.getUser(token):** AC6 — local verify nhanh (~0.1ms vs ~10-20ms network call per request). Cần `SUPABASE_JWT_SECRET` env (new). Trade-off: JWT secret phải sync với Supabase (local demo cố định, prod từ Dashboard). Ưu tiên performance (NFR2 < 200ms P95). Nếu secret rotate → update env + restart. Alternative: `supabase.auth.getUser(token)` (no secret needed, but network call per request) — fallback nếu dev không muốn thêm env.
2. **refresh_token httpOnly cookie + access_token in memory:** AC4 — httpOnly cookie bảo vệ refresh token khỏi XSS (KHÔNG accessible JS). access_token in memory (React state) — ngắn hạn (1h), KHÔNG cookie (tránh CSRF + XSS). Refresh page → memory mất → restore qua `/auth/refresh` (httpOnly cookie tự gửi). Pattern chuẩn SPA auth (OWASP recommended).
3. **SameSite=Lax + Path=/api/auth:** CSRF protection — Lax block cross-site POST (form submit từ site khác). Path restrict cookie chỉ gửi cho `/api/auth/*` (refresh, logout) — giảm exposure. Dev local (HTTP): `Secure` omitted (browser block Secure cookie trên HTTP).
4. **Generic error anti-enumeration (AC3):** Sai password + email không tồn tại → cùng message "Email hoặc mật khẩu không đúng". Supabase Auth `signInWithPassword` đã trả cùng error cho cả 2 → API chỉ forward generic. KHÔNG có field `emailExists`. Email chưa verify (E3) → message khác (403) — OK vì user đã biết email mình.
5. **@nestjs/throttler cho rate limit (E9):** 5 login / 15 phút / IP. Simple, NestJS-native. Alternative: Redis-based custom guard (phức tạp hơn). Throttler dùng in-memory (default) — OK single instance. Prod multi-instance: cần Redis store cho throttler (future). Story 2.2: in-memory throttler OK.
6. **Logout global (scope: 'global'):** Revoke tất cả session (multi-tab/device). Alternative: `scope: 'local'` (chỉ session hiện tại). Ưu tiên global — user expect logout = logout everywhere. E8 concurrent login test verify.
7. **AuthContext client component (KHÔNG localStorage):** access_token trong React state (memory). KHÔNG localStorage/sessionStorage (XSS risk). httpOnly cookie (refresh token) là server-managed. AuthProvider wrap app trong root layout (client boundary). Restore session on mount qua `/auth/refresh`.
8. **Next API thin proxy pass-through Set-Cookie (AD-10):** Login route forward NestJS response + `Set-Cookie` header. KHÔNG parse/manipulate cookie trong web. Logout route forward + clear. Refresh route đọc cookie (forward) + pass-through new cookie. Zero business logic.
9. **JwtAuthGuard verify-only (KHÔNG query role):** Guard chỉ verify JWT + extract `sub` (user id). Role query trong service khi cần (getMe, admin guard Story 2.5). Tránh DB call mỗi request. Nếu cần role trong guard → Redis cache (future). Story 2.2: guard lightweight.
10. **Zod login schema shared (optional):** `packages/shared/src/schemas/login.ts` — api + web import (DRY, AD-1). Hoặc duplicate (login schema đơn giản — email + password non-empty). Ưu tiên shared cho consistency với register (Story 2.1 pattern).

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **R1 — SUPABASE_JWT_SECRET sai (local vs prod mismatch)** | Local: demo secret cố định (document trong .env.example). Prod: lấy từ Supabase Dashboard → Settings → API → JWT Secret. Verify: `jwt.verify(anonKey, secret)` thành công (anon key signed cùng secret). Test e2e verify JWT thật. |
| **R2 — CORS + cookie cross-origin (web 3100 → API 3101)** | `app.enableCors({ credentials: true, origin: web_url })`. Cookie `SameSite=Lax` + CORS credentials → browser gửi cookie. Dev local: web + API khác port = cross-origin. Test: browser login → cookie set → refresh request gửi cookie. |
| **R3 — Refresh token rotation race (concurrent refresh)** | Supabase `refresh_token_reuse_interval = 10` (config.toml) — cho phép reuse refresh token trong 10s. Concurrent refresh request → cùng new token (trong interval). Test: 2 refresh gần nhau → OK. |
| **R4 — access_token in memory mất khi refresh page** | AuthProvider mount → gọi `/auth/refresh` (httpOnly cookie tự gửi) → restore session. Nếu refresh fail → unauthenticated. UX: flash loading state khi restore. Test: refresh page → session restore. |
| **R5 — Throttler in-memory KHÔNG sync multi-instance (prod)** | Prod Dokploy single container (Story 1.3) → OK. Future multi-instance: ThrottlerModule Redis store. Document trong code comment. |
| **R6 — JWT secret rotate (Supabase prod) → existing JWT invalid** | Rotate secret → tất cả existing JWT invalid → user bị logout (401 → refresh fail → redirect login). Mitigation: rotate window (Supabase hỗ trợ grace period) HOẶC announce maintenance. KHÔNG rotate thường xuyên. |
| **R7 — Email chưa verify block login (E3) — UX friction** | Supabase `enable_confirmations = true` (Story 2.1) → user chưa verify KHÔNG login được. Message rõ "Vui lòng xác thực email". Future: resend verification email (Story 2.3/6.2). |
| **R8 — cookie-parser + CORS credentials complexity** | Dev local: web (3100) + API (3101) cross-origin + cookie. Test kỹ trên browser thật (e2e-tester). Fallback: nếu cookie không gửi → access_token trong header cho refresh (alternative pattern). Ưu tiên httpOnly cookie (security best practice). |
| **R9 — jsonwebtoken dep mới (supply chain)** | `jsonwebtoken` 9.0.2 — widely used, maintained. `@types/jsonwebtoken` devDep. Audit `yarn audit` pass. Alternative: `jose` (already transitive dep of @supabase/supabase-js) — nhưng API khác. Ưu tiên jsonwebtoken (simple, well-documented). |

## References

- [Source:] `_bmad-output/planning-artifacts/epics.md` dòng 262-275 (Epic 2, Story 2.2 AC) + dòng 19 (FR2) + dòng 144 (quy ước test) + dòng 358 (JWT expire edge case pattern).
- [Source:] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45 — exception auth flows), AD-5 (dòng 63 — Supabase Auth JWT + NestJS guard), AD-8 (dòng 81 — PII handling), AD-10 (dòng 93 — Next API thin proxy), Auth token convention (dòng 132 — "Supabase JWT in Authorization: Bearer header, verified server-side"), Stack (dòng 136-160), M2 User Management (dòng 312: AD-5, AD-8).
- [Source:] `bdsai/apps/api/src/auth/auth.module.ts` — AuthModule hiện tại (Story 2.1, exports AuthService).
- [Source:] `bdsai/apps/api/src/auth/auth.controller.ts` — controller hiện tại (POST /auth/register — Story 2.1).
- [Source:] `bdsai/apps/api/src/auth/auth.service.ts` — service hiện tại (register logic, safeErr redact pattern, isDuplicateEmail/isRateLimited helpers — reuse cho login).
- [Source:] `bdsai/apps/api/src/auth/dto/register.dto.ts` — Zod schema pattern (preprocess + shared import).
- [Source:] `bdsai/apps/api/src/supabase/supabase.service.ts` — service-role client (`auth` getter — signInWithPassword, signOut, refreshSession, admin.signOut).
- [Source:] `bdsai/apps/api/src/supabase/supabase.module.ts` — @Global, expose SupabaseService.
- [Source:] `bdsai/apps/api/src/config/env.validation.ts` — env schema (cần thêm SUPABASE_JWT_SECRET).
- [Source:] `bdsai/apps/api/src/app.module.ts` — imports (AuthModule đã có từ 2.1).
- [Source:] `bdsai/apps/api/src/main.ts` — bootstrap (cần thêm cookie-parser + CORS).
- [Source:] `bdsai/apps/api/src/queue/queue.service.ts` — QueueService pattern (E1 graceful, E3 retry — tham khảo cho throttler).
- [Source:] `bdsai/apps/api/src/common/logger/logger.module.ts` — pino redact (đã có *.email, *.phone, *.password, *.token từ Story 2.1).
- [Source:] `bdsai/apps/api/src/common/filters/all-exceptions.filter.ts` — exception filter shape (UnauthorizedException → 401 shape).
- [Source:] `bdsai/apps/api/src/common/sentry/sentry.util.ts` — Sentry redact (Authorization header đã strip, email/phone PII đã redact).
- [Source:] `bdsai/apps/api/src/db/schema/public-users.ts` — public_users table (read cho banned check + getMe).
- [Source:] `bdsai/apps/api/src/db/database.tokens.ts` — DrizzleDB type (đã include publicUsers từ 2.1).
- [Source:] `bdsai/apps/api/package.json` — deps (cần thêm jsonwebtoken, @nestjs/throttler, cookie-parser).
- [Source:] `bdsai/apps/api/test/auth.e2e-spec.ts` — e2e test pattern (env guard, supabaseAvailable, pre-cleanup, uniqueSuffix).
- [Source:] `bdsai/apps/web/app/(auth)/layout.tsx` — auth layout (centered card — dùng chung login + register).
- [Source:] `bdsai/apps/web/app/(auth)/register/register-form.tsx` — client form pattern (useState, fetch, Zod validation, error display).
- [Source:] `bdsai/apps/web/app/api/auth/register/route.ts` — Next API thin proxy pattern (forward NestJS, AD-10).
- [Source:] `bdsai/apps/web/components/shared/site-header.tsx` — header (nút Đăng nhập /login, Đăng ký /register — cần update khi authenticated).
- [Source:] `bdsai/apps/web/app/layout.tsx` — root layout (cần wrap AuthProvider).
- [Source:] `bdsai/apps/web/package.json` — deps (Next 16, React 19, @supabase/ssr — KHÔNG cần thêm).
- [Source:] `bdsai/packages/shared/src/schemas/register.ts` — Zod shared schema pattern (thêm login.ts).
- [Source:] `bdsai/supabase/config.toml` — `[auth]` jwt_expiry=3600, enable_refresh_token_rotation=true, refresh_token_reuse_interval=10, `[auth.rate_limit]` sign_in_sign_ups=30, `[auth.email]` enable_confirmations=true.
- [Source:] `_bmad-output/implementation-artifacts/2-1-dang-ky-email-phone.md` — format story file, Dev Notes pattern, edge case format, decisions pattern.
- [Source:] `.claude/skills/bmad-create-story/template.md` — BMad story template (AC, Tasks, Dev Notes, References, Dev Agent Record).

## Dev Agent Record

- **Story points:** 5 (medium — login/logout/refresh API + JwtAuthGuard + web /login + auth context + JWT refresh interceptor + rate limit + cookie).
- **Dependencies:** Story 2.1 (AuthModule + public_users + register), Story 1.2 (Supabase client + ConfigService + env validation), Story 1.4 (Base UI header + route groups), Story 1.6 (BullMQ queue + pino logger + exception filter + Sentry redact).
- **Estimated effort:** 1.5-2 ngày dev + 0.5 ngày test.
- **Status:** ready-for-dev → (dev implement) → review → e2e → done.
