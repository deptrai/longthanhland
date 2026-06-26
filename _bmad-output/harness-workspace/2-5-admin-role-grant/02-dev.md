# Story 2.5 — Dev Log (Trạm 2)

**Story key:** 2-5-admin-role-grant
**Agent:** story-developer (direct implementation — subagent rate-limited)
**Date:** 2026-06-26
**Status:** DONE — 8/8 AC pass, 72 e2e pass, 152 unit pass

## Files changed: 4 NEW + 3 UPDATE = 7 files

### API (NestJS) — 2 NEW + 2 UPDATE:
- `apps/api/src/admin/dto/role-grant.dto.ts` — NEW — Zod schema `{ role: 'admin'|'user' }`
- `apps/api/src/admin/dto/role-grant.dto.spec.ts` — NEW — unit test validation
- `apps/api/src/admin/admin.controller.ts` — UPDATE — thêm `POST /admin/users/:id/role` + `@Throttle(10/15min)`
- `apps/api/src/admin/admin.service.ts` — UPDATE — thêm `grantRole()` + `toItem(roleOverride)`

### Web (Next.js) — 1 NEW + 1 UPDATE:
- `apps/web/app/api/admin/users/[id]/role/route.ts` — NEW — thin proxy POST role grant
- `apps/web/app/(admin)/admin/users/users-table.tsx` — UPDATE — thêm role grant/revoke button + confirm dialog

### Test — 1 UPDATE:
- `apps/api/test/admin.e2e-spec.ts` — UPDATE — thêm 10 role grant e2e tests (AC1-AC4, E1-E6, AC2a, AC8 rate limit)

## AC verify (8/8 PASS)

| AC | Test | Result |
|----|------|--------|
| AC1 | POST /admin/users/:id/role { role: 'admin' } → 200 + DB role='admin' | PASS |
| AC1 | POST /admin/users/:id/role { role: 'user' } → 200 + DB role='user' | PASS |
| AC2 | JwtAuthGuard + AdminGuard stack — no token → 401, user → 403, admin → 200 | PASS |
| AC3 | Self-revoke → 400 "Không thể thu hồi vai trò của chính mình" | PASS |
| AC3 | Self-grant → 200 (idempotent) | PASS |
| AC4 | Grant admin cho admin → 200 (idempotent) | PASS |
| AC4 | Revoke admin B → admin B GET /admin/users → 403 (AD-5 query DB) | PASS |
| AC5 | Web /admin/users — role button render (vitest) | PASS |
| AC6 | PII redact — log chỉ targetId + adminId + newRole (no raw email/phone) | PASS |
| AC7 | build 3/3, lint 4/4, typecheck 4/4, test 152 pass | PASS |
| AC8 | Rate limit 10/15min — 11th request → 429 | PASS |

## Edge case verify (8/8 PASS)

| EC | Test | Result |
|----|------|--------|
| E1 | no token → 401 | PASS |
| E2 | user token → 403 | PASS |
| E3 | not exist UUID → 404 | PASS |
| E4 | self-revoke → 400 | PASS |
| E5 | grant admin cho admin → 200 (idempotent) | PASS |
| E6 | invalid role 'superadmin' → 400 | PASS |
| E7 | web chưa login → redirect /login (vitest 2.4) | PASS |
| E8 | web user thường → redirect / (vitest 2.4) | PASS |

## Curl verify (real data — Supabase + Redis)

```
AC1: POST /admin/users/<user_id>/role {role:admin} → 200 {"role":"admin"} + DB role=admin
AC1: POST /admin/users/<user_id>/role {role:user} → 200 {"role":"user"} + DB role=user
E1: POST /admin/users/<id>/role (no token) → 401 "Thiếu token xác thực"
E2: POST /admin/users/<id>/role (user token) → 403 "Không có quyền truy cập"
E3: POST /admin/users/<random-uuid>/role → 404 "Người dùng không tồn tại"
E4: POST /admin/users/<admin_id>/role {role:user} → 400 "Không thể thu hồi vai trò của chính mình"
E5: POST /admin/users/<admin_id>/role {role:admin} → 200 (idempotent self-grant)
E6: POST /admin/users/<id>/role {role:superadmin} → 400 "Validation failed"
E5b: POST /admin/users/<user2_id>/role {role:admin} → 200 (grant admin)
AC8: 11th role grant request → 429 "Too Many Requests"
```

## Gates

- `yarn build` → 3/3 PASS
- `yarn lint` → 4/4 PASS
- `yarn typecheck` → 4/4 PASS
- `yarn test` → 152 API + web unit tests PASS
- `yarn test:e2e` → 72/72 PASS (8 test suites)

## Teardown

- API killed (port 3101 free)
- Web killed (port 3100 free)
- bdsai-redis docker stopped + removed
- Supabase stopped
- System redis on 6379 left as-is (not ours)

## Notes

- Story-author subagent đã viết code implementation (controller + service + DTO + tests + web) trong trạm 1
- Dev trạm 2: verify gates + run e2e với real data + fix e2e test order (AC4 moved before E1-E6 to avoid rate limit 10/15min quota exhaustion)
- Playwright browser test không kết nối được localhost (sandboxed) — vitest users-table.test.tsx cover role button render + curl verify page 200
- AdminGuard reuse từ 2.4 (query DB check role — AD-5) — role change take effect ngay (KHÔNG cần re-login)
- Method-level @Throttle 10/15min override controller-level 20/15min (role grant nhạy cảm hơn ban/unban)
