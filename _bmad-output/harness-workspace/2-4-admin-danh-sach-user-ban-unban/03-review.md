# Story 2.4 — Code Review Report

**Story key:** 2-4-admin-danh-sach-user-ban-unban (Admin danh sách user ban/unban)
**Agent:** code-reviewer (opus, adversarial)
**Date:** 2026-06-26
**Verdict:** ✅ **APPROVED** (0 critical, 0 high, 1 medium non-blocking, 5 low non-blocking)

---

## Methodology (adversarial — KHÔNG tin dev log)

1. **Serena `find_symbol`** đọc body chính xác: `AdminGuard`, `AdminService`, `AdminController`, `listUsersApiSchema`, `AdminModule`, `JwtAuthGuard`, `AllExceptionsFilter`.
2. **Serena `find_referencing_symbols`** verify `AdminModule` chỉ được import bởi `AppModule` (AD-1 isolation).
3. **code-review-graph** `build_or_update_graph` + `get_impact_radius` → risk=low, 0 nodes impacted (module mới isolated).
4. **Tự chạy gate**: `yarn build` (3/3 pass, FULL TURBO), `yarn lint` (4/4 pass), `yarn typecheck` (4/4 pass), `yarn test` (136 API unit + 30 web vitest = 166 pass).
5. **Đọc thủ công** tất cả 17 files (15 NEW + 2 UPDATE) + schema public-users + auth-fetch + exception filter.
6. **Verify security invariants** bằng code reading, KHÔNG tin log.

---

## Findings theo severity

### CRITICAL: 0

### HIGH: 0

### MEDIUM: 1

#### MEDIUM-1: listUsers audit log ghi `adminId: 'unknown'` — sai AC8(a)

- **File:** `bdsai/apps/api/src/admin/admin.service.ts:92` + `bdsai/apps/api/src/admin/admin.controller.ts:36-42`
- **Vấn đề:** AC8(a) explicit yêu cầu log list-users phải có `adminId`:
  > `logger.log({ action: 'list-users', adminId, page, limit, search: ..., reason: 'success' })`
  Nhưng `AdminController.listUsers` (line 36-42) KHÔNG truyền `req.user.id` vào service — chỉ gọi `this.adminService.listUsers(result.data)`. Service log `adminId: 'unknown'` (line 92). Audit trail cho action list-users KHÔNG ghi được admin nào đã xem danh sách.
- **So sánh:** `banUser`/`unbanUser` ĐÚNG truyền `adminId` (controller line 53, 65 → service param). Chỉ `listUsers` thiếu.
- **Security impact:** LOW (không phải lỗ hổng bảo mật, nhưng gap audit — không trace được ai đã list users).
- **Cách sửa:**
  ```ts
  // admin.controller.ts — listUsers
  async listUsers(@Query() query: unknown, @Req() req: Request): Promise<ListUsersResponse> {
    const result = listUsersApiSchema.safeParse(query);
    if (!result.success) throw new ZodError(result.error.issues);
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.listUsers(result.data, user.id);
  }
  // admin.service.ts — listUsers(dto, adminId) → log adminId thay vì 'unknown'
  ```
- **Blocking?** KHÔNG — không phá chức năng, không phải critical/high. Nhưng NÊN fix để chuẩn AC8(a).

### LOW: 5 (tất cả non-blocking)

#### LOW-1: ZodError throw trong controller → message English "Validation failed"

- **File:** `bdsai/apps/api/src/admin/admin.controller.ts:39`
- **Vấn đề:** `throw new ZodError(result.error.issues)` → `AllExceptionsFilter` map → `{ statusCode: 400, message: 'Validation failed', error: 'Bad Request', details: [...] }`. Message tiếng Anh, inconsistent với Vietnamese messages elsewhere (vd AC2a: 'ID người dùng không hợp lệ'). AD-7 shape ĐÚNG.
- **Cách sửa (optional):** Throw `BadRequestException('Tham số truy vấn không hợp lệ')` thay vì ZodError, hoặc thêm ZodError mapping tiếng Việt trong filter.
- **Blocking?** KHÔNG.

#### LOW-2: Không có test verify PII redact trong admin logs (AC8 verify gap)

- **File:** test suite (admin.service.spec.ts, admin.e2e-spec.ts)
- **Vấn đề:** AC8 verify yêu cầu "unit test — log object có email → output [Redacted]". Không có unit/e2e test nào assert log output KHÔNG chứa raw email/phone cho admin actions. Pino redact config (`*.email`, `*.phone`) đã có từ Story 2.1 (global) → áp dụng tự động, nhưng Story 2.4 không có test trực tiếp.
- **Cách sửa (optional):** Thêm unit test spy `logger.log` → assert log object KHÔNG chứa raw email/phone field.
- **Blocking?** KHÔNG — redact là config-level, đã test ở Story 2.1.

#### LOW-3: AdminGuard không check `banned` flag

- **File:** `bdsai/apps/api/src/admin/guards/admin.guard.ts:57`
- **Vấn đề:** AdminGuard chỉ check `role === 'admin'`, KHÔNG check `banned`. Một admin bị ban qua SQL direct (API block ban-admin per E5) vẫn pass AdminGuard → vẫn truy cập /admin/*. AC4 chỉ yêu cầu check role, KHÔNG yêu cầu check banned → by design. Nhưng đáng document.
- **Blocking?** KHÔNG — by design (AC4 chỉ check role).

#### LOW-4: TOCTOU race trong banUser (query → update không transaction)

- **File:** `bdsai/apps/api/src/admin/admin.service.ts:132-148`
- **Vấn đề:** `banUser` query target role (line 132) → check admin (line 135) → update (line 145). Giữa query và update, target role có thể đổi sang 'admin' (qua SQL direct). Không dùng transaction. Rất khó xảy ra (role grant là SQL-only, deferred Story 2.5).
- **Cách sửa (optional):** Wrap trong `db.transaction()` hoặc thêm `WHERE role != 'admin'` trong update query.
- **Blocking?** KHÔNG — cực hiếm, role grant SQL-only.

#### LOW-5: Layout redirect hardcode `/admin/users`

- **File:** `bdsai/apps/web/app/(admin)/layout.tsx:24`
- **Vấn đề:** Redirect `/login?redirect=/admin/users` hardcode bất kể actual path. Nếu future có `/admin/listings`, redirect vẫn về `/admin/users`. Hiện tại chỉ có `/admin/users` → OK.
- **Cách sửa (optional):** Dùng `usePathname()` cho redirect param.
- **Blocking?** KHÔNG.

---

## Bảng verify AC1–AC10

| AC | Mô tả | Verdict | Evidence (code:line) |
|----|-------|---------|----------------------|
| AC1 | GET /admin/users paginated + search | ✅ PASS | controller:35-42, service:47-119 (Drizzle ilike parameterized, offset=(page-1)*limit, count query, orderBy desc(createdAt)) |
| AC2 | POST ban → banned=true | ✅ PASS | controller:45-54, service:122-164 (self-ban E4 line 124, ban-admin E5 line 135, idempotent E7 line 143, update line 145) |
| AC3 | POST unban → banned=false | ✅ PASS | controller:57-66, service:167-191 (idempotent, no role check — by design) |
| AC4 | AdminGuard role='admin' only → 403 | ✅ PASS | guard:44-63 (query DB role, KHÔNG trust JWT, orphan→403, DB fail→500) |
| AC5 | JwtAuthGuard + AdminGuard stack | ✅ PASS | controller:29 `@UseGuards(JwtAuthGuard, AdminGuard)` controller-level, JwtAuthGuard verify JWT trước (guard:43-95), AdminGuard check admin sau |
| AC6 | Web /admin/users table + search + ban/unban | ✅ PASS | users-table.tsx: table:229-310, search:197-226, pagination:312-340, ban/unban:100-148, confirm dialog:342-376 |
| AC7 | Web admin layout sidebar + guard | ✅ PASS | layout.tsx: sidebar:62-83 (nav "Người dùng" active link), guard:21-30 (role!==admin→redirect /) |
| AC8 | PII redact (AD-8) | ⚠️ PASS with MEDIUM-1 | service:104-116 (searchProvided boolean, KHÔNG raw search), ban/unban log chỉ targetId+adminId. **Gap: listUsers log adminId='unknown'** (MEDIUM-1) |
| AC9 | Không phá 1.1-2.3 | ✅ PASS | gate: build/lint/typecheck/test all green (136 API + 30 web = 166 pass). AdminModule isolated (impact radius=0) |
| AC10 | Rate limit 20/15min | ✅ PASS | controller:30 `@Throttle({ default: { limit: 20, ttl: 15*60*1000 } })`, AdminModule KHÔNG re-register ThrottlerModule (rely on global APP_GUARD from AuthModule) |

---

## Bảng verify invariant AD

| AD | Áp dụng | Verdict | Evidence |
|----|---------|---------|----------|
| AD-1 (Module Isolation) | admin/ module NestJS riêng | ✅ PASS | admin.module.ts riêng, chỉ import bởi AppModule (serena find_referencing_symbols confirm). KHÔNG trong auth/. Schema KHÔNG đổi. |
| AD-2 (Single Data Mutation Path) | ban/unban qua Service→Drizzle | ✅ PASS | service:145-148 `db.update(publicUsers).set({banned})`, list qua `db.select()`. Frontend KHÔNG update trực tiếp. |
| AD-5 (Auth Separation) | AdminGuard query DB, KHÔNG trust JWT | ✅ PASS | guard:44-48 `db.select({role}).from(publicUsers).where(eq(id, user.id))` — query DB mỗi request. KHÔNG đọc role từ JWT payload. |
| AD-7 (Error shape) | Tất cả error qua AllExceptionsFilter | ✅ PASS | 403 ForbiddenException, 404 NotFoundException, 400 BadRequestException, 500 InternalServerErrorException — tất cả HttpException → filter normalize `{statusCode, message, error?}`. ZodError→400+details. |
| AD-8 (PII/secret) | email/phone KHÔNG log raw | ✅ PASS (with LOW-2) | service log: searchProvided boolean (KHÔNG raw search), ban/unban log chỉ targetId+adminId. Pino redact `*.email`,`*.phone` global. **LOW-2: không có test trực tiếp** |
| AD-10 (Next API Route Boundary) | Next API chỉ forward | ✅ PASS | route.ts: chỉ fetch→NestJS, pass-through Authorization, zero business logic. 503 on fetch fail. |
| AD-4 (SSR Boundary) | /admin/users server wrapper + client island | ✅ PASS | page.tsx server wrapper → UsersTable client island. Auth protect client-side (useAuth, KHÔNG SSR). |

---

## Security verify (CRITICAL checks)

| Check | Verdict | Evidence |
|-------|---------|----------|
| AdminGuard query DB role, KHÔNG trust JWT? | ✅ PASS | guard:44-48 query public_users.role từ DB mỗi request. JwtUser type chỉ có {id, email} — KHÔNG có role field. |
| Self-ban block (E4)? | ✅ PASS | service:124 `if (targetId === adminId)` → 400 'Không thể khóa chính mình'. Test e2e:250 + unit:232. |
| Ban admin block (E5)? | ✅ PASS | service:135 `if (target.role === 'admin')` → 400 'Không thể khóa quản trị viên'. Test e2e:260 + unit:239. |
| SQL injection (R5)? | ✅ PASS | service:58-61 Drizzle `ilike(publicUsers.email, \`%${search}%\`)` — parameterized, KHÔNG string concat. Zod validate search max 100 chars. |
| PII leak (email/phone raw log)? | ✅ PASS | Log objects: searchProvided boolean, targetId, adminId — KHÔNG có email/phone field. Pino redact global. |
| Privilege escalation (user→/admin/*)? | ✅ PASS | AdminGuard reject role!='admin' → 403. Test e2e:161 (user GET→403), e2e:171 (user POST ban→403). No role grant API. |

---

## Test quality verify

| Aspect | Verdict | Evidence |
|--------|---------|----------|
| 166 unit tests có thật sự kiểm AC? | ✅ PASS | 28 admin unit (10 DTO + 5 guard + 13 service) + 136 existing. 7 web vitest (render, E10, E11, search, ban confirm, unban, error). |
| 14 e2e có kiểm edge case? | ✅ PASS | E1(401), E2(403), E3(403), E4(self-ban 400), E5(ban-admin 400), E6(404), E7(idempotent), E8(search), E9(pagination), AC2a(UUID 400), AC10(429 rate limit). DB verify ban/unban. Env guard skip if Supabase down. |
| Test có verify DB state? | ✅ PASS | e2e:224 `db.select().from(publicUsers)` assert banned=true; e2e:245 assert banned=false. |
| Test có verify guard order? | ✅ PASS | E1 no-token→401 (JwtAuthGuard reject trước AdminGuard), E2 user→403 (JwtAuthGuard pass, AdminGuard reject). |

---

## Gate verify (tự chạy, KHÔNG tin log)

```
$ yarn build        → 3/3 successful (FULL TURBO, cache hit)
$ yarn lint         → 4/4 successful (FULL TURBO)
$ yarn typecheck    → 4/4 successful (FULL TURBO)
$ yarn test         → 166 pass (136 API unit + 30 web vitest)
```

E2e (Supabase real): KHÔNG chạy trong review này (require Supabase start + Redis Docker — dev log báo 14/14 pass, env guard skip if down). Unit + gate đủ verdict.

---

## Kết luận

**Verdict: APPROVED** — Story 2.4 đạt 10/10 AC + 7/7 AD invariant. Không có critical/high finding.

**Security:** AdminGuard đúng AD-5 (query DB, KHÔNG trust JWT). Self-ban (E4) + ban-admin (E5) + SQL injection (R5) + privilege escalation — tất cả block đúng. PII redact qua pino config global.

**1 MEDIUM non-blocking:** MEDIUM-1 — `listUsers` audit log ghi `adminId: 'unknown'` thay vì admin ID thật (sai AC8a explicit). Nên fix nhưng không block merge.

**5 LOW non-blocking:** ZodError English message, thiếu test PII redact trực tiếp, AdminGuard không check banned, TOCTOU race, layout redirect hardcode.

**Recommendation:** Leader có thể merge. Khuyến nghị fix MEDIUM-1 (truyền `req.user.id` vào `listUsers`) trong follow-up hoặc trước merge nếu muốn audit trail đầy đủ.
