# Epic 2 Gap Review

Review gaps Story 2.1–2.5 (Epic 2 — User Authentication & Profiles) cho bdsai.vn.
Phương pháp: đọc AC trong `_bmad-output/planning-artifacts/epics.md` (lines 242–323),
so sánh với code implement trong `bdsai/apps/api/src/{auth,admin,upload,marketplace,db}`
và `bdsai/apps/web/app/{(auth),(admin),profile}` + `components/auth`. KHÔNG sửa code.

---

## Story 2.1: Đăng ký bằng email + phone

- **Status:** MINOR GAP
- **Gaps:**
  - **MINOR — Email xác thực chưa thực sự gửi ở prod.** AC: "email xác thực được gửi;
    tài khoản ở trạng thái chưa verify đến khi xác nhận". Implement enqueue email
    verification job (`auth.service.ts:184`) + dev-only `generateLink` log link
    (`auth.service.ts:200–221`), nhưng `admin.createUser` KHÔNG tự gửi confirmation
    email. Prod SMTP thật deferred tới Story 6.2 (comment `auth.service.ts:179–182`).
    Hiện tại ở prod: user đăng ký xong không nhận được email xác thực → không thể
    login (login chặn email-not-confirmed, `auth.service.ts:270–276`). Suggested fix:
    hoàn thiện Story 6.2 EmailProcessor hoặc tạm dùng `supabase.auth.admin.inviteUserByEmail`
    / `generateLink` gửi qua Resend SES.
- **Implemented:**
  - `POST /auth/register` (`auth.controller.ts:48`) — Zod validate + service.
  - Supabase Auth `admin.createUser` (service-role, AD-5) → `authUserId`
    (`auth.service.ts:96`).
  - `public_users` insert với `role='user'` (`auth.service.ts:150`, schema
    `db/schema/public-users.ts:22`).
  - Compensate rollback: insert fail → `admin.deleteUser` (`auth.service.ts:162`).
  - Validation: email + phone VN (normalize trước, `register.dto.ts:20`) + password
    ≥8 (`@bdsai/shared` registerSchema).
  - Duplicate email → 409 Conflict (`auth.service.ts:112–123`); duplicate phone →
    409 (`auth.service.ts:125–131`).
  - Phone chuẩn hóa `0xxxxxxxxx` (`phone-normalize.ts`), Supabase Auth lưu E.164.
  - PII redact trong log (`safeErr`, `auth.service.ts:631`).

---

## Story 2.2: Đăng nhập / đăng xuất với JWT session

- **Status:** NO GAP
- **Gaps:** Không phát hiện gap material.
- **Implemented:**
  - `POST /auth/login` (`auth.controller.ts:61`) — `signInWithPassword`, rate limit
    5/15min (`auth.controller.ts:64`).
  - Anti-enumeration: sai password / email không tồn tại → generic 401 "Email hoặc
    mật khẩu không đúng" (`auth.service.ts:282`).
  - Banned user → 403, không return JWT (`auth.service.ts:310–317`).
  - `POST /auth/logout` — `JwtAuthGuard` verify signature (fix HIGH-1) +
    `admin.signOut(userId, 'global')` + clear cookie (`auth.controller.ts:79`,
    `auth.service.ts:346`).
  - `POST /auth/refresh` — cookie ưu tiên, body fallback; rotate refresh token;
    fail → 401 + clear cookie (`auth.controller.ts:96`, `auth.service.ts:372`).
  - `GET /auth/me` — `JwtAuthGuard` (`auth.controller.ts:119`).
  - JWT verify hybrid HS256 local → ES256 fallback `getUser` + iss validation
    (`jwt-auth.guard.ts:56–94`).
  - Refresh token httpOnly cookie (Secure, SameSite=Lax, Path=/api/auth, 7d)
    (`cookie.helper.ts`).
  - AD-4 SSR boundary: `accessToken` trong memory (useState), KHÔNG localStorage;
    `AuthProvider` client component restore session qua `/api/auth/refresh` on mount
    (`auth-provider.tsx:16`).
  - `useAuthFetch` 401 → auto refresh im lặng → retry; refresh fail → redirect
    `/login` (`lib/auth-fetch.ts`).
  - Web UI: `/login` + `LoginForm`, `/register`, 4 API thin proxies
    (`app/api/auth/*`).

---

## Story 2.3: Quản lý profile (avatar, bio, phone verified)

- **Status:** MAJOR GAP
- **Gaps:**
  - **MAJOR — Không có xác thực phone qua OTP.** AC: "xác thực phone qua OTP →
    đánh dấu `phone_verified = true`". Không có endpoint send-OTP / verify-OTP nào
    trong `auth.controller.ts` hay `auth.service.ts`. `phoneVerified` luôn `false`
    khi register (`auth.service.ts:231`) và không có path nào set `true` (grep
    `phone_verified` chỉ có read, không có update). UI profile chỉ hiển thị badge
    "Chưa xác thực" tĩnh (`profile-form.tsx:253–261`). Suggested fix: thêm
    `POST /auth/phone/otp` (gọi `supabase.auth.signInWithOtp({ phone })`) +
    `POST /auth/phone/verify` (verify OTP → `db.update(publicUsers).set({phoneVerified: true})`).
  - **MINOR — Avatar upload qua NestJS, không "trực tiếp Supabase Storage".** AC:
    "avatar upload trực tiếp Supabase Storage (AD-7, exception AD-2)". Implement
    upload qua `POST /api/upload/avatar` → `UploadService.uploadAvatar` →
    `supabase.storage.upload` service-role (`upload.service.ts:70`). Đây là qua
    NestJS (AD-2), không phải client upload trực tiếp Storage. An toàn hơn nhưng
    lệch chữ AC. Acceptable theo exception AD-2.
- **Implemented:**
  - `PATCH /auth/me` (`auth.controller.ts:129`) — update displayName, bio, avatarUrl.
  - Whitelist + sanitize XSS (encode `< > &`) + max length (`update-me.dto.ts:25–71`).
  - Banned user → 403 update (`auth.service.ts:498`).
  - Avatar: sharp convert WebP 512x512 cover, quality 80, ≤10MB, magic-bytes
    validation (`upload.service.ts:70–134`).
  - avatarUrl host validate match Supabase host (`auth.service.ts:550`).
  - Web UI `/profile` + `ProfileForm` (avatar preview, char counter, auth protect).

---

## Story 2.4: Admin — danh sách user, ban/unban

- **Status:** MAJOR GAP
- **Gaps:**
  - **MAJOR — Banned user vẫn đăng tin được; tin đang hiển thị KHÔNG bị ẩn.** AC:
    "ban một user → user đó không đăng nhập/đăng tin được, tin đang hiển thị bị ẩn".
    Login đã chặn (`auth.service.ts:310`), NHƯNG `MarketplaceService.createListing`
    KHÔNG check `banned` (`marketplace.service.ts:52` — không query public_users,
    không guard banned). Query public/search listings cũng KHÔNG join/filter seller
    banned (grep `banned` trong `src/marketplace` = 0 match; `getListing` chỉ check
    `status==='PUBLISHED'`, `marketplace.service.ts:110`). Suggested fix: trong
    `createListing` query `publicUsers.banned` → 403 nếu banned; trong public
    listing query thêm `EXISTS (SELECT 1 FROM public_users WHERE id=sellerId AND
    banned=false)` hoặc join + filter.
  - **MAJOR — Ban/unban KHÔNG ghi audit log.** AC: "mọi hành động ban/unban ghi
    audit log". `AdminService.banUser`/`unbanUser` chỉ `logger.log` pino structured
    (`admin.service.ts:158`, `:185`) — KHÔNG insert vào bảng audit nào. Bảng duy nhất
    `moderation_audit_logs` (`db/schema/moderation-audit-logs.ts`) là cho listing
    moderation (Story 3.5, FK listingId NOT NULL), không dùng cho user action.
    Suggested fix: tạo bảng `user_audit_logs(adminId, targetId, action, createdAt)`
    + insert trong `banUser`/`unbanUser`.
- **Implemented:**
  - `GET /admin/users` — paginated + search email/phone (Drizzle ilike parameterized)
    (`admin.controller.ts:37`, `admin.service.ts:47`).
  - `POST /admin/users/:id/ban` + `/unban` (`admin.controller.ts:47,59`).
  - Self-ban → 400 (`admin.service.ts:124`); ban admin → 400 (`admin.service.ts:135`).
  - Guard stack `JwtAuthGuard` + `AdminGuard` (query DB role, không trust JWT)
    (`admin.controller.ts:31`, `admin/guards/admin.guard.ts:34`).
  - Rate limit 20/15min (`admin.controller.ts:32`).
  - Web UI `/admin/users` + `UsersTable` (search, pagination, ban/unban, confirm dialog).

---

## Story 2.5: Admin role grant — quy trình cấp quyền an toàn

- **Status:** MAJOR GAP
- **Gaps:**
  - **MAJOR — Không có super-admin role / seed migration.** AC: "super-admin đầu
    tiên được seed qua migration/command (KHÔNG qua UI công khai)". Schema
    `public_users.role` chỉ có giá trị `'user' | 'admin'` (`role-grant.dto.ts:8`
    enum, `admin.guard.ts:57` check `=== 'admin'`). Không có role `super-admin`,
    không có migration/command seed admin đầu tiên (grep `seed.*admin`, `super_admin`,
    `INSERT INTO public_users` trong migrations = 0 match; chỉ có `seed-listings.ts`).
    Admin đầu tiên phải tạo bằng SQL tay không tài liệu hóa. Suggested fix: thêm
    role `super-admin` vào schema + migration seed 1 super-admin từ env
    (`SUPER_ADMIN_EMAIL`) hoặc CLI command `db:seed-super-admin`.
  - **MAJOR — Bất kỳ admin nào cũng cấp/thu quyền, không phân biệt super-admin.**
    AC: "chỉ super-admin cấp/thu quyền admin cho user khác". Implement `AdminGuard`
    chỉ check `role==='admin'` (`admin.guard.ts:57`), `grantRole` không check caller
    có phải super-admin (`admin.service.ts:199`). Bất kỳ admin nào cũng grant/revoke
    admin cho user khác → vi phạm nguyên tắc "chỉ super-admin". Suggested fix:
    `grantRole` yêu cầu `caller.role === 'super-admin'` (thêm SuperAdminGuard hoặc
    check trong service).
  - **MAJOR — Thay đổi role KHÔNG ghi audit log.** AC: "mọi thay đổi role ghi audit
    log (ai cấp, cho ai, khi nào)". `grantRole` chỉ `logger.log` pino
    (`admin.service.ts:230`) — KHÔNG insert audit table. Pino log có adminId +
    targetId + newRole nhưng không persistent, không queryable. Suggested fix: insert
    vào `user_audit_logs` (cùng bảng với Story 2.4) với action `role_grant`/`role_revoke`.
- **Implemented:**
  - `POST /admin/users/:id/role` — body `{ role: 'admin'|'user' }` (`admin.controller.ts:74`).
  - Self-revoke → 400 (`admin.service.ts:205`); self-grant idempotent 200.
  - Regular user gọi API → 403 (`AdminGuard`).
  - Revoke hiệu lực ngay: `AdminGuard` query DB mỗi request (không trust JWT stale)
    (`admin.guard.ts:44`) → admin bị demote mất quyền ở request kế tiếp.
  - Role enum chặn `superadmin`/giá trị lạ → 400 (`role-grant.dto.ts:8`).
  - Web UI: nút "Cấp admin" / "Thu hồi admin" + confirm dialog, self-revoke disabled
    (`users-table.tsx:345–382`).

---

## Summary table

| Story | Status | # Gaps | Priority |
|-------|--------|--------|----------|
| 2.1 Đăng ký email/phone | MINOR GAP | 1 | Medium (email verify deferred Story 6.2) |
| 2.2 Login/logout JWT | NO GAP | 0 | — |
| 2.3 Profile + phone OTP | MAJOR GAP | 2 | High (OTP verify thiếu) |
| 2.4 Admin ban/unban | MAJOR GAP | 2 | High (banned vẫn đăng tin + audit log) |
| 2.5 Admin role grant | MAJOR GAP | 3 | High (super-admin model + audit log) |

**Tổng: 5 story, 3 MAJOR GAP, 1 MINOR GAP, 1 NO GAP. 8 gap items.**

### Gap tập trung (cross-story)
1. **Audit log persistent thiếu hoàn toàn cho user action** (Story 2.4 + 2.5) — chỉ
   có pino structured log, không có bảng `user_audit_logs`. Bảng `moderation_audit_logs`
   hiện có chỉ phục vụ listing moderation (Story 3.5). → Cần thêm bảng + insert cho
   ban/unban/role-grant.
2. **Banned enforcement không đầy đủ** (Story 2.4) — chỉ chặn login, không chặn tạo
   tin và không ẩn tin đang hiển thị. Marketplace service không join `public_users.banned`.
3. **Super-admin role model không tồn tại** (Story 2.5) — schema chỉ có `user|admin`,
   không seed, không phân quyền super-admin vs admin thường.
4. **Phone OTP verification thiếu** (Story 2.3) — `phone_verified` luôn false, không
   có endpoint verify.

### Đã làm tốt
- AD-5 auth separation (Supabase Auth + public_users business entity) rõ ràng.
- AD-8 PII redact trong log consistent.
- Anti-enumeration login, JWT iss validation, refresh token httpOnly rotation.
- AdminGuard query DB mỗi request (revoke hiệu lực ngay, không trust JWT stale).
- Self-ban / self-revoke block (defense-in-depth UI + server).
- Compensate rollback register (orphan prevention).
