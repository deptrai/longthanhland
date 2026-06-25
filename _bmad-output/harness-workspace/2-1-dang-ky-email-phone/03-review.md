# Code Review — Story 2.1: Đăng ký bằng email + phone

- **Story key:** `2-1-dang-ky-email-phone`
- **Agent:** code-reviewer (opus)
- **Ngày:** 2026-06-26
- **Verdict:** **CHANGES REQUESTED** (2 HIGH, 2 MEDIUM, 3 LOW)

## Tóm tắt verdict

Story 2.1 implement tốt phần lớn AC (migration 0001 + RLS, Zod validation, phone
normalize, compensate rollback, PII redact pino/Sentry, Next API thin proxy, web form).
Build/lint/typecheck/test PASS (59 unit + 10 web, cache hit). Không phá 1.1-1.6.

Tuy nhiên có **2 finding HIGH** chặn approve:
1. Migration 0001 KHÔNG có FK `ON DELETE CASCADE` → `auth.users.id` (AC1 yêu cầu,
   schema comment claim có nhưng thực không).
2. `config.toml [auth.email] enable_confirmations = false` — contradict AC2 + story
   Dev Notes (`= true`). Email xác thực KHÔNG được gửi → user stuck unconfirmed.

## Findings theo severity

### HIGH

#### HIGH-1 — Migration 0001 thiếu FK ON DELETE CASCADE (AC1 không thỏa đầy đủ)

- **File:** `bdsai/apps/api/src/db/migrations/0001_brainy_frightful_four.sql:1-10`
- **Mô tả:** AC1 (story dòng 29) yêu cầu `id uuid PK (FK → auth.users.id, ON DELETE
  CASCADE)`. Schema comment (`public-users.ts:13`) claim "FK ON DELETE CASCADE được
  tạo thủ công trong migration 0001 (RLS section)". Nhưng migration 0001 chỉ có
  `"id" uuid PRIMARY KEY NOT NULL` — KHÔNG có `REFERENCES auth.users(id) ON DELETE
  CASCADE`. Hệ quả: khi Supabase Auth user bị xóa (admin.deleteUser ở story sau, hoặc
  compensate rollback path khác), `public_users` row KHÔNG tự xóa → orphan data.
  Trong flow Story 2.1 hiện tại không orphan (insert-fail path chưa insert row), nhưng
  AC1 yêu cầu FK CASCADE làm invariant dữ liệu, và comment code sai sự thật.
- **Cách sửa:** Thêm vào cuối migration 0001 (sau RLS section):
  ```sql
  ALTER TABLE "public_users"
    ADD CONSTRAINT "public_users_id_fkey"
    FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  ```
  Hoặc nếu cố ý không add FK (vì `auth.users` ngoài schema Drizzle, lo ngại drizzle-kit
  re-generate phá), thì tạo migration `0002 --custom` riêng chứa FK, và sửa comment
  trong `public-users.ts` cho khớp thực tế. Khuyến nghị: add FK (AC1 yêu cầu rõ).

#### HIGH-2 — config.toml enable_confirmations=false → email verify KHÔNG gửi (AC2)

- **File:** `bdsai/supabase/config.toml:217` (`enable_confirmations = false`)
- **Mô tả:** AC2 (story dòng 46) yêu cầu "Email xác thực tựống gửi (Supabase Auth
  trigger — confirm email link). User ở trạng thái email_confirmed=false cho đến khi
  click link." Story Dev Notes (dòng 209) ghi `enable_confirmations = true  # gửi email
  xác thực`. Nhưng config thực tế = `false`. Hệ quả:
  - `admin.createUser({ email_confirm: false })` tạo user `email_confirmed=false`.
  - Với `enable_confirmations=false`, Supabase KHÔNG gửi confirmation email.
  - User stuck `email_confirmed=false` vĩnh viễn → không thể login (Story 2.2 sẽ check).
  - Email verification job (EmailProcessor) là no-op → không có email nào được gửi.
  - AC2 KHÔNG thỏa.
- **Cách sửa:** Đổi `config.toml:217` thành `enable_confirmations = true`. Verify
  e2e: register → check Inbucket (port 54354) có email confirm. Lưu ý: admin.createUser
  KHÔNG tự gửi email kể cả khi `enable_confirmations=true` (chỉ anon signUp gửi) → cần
  gọi `supabase.auth.admin.inviteUserByEmail` HOẶC gửi email custom qua EmailProcessor
  (Story 6.2). NếuStory 2.1 chấp nhận no-email (defer sang 2.2/6.2), thì phải document
  rõ + sửa AC2 expectation, KHÔNG để comment/schema claim sai.

### MEDIUM

#### MEDIUM-1 — rawMsg trong duplicate-email log KHÔNG redact PII (AD-8)

- **File:** `bdsai/apps/api/src/auth/auth.service.ts:72`
- **Mô tả:** Warn log duplicate-email dùng `rawMsg: message.slice(0, 200)` — log raw
  Supabase error message KHÔNG qua `safeErr()` redact. Pino redact paths match key
  `*.email`/`*.phone`, KHÔNG match giá trị string trong `rawMsg`. Nếu Supabase message
  chứa email (VD "User already registered: test@bdsai.vn") → leak PII vào log. Hiện
  Supabase trả "User already registered" (không email) nhưng fragile — đổi version =
  leak. `safeErr()` helper đã có sẵn nhưng không dùng.
- **Cách sửa:** Đổi `rawMsg: message.slice(0, 200)` → `rawMsg: this.safeErr(e).message`
  (safeErr đã redact email/phone regex). Hoặc bỏ `rawMsg` field, chỉ log `reason`.

#### MEDIUM-2 — Không có rate-limit guard ở /auth/register (E9)

- **File:** `bdsai/apps/api/src/auth/auth.controller.ts:19-28` (không guard)
- **Mô tả:** Story E9 yêu cầu chống spam register. Hiện chỉ dựa Supabase Auth
  built-in rate limit. Nhưng `admin.createUser` dùng service-role key → BYPASS
  `sign_in_sign_ups` rate limit (anon-only). `email_sent=30/hour` chỉ limit email
  gửi — nếu `enable_confirmations=false` (HIGH-2) thì không email nào gửi → không
  rate limit nào áp dụng. Spam register có thể flood Supabase Auth user table.
- **Cách sửa:** Thêm `@nestjs/throttler` (hoặc guard đơn giản) `@Throttle(5, 60)` trên
  `register()`. Hoặc document rõ rằng rely Supabase + thêm captcha (Story sau). Ít
  nhất thêm 1 lớp app-level rate limit per-IP.

### LOW

#### LOW-1 — minimum_password_length=6 trong config vs Zod min(8)

- **File:** `bdsai/supabase/config.toml:176` (`minimum_password_length = 6`)
- **Mô tả:** Supabase Auth chấp nhận password 6 ký tự, nhưng Zod (AC3) yêu cầu ≥8.
  Zod gate trước nên không bypass, nhưng inconsistent — nếu có path nào skip Zod
  (future) thì Supabase chấp nhận yếu hơn AC3.
- **Cách sửa:** Đổi `minimum_password_length = 8` cho khớp AC3.

#### LOW-2 — Compensate rollback fail KHÔNG capture Sentry tường minh

- **File:** `bdsai/apps/api/src/auth/auth.service.ts:122-127`
- **Mô tả:** Comment dòng 122 ghi "Sentry capture (orphan user)" nhưng code chỉ
  `this.logger.error(...)` — không có `Sentry.captureException()`. Orphan Supabase
  Auth user là state critical cần alert. NestJS Logger error có thể/không được
  Sentry auto-capture tùy setup.
- **Cách sửa:** Thêm `Sentry.captureException(new Error('orphan-auth-user'),
  { extra: { userId } })` (userId không phải PII). Hoặc verify Sentry auto-capture
  Logger.error đã wired.

#### LOW-3 — public_users.email không có DB unique constraint

- **File:** `bdsai/apps/api/src/db/schema/public-users.ts:25` (email text NOT NULL, no unique)
- **Mô tả:** Story E7 quyết định unique email qua Supabase Auth (KHÔNG DB constraint).
  Acceptable per AD-5, nhưng nếu Supabase Auth bị race hoặc data drift → public_users
  có thể có duplicate email không phát hiện. Defensive: thêm unique index.
- **Cách sửa:** Optional — `email: text('email').notNull().unique()` + migration.
  Hoặc document rõ rely Supabase Auth. Non-blocking.

## Bảng verify AC1–AC8

| AC | Status | Ghi chú |
|----|--------|---------|
| AC1 — Migration 0001 + RLS | **PARTIAL** | CREATE TABLE + RLS policy đúng (users_select_own, service_role_all, anon không INSERT/UPDATE/DELETE). **THIẾU FK ON DELETE CASCADE** (HIGH-1). Column types đúng (uuid PK, text, boolean, timestamptz). Journal có 2 entries (0000+0001). |
| AC2 — Supabase Auth email+phone | **FAIL** | `[auth.email] enable_signup=true` ✓, `[auth.sms] enable_signup=true` ✓. NHƯNG `enable_confirmations=false` (HIGH-2) → email verify không gửi. |
| AC3 — Zod validation | **PASS** | registerSchema (email, phone VN regex, password ≥8 + chữ + số). 18 unit test cover edge case (SQL injection, phone sai, password yếu). z.preprocess normalize phone. |
| AC4 — POST /auth/register | **PASS** | admin.createUser (service-role) + public_users insert + compensate rollback (deleteUser) + email job enqueue. 6 unit test (happy, normalize, dup, network, insert-fail compensate, rate-limit). KHÔNG await job (AD-6). |
| AC5 — Phone normalization | **PASS** | normalizePhone: strip spaces/dashes/parens/dots, +84→0, 0084→84→0, 84→0. 10 unit test. toE164 cho Supabase. public_users lưu 0xxxxxxxxx. |
| AC6 — Web page /auth/register | **PASS** | Client component form (email, phone, password, confirmPassword). Zod UX validation. Next API thin proxy (AD-10). Header thêm nút "Đăng ký". Loading/error/success state. a11y (aria-invalid, aria-describedby, role=alert). |
| AC7 — Trùng email → 409 | **PASS** | isDuplicateEmail check error_code `email_exists` + message. 409 Conflict shape đúng. e2e verify không tạo trùng. Phân biệt phone_exists (409 riêng). |
| AC8 — PII redact + không phá 1.1-1.6 | **PARTIAL** | Pino redact `*.email`/`*.phone`/`*.confirmPassword` ✓. Sentry redact email/phone regex ✓. Build/lint/typecheck/test PASS. **MEDIUM-1**: rawMsg log chưa redact. Migration 0000 OK. |

## Bảng verify invariant AD

| AD | Status | Ghi chú |
|----|--------|---------|
| AD-2 (Single Data Mutation Path) | **PASS** | Registration 2 write (Supabase Auth + public_users) qua NestJS API → Service. Compensate rollback nếu insert fail. Anon không INSERT/UPDATE/DELETE (RLS). Frontend không insert trực tiếp. |
| AD-5 (Auth Separation) | **PASS** | admin.createUser service-role (KHÔNG anon signUp). public_users.role discriminator. Service-role key chỉ backend (grep web: 0 expose, chỉ comment). |
| AD-8 (PII/secret) | **PARTIAL** | Pino + Sentry redact email/phone/password. Exception filter không leak stack. **MEDIUM-1**: rawMsg duplicate-email log chưa redact. safeErr dùng cho error path khác OK. |
| AD-10 (Next API mỏng) | **PASS** | route.ts thin proxy forward NestJS, zero business logic. Web form chỉ UX validation. |
| AD-1 (Module Isolation) | **PASS** | AuthModule riêng, inject hạ tầng @Global. Schema public-users.ts riêng, export barrel. QueueService inject (không queue riêng). |
| AD-6 (Background Job) | **PASS** | Email job enqueue qua QueueService (BullMQ), không await job. EmailProcessor no-op (Supabase gửi — nhưng HIGH-2: thực ra không gửi). |

## Verify adversarial (tự chạy)

- `git status` → 12 NEW + 14 UPDATE file tồn tại ✓
- `yarn build` → 3/3 successful (cache hit) ✓
- `yarn lint` → 4/4 successful ✓
- `yarn typecheck` → 4/4 successful ✓
- `yarn test` → 59 unit (api, 8 suites) + 10 (web, 3 suites) PASS ✓
- `grep service-role apps/web` → 0 expose (chỉ comment/doc) ✓
- `grep console.log apps/api/src/auth` → 0 match ✓
- `grep password logger.module.ts` → `*.password` trong redact paths ✓
- Migration 0001 SQL đọc trực tiếp → thiếu FK CASCADE (HIGH-1) ✗
- config.toml đọc trực tiếp → enable_confirmations=false (HIGH-2) ✗
- E2e (auth.e2e-spec.ts) KHÔNG re-run bởi reviewer (cần Supabase live) — dev log
  claim 24 e2e pass, code review logic test OK nhưng không verify real-data.

## Kết luận + recommendation

**CHANGES REQUESTED.** Code chất lượng tốt, kiến trúc sạch (AD-1/2/5/6/10 tuân),
test coverage đầy đủ edge case. Nhưng 2 HIGH chặn:

1. **HIGH-1 (FK CASCADE):** Thêm FK `public_users.id → auth.users.id ON DELETE
   CASCADE` vào migration (0001 sửa hoặc 0002 mới). Sửa comment schema cho khớp.
2. **HIGH-2 (enable_confirmations):** Đổi `config.toml` `enable_confirmations=true`
   + verify email thực gửi (Inbucket), HOẶC document rõ defer email sang Story 2.2/6.2
   và sửa AC2 expectation + bỏ claim "email tự động gửi".

Fix thêm MEDIUM-1 (rawMsg redact) + MEDIUM-2 (rate-limit guard) trước e2e. LOW
non-blocking (có thể fix trong story sau).

**Recommendation cho leader:** Yêu cầu story-developer fix HIGH-1 + HIGH-2 + MEDIUM-1,
re-run build/test, rồi mới chuyển e2e-tester (e2e real-data sẽ verify email Inbucket +
FK CASCADE thực tế).
