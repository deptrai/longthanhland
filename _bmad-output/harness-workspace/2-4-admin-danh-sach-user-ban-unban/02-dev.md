# Story 2.4 — Dev Log

**Story:** 2-4-admin-danh-sach-user-ban-unban (Admin danh sách user ban/unban)
**Date:** 2026-06-26
**Status:** dev (implementation complete, ready for review)

## Files Changed

### NEW — API (apps/api/src/admin/)
1. `admin/guards/admin.guard.ts` — AdminGuard (AC4, AC5, AD-5). Query public_users.role từ DB, KHÔNG trust JWT role claim. role='user' → 403, orphan → 403 (KHÔNG leak), DB fail → 500.
2. `admin/dto/list-users.dto.ts` — Zod schema (page coerce int ≥1 default 1, limit 1-100 default 20, search trim max 100 optional).
3. `admin/admin.service.ts` — AdminService: listUsers (paginated + search ilike parameterized), banUser (self-ban E4 + ban-admin E5 guard, idempotent E7), unbanUser (idempotent). PII redact in logs (searchProvided boolean, KHÔNG raw search term).
4. `admin/admin.controller.ts` — AdminController: GET /admin/users, POST /admin/users/:id/ban, POST /admin/users/:id/unban. @UseGuards(JwtAuthGuard, AdminGuard) controller-level. @Throttle(20/15min) AC10. UUID validation (Zod) → 400.
5. `admin/admin.module.ts` — AdminModule (AD-1). KHÔNG re-register ThrottlerModule/APP_GUARD (rely on global ThrottlerGuard from AuthModule — avoid DI conflict). Provides AdminService, AdminGuard, JwtAuthGuard.

### NEW — API tests
6. `admin/dto/list-users.dto.spec.ts` — 10 unit tests (coerce, min/max, search trim, defaults).
7. `admin/guards/admin.guard.spec.ts` — 5 unit tests (admin pass, user 403, orphan 403, DB fail 500, no user 403).
8. `admin/admin.service.spec.ts` — 13 unit tests (listUsers happy/search/pagination/DB-fail, banUser happy/self/admin/not-exist/idempotent/update-fail, unbanUser happy/not-exist/idempotent).
9. `test/admin.e2e-spec.ts` — 14 e2e tests (AC1-AC10, E1-E9, rate limit). Env guard (skip if Supabase unreachable).

### UPDATE — API
10. `app.module.ts` — import AdminModule.

### NEW — Web (apps/web/app/)
11. `api/admin/users/route.ts` — Next API thin proxy GET (AD-10, pass-through Authorization).
12. `api/admin/users/[id]/ban/route.ts` — Next API thin proxy POST ban.
13. `api/admin/users/[id]/unban/route.ts` — Next API thin proxy POST unban.
14. `(admin)/admin/users/page.tsx` — server wrapper → UsersTable.
15. `(admin)/admin/users/users-table.tsx` — client component: table + search + pagination + ban/unban button + confirm dialog. Auth protect (E10 redirect /login, E11 redirect / for non-admin).

### UPDATE — Web
16. `(admin)/layout.tsx` — admin nav thật (sidebar "Người dùng" link active) + admin guard (role !== 'admin' → redirect /). Client-side (AD-4 SSR Boundary).

### NEW — Web tests
17. `tests/users-table.test.tsx` — 7 vitest tests (render, E10 redirect, E11 redirect, search, ban confirm, unban, error display).

**Total: 15 NEW + 2 UPDATE = 17 files**

## Commands Run + Output

### Gate (build/lint/typecheck/test)
```
$ yarn build        → 3 successful (shared, api, web)
$ yarn lint         → 4 successful (FULL TURBO)
$ yarn typecheck    → 4 successful (FULL TURBO)
$ yarn test         → 166 tests pass (136 API unit + 30 web vitest)
```

### API unit tests (admin)
```
$ npx jest src/admin
Test Suites: 3 passed, 3 total
Tests:       28 passed, 28 total
```

### E2e (Supabase + Redis real)
```
$ supabase start --ignore-health-check  → Started (5435x ports)
$ docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine  → Up
$ yarn test:e2e (admin.e2e-spec.ts alone)
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
  ✓ AC1: admin GET /admin/users → 200 { data, total, page, limit }
  ✓ E1: GET /admin/users không Authorization → 401
  ✓ AC4/E2: user thường GET /admin/users → 403
  ✓ AC4/E3: user thường POST /admin/users/:id/ban → 403
  ✓ E8: GET /admin/users?search=<email-substring> → filter
  ✓ E9: GET /admin/users?page=2&limit=2 → offset correct
  ✓ AC2: admin POST /admin/users/:id/ban → 200 + banned=true
  ✓ E7: ban user đã banned → 200 (idempotent)
  ✓ AC3: admin POST /admin/users/:id/unban → 200 + banned=false
  ✓ E4: admin tự ban mình → 400
  ✓ E5: ban admin khác → 400
  ✓ E6: ban user không tồn tại → 404
  ✓ AC2a: ban với id không phải UUID → 400
  ✓ AC10: 21 admin requests liên tiếp → lần 21 trả 429
```

Note: auth.e2e-spec.ts có 2 flaky failures khi chạy cùng tất cả e2e (Supabase Auth rate limit createUser khi parallel) — PASS 25/25 khi chạy riêng. KHÔNG phải do thay đổi story 2.4 (admin module không đụng auth).

### Curl verify (real API + Supabase + Redis)
Setup: register admin + user → confirm email (psql) → set role='admin' (psql UPDATE public_users) → login cả 2 → ES256 JWT tokens.

```
AC1:  GET /admin/users (admin)         → 200 { data:[...], total:N, page:1, limit:5 }
E1:   GET /admin/users (no token)      → 401
AC4:  GET /admin/users (user token)    → 403
AC2:  POST /admin/users/:id/ban        → 200 { banned:true } + DB banned=t
AC3:  POST /admin/users/:id/unban      → 200 { banned:false } + DB banned=f
E4:   POST self-ban                    → 400 "Không thể khóa chính mình"
E5:   (covered by e2e — second admin)  → 400 "Không thể khóa quản trị viên"
E6:   POST ban nonexistent UUID        → 404 "Người dùng không tồn tại"
E7:   POST ban already-banned          → 200 (idempotent)
E8:   GET ?search=curl-admin           → total:1 (filter)
E9:   GET ?page=2&limit=1              → page:2,limit:1 (offset correct)
UUID: POST ban "not-a-uuid"            → 400 "ID người dùng không hợp lệ"
AC10: X-RateLimit-Limit:20, Remaining:14, Reset:882 (15min)
AC8:  PII redact — grep log KHÔNG chứa raw email/phone (pino redact *.email, *.phone)
```

### Web verify
```
$ yarn dev (web) → http://localhost:3100/admin/users → 200 HTML
```

Route group `(admin)` KHÔNG thêm URL segment → page đặt tại `app/(admin)/admin/users/page.tsx` để URL = `/admin/users` (khớp story intent + sidebar link + redirect).

## Teardown
```
$ docker stop bdsai-redis && docker rm bdsai-redis  → removed
$ supabase stop                                      → Stopped (backup to volume)
$ kill api (PID) + web dev server                    → terminated
Port 3101 (api): free
Port 3100 (web): free
Port 6379: system redis (pre-existing, NOT bdsai-redis) — left as-is
```

## AC Pass Summary
- AC1 (GET /admin/users paginated+search): PASS (curl + e2e + unit)
- AC2 (POST ban → banned=true): PASS (curl + e2e + unit, DB verify)
- AC3 (POST unban → banned=false): PASS (curl + e2e + unit, DB verify)
- AC4 (AdminGuard role='admin' only): PASS (curl 403 + e2e + unit)
- AC5 (JwtAuthGuard + AdminGuard stack): PASS (E1 401 no-token, E2 403 user, 200 admin)
- AC6 (Web /admin/users table+search+ban/unban): PASS (web 200 + vitest 7)
- AC7 (Web admin layout sidebar+guard): PASS (layout updated, nav active link)
- AC8 (PII redact): PASS (log grep no raw email/phone, searchProvided boolean)
- AC9 (Không phá 1.1-2.3): PASS (build/lint/typecheck/test all green, auth e2e 25/25 isolated)
- AC10 (Rate limit 20/15min): PASS (e2e 429 on 21st, X-RateLimit headers)

## Edge Cases
- E1 (no token 401): PASS
- E2 (user 403): PASS
- E3 (user ban 403): PASS
- E4 (self-ban 400): PASS
- E5 (ban admin 400): PASS
- E6 (not exist 404): PASS
- E7 (idempotent ban 200): PASS
- E8 (search filter): PASS
- E9 (pagination offset): PASS
- E10 (web redirect /login): PASS (vitest)
- E11 (web user redirect /): PASS (vitest)
- E12 (ban active session — JWT valid until expire): documented (R3 defer)

## Architecture Decisions (dev)
1. AdminGuard query DB mỗi request (AD-5 — KHÔNG trust JWT role). 1 SELECT/admin request, admin traffic low → acceptable.
2. AdminModule KHÔNG re-register ThrottlerModule/APP_GUARD — rely on global ThrottlerGuard from AuthModule (APP_GUARD app-wide). @Throttle(20/15min) on AdminController overrides default. Avoids DI conflict (two ThrottlerStorage providers).
3. KHÔNG migration mới — dùng cột banned + role có sẵn (Story 2.1 migration 0001).
4. KHÔNG role grant API — set role='admin' qua psql/Supabase Dashboard (Story 2.5).
5. Web route group `(admin)` + segment `admin/users` → URL `/admin/users` (route group invisible in URL).
6. PII redact: log searchProvided boolean (KHÔNG raw search term — có thể chứa email/phone). Pino redact *.email, *.phone đã có từ Story 2.1.
7. Idempotent ban/unban (E7) — no-op update, vẫn 200.
