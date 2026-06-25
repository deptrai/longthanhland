---
baseline_commit: TBD-by-dev
---

# Story 2.3: Quản lý profile (avatar, bio, display_name)

Status: ready-for-dev

<!-- Story THỨ 3 Epic 2 (User Authentication & Profiles). Story 2.1 (register) + 2.2 (login/logout/JWT) DONE — AuthModule + public_users + JwtAuthGuard + AuthProvider đã sẵn. -->
<!-- Dependencies: Story 2.1 (AuthModule + public_users + register), Story 2.2 (login/logout/refresh/me + JwtAuthGuard + AuthProvider + useAuthFetch), Story 1.2 (Supabase client + ConfigService + env validation), Story 1.4 (Base UI header + route groups), Story 1.6 (BullMQ + pino logger + exception filter + Sentry redact). -->
<!-- DEFERRED: Phone OTP verify (epic AC dòng 288 "xác thực phone qua OTP") — quá phức tạp cho 2.3 (cần Twilio/Vonage provider + OTP flow + rate limit). Defer sang story riêng (2.3b hoặc 6.x). Story 2.3 chỉ cập nhật avatar/bio/display_name + xem profile. phone_verified giữ nguyên (set = true chỉ qua flow OTP riêng). -->

## Story

As a **người dùng đã đăng nhập**,
I want **xem và cập nhật profile của mình (avatar, bio, display_name)**,
so that **tôi cá nhân hóa tài khoản và tăng độ tin cậy trên nền tảng**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 2 → Story 2.3 (dòng 277-290, AC gốc Given/When/Then) + FR2 (dòng 19: "User đăng nhập, quản lý profile (avatar, bio, phone verified)") + AD-2 (Single Data Mutation Path), AD-7 (Image Storage Convention), AD-8 (PII/Secret), AD-10 (Next API mỏng).
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC9.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.
> **Scope cut:** Phone OTP verify (epic dòng 288) DEFERRED sang story riêng — story này KHÔNG implement OTP. `phone_verified` chỉ set qua flow OTP đó (KHÔNG qua PATCH /auth/me).

1. **AC1 — Drizzle migration 0002 thêm cột `avatar_url`, `bio`, `display_name` vào `public_users`.**
   Given Story 2.1 đã tạo bảng `public_users` (migration 0001) với cột id, email, phone, phone_verified, role, banned, created_at, updated_at,
   When định nghĩa thêm 3 cột trong `apps/api/src/db/schema/public-users.ts` + chạy `yarn db:generate` (KHÔNG `--custom` — schema change thật),
   Then migration 0002 `*.sql` chứa `ALTER TABLE public_users ADD COLUMN avatar_url text, ADD COLUMN bio text, ADD COLUMN display_name text` (cả 3 NULLable — user chưa set thì NULL). `yarn db:migrate` apply thành công.
   Cột mới:
   - `avatar_url` text NULL — public URL từ Supabase Storage (AD-7 — chỉ lưu URL reference, KHÔNG lưu binary).
   - `bio` text NULL — giới thiệu bản thân, max 500 chars (validate AC3).
   - `display_name` text NULL — tên hiển thị, max 100 chars (validate AC3).
   Verify: `psql` — `\d public_users` hiện 3 cột mới (nullable). `SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;` có 3 rows (0000 + 0001 + 0002). Existing rows KHÔNG bị ảnh hưởng (cột mới = NULL).

2. **AC2 — `GET /auth/me` trả profile đầy đủ (mở rộng từ Story 2.2 AC7).**
   Given user đã đăng nhập (có valid JWT) + Story 2.2 đã có `GET /auth/me` trả `{ id, email, phone, phoneVerified, role, banned, createdAt }`,
   When `GET /auth/me` với `Authorization: Bearer <jwt>`,
   Then:
   (a) JwtAuthGuard verify JWT + extract user id (Story 2.2 — KHÔNG đổi).
   (b) Query `public_users` row bằng `user.id` (Drizzle — AD-2 read).
   (c) Response: 200 `{ id, email, phone, phoneVerified, role, banned, createdAt, avatarUrl, bio, displayName }` (thêm 3 field mới — `null` nếu chưa set).
   (d) Orphan (no `public_users` row) → 404 `{ message: 'Hồ sơ người dùng không tồn tại' }` (giữ Story 2.2 E11).
   Verify: `curl http://localhost:3101/auth/me -H 'Authorization: Bearer <jwt>'` → 200 + 9 field. User mới register (chưa set profile) → `avatarUrl: null, bio: null, displayName: null`.

3. **AC3 — `PATCH /auth/me` cập nhật `avatar_url`, `bio`, `display_name` (chỉ field gửi, KHÔNG update email/phone/role/banned).**
   Given user đã đăng nhập (JwtAuthGuard),
   When `PATCH /auth/me` với body `{ avatarUrl?, bio?, displayName? }` (tất cả optional — chỉ update field có trong body),
   Then:
   (a) **Whitelist field:** chỉ accept `avatarUrl`, `bio`, `displayName`. Field khác (`email`, `phone`, `role`, `banned`, `id`, `createdAt`) trong body → IGNORE (KHÔNG update, KHÔNG error — silent strip). Quyết định dev: silent strip thay vì 400 để UX tốt hơn (frontend gửi thừa field không break).
   (b) **Validation (Zod):**
   - `displayName`: string, max 100 chars, optional. Trim trước validate. Empty string → set NULL (xóa display_name).
   - `bio`: string, max 500 chars, optional. Trim. Empty string → set NULL.
   - `avatarUrl`: string URL, max 500 chars, optional. Phải là URL hợp lệ (z.string().url()). Empty string → set NULL (xóa avatar). Phải thuộc domain Supabase Storage (check host = Supabase project host — chống inject URL ngoài). Quyết định dev: validate host match `SUPABASE_URL` host.
   (c) **Sanitize XSS:** `bio` + `displayName` sanitize trước lưu — strip HTML tag (`<script>`, `<img onerror>`, ...). Dùng `sanitize-html` (new dep) HOẶC simple regex strip `<[^>]*>`. Quyết định dev: simple regex strip + encode `<` `>` `&` (đủ cho text field, KHÔNG cần full HTML sanitizer vì field là plain text hiển thị text-only).
   (d) **Update:** `db.update(publicUsers).set({ ...fields, updatedAt: new Date() }).where(eq(publicUsers.id, userId))` (Drizzle — AD-2 mutation qua NestJS Service). Last-write-wins (KHÔNG optimistic locking — xem E12).
   (e) **Response:** 200 `{ id, email, phone, phoneVerified, role, banned, createdAt, avatarUrl, bio, displayName }` (return profile mới — same shape AC2).
   (f) **Banned user:** nếu `public_users.banned = true` → 403 `{ message: 'Tài khoản đã bị khóa' }` (E8 — banned user không update profile).
   (g) **Orphan:** row không tồn tại → 404 (giữ AC2d).
   Verify: `curl -X PATCH http://localhost:3101/auth/me -H 'Authorization: Bearer <jwt>' -H 'Content-Type: application/json' -d '{"displayName":"Luis P","bio":"Môi giới BĐS Long Thành"}'` → 200 + profile mới. `psql` — `SELECT display_name, bio FROM public_users WHERE id=...` → "Luis P", "Môi giới BĐS Long Thành". PATCH với `{email:"x@y.com"}` → email KHÔNG đổi (silent strip).

4. **AC4 — `PATCH /auth/me` cần JwtAuthGuard (verify JWT, extract user id).**
   Given endpoint `PATCH /auth/me`,
   When request tới,
   Then:
   (a) `@UseGuards(JwtAuthGuard)` (Story 2.2 — reuse, KHÔNG tạo guard mới).
   (b) Không Authorization header / malformed / expired → 401 (guard reject — Story 2.2 behavior).
   (c) Guard attach `request.user = { id, email }` → service nhận `userId` từ `req.user.id`.
   Verify: `curl -X PATCH http://localhost:3101/auth/me -H 'Content-Type: application/json' -d '{"bio":"x"}'` (không JWT) → 401. `curl -X PATCH ... -H 'Authorization: Bearer <expired>'` → 401.

5. **AC5 — Avatar upload: `POST /upload/avatar` (JwtAuthGuard) → Supabase Storage bucket `avatars` → return public URL.**
   Given user đã đăng nhập + muốn upload avatar mới,
   When `POST /upload/avatar` với `Authorization: Bearer <jwt>` + body `multipart/form-data` field `file` (image),
   Then:
   (a) **JwtAuthGuard** verify JWT + extract userId.
   (b) **File validation:**
   - Content-Type phải là image (`image/jpeg`, `image/png`, `image/webp`, `image/gif`). Non-image → 400 `{ message: 'File phải là ảnh (JPEG, PNG, WebP, GIF)' }` (E6).
   - File size ≤ 10MB (AD-7 — max 10MB/image). > 10MB → 400 `{ message: 'Ảnh tối đa 10MB' }` (E5).
   (c) **WebP auto-convert (AD-7):** convert image sang WebP server-side dùng `sharp` (new dep). Resize max 512x512 (avatar — square crop center). Quality 80. Output buffer WebP.
   (d) **Upload Supabase Storage:** `supabase.storage.from('avatars').upload(${userId}/avatar.webp, webpBuffer, { contentType: 'image/webp', upsert: true })` (service-role — AD-5). Path = `{userId}/avatar.webp` (upsert — 1 avatar/user, ghi đè cũ).
   (e) **Public URL:** `supabase.storage.from('avatars').getPublicUrl(${userId}/avatar.webp)` → return URL. Response: 200 `{ avatarUrl: <publicUrl> }`.
   (f) **Bucket `avatars`:** tạo bucket mới (private HOẶC public — quyết định dev: PUBLIC vì avatar hiển thị công khai trên profile/listing. Tạo qua SQL migration 0002 `--custom` section HOẶC Supabase Dashboard. RLS policy: bucket public read, service-role write). Document trong migration comment.
   (g) **AD-2 exception:** Storage upload là service riêng (AD-2 exception — xem ARCHITECTURE-SPINE.md dòng 49). NestJS endpoint validate + convert + upload (KHÔNG frontend upload trực tiếp — giữ validation server-side).
   Verify: `curl -X POST http://localhost:3101/upload/avatar -H 'Authorization: Bearer <jwt>' -F 'file=@test.jpg'` → 200 + `{ avatarUrl: 'https://<supabase>.supabase.co/storage/v1/object/public/avatars/<userId>/avatar.webp' }`. Supabase Dashboard → Storage → bucket `avatars` → file `<userId>/avatar.webp` (WebP). GET avatarUrl public → 200 image/webp.

6. **AC6 — Web page `/profile` (form hiển thị + edit profile, AuthContext protect).**
   Given Story 2.2 đã có AuthProvider + useAuth + useAuthFetch + route group `(auth)` (login/register),
   When tạo:
   (a) **`/profile` page:** `apps/web/app/profile/page.tsx` (server wrapper) + `apps/web/app/profile/profile-form.tsx` (client component). Route KHÔNG nằm trong `(auth)` group (group đó cho login/register — profile là authenticated page riêng).
   (b) **Auth protect (AC6 web):** page dùng `useAuth()` — nếu `!isAuthenticated && !isLoading` → redirect `/login?redirect=/profile` (useEffect redirect). Nếu `isLoading` → hiển thị loading spinner (tránh flash). KHÔNG SSR protect (accessToken in memory — SSR không biết auth state).
   (c) **Form fields:** avatar (image upload + preview), displayName (text input), bio (textarea). Email + phone hiển thị read-only (KHÔNG edit — AC3 whitelist). phone_verified hiển thị badge (verified/chưa). Label tiếng Việt.
   (d) **Load profile:** mount → `useAuthFetch()('/api/auth/me')` → populate form. Hoặc dùng `user` từ AuthContext (đã có từ Story 2.2 restore). Quyết định dev: fetch `/api/auth/me` fresh (AuthContext user có thể stale — chỉ có id/email/role, thiếu avatarUrl/bio/displayName).
   (e) **Avatar upload:** input type=file → chọn ảnh → preview (URL.createObjectURL) → upload `POST /api/upload/avatar` (multipart) → get avatarUrl → hiển thị preview mới. Upload riêng nút "Tải ảnh" (KHÔNG đợi save profile — upload ngay).
   (f) **Save profile:** nút "Lưu" → `useAuthFetch()('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ displayName, bio }) })` (AD-10 — qua Next API thin proxy). avatarUrl đã lưu qua upload step (KHÔNG gửi lại qua PATCH — hoặc gửi lại để confirm). Quyết định dev: PATCH gửi `{ displayName, bio, avatarUrl }` (avatarUrl từ upload step — confirm server).
   (g) **Success:** toast "Cập nhật hồ sơ thành công" + refresh AuthContext user (fetch /api/auth/me lại).
   (h) **Error:** hiển thị message từ API response (validation error inline, server error toast).
   Verify: browser — login → navigate `/profile` → form hiển thị profile. Edit displayName + bio → save → toast success. Upload avatar → preview → save → avatar mới. Navigate `/profile` khi chưa login → redirect `/login?redirect=/profile`.

7. **AC7 — Next API thin proxy cho PATCH /auth/me + POST /upload/avatar (AD-10).**
   Given web form gọi API,
   When tạo Next API routes:
   (a) `apps/web/app/api/auth/me/route.ts` — UPDATE (đã có GET từ Story 2.2) → thêm `PATCH` method: forward body + Authorization header → NestJS `PATCH /auth/me`. Pass-through response.
   (b) `apps/web/app/api/upload/avatar/route.ts` — NEW: forward `multipart/form-data` + Authorization header → NestJS `POST /upload/avatar`. Pass-through response (JSON `{ avatarUrl }`).
   Then: ZERO business logic trong web (AD-10) — chỉ forward. Validation nghiệp vụ (whitelist, Zod, file check) ở NestJS. Web chỉ client-side UX validation (required, max length hint).
   Verify: grep `apps/web/app/api/` — không có Zod validation nghiệp vụ, không Drizzle, không Supabase client trực tiếp (chỉ fetch forward).

8. **AC8 — PII redact (AD-8): không log avatar_url/bio/displayName raw nếu chứa PII.**
   Given Story 2.1/2.2 đã redact `*.email`, `*.phone`, `*.password`, `*.token` trong pino + Sentry,
   When profile update flow log (info/warn/error),
   Then:
   (a) **bio KHÔNG log raw** (có thể chứa PII — user tự nhập). Pino redact thêm `*.bio`, `*.displayName` vào config (UPDATE `logger.module.ts`). Log chỉ `[Redacted]`.
   (b) **avatarUrl KHÔNG log raw** nếu chứa PII (URL có thể chứa userId — đó là PII indirect). Pino redact thêm `*.avatarUrl`. Log chỉ `[Redacted]` HOẶC log chỉ path phần cuối (`avatars/<userId>/avatar.webp` — userId đã là hash? KHÔNG, userId là uuid Supabase). Quyết định dev: redact `*.avatarUrl` full (log chỉ `[Redacted]`).
   (c) Sentry beforeSend redact bio/displayName khỏi request body (UPDATE Sentry config — thêm regex strip text field, hoặc redact field trong beforeSend).
   (d) Exception filter KHÔNG leak stack — PATCH error response chỉ `{ statusCode, message, error, details? }`.
   Verify: unit test — log object có `bio: 'SĐT tôi 0901234567'` → output `[Redacted]`. E2e — PATCH /auth/me → check pino log KHÔNG chứa bio/displayName/avatarUrl raw.

9. **AC9 — Rate limit PATCH /auth/me (10/15 phút) + không phá Story 1.1-2.2 (build/lint/typecheck/test pass).**
   Given `@nestjs/throttler` đã có từ Story 2.2 (login rate limit),
   When apply `@Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })` trên `PATCH /auth/me` (10 update / 15 phút / IP — tránh spam update),
   Then:
   (a) Exceed → 429 `{ message: 'Quá nhiều yêu cầu, thử lại sau 15 phút' }` (E — rate limit).
   (b) `POST /upload/avatar` cũng rate limit (10 upload / 15 phút / IP — tránh spam upload). Quyết định dev: cùng throttle config hoặc riêng. Ưu tiên: riêng `@Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })` trên upload endpoint.
   (c) `yarn build && yarn lint && yarn typecheck && yarn test` (cả 3 package: shared, api, web) PASS — không phá 1.1-2.2.
   (d) Story 2.1 register + 2.2 login/logout/refresh/me vẫn hoạt động (KHÔNG break). Health endpoint (`GET /health/supabase`) vẫn 200. Migration 0000 + 0001 + 0002 apply đúng.
   Verify: e2e — 11 PATCH /auth/me liên tiếp → lần 11 trả 429. 11 POST /upload/avatar → lần 11 trả 429.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-2 (Single Data Mutation Path)** | AC3 — PATCH /auth/me qua NestJS AuthService → Drizzle `db.update(publicUsers)`. Frontend KHÔNG update public_users trực tiếp. AC5 — avatar upload qua NestJS endpoint → Supabase Storage (AD-2 exception dòng 49: "Storage upload trực tiếp tới bucket" — nhưng story này chọn qua NestJS để validate + convert server-side, vẫn hợp AD-2 vì storage là service riêng KHÔNG phải business-entity write). |
| **AD-5 (Auth Separation)** | AC4 — JwtAuthGuard verify Supabase JWT (Story 2.2 reuse). AC3f — banned check đọc `public_users.banned` (business flag, NestJS quản lý). AC5 — Supabase Storage upload dùng service-role key (chỉ backend). KHÔNG expose service-role ra frontend. |
| **AD-7 (Image Storage Convention)** | AC5 — avatar lưu Supabase Storage bucket `avatars/{userId}/avatar.webp`. Max 10MB, auto-convert WebP server-side (Sharp). Public URL via Supabase CDN. KHÔNG lưu binary trong DB — chỉ URL reference (`public_users.avatar_url`). Consistent với listing image convention (AD-7 dòng 79). |
| **AD-8 (PII/secret)** | AC8 — bio/displayName/avatarUrl KHÔNG log raw (pino redact thêm `*.bio`, `*.displayName`, `*.avatarUrl`). Sentry redact. Bio có thể chứa PII (user tự nhập SĐT/địa chỉ). Exception filter không leak stack. |
| **AD-10 (Next API Route Boundary)** | AC7 — Next API routes (`/api/auth/me` PATCH, `/api/upload/avatar`) chỉ forward tới NestJS. ZERO business logic — validation nghiệp vụ (whitelist, Zod, file check, WebP convert) ở NestJS. Web chỉ client-side UX validation. |
| **AD-1 (Module Isolation)** | `auth/` module NestJS mở rộng (thêm updateMe vào AuthService + PATCH vào AuthController). Upload endpoint: tạo `upload/` module riêng (UploadController + UploadService) HOẶC đặt trong `auth/` (avatar gắn user). Quyết định dev: `upload/` module riêng (reusable cho Story 3.2 listing image upload — AD-1 module isolation). Drizzle schema `public-users.ts` UPDATE (thêm cột). |
| **AD-4 (SSR Boundary)** | `/profile` page server wrapper + client island form. Auth protect client-side (accessToken in memory — SSR không biết auth state). KHÔNG SSR protect (tránh flash — dùng loading state). |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — PATCH /auth/me không token.** AC4 — JwtAuthGuard reject → 401 `{ message: 'Thiếu token xác thực' }`. Test: e2e PATCH không Authorization → 401.
- **E2 — PATCH /auth/me với field không allowed (email, phone, role, banned, id).** AC3a — silent strip (ignore field, KHÔNG error). Update chỉ field whitelist. Test: e2e PATCH `{ email: 'hacked@x.com', role: 'admin', bio: 'ok' }` → 200, `psql` verify email + role KHÔNG đổi, bio đổi.
- **E3 — PATCH /auth/me bio quá dài (> 500 chars).** AC3b — Zod reject → 400 `{ message: 'Validation failed', details: [...] }`. Test: unit test Zod schema bio 501 chars → reject.
- **E4 — PATCH /auth/me displayName quá dài (> 100 chars).** AC3b — Zod reject → 400. Test: unit test displayName 101 chars → reject.
- **E5 — Avatar upload file quá lớn (> 10MB).** AC5b — 400 `{ message: 'Ảnh tối đa 10MB' }`. Test: e2e upload file 11MB → 400. (File size check trước WebP convert — tránh OOM.)
- **E6 — Avatar upload file type không hợp lệ (không phải image).** AC5b — 400 `{ message: 'File phải là ảnh (JPEG, PNG, WebP, GIF)' }`. Test: e2e upload `.txt` / `.pdf` → 400. (Check Content-Type + magic bytes — không tin Content-Type alone, dùng `file-type` lib HOẶC sharp metadata decode fail → reject.)
- **E7 — Avatar upload Supabase Storage fail (quota full / network).** AC5 — catch error → 500 generic `{ message: 'Tải ảnh thất bại, thử lại sau' }` (AD-8 — không leak Supabase error detail). Log server-side (pino). Test: mock supabase.storage.upload reject → assert 500.
- **E8 — PATCH /auth/me với user banned.** AC3f — 403 `{ message: 'Tài khoản đã bị khóa' }`. Test: unit test mock banned=true → 403. E2e: admin ban user (Story 2.4) → PATCH /auth/me → 403. (Story 2.3 chỉ check banned flag, admin ban UI là Story 2.4.)
- **E9 — Web /profile chưa login.** AC6b — redirect `/login?redirect=/profile`. Test: vitest render ProfileForm với `isAuthenticated=false` → assert redirect called.
- **E10 — Web /profile save fail (API error).** AC6h — hiển thị error message từ API response. Validation error → inline. Server error → toast "Cập nhật thất bại, thử lại". Test: vitest mock fetch reject → assert error display.
- **E11 — GET /auth/me / PATCH /auth/me user không tồn tại trong public_users (orphan).** AC2d/AC3g — 404 `{ message: 'Hồ sơ người dùng không tồn tại' }` (giữ Story 2.2 E11). Test: unit test mock db.select return [] → 404.
- **E12 — Concurrent update (2 request PATCH cùng lúc).** AC3d — last-write-wins (KHÔNG optimistic locking — story này đơn giản). Request 2 ghi đè request 1. Quyết định dev: KHÔNG thêm version column / optimistic locking (overkill cho profile update — không critical data). Document rõ. Test: document behavior, KHÔNG cần automated test (race condition khó test deterministic).
- **E13 — AvatarUrl inject (PATCH với URL ngoài Supabase domain).** AC3b — Zod validate host phải match `SUPABASE_URL` host. URL `https://evil.com/x.jpg` → 400 `{ message: 'URL ảnh không hợp lệ' }`. Test: unit test Zod schema avatarUrl với external URL → reject.
- **E14 — Bio/displayName XSS (script tag).** AC3c — sanitize strip HTML tag + encode `<` `>` `&`. Input `<script>alert(1)</script>` → lưu `&lt;script&gt;alert(1)&lt;/script&gt;` (hiển thị text, KHÔNG execute). Test: unit test sanitize function + e2e PATCH bio XSS → verify stored encoded.
- **E15 — Sharp convert fail (image corrupt).** AC5c — sharp throw error → catch → 400 `{ message: 'Ảnh không hợp lệ hoặc bị hỏng' }`. Test: e2e upload file rename .jpg nhưng thực là text → sharp decode fail → 400.
- **E16 — Rate limit PATCH /upload (spam).** AC9 — 11th request → 429. Test: e2e 11 PATCH liên tiếp → 429.

## UX Spec tham chiếu

- Trang `/profile`: form card centered (giống (auth) layout nhưng KHÔNG trong group (auth)).
- Fields: avatar (circular preview 128px + nút "Tải ảnh"), displayName (text input), bio (textarea, char counter "0/500"), email (read-only text), phone (read-only text + badge "Đã xác thực"/"Chưa xác thực").
- Button "Lưu thay đổi" (loading state "Đang lưu...").
- Avatar upload: drag-drop HOẶC click chọn. Preview ngay sau chọn. Upload auto (KHÔNG đợi save) — hiển thị spinner trong preview khi đang upload.
- Error inline dưới field (client validation) + toast/banner cho API error.
- Success → toast "Cập nhật hồ sơ thành công".
- Responsive (mobile-first — Story 1.4 Tailwind 4). Touch target ≥ 44px (EXPERIENCE.md).
- Header: thêm link "Hồ sơ" (`/profile`) khi authenticated (site-header update — Story 2.2 đã có email + Đăng xuất, thêm link Hồ sơ).
- Tham chiếu: `docs/bdsai/ux/UX-DESIGN.md` (nếu có) + `EXPERIENCE.md` (touch target, contrast AA).

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack + Story 1.2/1.6/2.1/2.2 pin)

| Package | Version | Note |
|---------|---------|------|
| Drizzle ORM | 0.36.4 (đã có) | KHÔNG nâng cấp — schema change (thêm cột) |
| drizzle-kit | 0.31.10 (đã có) | `yarn db:generate` (KHÔNG --custom — schema change thật) |
| @supabase/supabase-js | 2.108.2 (đã có) | `storage.from('avatars').upload()` / `getPublicUrl()` |
| Zod | 3.25.76 (đã có) | Validation update profile DTO |
| sharp | 0.33.5 (NEW) | WebP auto-convert + resize avatar (AD-7) |
| @nestjs/throttler | 6.4.2 (đã có, Story 2.2) | Rate limit PATCH /upload |
| nestjs-pino | 4.6.1 (đã có) | Logger + redact PII (thêm *.bio, *.displayName, *.avatarUrl) |
| Next.js | 16.2.9 (đã có) | /profile page + API thin proxy |
| React | 19.2.7 (đã có) | Client component form |

Note: `sharp` là native module (libvips) — CI/Docker cần build dependency. Story 1.3 Dockerfile đã có `apk add` cho native build? Verify dev: `yarn add sharp` trong `apps/api` + test `yarn build` Docker. Nếu sharp build fail trong Docker → document workaround (prebuilt binary `sharp --cpu=x64 --os=linux`).

### Drizzle schema — UPDATE public_users (thêm 3 cột)

```typescript
// apps/api/src/db/schema/public-users.ts — UPDATE
export const publicUsers = pgTable('public_users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  // --- Story 2.3: profile fields (nullable — user chưa set thì NULL) ---
  avatarUrl: text('avatar_url'),  // AD-7 — chỉ lưu URL reference, KHÔNG lưu binary
  bio: text('bio'),               // max 500 chars (validate AC3)
  displayName: text('display_name'),  // max 100 chars (validate AC3)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

### Migration 0002

```bash
cd bdsai/apps/api
yarn db:generate  # KHÔNG --custom — drizzle-kit sinh ALTER TABLE từ schema diff
# Review file 0002_*.sql — verify ALTER TABLE public_users ADD COLUMN avatar_url, bio, display_name
# THÊM section tạo bucket avatars (migration --custom 0003 HOẶC append vào 0002):
#   INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
#   -- RLS: public read (SELECT), service-role write (INSERT/UPDATE/DELETE).
#   CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
#   CREATE POLICY "avatars_service_write" ON storage.objects FOR ALL
#     USING (bucket_id = 'avatars' AND auth.role() = 'service_role');
yarn db:migrate
```

Note: Bucket creation qua SQL (`storage.buckets`) — Supabase Storage internal table. RLS policy trên `storage.objects`. Service-role bypass RLS (Drizzle direct PG). Document rõ trong migration comment. Alternative: tạo bucket qua Supabase Dashboard (manual) — KHÔNG reproducible. Ưu tiên SQL migration (reproducible).

### API endpoints — AuthController + AuthService mở rộng + UploadModule mới

```
apps/api/src/
├── auth/
│   ├── auth.module.ts              # UPDATE — (giữ, không thêm dep mới)
│   ├── auth.controller.ts          # UPDATE — thêm PATCH /auth/me
│   ├── auth.service.ts             # UPDATE — thêm updateMe()
│   ├── auth.service.spec.ts        # UPDATE — unit test updateMe
│   ├── dto/
│   │   ├── update-me.dto.ts        # NEW — Zod schema (avatarUrl, bio, displayName)
│   │   └── update-me.dto.spec.ts   # NEW — unit test validation
│   └── ... (giữ từ 2.1/2.2)
├── upload/                          # NEW module (AD-1 — reusable cho Story 3.2)
│   ├── upload.module.ts            # NEW
│   ├── upload.controller.ts        # NEW — POST /upload/avatar
│   ├── upload.service.ts           # NEW — validate + sharp convert + Supabase Storage
│   └── upload.service.spec.ts      # NEW — unit test
├── db/
│   ├── schema/public-users.ts      # UPDATE — thêm 3 cột
│   └── migrations/
│       └── 0002_*.sql              # NEW — ALTER TABLE + bucket avatars
├── common/logger/logger.module.ts  # UPDATE — redact thêm *.bio, *.displayName, *.avatarUrl
└── app.module.ts                   # UPDATE — import UploadModule
```

Flow `auth.service.updateMe()`:
1. Guard đã verify JWT + attach `request.user.id`.
2. Query `public_users` bằng userId → check tồn tại (orphan → 404), check banned (→ 403).
3. Validate body qua Zod (updateMeApiSchema) — whitelist strip field không allowed.
4. Sanitize bio + displayName (strip HTML + encode).
5. Validate avatarUrl host (match Supabase host) nếu có.
6. `db.update(publicUsers).set({ ...fields, updatedAt: new Date() }).where(eq(publicUsers.id, userId))`.
7. Return profile mới (query lại HOẶC build từ update values — quyết định dev: query lại cho nhất quán).

Flow `upload.service.uploadAvatar()`:
1. Guard đã verify JWT + attach userId.
2. Extract file từ multipart (FileInterceptor / multer).
3. Validate content-type (image) + size (≤ 10MB).
4. `sharp(buffer).resize(512, 512, { fit: 'cover', position: 'center' }).webp({ quality: 80 }).toBuffer()` → webpBuffer.
5. `supabase.storage.from('avatars').upload(${userId}/avatar.webp, webpBuffer, { contentType: 'image/webp', upsert: true })`.
6. `getPublicUrl(${userId}/avatar.webp)` → return `{ avatarUrl }`.

### update-me.dto.ts — Zod schema

```typescript
// apps/api/src/auth/dto/update-me.dto.ts
import { z } from 'zod';

// Sanitize: strip HTML tag + encode < > &
function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')        // strip HTML tag
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .trim();
}

export const updateMeApiSchema = z.object({
  displayName: z
    .string()
    .max(100, 'Tên hiển thị tối đa 100 ký tự')
    .transform(sanitizeText)
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, 'Giới thiệu tối đa 500 ký tự')
    .transform(sanitizeText)
    .optional()
    .nullable(),
  avatarUrl: z
    .string()
    .url('URL ảnh không hợp lệ')
    .max(500, 'URL quá dài')
    .optional()
    .nullable(),
  // Whitelist: KHÔNG accept email/phone/role/banned/id — Zod strip field không trong schema (z.object strict? — quyết định: .strict() để reject extra field? HOẶC .passthrough? — AC3a silent strip → KHÔNG .strict(), field thừa bị Zod ignore mặc định).
});
export type UpdateMeDto = z.infer<typeof updateMeApiSchema>;
```

Note: avatarUrl host validation (match Supabase host) — thêm `.refine()` check URL host. Quyết định dev: thêm refine trong controller/service (đọc SUPABASE_URL từ ConfigService) thay vì hardcode trong DTO.

### UploadModule — sharp + Supabase Storage

```typescript
// apps/api/src/upload/upload.controller.ts
import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })  // AC9
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },  // 10MB — AC5b
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: Request) {
    if (!file) throw new BadRequestException('Thiếu file ảnh');
    const user = (req as Request & { user: JwtUser }).user;
    return this.uploadService.uploadAvatar(user.id, file);
  }
}
```

Note: `@nestjs/platform-express` + `multer` — đã có (NestJS default platform). `FileInterceptor` parse multipart. `Express.Multer.File` type từ `@types/multer` (devDep — check đã có).

### Web — /profile page + form + API proxy

```
apps/web/app/
├── profile/                         # NEW route (KHÔNG trong (auth) group)
│   ├── page.tsx                     # NEW — server wrapper → ProfileForm
│   └── profile-form.tsx             # NEW — client component (avatar upload + edit)
├── api/
│   ├── auth/me/
│   │   └── route.ts                 # UPDATE — thêm PATCH method (forward PATCH /auth/me)
│   └── upload/
│       └── avatar/
│           └── route.ts             # NEW — thin proxy forward multipart → NestJS
└── (auth)/                          # (giữ — login/register)
```

```
apps/web/components/shared/
└── site-header.tsx                  # UPDATE — thêm link "Hồ sơ" (/profile) khi authenticated
```

### Next API thin proxy — PATCH /auth/me + upload/avatar

```typescript
// apps/web/app/api/auth/me/route.ts — UPDATE (thêm PATCH, giữ GET từ 2.2)
export async function PATCH(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ statusCode: 401, message: 'Thiếu token xác thực' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ statusCode: 400, message: 'Body không hợp lệ' }, { status: 400 });
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', authorization: authHeader },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng' }, { status: 503 });
  }
}
```

```typescript
// apps/web/app/api/upload/avatar/route.ts — NEW (forward multipart)
export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ statusCode: 401, message: 'Thiếu token xác thực' }, { status: 401 });
  // Forward multipart FormData nguyên dạng (KHÔNG parse — pass-through stream).
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ statusCode: 400, message: 'Thiếu file' }, { status: 400 });
  try {
    const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: { authorization: authHeader },  // KHÔNG set Content-Type — fetch tự set boundary cho FormData
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng' }, { status: 503 });
  }
}
```

### PII redaction — UPDATE logger

```typescript
// apps/api/src/common/logger/logger.module.ts — UPDATE redact paths
redact: {
  paths: [
    // ... existing (password, key, token, email, phone, ...)
    '*.bio',
    '*.displayName',
    '*.avatarUrl',
  ],
  censor: '[Redacted]',
}
```

### Test strategy

- **Unit (jest):**
  - `update-me.dto.spec.ts` — displayName/bio max length, sanitize XSS, avatarUrl URL validate, extra field ignore (E2, E3, E4, E13, E14).
  - `auth.service.spec.ts` (UPDATE) — updateMe:
    - Happy path → 200 + profile mới + db.update called.
    - E2 extra field → silent strip, only whitelist updated.
    - E8 banned → 403.
    - E11 orphan → 404.
    - avatarUrl external host → 400 (E13).
  - `upload.service.spec.ts` — uploadAvatar:
    - Happy path → sharp convert + storage.upload called + return avatarUrl.
    - E5 file > 10MB → 400.
    - E6 non-image content-type → 400.
    - E7 storage.upload fail → 500.
    - E15 sharp fail (corrupt) → 400.
  - `sanitize.spec.ts` (hoặc trong dto spec) — sanitizeText XSS cases.
- **Integration (jest e2e):**
  - `auth.e2e-spec.ts` (UPDATE) — thêm PATCH /auth/me tests:
    - Login → PATCH displayName/bio → 200 + profile mới.
    - PATCH không JWT → 401 (E1).
    - PATCH extra field (email/role) → 200, email/role KHÔNG đổi (E2).
    - PATCH bio 501 chars → 400 (E3).
    - PATCH banned user → 403 (E8).
    - GET /auth/me → 200 + 9 field (avatarUrl/bio/displayName null cho user mới).
    - Rate limit: 11 PATCH → 429 (E16).
  - `upload.e2e-spec.ts` (NEW):
    - Login → POST /upload/avatar với test image → 200 + avatarUrl.
    - Upload non-image → 400 (E6).
    - Upload > 10MB → 400 (E5).
    - Upload không JWT → 401.
    - Rate limit: 11 upload → 429.
  - Skip nếu Supabase không reach (env guard — pattern từ Story 2.1/2.2).
- **Web (vitest):**
  - `profile-form.spec.tsx` — form render, populate from /api/auth/me, edit + save fetch mock, avatar upload mock, error display (E10), redirect khi chưa login (E9).
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3).

### Source tree (NEW/UPDATE)

```
bdsai/
├── apps/api/
│   ├── src/
│   │   ├── auth/                              # UPDATE directory
│   │   │   ├── auth.controller.ts             # UPDATE — thêm PATCH /auth/me
│   │   │   ├── auth.service.ts                # UPDATE — thêm updateMe()
│   │   │   ├── auth.service.spec.ts           # UPDATE — unit test updateMe
│   │   │   ├── dto/
│   │   │   │   ├── update-me.dto.ts           # NEW — Zod schema
│   │   │   │   └── update-me.dto.spec.ts      # NEW — unit test
│   │   │   └── ... (giữ từ 2.1/2.2)
│   │   ├── upload/                            # NEW module (AD-1)
│   │   │   ├── upload.module.ts               # NEW
│   │   │   ├── upload.controller.ts           # NEW — POST /upload/avatar
│   │   │   ├── upload.service.ts              # NEW — sharp + Supabase Storage
│   │   │   └── upload.service.spec.ts         # NEW — unit test
│   │   ├── db/
│   │   │   ├── schema/public-users.ts         # UPDATE — thêm 3 cột
│   │   │   └── migrations/
│   │   │       └── 0002_*.sql                 # NEW — ALTER TABLE + bucket avatars
│   │   ├── common/logger/logger.module.ts     # UPDATE — redact thêm *.bio, *.displayName, *.avatarUrl
│   │   └── app.module.ts                      # UPDATE — import UploadModule
│   ├── test/
│   │   ├── auth.e2e-spec.ts                   # UPDATE — thêm PATCH /auth/me + rate limit
│   │   └── upload.e2e-spec.ts                 # NEW — upload avatar integration test
│   ├── package.json                           # UPDATE — thêm sharp
│   └── .env.example                           # KHÔNG ĐỔI (SUPABASE_STORAGE_BUCKET đã có, default 'listings' — avatar dùng bucket 'avatars' hardcode HOẶC thêm env AVATAR_BUCKET)
├── apps/web/
│   ├── app/
│   │   ├── profile/                           # NEW route
│   │   │   ├── page.tsx                       # NEW — server wrapper
│   │   │   └── profile-form.tsx               # NEW — client component
│   │   └── api/
│   │       ├── auth/me/route.ts               # UPDATE — thêm PATCH method
│   │       └── upload/avatar/route.ts         # NEW — thin proxy multipart
│   ├── components/shared/
│   │   └── site-header.tsx                    # UPDATE — thêm link "Hồ sơ" (/profile)
│   ├── tests/
│   │   └── profile-form.test.tsx              # NEW — vitest form test
│   └── package.json                           # KHÔNG cần dep mới
└── supabase/
    └── config.toml                            # KHÔNG ĐỔI (storage config default OK)
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **Avatar upload qua NestJS (KHÔNG frontend trực tiếp):** AD-2 exception cho phép frontend upload trực tiếp Storage, nhưng story này chọn qua NestJS để (a) validate file server-side, (b) WebP convert server-side (sharp), (c) resize 512x512. Frontend upload trực tiếp = expose service-role HOẶC dùng anon key (public bucket write — insecure). NestJS endpoint = validation + convert + service-role upload. Trade-off: thêm network hop (upload → NestJS → Storage) nhưng an toàn hơn.
2. **Bucket `avatars` riêng (KHÔNG dùng `listings`):** AD-7 quy định `listings/{listingId}/{index}.webp` cho listing image. Avatar là entity khác (user profile) → bucket riêng `avatars/{userId}/avatar.webp`. Tách bucket cho RLS policy riêng (avatar public read, listing có thể private). Bucket public (avatar hiển thị công khai).
3. **WebP + resize 512x512 (AD-7):** Avatar hiển thị nhỏ (header 32px, profile 128px) → 512x512 đủ (retina). Square cover crop center (face detection future — overkill). Quality 80 (cân bằng size + quality). Sharp native module — verify Docker build.
4. **Silent strip extra field (KHÔNG 400):** AC3a — PATCH với field không allowed (email/role) → ignore thay vì 400. UX tốt hơn (frontend gửi thừa field không break). Security: whitelist strip đảm bảo KHÔNG update field nhạy cảm dù client gửi. Zod `.object()` mặc định strip field không trong schema (KHÔNG cần `.strict()`).
5. **Last-write-wins (KHÔNG optimistic locking):** E12 — concurrent PATCH → request 2 ghi đè request 1. Profile update KHÔNG critical data (không phải financial) → overkill thêm version column. Document rõ. Future: nếu cần (multi-device conflict) → thêm `version` int column + check trong UPDATE WHERE.
6. **Phone OTP verify DEFERRED:** Epic AC dòng 288 yêu cầu phone OTP, nhưng quá phức tạp (Twilio/Vonage provider + OTP flow + rate limit + resend). Defer sang story riêng (2.3b hoặc 6.x). Story 2.3 chỉ avatar/bio/displayName. `phone_verified` chỉ set qua flow OTP đó. Document rõ trong story + sprint status.
7. **UploadModule riêng (AD-1):** Avatar upload trong `upload/` module riêng (KHÔNG trong `auth/`) — reusable cho Story 3.2 (listing image upload). UploadService inject SupabaseService. Future: thêm `uploadListingImage()` method.
8. **Sanitize simple regex (KHÔNG sanitize-html dep):** bio/displayName là plain text field (hiển thị text-only, KHÔNG render HTML). Simple regex strip `<[^>]*>` + encode `<>&` đủ. `sanitize-html` (new dep) overkill cho text field. Nếu future cần rich-text bio → reconsider.

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **R1 — Sharp native module build fail trong Docker/CI** | Sharp cần libvips. Dockerfile (Story 1.3) verify `apk add vips-dev` HOẶC dùng sharp prebuilt binary (`sharp --cpu=x64 --os=linux` trong package.json `optionalDependencies`). Test `yarn build` Docker trước merge. Fallback: nếu sharp fail → dùng `@squoosh/lib` (pure JS, slower) HOẶC defer WebP convert (accept original format, validate chỉ image). |
| **R2 — Bio/displayName XSS (stored XSS)** | AC3c sanitize strip HTML + encode. Test E14. Frontend render text-only (KHÔNG dangerouslySetInnerHTML). Defense-in-depth: pino redact + sanitize server-side. |
| **R3 — Avatar URL manipulation (guess path)** | Path = `{userId}/avatar.webp` — userId là uuid Supabase (unguessable). Bucket public read — ai cũng xem được avatar (OK, avatar công khai). KHÔNG có sensitive avatar. upsert=true → 1 file/user (KHÔNG leak old avatar). |
| **R4 — Concurrent update race condition** | E12 — last-write-wins. Document. KHÔNG critical (profile text). Future: optimistic locking nếu cần. |
| **R5 — Phone OTP verify complexity (DEFERRED)** | Story 2.3 KHÔNG implement OTP. Defer sang story riêng. Document rõ. `phone_verified` giữ false cho đến flow OTP. KHÔNG break epic flow (Story 2.4 admin ban KHÔNG phụ thuộc phone_verified). |
| **R6 — Avatar CDN cache invalidation sau update** | upsert=true ghi đè cùng path → CDN cache có thể serve old avatar (stale). Mitigation: thêm query param cache-bust `?v=<timestamp>` trong avatarUrl HOẶC dùng `Cache-Control: max-age=300, must-revalidate` trên bucket. Quyết định dev: client append `?v=Date.now()` khi render avatar (cache-bust). HOẶC Supabase Storage CDN invalidate (future). |
| **R7 — Supabase Storage quota (bucket full)** | E7 — upload fail → 500 generic. Monitoring cron (Story 1.6 NFR5) detect storage > 80%. Avatar nhỏ (WebP 512x512 ~50KB) → quota low risk. Mitigation: 1 avatar/user (upsert, KHÔNG accumulate). |
| **R8 — Migration 0002 bucket creation SQL fail** | `storage.buckets` insert + RLS policy — Supabase internal table. Test `yarn db:migrate` local trước. Verify bucket tồn tại: `SELECT * FROM storage.buckets WHERE id='avatars'`. Fallback: tạo bucket qua Dashboard (manual, document). |

## References

- [Source:] `_bmad-output/planning-artifacts/epics.md` dòng 277-290 (Epic 2, Story 2.3 AC) + dòng 19 (FR2) + dòng 144 (quy ước test).
- [Source:] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45, exception dòng 49), AD-5 (dòng 63), AD-7 (dòng 75), AD-8 (dòng 81), AD-10 (dòng 93), M2 User Management (dòng 312).
- [Source:] `bdsai/apps/api/src/db/schema/public-users.ts` — schema hiện tại (8 cột, cần thêm 3).
- [Source:] `bdsai/apps/api/src/auth/auth.controller.ts` — GET /auth/me (Story 2.2, cần thêm PATCH).
- [Source:] `bdsai/apps/api/src/auth/auth.service.ts` — getMe() (Story 2.2, cần thêm updateMe()).
- [Source:] `bdsai/apps/api/src/auth/guards/jwt-auth.guard.ts` — JwtAuthGuard (Story 2.2, reuse).
- [Source:] `bdsai/apps/api/src/supabase/supabase.service.ts` — service-role client + `.storage` getter + `storageBucket` (default 'listings').
- [Source:] `bdsai/apps/api/src/config/env.validation.ts` — `SUPABASE_STORAGE_BUCKET` (default 'listings').
- [Source:] `bdsai/apps/web/components/auth/auth-provider.tsx` — AuthProvider (Story 2.2, restore session).
- [Source:] `bdsai/apps/web/lib/auth-fetch.ts` — useAuthFetch (Story 2.2, JWT refresh interceptor).
- [Source:] `bdsai/apps/web/app/api/auth/me/route.ts` — GET proxy (Story 2.2, cần thêm PATCH).
- [Source:] `_bmad-output/implementation-artifacts/2-1-dang-ky-email-phone.md` — format story file, Dev Notes pattern.
- [Source:] `_bmad-output/implementation-artifacts/2-2-dang-nhap-dang-xuat-jwt.md` — format story file, JwtAuthGuard pattern, AuthProvider pattern, throttle pattern.
- [Source:] `bdsai/apps/api/src/db/migrations/` — 0000 (fts) + 0001 (public_users), 0002 sẽ là migration thứ 3.

## Dev Agent Record

- **Story points:** 5 (medium — migration + PATCH endpoint + upload module + sharp WebP + web profile page + sanitize + PII redact).
- **Dependencies:** Story 2.1 (AuthModule + public_users), Story 2.2 (JwtAuthGuard + AuthProvider + useAuthFetch + me endpoint), Story 1.2 (Supabase client), Story 1.4 (Base UI), Story 1.6 (pino logger + exception filter).
- **Estimated effort:** 1-2 ngày dev + 0.5 ngày test.
- **Status:** ready-for-dev → (dev implement) → review → e2e → done.
- **Deferred:** Phone OTP verify (epic dòng 288) — sang story riêng (2.3b hoặc 6.x).
