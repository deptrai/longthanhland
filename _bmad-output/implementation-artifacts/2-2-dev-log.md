# Story 2.2 — Đăng nhập/Đăng xuất JWT — Dev Log

**Date:** 2026-06-26
**Status:** DONE
**Story:** `_bmad-output/implementation-artifacts/2-2-dang-nhap-dang-xuat-jwt.md`

## Summary

Implemented user login/logout with JWT sessions for bdsai.vn. Full stack: NestJS API endpoints (login, logout, refresh, me) + Next.js web (login page, AuthProvider context, API thin proxies, conditional header auth actions).

## Implementation Details

### API (apps/api)

**New dependencies:**
- `jsonwebtoken` — local JWT verification (HS256 fast path)
- `@nestjs/throttler` 6.5.0 — rate limiting /auth/login (5/15min/IP)
- `cookie-parser` + `@types/cookie-parser` — httpOnly refresh token cookie

**New/modified files:**
- `src/config/env.validation.ts` — added `SUPABASE_JWT_SECRET` (min 32 chars)
- `src/main.ts` — added `cookieParser()` + CORS with credentials
- `src/auth/dto/login.dto.ts` — LoginDto using shared Zod schema
- `src/auth/dto/refresh.dto.ts` — RefreshDto (refresh_token from cookie or body)
- `src/auth/cookie.helper.ts` — setRefreshCookie (httpOnly, Secure, SameSite=Lax, Path=/api/auth, Max-Age=7d) + clearRefreshCookie
- `src/auth/guards/jwt-auth.guard.ts` — hybrid JWT verify: HS256 local (fast) → ES256 fallback (supabase.auth.getUser)
- `src/auth/auth.service.ts` — login (Supabase signInWithPassword + banned check), logout (admin.signOut), refresh (refreshSession), getMe (public_users query)
- `src/auth/auth.controller.ts` — POST /auth/login (Throttle 5/15min), POST /auth/logout, POST /auth/refresh, GET /auth/me (JwtAuthGuard)
- `src/auth/auth.module.ts` — ThrottlerModule + APP_GUARD ThrottlerGuard
- `src/common/logger/logger.module.ts` — redact accessToken/refreshToken/access_token/refresh_token/SUPABASE_JWT_SECRET
- `src/common/sentry/sentry.util.ts` — redact accessToken/refreshToken/access_token/refresh_token/SUPABASE_JWT_SECRET

**Key decisions:**
- **Hybrid JWT verify:** New Supabase (v2.188+) uses ES256 asymmetric keys, not HS256. Guard tries local HS256 first (0.1ms), falls back to `supabase.auth.getUser(token)` for ES256. Local Supabase same machine → < 1ms.
- **Anti-enumeration:** Login errors (wrong password, email not found) return generic "Email hoặc mật khẩu không đúng" (401). Email not confirmed → 403 "Vui lòng xác thực email trước khi đăng nhập". Banned → 403 "Tài khoản đã bị khóa".
- **Refresh token rotation:** Each /auth/refresh call returns new access + refresh tokens. Old refresh token invalidated by Supabase.
- **Logout idempotent:** No token → 200 "Đăng xuất thành công" without calling signOut.

### Web (apps/web)

**New/modified files:**
- `app/(auth)/login/page.tsx` — login page (server component, Suspense boundary for useSearchParams)
- `app/(auth)/login/login-form.tsx` — client form with Zod UX validation + fetch /api/auth/login
- `app/api/auth/login/route.ts` — thin proxy → NestJS /auth/login (pass-through Set-Cookie)
- `app/api/auth/logout/route.ts` — thin proxy → NestJS /auth/logout
- `app/api/auth/refresh/route.ts` — thin proxy → NestJS /auth/refresh (reads httpOnly cookie)
- `app/api/auth/me/route.ts` — thin proxy → NestJS /auth/me
- `components/auth/auth-context.ts` — AuthContext (accessToken in memory, not localStorage)
- `components/auth/auth-provider.tsx` — AuthProvider (restore session via /api/auth/refresh on mount)
- `components/auth/use-auth.ts` — useAuth hook
- `lib/auth-fetch.ts` — useAuthFetch (JWT refresh interceptor: 401 → auto refresh → retry)
- `components/shared/header-auth-actions.tsx` — conditional auth actions (login/register or email/logout)
- `components/shared/site-header.tsx` — replaced hardcoded buttons with HeaderAuthActions
- `app/layout.tsx` — wrapped children in AuthProvider

**Key decisions:**
- **accessToken in memory only** (React state) — NOT localStorage (XSS protection)
- **Refresh token in httpOnly cookie** — browser sends automatically, JS can't read
- **Session restore on mount:** AuthProvider calls /api/auth/refresh → get new accessToken → /api/auth/me → restore user profile
- **AD-10 compliance:** All API calls go through Next.js thin proxies, not directly to NestJS

### Shared (packages/shared)

- `src/schemas/login.ts` — loginSchema (Zod, same as API validation)
- `src/schemas/index.ts` — export loginSchema

## Test Results

### Unit tests (79 pass)
- `auth.service.spec.ts` — 16 tests (register 8 + login/logout/refresh/getMe 8)
- `jwt-auth.guard.spec.ts` — 7 tests (HS256, ES256 fallback, expired, malformed, no token)
- `env.validation.spec.ts` — 8 tests (including SUPABASE_JWT_SECRET required)
- Other existing tests — 48 pass

### Web tests (18 pass)
- `login-form.test.tsx` — 5 tests (render, validation, submit, API error)
- `auth-context.test.tsx` — 3 tests (render, restore fail, login/logout state)
- `site-header.test.tsx` — 4 tests (updated for HeaderAuthActions)
- Other existing tests — 6 pass

### Build/Lint/Typecheck
- `yarn build` — 3/3 packages PASS
- `yarn lint` — 4/4 tasks PASS
- `yarn typecheck` — 4/4 tasks PASS

### Real verify (curl + Supabase local)
All 7 AC verified with real Supabase + Redis:
- AC1: Login → 200 + accessToken + refreshToken + user + Set-Cookie httpOnly ✓
- AC2: Logout with token → 200 "Đăng xuất thành công" ✓
- AC3: Wrong password → 401 "Email hoặc mật khẩu không đúng" ✓
- AC5: Refresh → 200 + new accessToken (rotated) ✓
- AC6: GET /auth/me without token → 401 "Thiếu token xác thực" ✓
- AC7: GET /auth/me with token → 200 + full user profile ✓
- E6: Logout without token → 200 idempotent ✓

## Notes

- Supabase local v2.188+ uses ES256 asymmetric JWT signing (not HS256). The `SUPABASE_JWT_SECRET` env var is still required for HS256 fast path (older Supabase / production with custom JWT secret). The guard falls back to `supabase.auth.getUser()` for ES256 tokens.
- Rate limiting (E9) tested in e2e suite (6 consecutive failed logins → 429). Not tested in real curl verify to avoid polluting throttler state for other tests.
- E2e tests are gated by `supabaseAvailable` flag (skip if Supabase not running).
