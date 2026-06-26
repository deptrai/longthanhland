---
baseline_commit: TBD-by-dev
---

# Story 2.4: Admin danh sách user ban/unban

Status: ready-for-dev

<!-- Story THỨ 4 Epic 2 (User Authentication & Profiles). Story 2.1 (register) + 2.2 (login/logout/JWT) + 2.3 (profile) DONE — AuthModule + public_users (11 cột) + JwtAuthGuard + AuthProvider + useAuthFetch + UploadModule đã sẵn. -->
<!-- Dependencies: Story 2.1 (AuthModule + public_users + register), Story 2.2 (login/logout/refresh/me + JwtAuthGuard + AuthProvider + useAuthFetch + banned check login), Story 2.3 (PATCH /auth/me + profile fields), Story 1.2 (Supabase client + ConfigService), Story 1.4 (Base UI header + route groups + (admin) layout), Story 1.6 (pino logger + exception filter + Sentry redact + ThrottlerModule). -->
<!-- SCOPE: Admin (role='admin') quản lý user — list (paginated + search), ban, unban. AdminGuard query DB check role (AD-5 — KHÔNG trust JWT role claim). KHÔNG include role grant (story 2.5 — admin role được set qua SQL/Dashboard, KHÔNG qua API). -->

## Story

As a **quản trị viên (admin)**,
I want **xem danh sách người dùng, khóa (ban) và mở khóa (unban) tài khoản**,
so that **tôi kiểm soát được ai được sử dụng nền tảng và ngăn tài khoản vi phạm**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 2 → Story 2.4 (admin user management) + FR2 (dòng 19: "User đăng nhập, quản lý profile") + AD-2 (Single Data Mutation Path), AD-5 (Auth Separation — AdminGuard query DB, KHÔNG trust JWT role), AD-7 (Error shape), AD-8 (PII redact), AD-10 (Next API mỏng).
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC10.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.
> **Scope cut:** Role grant (set role='admin' cho user) DEFERRED sang Story 2.5. Story 2.4 chỉ list/ban/unban. Admin role được set qua SQL migration seed HOẶC Supabase Dashboard (manual) — KHÔNG qua API endpoint.

1. **AC1 — `GET /admin/users` — paginated list (page, limit, search) — return array public_users + total.**
   Given admin đã đăng nhập (có valid JWT + `public_users.role = 'admin'`),
   When `GET /admin/users?page=1&limit=20&search=keyword` với `Authorization: Bearer <jwt>`,
   Then:
   (a) **Query params (Zod validate):**
   - `page`: integer ≥ 1, default 1.
   - `limit`: integer 1–100, default 20.
   - `search`: string optional, max 100 chars — filter by `email` ILIKE `%search%` OR `phone` ILIKE `%search%` (Drizzle `ilike` — parameterized, KHÔNG string concat — R5).
   (b) **Drizzle query:** `db.select({ id, email, phone, role, banned, createdAt }).from(publicUsers).where(search ? or(ilike(email, `%${search}%`), ilike(phone, `%${search}%`)) : undefined).limit(limit).offset((page - 1) * limit).orderBy(desc(createdAt))` (AD-2 read path).
   (c) **Total count:** `db.select({ count: count() }).from(publicUsers).where(same filter)` — return total cho pagination UI.
   (d) **Response:** 200 `{ data: [{ id, email, phone, role, banned, createdAt }], total, page, limit }` (KHÔNG trả avatarUrl/bio/displayName — admin list chỉ cần quản lý, KHÔNG cần profile chi tiết).
   (e) **PII:** email + phone trong response (admin cần xem để quản lý) — NHƯNG KHÔNG log raw (AC8). Response trả raw cho admin (admin được phép xem — AD-5 business decision).
   Verify: `curl 'http://localhost:3101/admin/users?page=1&limit=20' -H 'Authorization: Bearer <admin-jwt>'` → 200 + `{ data: [...], total: N, page: 1, limit: 20 }`. Search `?search=test@` → filter email contains "test@".

2. **AC2 — `POST /admin/users/:id/ban` — set banned=true → 200.**
   Given admin đã đăng nhập + target user tồn tại trong `public_users`,
   When `POST /admin/users/:id/ban` với `Authorization: Bearer <admin-jwt>`,
   Then:
   (a) **Validate `:id`** — UUID format (Zod `.uuid()`). Invalid UUID → 400 `{ message: 'ID người dùng không hợp lệ' }`.
   (b) **Query target user:** `db.select().from(publicUsers).where(eq(publicUsers.id, targetId))` → check tồn tại (→ 404 E6), check role (→ 400 E5 if target is admin).
   (c) **Self-ban check (E4):** if `targetId === req.user.id` → 400 `{ message: 'Không thể khóa chính mình' }` (R1 — prevent admin lockout).
   (d) **Ban admin check (E5):** if `targetUser.role === 'admin'` → 400 `{ message: 'Không thể khóa quản trị viên' }` (R2 — prevent admin mutual ban).
   (e) **Update:** `db.update(publicUsers).set({ banned: true, updatedAt: new Date() }).where(eq(publicUsers.id, targetId))` (AD-2 mutation qua NestJS Service → Drizzle).
   (f) **Idempotent (E7):** if `targetUser.banned === true` already → vẫn 200 (KHÔNG error — idempotent). Update ghi đè `banned=true` (no-op effect).
   (g) **Response:** 200 `{ id, email, phone, role, banned: true, createdAt }` (return profile mới — same shape AC1 data item).
   (h) **Log:** `logger.log({ action: 'ban', targetId, adminId: req.user.id, reason: 'success' }, 'Admin ban user')` — KHÔNG log email/phone raw (AD-8 — pino redact `*.email`, `*.phone` đã có).
   Verify: `curl -X POST http://localhost:3101/admin/users/<userId>/ban -H 'Authorization: Bearer <admin-jwt>'` → 200 + `{ banned: true }`. `psql` — `SELECT banned FROM public_users WHERE id='<userId>'` → `t`.

3. **AC3 — `POST /admin/users/:id/unban` — set banned=false → 200.**
   Given admin đã đăng nhập + target user tồn tại,
   When `POST /admin/users/:id/unban` với `Authorization: Bearer <admin-jwt>`,
   Then:
   (a) Validate `:id` UUID (same AC2a). Invalid → 400.
   (b) Query target user → 404 if not exist (E6).
   (c) **Self-unban:** allowed (KHÔNG block — admin unban mình OK, nhưng nếu admin không bị banned thì no-op). KHÔNG cần self-check cho unban (chỉ ban có lockout risk).
   (d) **Unban admin:** allowed (admin khác có thể bị ban tạm? — KHÔNG, E5 ngăn ban admin. Nhưng nếu admin bị ban qua SQL direct → unban OK). Quyết định dev: unban KHÔNG check role (chỉ ban check).
   (e) **Update:** `db.update(publicUsers).set({ banned: false, updatedAt: new Date() }).where(eq(publicUsers.id, targetId))`.
   (f) **Idempotent:** if `banned === false` already → vẫn 200 (no-op).
   (g) **Response:** 200 `{ id, email, phone, role, banned: false, createdAt }`.
   (h) **Log:** `logger.log({ action: 'unban', targetId, adminId, reason: 'success' }, 'Admin unban user')`.
   Verify: `curl -X POST http://localhost:3101/admin/users/<userId>/unban -H 'Authorization: Bearer <admin-jwt>'` → 200 + `{ banned: false }`. `psql` verify `banned = f`.

4. **AC4 — AdminGuard — chỉ role='admin' mới truy cập /admin/* — user thường → 403.**
   Given endpoint `/admin/*`,
   When request tới với valid JWT (JwtAuthGuard pass) nhưng user có `role='user'`,
   Then:
   (a) **AdminGuard** (new — `apps/api/src/admin/guards/admin.guard.ts`) query `public_users` bằng `req.user.id` → check `role === 'admin'`.
   (b) **AD-5 (Auth Separation):** AdminGuard query DB cho role — KHÔNG trust JWT role claim (JWT có thể stale — user bị demote sau khi JWT issued). Query DB mỗi admin request (trade-off: 1 DB call / admin request — acceptable, admin traffic low).
   (c) If `role !== 'admin'` → 403 `{ message: 'Không có quyền truy cập', error: 'Forbidden' }` (E2/E3).
   (d) If `public_users` row không tồn tại (orphan) → 403 (KHÔNG 404 — KHÔNG leak existence). Log warn.
   (e) If DB query fail → 500 generic (AD-7 error shape).
   Verify: `curl http://localhost:3101/admin/users -H 'Authorization: Bearer <user-jwt>'` (role='user') → 403. `curl ... -H 'Authorization: Bearer <admin-jwt>'` → 200.

5. **AC5 — JwtAuthGuard + AdminGuard stack — verify JWT trước, check admin sau.**
   Given endpoint `/admin/*` có `@UseGuards(JwtAuthGuard, AdminGuard)`,
   When request tới,
   Then:
   (a) **Order:** JwtAuthGuard chạy trước (verify JWT + extract `req.user.id`) → AdminGuard chạy sau (query DB check role).
   (b) **No token / expired / malformed** → JwtAuthGuard reject 401 (KHÔNG tới AdminGuard).
   (c) **Valid JWT but role='user'** → JwtAuthGuard pass → AdminGuard reject 403.
   (d) **Valid JWT + role='admin'** → cả 2 pass → controller handler chạy.
   (e) Guard stack apply trên **tất cả** `/admin/*` endpoints (controller-level `@UseGuards(JwtAuthGuard, AdminGuard)` trên `AdminController` — KHÔNG per-method).
   Verify: `curl http://localhost:3101/admin/users` (no token) → 401. `curl ... <user-jwt>` → 403. `curl ... <admin-jwt>` → 200. `curl ... <expired-jwt>` → 401.

6. **AC6 — Web `/admin/users` page — table list + search + ban/unban button.**
   Given Story 2.2 đã có AuthProvider + useAuth + useAuthFetch + route group `(admin)` (layout từ Story 1.4),
   When tạo:
   (a) **`/admin/users` page:** `apps/web/app/(admin)/users/page.tsx` (server wrapper) + `apps/web/app/(admin)/users/users-table.tsx` (client component). Route nằm trong group `(admin)` (layout admin sidebar).
   (b) **Admin protect (web):** page dùng `useAuth()` — nếu `!isAuthenticated && !isLoading` → redirect `/login?redirect=/admin/users` (E10). Nếu `isLoading` → loading spinner. Nếu authenticated nhưng `user.role !== 'admin'` → redirect `/` (E11 — user thường không thấy admin page). Check role client-side (AuthContext user.role từ /auth/me).
   (c) **Table columns:** STT, Email, Phone, Role (badge User/Admin), Trạng thái (badge Active/Banned), Ngày tạo, Hành động (Ban/Unban button).
   (d) **Search bar:** input text + nút "Tìm" → `useAuthFetch()('/api/admin/users?search=...')` → refresh table. Search by email/phone (hint text).
   (e) **Pagination:** prev/next + page number + "Hiển thị X–Y trên Z". `useAuthFetch()('/api/admin/users?page=2&limit=20')`.
   (f) **Ban/Unban button:** mỗi row có button "Khóa" (nếu banned=false) HOẶC "Mở khóa" (nếu banned=true). Click → `useAuthFetch()('/api/admin/users/<id>/ban', { method: 'POST' })` → refresh row. Loading state trên button. Confirm dialog ("Bạn chắc chắn khóa tài khoản này?") trước khi ban (tránh misclick).
   (g) **Success:** toast "Đã khóa tài khoản" / "Đã mở khóa tài khoản" + refresh table data.
   (h) **Error:** hiển thị message từ API (403 → "Không có quyền", 404 → "Người dùng không tồn tại", 400 → "Không thể khóa quản trị viên" / "Không thể khóa chính mình").
   Verify: browser — login admin → navigate `/admin/users` → table list users. Search → filter. Click "Khóa" → confirm → toast + badge đổi Banned. Login user thường → navigate `/admin/users` → redirect `/`.

7. **AC7 — Web `/admin/*` — admin layout (sidebar/nav admin).**
   Given Story 1.4 đã có `(admin)/layout.tsx` (placeholder sidebar — TODO story 2.4/2.5),
   When update layout:
   (a) **Sidebar nav:** thay placeholder bằng nav admin thật — link "Người dùng" (`/admin/users`). Future: Listings, Moderation (TODO story 3.x). Highlight active link.
   (b) **Admin guard (layout):** layout component check `useAuth().user.role === 'admin'` — nếu không → redirect `/` (E11). Check ở layout level (bảo vệ tất cả admin pages trong group).
   (c) **Header:** giữ SiteHeader (từ Story 1.4) — header chung. Sidebar admin riêng trong `(admin)` layout.
   (d) **Responsive:** sidebar hidden trên mobile (md:block — đã có từ Story 1.4), mobile nav admin (Sheet/Drawer — future, story 2.4 chỉ desktop sidebar).
   Verify: browser — `/admin/users` → sidebar hiện "Người dùng" link active. Navigate `/admin` (không page) → sidebar vẫn hiện. User thường → redirect `/`.

8. **AC8 — PII redact (AD-8): không log email/phone raw trong admin actions.**
   Given Story 2.1/2.2 đã redact `*.email`, `*.phone`, `*.password`, `*.token` trong pino + Sentry,
   When admin list/ban/unban flow log (info/warn/error),
   Then:
   (a) **Admin list:** log `logger.log({ action: 'list-users', adminId, page, limit, search: search ? '[Redacted]' : undefined, reason: 'success' })` — KHÔNG log search term raw (search có thể chứa email/phone — PII). Quyết định dev: redact search term trong log (log chỉ `searchProvided: true/false`).
   (b) **Ban/unban:** log chỉ `targetId` + `adminId` + `action` + `reason` — KHÔNG log target email/phone raw (pino redact `*.email`, `*.phone` đã có từ 2.1 — áp dụng cho log object fields).
   (c) **Sentry:** admin action error → Sentry redact email/phone khỏi request body + query params (đã có từ Story 1.6).
   (d) **Exception filter:** KHÔNG leak stack — admin error response chỉ `{ statusCode, message, error }` (AD-7).
   Verify: unit test — log object có `email: 'test@bdsai.vn'` → output `[Redacted]`. E2e — ban user → check pino log KHÔNG chứa target email raw.

9. **AC9 — Không phá Story 1.1-2.3 (build/lint/typecheck/test pass).**
   Given Story 2.1 (register) + 2.2 (login/logout/refresh/me) + 2.3 (profile/avatar) đã DONE,
   When implement admin module,
   Then:
   (a) `yarn build && yarn lint && yarn typecheck && yarn test` (cả 3 package: shared, api, web) PASS — không phá 1.1-2.3.
   (b) Story 2.1 register + 2.2 login/logout/refresh/me + 2.3 PATCH /auth/me + upload avatar vẫn hoạt động (KHÔNG break).
   (c) Banned user login vẫn bị 403 (Story 2.2 E7 — banned check trong login service, KHÔNG đổi).
   (d) Health endpoint (`GET /health/supabase`) vẫn 200. Migration 0000 + 0001 + 0002 vẫn apply đúng (KHÔNG migration mới — story 2.4 KHÔNG đổi schema, chỉ dùng cột `banned` + `role` đã có).
   Verify: e2e — register → login → PATCH /auth/me → upload avatar → tất cả vẫn 200. Banned user login → 403.

10. **AC10 — Rate limit admin actions 20/15 phút.**
    Given `@nestjs/throttler` đã có từ Story 2.2 (AuthModule scoped),
    When apply rate limit trên AdminController,
    Then:
    (a) `@Throttle({ default: { limit: 20, ttl: 15 * 60 * 1000 } })` trên AdminController (controller-level — 20 admin actions / 15 phút / IP). Apply cho tất cả `/admin/*` endpoints (list, ban, unban).
    (b) Exceed → 429 `{ message: 'Quá nhiều yêu cầu, thử lại sau 15 phút' }` (AD-7 error shape).
    (c) AdminModule import ThrottlerModule (scoped — KHÔNG global, KHÔNG conflict với AuthModule throttler).
    Verify: e2e — 21 admin requests liên tiếp → lần 21 trả 429.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-2 (Single Data Mutation Path)** | AC2/AC3 — ban/unban qua NestJS AdminService → Drizzle `db.update(publicUsers).set({ banned })`. Frontend KHÔNG update public_users trực tiếp. AC1 — list qua NestJS AdminService → Drizzle `db.select()`. |
| **AD-5 (Auth Separation)** | AC4/AC5 — AdminGuard query `public_users.role` từ DB (KHÔNG trust JWT role claim — JWT có thể stale). JwtAuthGuard verify JWT trước (auth), AdminGuard check admin sau (business). Admin role KHÔNG qua JWT claim. KHÔNG include role grant API (Story 2.5). |
| **AD-7 (Error shape)** | Tất cả admin error → `{ statusCode, message, error?, details? }` qua AllExceptionsFilter (Story 1.6). 403 Forbidden, 404 Not Found, 400 Bad Request, 429 Too Many Requests — consistent shape. |
| **AD-8 (PII/secret)** | AC8 — email/phone KHÔNG log raw (pino redact `*.email`, `*.phone` đã có). Search term KHÔNG log raw (có thể chứa PII). Sentry redact. Exception filter KHÔNG leak stack. |
| **AD-10 (Next API Route Boundary)** | AC6 — Next API routes (`/api/admin/users`, `/api/admin/users/:id/ban`, `/api/admin/users/:id/unban`) chỉ forward tới NestJS. ZERO business logic — admin check, ban/unban logic ở NestJS. Web chỉ client-side UX (table, search, confirm dialog). |
| **AD-1 (Module Isolation)** | `admin/` module NestJS riêng (AdminController + AdminService + AdminGuard). KHÔNG đặt trong `auth/` (admin là business domain riêng — quản lý user). Drizzle schema KHÔNG đổi (dùng cột `banned`, `role` đã có từ Story 2.1). |
| **AD-4 (SSR Boundary)** | `/admin/users` page server wrapper + client island table. Admin protect client-side (accessToken in memory — SSR không biết auth state). KHÔNG SSR protect (tránh flash — dùng loading state). |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Không token (GET /admin/users, POST ban/unban).** AC5 — JwtAuthGuard reject → 401 `{ message: 'Thiếu token xác thực' }`. Test: e2e GET /admin/users không Authorization → 401.
- **E2 — User thường truy cập /admin/users.** AC4 — AdminGuard query DB → role='user' → 403 `{ message: 'Không có quyền truy cập' }`. Test: e2e login user thường → GET /admin/users → 403.
- **E3 — User thường gọi POST /admin/users/:id/ban.** AC4 — AdminGuard reject → 403 (same E2). Test: e2e user thường → POST ban → 403.
- **E4 — Admin tự ban mình.** AC2c — 400 `{ message: 'Không thể khóa chính mình' }`. Test: e2e admin → POST /admin/users/<self-id>/ban → 400. (R1 — prevent lockout.)
- **E5 — Ban admin khác.** AC2d — 400 `{ message: 'Không thể khóa quản trị viên' }`. Test: e2e admin → POST /admin/users/<other-admin-id>/ban → 400. (R2 — prevent mutual ban.)
- **E6 — User không tồn tại (ban/unban).** AC2b — 404 `{ message: 'Người dùng không tồn tại' }`. Test: e2e POST /admin/users/<random-uuid>/ban → 404.
- **E7 — Ban user đã banned (idempotent).** AC2f — vẫn 200 (KHÔNG error). `banned` stays true. Test: e2e ban user → ban again → 200 (idempotent).
- **E8 — Search email filter.** AC1 — `?search=test@` → filter `email ILIKE '%test@%'`. Test: e2e GET /admin/users?search=test@ → only users with email containing "test@".
- **E9 — Pagination offset correct.** AC1 — page=2, limit=20 → offset=20 (rows 21–40). Test: e2e GET /admin/users?page=2&limit=20 → data[0] là row thứ 21 (orderBy desc(createdAt)).
- **E10 — Web /admin/users chưa login.** AC6b — redirect `/login?redirect=/admin/users`. Test: vitest render UsersTable với `isAuthenticated=false` → assert redirect called.
- **E11 — Web /admin/users user thường.** AC6b/AC7b — redirect `/` (user thường không thấy admin page). Test: vitest render với `user.role='user'` → assert redirect `/`.
- **E12 — Ban user đang login (session active).** AC2 — ban set `banned=true`. User session (JWT) vẫn valid until expire (1h). KHÔNG revoke JWT ngay (defer — R3). User tiếp tục dùng được đến khi JWT expire → refresh fail (Story 2.2 E7 — banned check trong refresh? — KHÔNG, refresh chỉ check Supabase session, KHÔNG check banned). Quyết định dev: banned user refresh vẫn OK (Supabase session valid) → access token mới → nhưng API endpoint có banned check (Story 2.3 E8 — PATCH /auth/me check banned). Login lại → 403 (Story 2.2 E7). Document: banned user session active defer revoke (R3 — future story: JWT blacklist hoặc Supabase session revoke). Test: e2e ban user → user GET /auth/me vẫn 200 (JWT valid) → PATCH /auth/me → 403 (banned check).

## UX Spec tham chiếu

- Trang `/admin/users`: table full-width trong admin layout (sidebar + main).
- Table columns: STT (1-based), Email, Phone, Role (badge), Trạng thái (badge Active=green / Banned=red), Ngày tạo (dd/mm/yyyy), Hành động.
- Search bar trên table: input + nút "Tìm". Hint "Tìm theo email hoặc SĐT".
- Pagination dưới table: "‹ Trang trước | 1 2 3 | Trang sau ›" + "Hiển thị 1–20 trên 100".
- Ban button: red outline "Khóa" (nếu active). Unban button: green outline "Mở khóa" (nếu banned).
- Confirm dialog ban: "Bạn chắc chắn khóa tài khoản <email>? Người dùng sẽ không thể đăng nhập." + nút "Khóa" (red) / "Hủy".
- Toast success: "Đã khóa tài khoản" / "Đã mở khóa tài khoản".
- Badge Role: "User" (gray) / "Admin" (blue). Badge Trạng thái: "Hoạt động" (green) / "Đã khóa" (red).
- Responsive: table scroll-x trên mobile. Sidebar hidden mobile (md:block).
- Touch target ≥ 44px (EXPERIENCE.md). Contrast AA.
- Tham chiếu: `docs/bdsai/ux/UX-DESIGN.md` (nếu có) + `EXPERIENCE.md`.

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack + Story 1.2/1.6/2.1/2.2/2.3 pin)

| Package | Version | Note |
|---------|---------|------|
| Drizzle ORM | 0.36.4 (đã có) | `db.select()` / `db.update()` — KHÔNG schema change |
| Zod | 3.25.76 (đã có) | Validation query params (page, limit, search) + UUID |
| @nestjs/throttler | 6.4.2 (đã có, Story 2.2) | Rate limit admin actions 20/15min (AC10) |
| nestjs-pino | 4.6.1 (đã có) | Logger + redact PII (đã có `*.email`, `*.phone`) |
| Next.js | 16.2.9 (đã có) | /admin/users page + API thin proxy |
| React | 19.2.7 (đã có) | Client component table |

Note: KHÔNG cần dep mới. Tất cả đã có từ Story 1.x/2.x. KHÔNG migration mới (dùng cột `banned`, `role` đã có từ Story 2.1 migration 0001).

### AdminGuard — query DB check role (AD-5)

```typescript
// apps/api/src/admin/guards/admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../../db/database.tokens';
import { publicUsers } from '../../db/schema/public-users';
import type { Request } from 'express';
import type { JwtUser } from '../../auth/guards/jwt-auth.guard';

/**
 * AdminGuard (AC4, AC5, AD-5) — Story 2.4.
 *
 * Query public_users.role từ DB — KHÔNG trust JWT role claim (JWT stale risk).
 * JwtAuthGuard chạy trước (verify JWT + attach req.user.id).
 * AdminGuard chạy sau (query DB check role === 'admin').
 *
 * E2/E3: role='user' → 403. Orphan → 403 (KHÔNG leak existence).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user: JwtUser }).user;
    if (!user?.id) {
      // JwtAuthGuard chưa pass (shouldn't reach here if guard order correct).
      throw new ForbiddenException('Không có quyền truy cập');
    }

    let userRow: typeof publicUsers.$inferSelect | undefined;
    try {
      const rows = await this.db
        .select({ role: publicUsers.role })
        .from(publicUsers)
        .where(eq(publicUsers.id, user.id));
      userRow = rows[0] as typeof publicUsers.$inferSelect | undefined;
    } catch {
      throw new InternalServerErrorException('Lỗi xác thực quyền');
    }

    if (!userRow || userRow.role !== 'admin') {
      // E2/E3: not admin → 403. Orphan → 403 (KHÔNG 404 — không leak).
      throw new ForbiddenException('Không có quyền truy cập');
    }

    return true;
  }
}
```

Note: AdminGuard query DB mỗi admin request (1 SELECT / request). Trade-off: admin traffic low (chỉ admin role) → acceptable. Future: cache role trong Redis (TTL 60s) nếu cần. KHÔNG trust JWT role claim vì JWT có thể stale (user demote sau khi JWT issued — JWT valid 1h).

### AdminModule + AdminController + AdminService

```
apps/api/src/
├── admin/                           # NEW module (AD-1 — admin business domain)
│   ├── admin.module.ts              # NEW — import ThrottlerModule (scoped)
│   ├── admin.controller.ts          # NEW — GET /admin/users, POST ban/unban
│   ├── admin.service.ts             # NEW — listUsers(), banUser(), unbanUser()
│   ├── admin.service.spec.ts        # NEW — unit test
│   ├── guards/
│   │   ├── admin.guard.ts           # NEW — AdminGuard (query DB check role)
│   │   └── admin.guard.spec.ts      # NEW — unit test
│   └── dto/
│       ├── list-users.dto.ts        # NEW — Zod schema (page, limit, search)
│       └── list-users.dto.spec.ts   # NEW — unit test validation
├── app.module.ts                    # UPDATE — import AdminModule
└── ... (giữ từ 2.1/2.2/2.3)
```

Flow `admin.service.listUsers()`:
1. Guard stack (JwtAuthGuard + AdminGuard) đã verify JWT + check admin.
2. Validate query params (Zod — page, limit, search).
3. Build where clause: `search ? or(ilike(email, `%${search}%`), ilike(phone, `%${search}%`)) : undefined`.
4. `db.select({ id, email, phone, role, banned, createdAt }).from(publicUsers).where(where).limit(limit).offset((page-1)*limit).orderBy(desc(createdAt))`.
5. `db.select({ count: count() }).from(publicUsers).where(where)` → total.
6. Return `{ data, total, page, limit }`.

Flow `admin.service.banUser(targetId, adminId)`:
1. Validate targetId UUID.
2. Query target user → 404 if not exist (E6).
3. Self-ban check: `targetId === adminId` → 400 (E4).
4. Ban admin check: `targetUser.role === 'admin'` → 400 (E5).
5. `db.update(publicUsers).set({ banned: true, updatedAt: new Date() }).where(eq(id, targetId))`.
6. Log `{ action: 'ban', targetId, adminId, reason: 'success' }`.
7. Return profile mới `{ id, email, phone, role, banned: true, createdAt }`.

Flow `admin.service.unbanUser(targetId, adminId)`:
1. Validate targetId UUID.
2. Query target user → 404 if not exist (E6).
3. `db.update(publicUsers).set({ banned: false, updatedAt: new Date() }).where(eq(id, targetId))`.
4. Log `{ action: 'unban', targetId, adminId, reason: 'success' }`.
5. Return profile mới `{ id, email, phone, role, banned: false, createdAt }`.

### AdminController — guard stack + throttle

```typescript
// apps/api/src/admin/admin.controller.ts
import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { listUsersApiSchema } from './dto/list-users.dto';

@Controller('admin')
// AC5: guard stack — JWT trước, admin sau. Controller-level (apply tất cả endpoints).
@UseGuards(JwtAuthGuard, AdminGuard)
// AC10: rate limit 20 admin actions / 15 phút / IP.
@Throttle({ default: { limit: 20, ttl: 15 * 60 * 1000 } })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query() query: unknown): Promise<ListUsersResponse> {
    const result = listUsersApiSchema.safeParse(query);
    if (!result.success) throw new ZodError(result.error.issues);
    return this.adminService.listUsers(result.data);
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.banUser(id, user.id);
  }

  @Post('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AdminUserResponse> {
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.unbanUser(id, user.id);
  }
}
```

### list-users.dto.ts — Zod schema

```typescript
// apps/api/src/admin/dto/list-users.dto.ts
import { z } from 'zod';

export const listUsersApiSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});
export type ListUsersDto = z.infer<typeof listUsersApiSchema>;
```

Note: `z.coerce.number()` — query params là string, coerce sang number. `search` optional + trim + max 100 (tránh query quá dài — R5). Drizzle `ilike` parameterized (KHÔNG string concat — SQL injection safe).

### Web — /admin/users page + table + API proxy

```
apps/web/app/
├── (admin)/
│   ├── layout.tsx                   # UPDATE — admin nav thật + admin guard
│   └── users/                       # NEW route
│       ├── page.tsx                 # NEW — server wrapper → UsersTable
│       └── users-table.tsx          # NEW — client component (table + search + ban/unban)
├── api/
│   └── admin/
│       └── users/
│           ├── route.ts             # NEW — thin proxy GET /admin/users
│           └── [id]/
│               ├── ban/
│               │   └── route.ts     # NEW — thin proxy POST /admin/users/:id/ban
│               └── unban/
│                   └── route.ts     # NEW — thin proxy POST /admin/users/:id/unban
```

### Next API thin proxy — admin routes

```typescript
// apps/web/app/api/admin/users/route.ts — NEW (GET list)
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: { authorization: authHeader },
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

```typescript
// apps/web/app/api/admin/users/[id]/ban/route.ts — NEW (POST ban)
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
  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/ban`, {
      method: 'POST',
      headers: { authorization: authHeader },
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

Note: unban route same pattern (replace `ban` with `unban`). AD-10: ZERO business logic — admin check, ban/unban ở NestJS. Next API chỉ forward + pass-through Authorization.

### Admin seed — set role='admin' cho user test

Story 2.4 KHÔNG có role grant API (Story 2.5). Để test admin flow, set role='admin' qua SQL:

```sql
-- Set admin role cho user test (Story 2.4 dev/test only — Story 2.5 sẽ có API).
UPDATE public_users SET role = 'admin' WHERE email = 'admin@bdsai.vn';
-- Hoặc set user đầu tiên thành admin:
UPDATE public_users SET role = 'admin' WHERE id = (SELECT id FROM public_users LIMIT 1);
```

Document trong story + dev log. Prod: admin role set qua SQL migration seed HOẶC Supabase Dashboard (manual) — KHÔNG qua API cho đến Story 2.5.

### Test strategy

- **Unit (jest):**
  - `list-users.dto.spec.ts` — page/limit coerce + min/max, search max 100, default values.
  - `admin.guard.spec.ts` — role='admin' → pass, role='user' → 403, orphan → 403, DB fail → 500.
  - `admin.service.spec.ts`:
    - listUsers happy path → return data + total + pagination.
    - listUsers with search → filter ilike email/phone.
    - listUsers pagination → offset correct (E9).
    - banUser happy path → banned=true + return profile.
    - banUser self-ban → 400 (E4).
    - banUser ban admin → 400 (E5).
    - banUser not exist → 404 (E6).
    - banUser already banned → 200 idempotent (E7).
    - unbanUser happy path → banned=false.
    - unbanUser not exist → 404 (E6).
- **Integration (jest e2e):**
  - `admin.e2e-spec.ts` (NEW):
    - Login admin → GET /admin/users → 200 + data + total.
    - GET /admin/users?page=2&limit=20 → pagination correct (E9).
    - GET /admin/users?search=test@ → filter (E8).
    - POST /admin/users/:id/ban → 200 + banned=true.
    - POST /admin/users/:id/unban → 200 + banned=false.
    - E1 no token → 401.
    - E2 user thường → 403.
    - E3 user thường ban → 403.
    - E4 admin self-ban → 400.
    - E5 ban admin → 400.
    - E6 user not exist → 404.
    - E7 ban already banned → 200 idempotent.
    - E12 ban user đang login → GET /auth/me vẫn 200, PATCH /auth/me → 403.
    - AC10 rate limit: 21 admin requests → 429.
  - Skip nếu Supabase không reach (env guard — pattern từ Story 2.1/2.2).
- **Web (vitest):**
  - `users-table.test.tsx` — table render, search, ban/unban button click + confirm, error display (E10 redirect, E11 redirect).
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3).

### Source tree (NEW/UPDATE)

```
bdsai/
├── apps/api/
│   ├── src/
│   │   ├── admin/                              # NEW module (AD-1)
│   │   │   ├── admin.module.ts                 # NEW — ThrottlerModule scoped
│   │   │   ├── admin.controller.ts             # NEW — GET /admin/users, POST ban/unban
│   │   │   ├── admin.service.ts                # NEW — listUsers, banUser, unbanUser
│   │   │   ├── admin.service.spec.ts           # NEW — unit test
│   │   │   ├── guards/
│   │   │   │   ├── admin.guard.ts              # NEW — AdminGuard (query DB check role)
│   │   │   │   └── admin.guard.spec.ts         # NEW — unit test
│   │   │   └── dto/
│   │   │       ├── list-users.dto.ts           # NEW — Zod schema (page, limit, search)
│   │   │       └── list-users.dto.spec.ts      # NEW — unit test
│   │   └── app.module.ts                       # UPDATE — import AdminModule
│   ├── test/
│   │   └── admin.e2e-spec.ts                   # NEW — integration test admin endpoints
│   └── package.json                            # KHÔNG cần dep mới
├── apps/web/
│   ├── app/
│   │   ├── (admin)/
│   │   │   ├── layout.tsx                      # UPDATE — admin nav thật + admin guard
│   │   │   └── users/                          # NEW route
│   │   │       ├── page.tsx                    # NEW — server wrapper
│   │   │       └── users-table.tsx             # NEW — client component
│   │   └── api/
│   │       └── admin/
│   │           └── users/
│   │               ├── route.ts                # NEW — thin proxy GET list
│   │               └── [id]/
│   │                   ├── ban/route.ts        # NEW — thin proxy POST ban
│   │                   └── unban/route.ts      # NEW — thin proxy POST unban
│   ├── tests/
│   │   └── users-table.test.tsx                # NEW — vitest table test
│   └── package.json                            # KHÔNG cần dep mới
└── supabase/
    └── config.toml                             # KHÔNG ĐỔI
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **AdminGuard query DB mỗi request (KHÔNG trust JWT role):** AD-5 — JWT role claim có thể stale (user demote sau khi JWT issued, JWT valid 1h). Query DB mỗi admin request (1 SELECT) — admin traffic low → acceptable. Alternative: cache role trong Redis (TTL 60s) — future optimization. Story 2.4: query DB mỗi lần (simple, correct).
2. **AdminModule riêng (AD-1):** `admin/` module riêng (KHÔNG trong `auth/`). Admin là business domain (quản lý user) — tách khỏi auth (authentication). AdminController + AdminService + AdminGuard trong `admin/`. Future: thêm listing moderation, inquiry management vào admin module.
3. **KHÔNG migration mới:** Story 2.4 dùng cột `banned` + `role` đã có từ Story 2.1 (migration 0001). KHÔNG thêm cột, KHÔNG đổi schema. Chỉ thêm module + endpoints + web pages.
4. **KHÔNG role grant API (Story 2.5):** Story 2.4 chỉ list/ban/unban. Set role='admin' qua SQL (dev/test) HOẶC Supabase Dashboard (prod manual). Story 2.5 sẽ có role grant API (admin set admin cho user khác) + audit log.
5. **Self-ban block (E4) + ban admin block (E5):** R1 (self-ban lockout) + R2 (mutual ban). Cả 2 → 400. Unban KHÔNG block (unban admin OK — admin có thể bị ban qua SQL direct, unban qua API OK).
6. **Banned user session active (R3 — defer revoke):** Ban set `banned=true` nhưng KHÔNG revoke JWT ngay. User session valid đến khi JWT expire (1h). Login lại → 403 (Story 2.2 E7). API endpoint có banned check (Story 2.3 E8 — PATCH /auth/me). Future story: JWT blacklist HOẶC Supabase session revoke (admin ban → revoke session ngay).
7. **Search redact trong log (AC8):** Search term có thể chứa email/phone (PII). Log chỉ `searchProvided: true/false` (KHÔNG log search term raw). Pino redact `*.email`, `*.phone` đã có (áp dụng cho response field trong log object).
8. **Idempotent ban/unban (E7):** Ban user đã banned → vẫn 200 (no-op). Unban user không banned → vẫn 200 (no-op). KHÔNG error — idempotent đơn giản hơn cho client (retry safe).
9. **Admin throttle 20/15min (AC10):** 20 admin actions / 15 phút / IP. Admin traffic low → 20 đủ. Exceed → 429. Scoped AdminModule (KHÔNG conflict AuthModule throttler — mỗi module scoped riêng).
10. **Web admin guard client-side (AC6b/AC7b):** Check `user.role === 'admin'` client-side (AuthContext). KHÔNG SSR protect (accessToken in memory). Redirect `/` nếu user thường. Server-side admin check vẫn ở NestJS AdminGuard (defense-in-depth — client guard là UX, server guard là security).

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **R1 — Admin self-ban lockout** | E4 — self-ban → 400 "Không thể khóa chính mình". Check `targetId === adminId` trước update. Test e2e. |
| **R2 — Ban admin khác (mutual ban)** | E5 — ban admin → 400 "Không thể khóa quản trị viên". Check `targetUser.role === 'admin'` trước update. Test e2e. |
| **R3 — Banned user session active (defer revoke)** | E12 — ban set `banned=true` nhưng JWT vẫn valid (1h). Login lại → 403. API endpoint banned check (Story 2.3 E8). Future: JWT blacklist HOẶC Supabase session revoke. Document rõ. |
| **R4 — Pagination performance (large user base)** | AC1 — `limit` max 100, `offset` pagination. `orderBy(desc(createdAt))` — index trên `created_at` (đã có default index? — verify). Future: cursor pagination nếu > 10k users. Story 2.4: offset pagination OK (user base small initially). |
| **R5 — Search injection (SQL injection via search)** | AC1 — Drizzle `ilike()` parameterized (KHÔNG string concat). Zod validate search max 100 chars. Drizzle escape `%` `_` trong ilike pattern? — verify (Drizzle `ilike` dùng parameterized query, `%` trong search được escape). Test: search `'; DROP TABLE--` → KHÔNG inject. |
| **R6 — Race condition (last-write-wins)** | AC2/AC3 — 2 admin ban/unban cùng user cùng lúc → last-write-wins (KHÔNG optimistic locking). Banned flag boolean → last write wins OK (KHÔNG critical data). Document. |

## References

- [Source:] `_bmad-output/planning-artifacts/epics.md` dòng 262-290 (Epic 2, admin user management) + dòng 19 (FR2) + dòng 144 (quy ước test).
- [Source:] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45), AD-5 (dòng 63 — AdminGuard query DB), AD-7 (dòng 69 — error shape), AD-8 (dòng 81 — PII redact), AD-10 (dòng 93 — Next API mỏng), M2 User Management (dòng 312).
- [Source:] `bdsai/apps/api/src/db/schema/public-users.ts` — schema hiện tại (11 cột: id, email, phone, phoneVerified, role, banned, avatarUrl, bio, displayName, createdAt, updatedAt).
- [Source:] `bdsai/apps/api/src/auth/auth.controller.ts` — AuthController (Story 2.1-2.3, pattern cho controller + guard + throttle).
- [Source:] `bdsai/apps/api/src/auth/auth.service.ts` — AuthService getMe/updateMe (Story 2.2-2.3, pattern cho service + Drizzle query).
- [Source:] `bdsai/apps/api/src/auth/guards/jwt-auth.guard.ts` — JwtAuthGuard (Story 2.2, reuse — guard stack AC5).
- [Source:] `bdsai/apps/api/src/auth/auth.module.ts` — AuthModule (Story 2.2, pattern cho ThrottlerModule scoped + APP_GUARD).
- [Source:] `bdsai/apps/web/app/(admin)/layout.tsx` — admin layout placeholder (Story 1.4, cần update nav thật + admin guard).
- [Source:] `bdsai/apps/web/components/auth/auth-context.ts` — AuthContext + AuthUser (Story 2.2-2.3, có `role` field cho admin check).
- [Source:] `bdsai/apps/web/lib/auth-fetch.ts` — useAuthFetch (Story 2.2, JWT refresh interceptor — admin page dùng cho API call).
- [Source:] `bdsai/apps/web/app/api/auth/me/route.ts` — Next API thin proxy pattern (Story 2.2-2.3, AD-10).
- [Source:] `_bmad-output/implementation-artifacts/2-2-dang-nhap-dang-xuat-jwt.md` — JwtAuthGuard pattern, throttle pattern, AuthProvider pattern.
- [Source:] `_bmad-output/implementation-artifacts/2-3-quan-ly-profile.md` — format story file, Drizzle query pattern, PII redact pattern.

## Dev Agent Record

- **Story points:** 3 (small — admin module + 3 endpoints + AdminGuard + web table + API proxy. KHÔNG migration, KHÔNG dep mới).
- **Dependencies:** Story 2.1 (public_users + banned/role cột), Story 2.2 (JwtAuthGuard + AuthProvider + useAuthFetch + banned login check), Story 2.3 (PATCH /auth/me banned check), Story 1.4 ((admin) layout), Story 1.6 (ThrottlerModule + pino + exception filter).
- **Estimated effort:** 0.5-1 ngày dev + 0.5 ngày test.
- **Status:** ready-for-dev → (dev implement) → review → e2e → done.
- **Deferred:** Role grant API (set role='admin') — Story 2.5. Banned user session revoke (JWT blacklist) — future story.
