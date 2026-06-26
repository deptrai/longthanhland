---
baseline_commit: e09af53d191f9eeeaf72441a0c5cc9652ad93abb
---

# Story 2.5: Admin role grant

Status: ready-for-dev

<!-- Story THỨ 5 (CUỐI) Epic 2 (User Authentication & Profiles). Story 2.1 (register) + 2.2 (login/logout/JWT) + 2.3 (profile) + 2.4 (admin list/ban/unban) DONE — AdminModule + AdminGuard + AdminController + AdminService + /admin/users page + users-table đã sẵn. -->
<!-- Dependencies: Story 2.1 (AuthModule + public_users + cột role), Story 2.2 (JwtAuthGuard + AuthProvider + useAuthFetch), Story 2.3 (PATCH /auth/me + profile), Story 2.4 (AdminModule + AdminGuard + AdminController + AdminService + /admin/users page + users-table + ban/unban), Story 1.6 (pino logger redact + exception filter + ThrottlerModule global). -->
<!-- SCOPE: Admin (role='admin') grant/revoke admin role cho user khác — POST /admin/users/:id/role { role: 'admin'|'user' }. AdminGuard (reuse từ 2.4) query DB check role. Self-revoke block (admin không thể thu hồi role của chính mình — R1 lockout). Grant admin cho admin khác → idempotent 200. KHÔNG migration mới (dùng cột role đã có từ 2.1). -->

## Story

As a **quản trị viên (admin)**,
I want **cấp và thu hồi vai trò quản trị viên (admin role) cho người dùng khác**,
so that **tôi phân quyền được ai quản lý hệ thống mà không cần truy cập database trực tiếp**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 2 → Story 2.5 (admin role grant) + FR2 (dòng 19: "User đăng nhập, quản lý profile") + AD-2 (Single Data Mutation Path), AD-5 (Auth Separation — AdminGuard query DB, KHÔNG trust JWT role), AD-7 (Error shape), AD-8 (PII redact), AD-10 (Next API mỏng).
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC8.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.
> **Scope:** Story 2.5 thêm endpoint role grant/revoke + web button. REUSE AdminGuard + AdminModule + AdminController + AdminService từ 2.4 (KHÔNG tạo module mới). KHÔNG migration mới (cột `role` đã có từ Story 2.1 migration 0001).

1. **AC1 — `POST /admin/users/:id/role` — set role='admin' hoặc role='user' → 200.**
   Given admin đã đăng nhập (valid JWT + `public_users.role = 'admin'`) + target user tồn tại,
   When `POST /admin/users/:id/role` với body `{ role: 'admin' | 'user' }` + `Authorization: Bearer <admin-jwt>`,
   Then:
   (a) **Validate `:id`** — UUID format (Zod `.uuid()`). Invalid UUID → 400 `{ message: 'ID người dùng không hợp lệ' }` (reuse `assertUuid` từ 2.4).
   (b) **Validate body** — Zod schema `roleGrantSchema = z.object({ role: z.enum(['admin', 'user']) })`. Invalid role (không phải 'admin'|'user') → 400 `{ message: 'Vai trò không hợp lệ' }` (E6).
   (c) **Query target user:** `db.select().from(publicUsers).where(eq(publicUsers.id, targetId))` → check tồn tại (→ 404 E3).
   (d) **Self-revoke check (E4):** if `targetId === req.user.id` AND `body.role === 'user'` → 400 `{ message: 'Không thể thu hồi vai trò của chính mình' }` (R1 — prevent admin lockout). Self-grant (set role='admin' cho chính mình) → idempotent 200 (đã là admin rồi — E5).
   (e) **Update:** `db.update(publicUsers).set({ role: body.role, updatedAt: new Date() }).where(eq(publicUsers.id, targetId))` (AD-2 mutation qua NestJS Service → Drizzle).
   (f) **Idempotent (E5):** if `targetUser.role === body.role` already → vẫn 200 (KHÔNG error — idempotent). Update ghi đè role (no-op effect).
   (g) **Response:** 200 `{ id, email, phone, role: <new-role>, banned, createdAt }` (return profile mới — same shape `AdminUserItem` từ 2.4).
   (h) **Log:** `logger.log({ action: 'role-grant', targetId, adminId: req.user.id, newRole: body.role, reason: 'success' }, 'Admin role grant')` — KHÔNG log email/phone raw (AD-8 — pino redact `*.email`, `*.phone` đã có).
   Verify: `curl -X POST http://localhost:3101/admin/users/<userId>/role -H 'Authorization: Bearer <admin-jwt>' -H 'Content-Type: application/json' -d '{"role":"admin"}'` → 200 + `{ role: 'admin' }`. `psql` — `SELECT role FROM public_users WHERE id='<userId>'` → `admin`.

2. **AC2 — AdminGuard + JwtAuthGuard stack (reuse từ 2.4) — chỉ admin mới truy cập /admin/users/:id/role.**
   Given endpoint `/admin/users/:id/role` nằm trong `AdminController` (controller-level `@UseGuards(JwtAuthGuard, AdminGuard)` từ 2.4),
   When request tới,
   Then:
   (a) **Order:** JwtAuthGuard chạy trước (verify JWT + extract `req.user.id`) → AdminGuard chạy sau (query DB check role === 'admin').
   (b) **No token / expired / malformed** → JwtAuthGuard reject 401 (KHÔNG tới AdminGuard) (E1).
   (c) **Valid JWT but role='user'** → JwtAuthGuard pass → AdminGuard reject 403 (E2).
   (d) **Valid JWT + role='admin'** → cả 2 pass → controller handler chạy.
   (e) Guard stack apply tự động (controller-level từ 2.4 — KHÔNG cần thêm `@UseGuards` per-method).
   Verify: `curl -X POST http://localhost:3101/admin/users/<id>/role` (no token) → 401. `curl ... <user-jwt>` → 403. `curl ... <admin-jwt>` → 200.

3. **AC3 — Self-revoke block — admin không thể set role='user' cho chính mình → 400.**
   Given admin đã đăng nhập,
   When `POST /admin/users/<self-id>/role` với body `{ role: 'user' }`,
   Then:
   (a) Service check `targetId === adminId` AND `newRole === 'user'` → 400 `{ message: 'Không thể thu hồi vai trò của chính mình' }` (R1 — prevent lockout).
   (b) Log warn `{ action: 'role-grant', targetId, adminId, newRole: 'user', reason: 'self-revoke' }`.
   (c) **Self-grant** (set role='admin' cho chính mình) → idempotent 200 (đã là admin — E5, KHÔNG block).
   Verify: `curl -X POST http://localhost:3101/admin/users/<self-id>/role -d '{"role":"user"}' -H <admin-jwt>` → 400. `curl ... -d '{"role":"admin"}'` → 200 (idempotent).

4. **AC4 — Grant admin cho admin khác → 200 (idempotent — đã là admin rồi).**
   Given admin A đã đăng nhập + admin B tồn tại (role='admin'),
   When `POST /admin/users/<admin-B-id>/role` với body `{ role: 'admin' }`,
   Then:
   (a) Target user tồn tại (→ 404 if not — E3).
   (b) `targetUser.role === 'admin'` already → vẫn 200 (idempotent — KHÔNG error). Update ghi đè role='admin' (no-op).
   (c) Response 200 `{ role: 'admin' }`.
   (d) **Revoke admin** (set role='user' cho admin khác) → allowed (200). Admin B mất quyền admin — AdminGuard query DB mỗi request → admin B request /admin/* tiếp theo → 403 (role='user' now). KHÔNG cần re-login để take effect (AD-5 — AdminGuard query DB, KHÔNG trust JWT).
   Verify: `curl -X POST /admin/users/<admin-B-id>/role -d '{"role":"admin"}'` → 200 (idempotent). `curl ... -d '{"role":"user"}'` → 200 + admin B GET /admin/users → 403 (role changed, AdminGuard query DB).

5. **AC5 — Web `/admin/users` — thêm button "Cấp admin" / "Thu hồi admin" trong table.**
   Given Story 2.4 đã có `users-table.tsx` (client component — table + search + pagination + ban/unban button),
   When update table:
   (a) **Role action column:** thêm button trong cột "Hành động" (cùng cell với ban/unban). Nếu `item.role === 'user'` → button "Cấp admin" (blue outline). Nếu `item.role === 'admin'` → button "Thu hồi admin" (amber/orange outline).
   (b) **Click "Cấp admin":** `useAuthFetch()('/api/admin/users/<id>/role', { method: 'POST', body: JSON.stringify({ role: 'admin' }) })` → refresh row (update role locally). Loading state trên button. Confirm dialog ("Bạn chắc chắn cấp quyền quản trị viên cho <email>?") trước khi grant (tránh misclick — admin role là quyền cao).
   (c) **Click "Thu hồi admin":** confirm dialog ("Bạn chắc chắn thu hồi quyền quản trị viên của <email>?") → `useAuthFetch()('/api/admin/users/<id>/role', { method: 'POST', body: JSON.stringify({ role: 'user' }) })` → refresh row.
   (d) **Self-revoke UI block:** nếu `item.id === user.id` AND `item.role === 'admin'` → KHÔNG hiển thị button "Thu hồi admin" (disable + tooltip "Không thể thu hồi vai trò của chính mình"). Client-side check (server cũng block — AC3 defense-in-depth).
   (e) **Success:** toast "Đã cấp quyền quản trị viên" / "Đã thu hồi quyền quản trị viên" + update row role badge (User→Admin hoặc Admin→User).
   (f) **Error:** hiển thị message từ API (403 → "Không có quyền", 404 → "Người dùng không tồn tại", 400 → "Không thể thu hồi vai trò của chính mình" / "Vai trò không hợp lệ").
   Verify: browser — login admin → `/admin/users` → click "Cấp admin" trên row user → confirm → toast + badge đổi Admin. Click "Thu hồi admin" → confirm → toast + badge đổi User. Row của chính mình → KHÔNG có button "Thu hồi admin".

6. **AC6 — PII redact (AD-8): không log email/phone raw trong role grant actions.**
   Given Story 2.1/2.2 đã redact `*.email`, `*.phone`, `*.password`, `*.token` trong pino + Sentry,
   When role grant/revoke flow log (info/warn/error),
   Then:
   (a) **Role grant:** log chỉ `targetId` + `adminId` + `newRole` + `action` + `reason` — KHÔNG log target email/phone raw (pino redact `*.email`, `*.phone` đã có từ 2.1 — áp dụng cho log object fields).
   (b) **Sentry:** role grant error → Sentry redact email/phone khỏi request body + query params (đã có từ Story 1.6).
   (c) **Exception filter:** KHÔNG leak stack — role grant error response chỉ `{ statusCode, message, error }` (AD-7).
   Verify: unit test — log object có `email: 'test@bdsai.vn'` → output `[Redacted]`. E2e — grant role → check pino log KHÔNG chứa target email raw.

7. **AC7 — Không phá Story 1.1-2.4 (build/lint/typecheck/test pass).**
   Given Story 2.1 (register) + 2.2 (login/logout/refresh/me) + 2.3 (profile/avatar) + 2.4 (admin list/ban/unban) đã DONE,
   When implement role grant endpoint + web button,
   Then:
   (a) `yarn build && yarn lint && yarn typecheck && yarn test` (cả 3 package: shared, api, web) PASS — không phá 1.1-2.4.
   (b) Story 2.4 admin list/ban/unban vẫn hoạt động (KHÔNG break — role grant là endpoint mới + button mới, KHÔNG đổi ban/unban logic).
   (c) Story 2.1 register + 2.2 login/logout/refresh/me + 2.3 PATCH /auth/me + upload avatar vẫn hoạt động (KHÔNG break).
   (d) Health endpoint (`GET /health/supabase`) vẫn 200. Migration 0000 + 0001 + 0002 vẫn apply đúng (KHÔNG migration mới — story 2.5 KHÔNG đổi schema, chỉ dùng cột `role` đã có).
   Verify: e2e — register → login → PATCH /auth/me → admin list → ban → unban → grant role → tất cả vẫn 200.

8. **AC8 — Rate limit — 10 role grant / 15 phút (tránh spam role grant).**
   Given `@nestjs/throttler` đã có từ Story 2.2 (global ThrottlerGuard via AuthModule APP_GUARD),
   When apply rate limit trên role grant endpoint,
   Then:
   (a) `@Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })` trên method `grantRole` (method-level override — 10 role grants / 15 phút / IP). KHÔNG override controller-level throttle (20/15min từ 2.4) — method-level @Throttle override cho endpoint này cụ thể (10/15min — chặt hơn vì role grant là action nhạy cảm).
   (b) Exceed → 429 `{ message: 'Quá nhiều yêu cầu, thử lại sau 15 phút' }` (AD-7 error shape).
   (c) KHÔNG đăng ký ThrottlerModule/APP_GUARD thứ hai (reuse global từ AuthModule — tránh DI conflict, pattern từ 2.4).
   Verify: e2e — 11 role grant requests liên tiếp → lần 11 trả 429.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-2 (Single Data Mutation Path)** | AC1 — role grant qua NestJS AdminService → Drizzle `db.update(publicUsers).set({ role })`. Frontend KHÔNG update public_users trực tiếp. |
| **AD-5 (Auth Separation)** | AC2 — AdminGuard query `public_users.role` từ DB (KHÔNG trust JWT role claim — reuse từ 2.4). Role change take effect ngay (AdminGuard query DB mỗi request — admin B bị revoke → request /admin/* tiếp theo → 403, KHÔNG cần re-login). |
| **AD-7 (Error shape)** | Tất cả role grant error → `{ statusCode, message, error?, details? }` qua AllExceptionsFilter (Story 1.6). 403 Forbidden, 404 Not Found, 400 Bad Request, 429 Too Many Requests — consistent shape. |
| **AD-8 (PII/secret)** | AC6 — email/phone KHÔNG log raw (pino redact `*.email`, `*.phone` đã có). Sentry redact. Exception filter KHÔNG leak stack. |
| **AD-10 (Next API Route Boundary)** | AC5 — Next API route (`/api/admin/users/:id/role`) chỉ forward tới NestJS. ZERO business logic — admin check, role grant logic ở NestJS. Web chỉ client-side UX (button, confirm dialog). |
| **AD-1 (Module Isolation)** | REUSE `admin/` module từ 2.4 (AdminController + AdminService + AdminGuard). KHÔNG tạo module mới. Thêm endpoint + method vào module có sẵn. Drizzle schema KHÔNG đổi (dùng cột `role` đã có từ Story 2.1). |
| **AD-4 (SSR Boundary)** | `/admin/users` page (2.4) — role button client-side (accessToken in memory — SSR không biết auth state). KHÔNG SSR protect. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Không token (POST /admin/users/:id/role).** AC2 — JwtAuthGuard reject → 401 `{ message: 'Thiếu token xác thực' }`. Test: e2e POST /admin/users/:id/role không Authorization → 401.
- **E2 — User thường gọi POST /admin/users/:id/role.** AC2 — AdminGuard query DB → role='user' → 403 `{ message: 'Không có quyền truy cập' }`. Test: e2e login user thường → POST role → 403.
- **E3 — User không tồn tại (POST role).** AC1c — 404 `{ message: 'Người dùng không tồn tại' }`. Test: e2e POST /admin/users/<random-uuid>/role → 404.
- **E4 — Admin tự thu hồi role mình (self-revoke).** AC3 — 400 `{ message: 'Không thể thu hồi vai trò của chính mình' }`. Test: e2e admin → POST /admin/users/<self-id>/role { role: 'user' } → 400. (R1 — prevent lockout.)
- **E5 — Grant admin cho admin (idempotent).** AC1f/AC4 — vẫn 200 (KHÔNG error). `role` stays 'admin'. Test: e2e grant admin cho admin → 200 (idempotent). Self-grant (admin set role='admin' cho chính mình) → 200 (idempotent).
- **E6 — Role invalid (không phải 'admin'|'user').** AC1b — 400 `{ message: 'Vai trò không hợp lệ' }`. Test: e2e POST role { role: 'superadmin' } → 400. POST role { role: '' } → 400. POST role {} (missing) → 400.
- **E7 — Web /admin/users chưa login.** AC5 (reuse 2.4 layout guard) — redirect `/login?redirect=/admin/users`. Test: vitest render UsersTable với `isAuthenticated=false` → assert redirect called (2.4 đã có test — verify vẫn pass).
- **E8 — Web /admin/users user thường.** AC5 (reuse 2.4 layout guard) — redirect `/` (user thường không thấy admin page). Test: vitest render với `user.role='user'` → assert redirect `/` (2.4 đã có test — verify vẫn pass).

## UX Spec tham chiếu

- Trang `/admin/users` (reuse từ 2.4): table full-width trong admin layout (sidebar + main).
- Cột "Hành động": ban/unban button (2.4) + role grant/revoke button (2.5 — mới).
- Button "Cấp admin": blue outline (nếu `role === 'user'`). Button "Thu hồi admin": amber/orange outline (nếu `role === 'admin'` AND `id !== self`).
- Self-revoke: KHÔNG hiển thị button "Thu hồi admin" trên row của chính mình (disable + tooltip "Không thể thu hồi vai trò của chính mình").
- Confirm dialog grant: "Bạn chắc chắn cấp quyền quản trị viên cho <email>? Người dùng sẽ có quyền quản lý hệ thống." + nút "Cấp admin" (blue) / "Hủy".
- Confirm dialog revoke: "Bạn chắc chắn thu hồi quyền quản trị viên của <email>? Người dùng sẽ mất quyền admin." + nút "Thu hồi" (amber) / "Hủy".
- Toast success: "Đã cấp quyền quản trị viên" / "Đã thu hồi quyền quản trị viên".
- Badge Role (reuse 2.4): "User" (gray) / "Admin" (blue).
- Responsive: table scroll-x trên mobile. Touch target ≥ 44px (EXPERIENCE.md). Contrast AA.
- Tham chiếu: `docs/bdsai/ux/UX-DESIGN.md` (nếu có) + `EXPERIENCE.md`.

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack + Story 1.2/1.6/2.1/2.2/2.3/2.4 pin)

| Package | Version | Note |
|---------|---------|------|
| Drizzle ORM | 0.36.4 (đã có) | `db.update()` — KHÔNG schema change |
| Zod | 3.25.76 (đã có) | Validation body (role enum) + UUID |
| @nestjs/throttler | 6.4.2 (đã có, Story 2.2) | Rate limit role grant 10/15min (AC8) |
| nestjs-pino | 4.6.1 (đã có) | Logger + redact PII (đã có `*.email`, `*.phone`) |
| Next.js | 16.2.9 (đã có) | /admin/users button + API thin proxy |
| React | 19.2.7 (đã có) | Client component table update |

Note: KHÔNG cần dep mới. Tất cả đã có từ Story 1.x/2.x. KHÔNG migration mới (dùng cột `role` đã có từ Story 2.1 migration 0001).

### REUSE từ Story 2.4 (KHÔNG tạo module mới)

```
apps/api/src/admin/                      # REUSE module từ 2.4
├── admin.module.ts                      # REUSE — KHÔNG đổi (AdminService, AdminGuard, JwtAuthGuard đã provided)
├── admin.controller.ts                  # UPDATE — thêm POST /admin/users/:id/role
├── admin.service.ts                     # UPDATE — thêm grantRole()
├── admin.service.spec.ts                # UPDATE — thêm test grantRole
├── guards/
│   ├── admin.guard.ts                   # REUSE — KHÔNG đổi (query DB check role)
│   └── admin.guard.spec.ts              # REUSE — KHÔNG đổi
└── dto/
    ├── list-users.dto.ts                # REUSE — KHÔNG đổi
    ├── list-users.dto.spec.ts           # REUSE — KHÔNG đổi
    ├── role-grant.dto.ts                # NEW — Zod schema { role: 'admin'|'user' }
    └── role-grant.dto.spec.ts           # NEW — unit test validation
```

### role-grant.dto.ts — Zod schema (NEW)

```typescript
// apps/api/src/admin/dto/role-grant.dto.ts
import { z } from 'zod';

// roleGrantSchema (AC1b) — Story 2.5.
//
// Body validation: role phải là 'admin' hoặc 'user' (E6 — invalid → 400).
// KHÔNG cho phép role khác (superadmin, moderator, etc.) — chỉ 2 role.
export const roleGrantSchema = z.object({
  role: z.enum(['admin', 'user']),
});
export type RoleGrantDto = z.infer<typeof roleGrantSchema>;
```

Note: `z.enum(['admin', 'user'])` — reject bất kỳ giá trị nào khác (E6). Zod enum error message customize nếu cần (default: "Invalid enum value(s). Expected 'admin' | 'user'").

### AdminController — thêm endpoint role grant (UPDATE)

```typescript
// apps/api/src/admin/admin.controller.ts — UPDATE (thêm method grantRole)
import { Body } from '@nestjs/common';  // thêm import
import { roleGrantSchema } from './dto/role-grant.dto';

// ... (giữ nguyên 2.4: @Controller('admin'), @UseGuards, @Throttle controller-level)

  // AC1: POST /admin/users/:id/role — grant/revoke admin role.
  // AC8: method-level @Throttle 10/15min (chặt hơn controller-level 20/15min).
  @Post('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async grantRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<AdminUserItem> {
    this.assertUuid(id);
    const result = roleGrantSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.grantRole(id, result.data.role, user.id);
  }
```

Note: `@Throttle` method-level override controller-level (10/15min cho endpoint này cụ thể — AC8). `assertUuid` reuse từ 2.4. `roleGrantSchema.safeParse` → ZodError (NestJS global filter catch → 400).

### AdminService — thêm method grantRole (UPDATE)

Flow `admin.service.grantRole(targetId, newRole, adminId)`:
1. Validate targetId UUID (controller đã validate — service trust input).
2. Query target user → 404 if not exist (E3).
3. Self-revoke check: `targetId === adminId` AND `newRole === 'user'` → 400 (E4 — R1 lockout).
4. `db.update(publicUsers).set({ role: newRole, updatedAt: new Date() }).where(eq(id, targetId))`.
5. Log `{ action: 'role-grant', targetId, adminId, newRole, reason: 'success' }`.
6. Return profile mới `{ id, email, phone, role: newRole, banned, createdAt }`.

```typescript
// apps/api/src/admin/admin.service.ts — UPDATE (thêm method grantRole)
  // AC1: POST /admin/users/:id/role — grant/revoke admin role.
  async grantRole(
    targetId: string,
    newRole: 'admin' | 'user',
    adminId: string,
  ): Promise<AdminUserItem> {
    // E4: self-revoke → 400 (R1 — prevent admin lockout).
    if (targetId === adminId && newRole === 'user') {
      this.logger.warn(
        { action: 'role-grant', targetId, adminId, newRole, reason: 'self-revoke' },
        'Admin tự thu hồi role mình — từ chối',
      );
      throw new BadRequestException('Không thể thu hồi vai trò của chính mình');
    }

    const target = await this.findUserOrThrow(targetId);

    // E5: idempotent — role already === newRole → vẫn 200 (no-op update).
    try {
      await this.db
        .update(publicUsers)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(publicUsers.id, targetId));
    } catch (e) {
      this.logger.error(
        { action: 'role-grant', targetId, adminId, newRole, reason: 'update-fail', err: this.safeErr(e) },
        'grantRole update thất bại',
      );
      throw new InternalServerErrorException('Cập nhật vai trò thất bại');
    }

    // AC6: log chỉ targetId + adminId + newRole (KHÔNG log email/phone raw).
    this.logger.log(
      { action: 'role-grant', targetId, adminId, newRole, reason: 'success' },
      'Admin role grant',
    );

    return this.toItem(target, target.banned);
    // Note: toItem trả role từ row (stale) — cần trả newRole. Xem quyết định dev #1.
  }
```

Quyết định dev #1: `toItem` từ 2.4 trả `row.role` (stale — trước update). Cho role grant, cần trả `newRole` (sau update). Option: (a) thêm param `role?: string` vào `toItem` override, (b) tạo `toItemWithRole(row, newRole, banned)`, (c) re-query sau update. Dev chọn (a) — thêm optional param `roleOverride` vào `toItem` (backward-compatible — 2.4 call không传 param → dùng row.role). Hoặc (b) — explicit hơn. Dev quyết định.

### Web — users-table.tsx update (UPDATE)

```
apps/web/app/
├── (admin)/admin/users/
│   └── users-table.tsx          # UPDATE — thêm role grant/revoke button + confirm dialog
├── api/admin/users/[id]/
│   └── role/
│       └── route.ts             # NEW — thin proxy POST /admin/users/:id/role
```

### Next API thin proxy — role route (NEW)

```typescript
// apps/web/app/api/admin/users/[id]/role/route.ts — NEW (POST role grant)
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { statusCode: 400, message: 'Body không hợp lệ', error: 'Bad Request' },
      { status: 400 },
    );
  }
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
      method: 'POST',
      headers: { authorization: authHeader, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { statusCode: 503, message: 'API không khả dụng, thử lại sau', error: 'Service Unavailable' },
      { status: 503 },
    );
  }
}
```

Note: AD-10 — ZERO business logic. Forward body as-is (NestJS validate role enum). Pass-through Authorization.

### Test strategy

- **Unit (jest):**
  - `role-grant.dto.spec.ts` (NEW) — role 'admin' pass, role 'user' pass, role 'superadmin' → fail, role '' → fail, missing role → fail, extra fields → strip (Zod default).
  - `admin.service.spec.ts` (UPDATE — thêm test grantRole):
    - grantRole happy path (user → admin) → return profile role='admin'.
    - grantRole happy path (admin → user) → return profile role='user'.
    - grantRole self-revoke → 400 (E4).
    - grantRole self-grant → 200 idempotent (E5).
    - grantRole not exist → 404 (E3).
    - grantRole idempotent (admin → admin) → 200 (E5).
    - grantRole update fail → 500.
- **Integration (jest e2e):**
  - `admin.e2e-spec.ts` (UPDATE — thêm test role grant):
    - Login admin → POST /admin/users/:id/role { role: 'admin' } → 200 + role='admin'.
    - POST role { role: 'user' } (revoke admin B) → 200 + admin B GET /admin/users → 403 (role changed, AdminGuard query DB).
    - E1 no token → 401.
    - E2 user thường → 403.
    - E3 user not exist → 404.
    - E4 self-revoke → 400.
    - E5 grant admin cho admin → 200 idempotent.
    - E6 role invalid → 400.
    - AC8 rate limit: 11 role grant requests → 429.
  - Skip nếu Supabase không reach (env guard — pattern từ Story 2.1/2.2/2.4).
- **Web (vitest):**
  - `users-table.test.tsx` (UPDATE — thêm test role button):
    - Role button render (user → "Cấp admin", admin → "Thu hồi admin").
    - Self-revoke UI block (row của chính mình → KHÔNG có "Thu hồi admin").
    - Click "Cấp admin" → confirm → API call + toast + badge update.
    - Click "Thu hồi admin" → confirm → API call + toast + badge update.
    - Error display (400 self-revoke message).
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3).

### Source tree (NEW/UPDATE)

```
bdsai/
├── apps/api/
│   ├── src/
│   │   ├── admin/                              # REUSE module từ 2.4
│   │   │   ├── admin.module.ts                 # REUSE — KHÔNG đổi
│   │   │   ├── admin.controller.ts             # UPDATE — thêm POST /admin/users/:id/role
│   │   │   ├── admin.service.ts                # UPDATE — thêm grantRole()
│   │   │   ├── admin.service.spec.ts           # UPDATE — thêm test grantRole
│   │   │   ├── guards/
│   │   │   │   ├── admin.guard.ts              # REUSE — KHÔNG đổi
│   │   │   │   └── admin.guard.spec.ts         # REUSE — KHÔNG đổi
│   │   │   └── dto/
│   │   │       ├── list-users.dto.ts           # REUSE — KHÔNG đổi
│   │   │       ├── list-users.dto.spec.ts      # REUSE — KHÔNG đổi
│   │   │       ├── role-grant.dto.ts           # NEW — Zod schema { role: 'admin'|'user' }
│   │   │       └── role-grant.dto.spec.ts      # NEW — unit test validation
│   │   └── app.module.ts                       # KHÔNG đổi (AdminModule đã import từ 2.4)
│   ├── test/
│   │   └── admin.e2e-spec.ts                   # UPDATE — thêm test role grant
│   └── package.json                            # KHÔNG cần dep mới
├── apps/web/
│   ├── app/
│   │   ├── (admin)/admin/users/
│   │   │   ├── page.tsx                        # REUSE — KHÔNG đổi
│   │   │   └── users-table.tsx                 # UPDATE — thêm role grant/revoke button + confirm
│   │   └── api/admin/users/[id]/
│   │       ├── ban/route.ts                    # REUSE — KHÔNG đổi
│   │       ├── unban/route.ts                  # REUSE — KHÔNG đổi
│   │       └── role/route.ts                   # NEW — thin proxy POST role grant
│   ├── tests/
│   │   └── users-table.test.tsx                # UPDATE — thêm test role button
│   └── package.json                            # KHÔNG cần dep mới
└── supabase/
    └── config.toml                             # KHÔNG ĐỔI
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **REUSE AdminModule + AdminGuard + AdminController (KHÔNG tạo module mới):** Story 2.5 thêm endpoint + method vào module 2.4 có sẵn. AdminGuard query DB mỗi request (AD-5) — role change take effect ngay (admin B bị revoke → request /admin/* tiếp theo → 403, KHÔNG cần re-login). KHÔNG trust JWT role claim.
2. **Self-revoke block (E4 — R1 lockout):** Admin không thể set role='user' cho chính mình → 400. Self-grant (set role='admin' cho chính mình) → idempotent 200 (đã là admin — E5, KHÔNG block). Check `targetId === adminId` AND `newRole === 'user'`.
3. **Idempotent role grant (E5):** Grant admin cho admin → 200 (no-op). Revoke user (set role='user' cho user) → 200 (no-op). KHÔNG error — idempotent đơn giản hơn cho client (retry safe).
4. **Revoke admin khác → allowed (AC4d):** Admin A có thể revoke admin B (set role='user'). Admin B mất quyền ngay (AdminGuard query DB — KHÔNG cần re-login). KHÔNG block revoke admin khác (chỉ block self-revoke — R1). Business risk: admin A revoke admin B sai người — out of scope (R2 — audit log future).
5. **Method-level @Throttle 10/15min (AC8):** Role grant nhạy cảm hơn ban/unban → chặt hơn (10/15min vs 20/15min controller-level). Method-level @Throttle override controller-level cho endpoint này cụ thể. KHÔNG đăng ký ThrottlerModule mới (reuse global từ AuthModule).
6. **toItem role override:** `toItem` từ 2.4 trả `row.role` (stale trước update). Cho role grant, cần trả `newRole` (sau update). Dev chọn: thêm optional param `roleOverride?: string` vào `toItem` (backward-compatible — 2.4 call không传 param → dùng row.role). Hoặc re-query sau update (1 thêm SELECT — đơn giản hơn, consistent). Dev quyết định.
7. **Web self-revoke UI block (AC5d):** Row của chính mình (`item.id === user.id` AND `item.role === 'admin'`) → KHÔNG hiển thị button "Thu hồi admin" (disable + tooltip). Client-side check (server cũng block — AC3 defense-in-depth).
8. **KHÔNG migration mới:** Story 2.5 dùng cột `role` đã có từ Story 2.1 (migration 0001). KHÔNG thêm cột, KHÔNG đổi schema. Chỉ thêm endpoint + method + web button.
9. **Role change take effect ngay (R3 — resolved by AD-5):** AdminGuard query DB mỗi request → admin B bị revoke → request /admin/* tiếp theo → 403 (role='user' now). KHÔNG cần re-login. KHÔNG cần JWT blacklist (JWT vẫn valid nhưng AdminGuard check DB — JWT role claim KHÔNG được trust). Đây là lợi thế của AD-5 (Auth Separation — query DB).
10. **Zod enum role validation (E6):** `z.enum(['admin', 'user'])` — reject role khác (superadmin, moderator, empty, missing). Zod error → ZodError → NestJS filter → 400. Customize message nếu cần (default Zod enum error OK).

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **R1 — Admin self-revoke lockout** | E4 — self-revoke → 400 "Không thể thu hồi vai trò của chính mình". Check `targetId === adminId` AND `newRole === 'user'` trước update. Test e2e. Web UI block (AC5d — disable button trên row của chính mình). |
| **R2 — Grant admin cho user không đáng tin (business risk)** | Out of scope — story 2.5 chỉ cung cấp tool, KHÔNG enforce business policy (ai được cấp admin là quyết định của admin hiện tại). Future: audit log (story 3.x hoặc riêng) — log ai cấp/revoke role cho ai + khi nào. Admin role grant là action có trách nhiệm — confirm dialog (AC5b) giảm misclick. |
| **R3 — Role change không take effect ngay** | RESOLVED by AD-5 — AdminGuard query DB mỗi request (KHÔNG trust JWT role claim). Admin B bị revoke → request /admin/* tiếp theo → 403 (role='user' now). KHÔNG cần re-login. KHÔNG cần JWT blacklist. Trade-off: 1 SELECT / admin request (acceptable — admin traffic low). |
| **R4 — Race condition (last-write-wins)** | AC1 — 2 admin grant/revoke role cùng user cùng lúc → last-write-wins (KHÔNG optimistic locking). Role là string đơn giản → last write wins OK (KHÔNG critical data — admin có thể grant lại nếu cần). Document. |

## References

- [Source:] `_bmad-output/planning-artifacts/epics.md` dòng 262-290 (Epic 2, admin user management) + dòng 19 (FR2) + dòng 144 (quy ước test).
- [Source:] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45), AD-5 (dòng 63 — AdminGuard query DB), AD-7 (dòng 69 — error shape), AD-8 (dòng 81 — PII redact), AD-10 (dòng 93 — Next API mỏng), M2 User Management (dòng 312).
- [Source:] `bdsai/apps/api/src/db/schema/public-users.ts` — schema hiện tại (cột `role: text('role').notNull().default('user')` — dòng 30).
- [Source:] `bdsai/apps/api/src/admin/admin.controller.ts` — AdminController (Story 2.4 — REUSE + UPDATE thêm endpoint role grant).
- [Source:] `bdsai/apps/api/src/admin/admin.service.ts` — AdminService (Story 2.4 — REUSE + UPDATE thêm grantRole method).
- [Source:] `bdsai/apps/api/src/admin/admin.module.ts` — AdminModule (Story 2.4 — REUSE, KHÔNG đổi).
- [Source:] `bdsai/apps/api/src/admin/guards/admin.guard.ts` — AdminGuard (Story 2.4 — REUSE, query DB check role).
- [Source:] `bdsai/apps/api/src/admin/dto/list-users.dto.ts` — Zod schema pattern (Story 2.4 — pattern cho role-grant.dto.ts).
- [Source:] `bdsai/apps/web/app/(admin)/admin/users/users-table.tsx` — UsersTable (Story 2.4 — REUSE + UPDATE thêm role button).
- [Source:] `bdsai/apps/web/app/api/admin/users/[id]/ban/route.ts` — Next API thin proxy pattern (Story 2.4 — pattern cho role/route.ts).
- [Source:] `bdsai/apps/web/app/(admin)/layout.tsx` — admin layout (Story 2.4 — REUSE, admin guard + sidebar).
- [Source:] `bdsai/apps/web/components/auth/auth-context.ts` — AuthContext + AuthUser (Story 2.2-2.3, có `role` field cho admin check + self-id).
- [Source:] `bdsai/apps/web/lib/auth-fetch.ts` — useAuthFetch (Story 2.2, JWT refresh interceptor — role button dùng cho API call).
