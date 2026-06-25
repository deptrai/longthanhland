---
baseline_commit: 38fb8dfa9e
---

# Story 2.1: Đăng ký bằng email + phone

Status: review

<!-- Story ĐẦU TIÊN Epic 2 (User Authentication & Profiles). Sau 2.1 done → Epic 2 in-progress. -->
<!-- Dependencies: Story 1.2 (Supabase client + ConfigService + env validation), Story 1.4 (Base UI header + route groups), Story 1.6 (BullMQ queue + pino logger + exception filter + Sentry redact). -->

## Story

As a **người dùng mới (buyer/seller)**,
I want **đăng ký tài khoản bằng email và số điện thoại**,
so that **tôi có tài khoản để đăng tin hoặc liên hệ seller**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 2 → Story 2.1 (dòng 246-260, AC gốc Given/When/Then) + FR1 (dòng 18: "User đăng ký bằng email + phone, xác thực qua Supabase Auth").
> AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC8.
> Quy ước test toàn dự án (dòng 144 epics.md): "mỗi story phải kèm test tự động trước khi coi là Done — Story 1.3 gate (lint+typecheck+build+test qua Turborepo) phải pass". Edge case nêu trong AC phải có test tương ứng.

1. **AC1 — Bảng `public_users` tạo qua Drizzle migration (schema + RLS).**
   Given Story 1.2 đã setup Drizzle (`drizzle.config.ts`, `yarn db:generate`/`yarn db:migrate`) + Story 1.5 đã có migration 0000 (`vietnamese_fts`) + schema hiện tại rỗng (`schema/index.ts` = `export {}`),
   When định nghĩa bảng `public_users` trong `apps/api/src/db/schema/public-users.ts` (Drizzle pgTable) + export qua `schema/index.ts`,
   Then `yarn db:generate` (KHÔNG `--custom` — đây là schema change thật, drizzle-kit sinh SQL tự động) tạo migration 0001 `*.sql` chứa `CREATE TABLE public_users (...)`. `yarn db:migrate` apply thành công.
   Cột bảng `public_users`:
   - `id` uuid PK (FK → `auth.users.id`, ON DELETE CASCADE) — khớp Supabase Auth user id.
   - `email` text NOT NULL.
   - `phone` text NOT NULL (đã chuẩn hóa — xem AC5).
   - `phone_verified` boolean NOT NULL default `false`.
   - `role` text NOT NULL default `'user'` (giá trị: `'user'` | `'admin'` — AD-5 role discriminator).
   - `banned` boolean NOT NULL default `false`.
   - `created_at` timestamptz NOT NULL default `now()`.
   - `updated_at` timestamptz NOT NULL default `now()`.
   RLS policy (xem Dev Notes — thêm thủ công vào migration 0001 sau khi generate, hoặc migration 0002 `--custom` riêng):
   - User chỉ SELECT row của chính mình (`id = auth.uid()`).
   - Service-role (backend) full access (bypass RLS — service-role key).
   - KHÔNG cho user INSERT/UPDATE/DELETE trực tiếp qua Supabase client (AD-2 — mutation qua NestJS API).
   Verify: `psql` — `\d public_users` hiện đúng cột + `\dp public_users` hiện RLS enabled. `SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;` có 2 rows (0000 + 0001).

2. **AC2 — Supabase Auth config: enable email + phone provider.**
   Given Story 1.2 đã init Supabase client (service-role, `apps/api/src/supabase/supabase.service.ts`) nhưng CHƯA config auth provider,
   When enable email provider + phone provider trong Supabase local (Dashboard → Authentication → Providers, HOẶC `supabase/config.toml` section `[auth.email]` enabled=true + `[auth.sms]` enabled=true với OTP provider config),
   Then Supabase Auth `signUp({ email, password, phone })` tạo được user mới. Email xác thực tự động gửi (Supabase Auth trigger — confirm email link). User ở trạng thái `email_confirmed=false` cho đến khi click link.
   Verify: `curl` POST `/auth/register` (AC4) với email/phone/password hợp lệ → 201 + Supabase Auth user tồn tại (Dashboard → Authentication → Users). Email xác thực đến Inbucket (local port 54354) hoặc email service (prod).
   Note: phone OTP verify KHÔNG nằm trong story này (Story 2.3 — phone verified). Story 2.1 chỉ lưu phone + gửi email verify. Phone provider enable để sẵn cho 2.3.

3. **AC3 — Validation: email + phone VN + password ≥ 8 ký tự (Zod schema, API + web).**
   Given input từ user qua form web,
   When validate bằng Zod schema (`packages/shared` hoặc `apps/api/src/auth/dto/`),
   Then:
   (a) **Email:** RFC 5322 đơn giản (`z.string().email()`) + non-empty.
   (b) **Phone VN:** regex `^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$` — chấp nhận `0xxx` hoặc `+84xxx`, 10-11 digit (sau normalize). Chuẩn hóa trước validate (xem AC5).
   (c) **Password:** `z.string().min(8)` + tối thiểu 1 chữ + 1 số (khuyến nghị, không bắt buộc ký tự đặc biệt — cân bằng security + UX VN).
   (d) **Confirm password:** phải khớp password (web form only, API không nhận confirm).
   Validation fail → 400 `{ statusCode: 400, message: 'Validation failed', error: 'Bad Request', details: zodIssues }` (qua AllExceptionsFilter — Story 1.6 AC6).
   Verify: unit test `register.dto.spec.ts` — email sai, phone sai format (thiếu số, sai đầu số), password < 8, confirm không khớp → reject. Email/phone/password hợp lệ → pass.

4. **AC4 — API endpoint `POST /auth/register` tạo Supabase Auth user + `public_users` row + queue email verification job.**
   Given web form submit (AC6) gọi API,
   When `POST /auth/register { email, phone, password }` (body đã validate AC3),
   Then:
   (a) **Supabase Auth signUp:** `supabase.auth.admin.createUser({ email, password, phone, email_confirm: false })` (service-role admin API — AD-5, KHÔNG dùng anon signUp vì cần kiểm soát + insert public_users đồng bộ). Trả user id (uuid).
   (b) **public_users insert:** `db.insert(publicUsers).values({ id: userId, email, phone: normalizedPhone, role: 'user' })` qua Drizzle (AD-2 — mutation qua NestJS API → Service → Drizzle).
   (c) **Compensate rollback:** nếu public_users insert fail → `supabase.auth.admin.deleteUser(userId)` (service-role) — xóa Supabase Auth user để không orphan. Log error (pino). Return 500 generic (AD-8 — không leak chi tiết).
   (d) **Email verification job:** enqueue BullMQ job `send-verification-email { userId, email }` (AD-6 — async, KHÔNG await job trong handler). Job gửi email xác thực (Supabase Auth đã gửi tự động khi createUser với `email_confirm: false` — job này có thể là no-op wrapper HOẶC gửi email custom qua SMTP. Quyết định dev: nếu Supabase Auth đã gửi thì job chỉ log; nếu muốn custom email thì job gửi. Ưu tiên: dựa vào Supabase Auth email tự động — job wrapper cho future custom email).
   (e) Response: 201 `{ userId, email, phoneVerified: false, emailVerified: false }` (KHÔNG trả JWT/session — Story 2.2 login).
   AD-2: registration là 2 write (Supabase Auth + public_users) — KHÔNG phải 1 transaction DB (Supabase Auth nằm ngoài PG transaction). Compensate rollback (AC4c) là cơ chế nhất quán thay thế.
   Verify: `curl -X POST http://localhost:3101/auth/register -H 'Content-Type: application/json' -d '{"email":"test@bdsai.vn","phone":"0901234567","password":"Abc12345"}'` → 201. `psql` — `SELECT * FROM public_users WHERE email='test@bdsai.vn'` → 1 row, role='user', phone_verified=false. Supabase Dashboard → Users → user tồn tại, email_confirmed=false.

5. **AC5 — Phone normalization: strip + convert +84 → 0, lưu format chuẩn.**
   Given user nhập phone ở nhiều format (`0901 234 567`, `0901-234-567`, `+84901234567`, `84901234567`),
   When normalize trước validate + trước insert,
   Then:
   (a) Strip spaces, dashes, parentheses, leading `00`.
   (b) `+84` → `0` (hoặc `84` không có + → `0`).
   (c) Kết quả: `0` + 9-10 digit (VD `0901234567`).
   (d) Lưu format chuẩn vào `public_users.phone`.
   Verify: unit test `phone-normalize.spec.ts` — `'+84 901 234 567'` → `'0901234567'`, `'0084901234567'` → `'0901234567'`, `'0901-234-567'` → `'0901234567'`. Invalid phone (sau normalize vẫn sai regex) → reject.

6. **AC6 — Web page `/auth/register` (route group `(auth)`, form client component).**
   Given Story 1.4 đã tạo route group `(auth)` (hiện rỗng) + header có nút "Đăng nhập" (`/auth/login`),
   When tạo page `apps/web/app/(auth)/register/page.tsx` + form component `apps/web/components/auth/register-form.tsx` (client component — `'use client'`),
   Then:
   (a) Form fields: email, phone, password, confirm password. Label tiếng Việt.
   (b) Client validation (Zod — cùng schema AC3, import từ `@bdsai/shared` hoặc duplicate). Error hiển thị inline dưới mỗi field.
   (c) Submit → `fetch('http://localhost:3101/auth/register', { method: 'POST', body })` (AD-10 — web form gọi API, KHÔNG business logic trong web). HOẶC qua Next API route `apps/web/app/api/auth/register/route.ts` (thin proxy — forward tới NestJS, AD-10). Quyết định dev: direct fetch OK cho dev; prod dùng Next API route proxy (CORS + env). Ưu tiên: Next API route thin proxy (AD-10 compliance).
   (d) Success → redirect `/auth/login` + toast "Đăng ký thành công, kiểm tra email xác thực".
   (e) Error (trùng email AC7, validation fail) → hiển thị message từ API response shape.
   (f) Header nút "Đăng nhập" (`/auth/login`) — thêm nút "Đăng ký" (`/auth/register`) vào header (Story 1.4 header update).
   Verify: browser — navigate `/auth/register`, fill form, submit → API call → success redirect. Playwright/Vitest test form render + validation.

7. **AC7 — Đăng ký trùng email → báo lỗi rõ ràng, không tạo trùng.**
   Given email đã tồn tại trong Supabase Auth,
   When `POST /auth/register` với email trùng,
   Then:
   (a) Supabase Auth `admin.createUser` throw error (`User already registered` — status 400/422).
   (b) API catch → return 409 `{ statusCode: 409, message: 'Email đã được đăng ký', error: 'Conflict' }` (KHÔNG leak email raw trong log — AD-8, log email redacted).
   (c) KHÔNG tạo public_users row (vì Supabase Auth fail trước — không có userId).
   (d) KHÔNG gửi email verification job.
   Verify: e2e — register email A → 201. Register email A lại → 409. `psql` — `SELECT count(*) FROM public_users WHERE email='A'` → 1 (không trùng).

8. **AC8 — Không lộ PII trong log (AD-8) + không phá Story 1.1-1.6.**
   Given Story 1.6 pino logger có redact config (`*.password`, `*.key`, `*.token`) + Sentry beforeSend redact secret,
   When register flow log (info/warn/error),
   Then:
   (a) Email/phone KHÔNG log raw — pino redact thêm `*.email`, `*.phone` vào config (UPDATE `logger.module.ts`). Log chỉ hiện `[Redacted]` hoặc hash.
   (b) Sentry beforeSend redact email/phone khỏi event (UPDATE Sentry config — Story 1.6 đã redact secret, thêm PII fields).
   (c) Exception filter (Story 1.6) KHÔNG leak stack ra client — register error response chỉ `{ statusCode, message, error, details? }`.
   (d) `yarn build && yarn lint && yarn typecheck && yarn test` (cả 3 package: shared, api, web) PASS — không phá 1.1-1.6.
   (e) Migration 0000 `vietnamese_fts` vẫn apply đúng (`yarn db:migrate` idempotent). Health endpoint 1.2 (`GET /health/supabase`) vẫn 200.
   Verify: unit test — log object có `email: 'test@bdsai.vn'` → output `[Redacted]`. E2e — register → check pino log output KHÔNG chứa email raw.

## Invariant AD liên quan (BẮT BUỘC tuân theo)

| AD | Áp dụng trong story này |
|----|------------------------|
| **AD-2 (Single Data Mutation Path)** | AC4 — registration tạo user qua Supabase Auth (`auth.admin.createUser` — exception AD-2, auth flow) + `public_users` row qua NestJS API → Service → Drizzle (business entity). 2 write KHÔNG cùng PG transaction (Supabase Auth ngoài PG) → compensate rollback (AC4c) nếu public_users fail. Frontend KHÔNG insert public_users trực tiếp. |
| **AD-5 (Auth Separation)** | AC2/AC4 — Supabase Auth cho auth (signup, email verify), NestJS cho business logic (public_users role/banned). Service-role key CHỈ backend (`supabase.service.ts` đã init service-role client — Story 1.2). Admin createUser dùng service-role (KHÔNG anon signUp). Role column `public_users.role` discriminator (user/admin). |
| **AD-8 (PII/secret)** | AC8 — email/phone KHÔNG log raw. Pino redact thêm `*.email`, `*.phone`. Sentry beforeSend redact PII. Exception filter không leak stack. Phone normalization trước log (nếu cần log phone, log normalized hash). AD-8 rule: "KHÔNG lưu sellerPhone raw từ crawl" — story này là user tự nhập phone (consent), lưu raw OK nhưng KHÔNG log raw. |
| **AD-10 (Next API Route Boundary)** | AC6 — web form gọi API qua Next API route thin proxy (`apps/web/app/api/auth/register/route.ts`) → forward tới NestJS. ZERO business logic trong web (validation nghiệp vụ ở NestJS, web chỉ client-side UX validation). |
| **AD-1 (Module Isolation)** | `auth/` module NestJS riêng (controller + service + dto). `auth/` expose AuthService interface. QueueService inject (KHÔNG tạo queue riêng). Drizzle schema `public-users.ts` riêng, export qua `schema/index.ts`. |
| **AD-6 (Background Job)** | AC4d — email verification job enqueue qua QueueService (BullMQ), KHÔNG await job trong HTTP handler. Job async ngoài request path. |

## Edge Case (phải có test hoặc xử lý rõ)

- **E1 — Email trùng (đã tồn tại trong Supabase Auth).** AC7 — `admin.createUser` throw `User already registered`. API catch → 409 Conflict. KHÔNG tạo public_users. Test: e2e register 2 lần cùng email → lần 2 trả 409.
- **E2 — Phone sai format (sau normalize vẫn sai regex).** AC3/AC5 — Zod reject → 400. VD: `12345` (quá ngắn), `090123456` (9 digit thiếu), `1901234567` (sai đầu số 19x). Test: unit test validation reject.
- **E3 — Password yếu (< 8 ký tự, hoặc chỉ chữ/chỉ số).** AC3 — Zod reject → 400. Test: unit test `password: '123'` → reject, `password: 'abcdefgh'` (chỉ chữ, no số) → reject nếu require number.
- **E4 — Supabase Auth fail (network/service down).** AC4 — `admin.createUser` throw network error. API catch → 500 generic (AD-8 — không leak). KHÔNG tạo public_users. Log error server-side (pino). Test: mock supabase.auth.admin.createUser reject → assert 500 + public_users không insert.
- **E5 — public_users insert fail (DB down, constraint violation).** AC4c — compensate rollback: `admin.deleteUser(userId)` xóa Supabase Auth user. Log error. Return 500. Test: mock db.insert reject → assert admin.deleteUser called + 500. CRITICAL: không orphan Supabase Auth user.
- **E6 — Email verify token expire / user không click.** AC2 — Supabase Auth email link có expiry (default 24h — config `[auth.email] otp_exp`). User không verify → `email_confirmed=false` vĩnh viễn cho đến khi resend (Story 2.2/2.3 handle resend). Story 2.1 KHÔNG handle resend — chỉ ghi nhận trạng thái. Test: register → check `email_confirmed=false` trong Dashboard.
- **E7 — Phone đã dùng (trùng phone trong public_users).** AC không yêu cầu unique phone (phone có thể trùng — 1 số cho nhiều tài khoản? Quyết định: KHÔNG unique phone trong story này — phone verified mới unique khi verified, Story 2.3 handle). Nếu cần unique: thêm unique constraint + catch → 409. Quyết định dev: KHÔNG unique phone ở 2.1 (chỉ unique email qua Supabase Auth). Test: register 2 email khác cùng phone → cả 2 OK.
- **E8 — Network timeout (web → API, API → Supabase).** AC4/AC6 — fetch timeout. Web form hiển thị "Lỗi mạng, thử lại". API: supabase client timeout config. Test: mock fetch timeout → assert error message user-friendly.
- **E9 — Rate limit (Supabase Auth signup spam).** AC2 — Supabase Auth có rate limit built-in (config `[auth] rate_limit`). Nếu exceed → 429. API catch → 429 + message "Quá nhiều yêu cầu, thử lại sau". Test: mock supabase return 429 → assert API 429.
- **E10 — SQL injection (input độc hại trong email/phone).** AC3 — Zod validation reject input không hợp lệ trước khi insert. Drizzle parameterized queries (postgres.js prepared statements — `prepare: false` nhưng vẫn parameterized). Test: email `' OR 1=1 --` → Zod reject (không phải email format). Phone `'; DROP TABLE--` → normalize + regex reject.

## UX Spec tham chiếu

- Form đăng ký: fields email, phone, password, confirm password. Label tiếng Việt ("Email", "Số điện thoại", "Mật khẩu", "Xác nhận mật khẩu").
- Button "Đăng ký" + link "Đã có tài khoản? Đăng nhập" (`/auth/login`).
- Error inline dưới field (client validation) + toast/banner cho API error.
- Success → redirect `/auth/login` + toast "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
- Responsive (mobile-first — Story 1.4 Tailwind 4). Touch target ≥ 44px (EXPERIENCE.md).
- Tham chiếu: `docs/bdsai/ux/UX-DESIGN.md` (nếu có) + `EXPERIENCE.md` (touch target, contrast AA).

## Dev Notes

### Versions (khớp ARCHITECTURE-SPINE.md Stack + Story 1.2/1.6 pin)

| Package | Version | Note |
|---------|---------|------|
| Drizzle ORM | 0.36.4 (đã có) | KHÔNG nâng cấp — Story 1.2 pin |
| drizzle-kit | 0.31.10 (đã có) | `yarn db:generate` (KHÔNG --custom — schema change thật) |
| @supabase/supabase-js | 2.108.2 (đã có) | `auth.admin.createUser` / `deleteUser` |
| Zod | 3.25.76 (đã có) | Validation schema (shared hoặc api) |
| BullMQ | 5.79.1 (đã có, Story 1.6) | QueueService enqueue email job |
| nestjs-pino | 4.6.1 (đã có, Story 1.6) | Logger + redact PII |
| Next.js | 16.2.9 (đã có) | Route group (auth) + form |
| React | 19.2.7 (đã có) | Client component form |

### Drizzle schema — `public_users`

```typescript
// apps/api/src/db/schema/public-users.ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const publicUsers = pgTable('public_users', {
  id: uuid('id').primaryKey(),  // FK → auth.users.id (KHÔNG dùng .references() vì auth.users nằm ngoài schema Drizzle — document trong comment)
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  role: text('role').notNull().default('user'),
  banned: boolean('banned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

```typescript
// apps/api/src/db/schema/index.ts — UPDATE (thay export {})
export * from './public-users';
```

### Migration 0001

```bash
cd bdsai/apps/api
yarn db:generate  # KHÔNG --custom — drizzle-kit sinh CREATE TABLE từ schema
# Review file 0001_*.sql — verify CREATE TABLE public_users đúng cột
# THÊM RLS policy thủ công vào cuối file 0001 (hoặc migration 0002 --custom):
#   ALTER TABLE public_users ENABLE ROW LEVEL SECURITY;
#   CREATE POLICY "users_select_own" ON public_users FOR SELECT USING (id = auth.uid());
#   CREATE POLICY "service_role_all" ON public_users FOR ALL USING (auth.role() = 'service_role');
#   -- KHÔNG policy INSERT/UPDATE/DELETE cho anon (AD-2 — mutation qua NestJS service-role)
yarn db:migrate
```

Note: RLS policy dùng `auth.uid()` + `auth.role()` — Supabase Auth helper functions. Service-role bypass RLS (service-role key). Drizzle insert từ NestJS dùng service-role connection (DATABASE_URL với service-role? — KHÔNG, Drizzle dùng DATABASE_URL direct PG, service-role bypass qua `auth.role()` check). **Quyết định dev:** Drizzle connection dùng DATABASE_URL (postgres direct) — RLS policy `service_role_all` check `auth.role() = 'service_role'`. Nếu Drizzle connection KHÔNG set role service-role → RLS block. Cần set `SET ROLE service_role` trong Drizzle session, HOẶC policy dùng `current_setting('request.jwt.claim.role') = 'service_role'`. **Ưu tiên:** Drizzle insert qua NestJS dùng service-role — set `SET LOCAL ROLE service_role` trước insert, HOẶC đơn giản hơn: RLS policy cho phép `id = auth.uid()` (user select own) + service-role bypass (Supabase service-role key khi connect qua Supabase client, KHÔNG qua Drizzle direct). **Chốt:** Drizzle dùng DATABASE_URL direct PG (postgres.js) — KHÔNG qua Supabase Auth. RLS chỉ áp dụng khi connect qua Supabase client (anon/auth). Drizzle direct PG = superuser/bypass RLS. → RLS policy protect frontend direct Supabase access, Drizzle bypass. Document rõ trong migration comment.

### Supabase Auth config

```toml
# supabase/config.toml — UPDATE (hoặc Dashboard)
[auth.email]
enabled = true
enable_confirmations = true  # gửi email xác thực

[auth.sms]
enabled = true  # enable cho Story 2.3 (phone OTP) — 2.1 chưa dùng OTP
# OTP provider (Twilio/Vonage) — dev local có thể dùng test provider
```

### API endpoint — `POST /auth/register`

```
apps/api/src/auth/
├── auth.module.ts          # NestJS module
├── auth.controller.ts      # POST /auth/register
├── auth.service.ts         # register logic (Supabase + Drizzle + Queue)
├── dto/
│   ├── register.dto.ts     # Zod schema (email, phone, password)
│   └── register.dto.spec.ts
├── auth.service.spec.ts    # Unit test
└── phone-normalize.ts      # normalizePhone() helper + spec
```

Flow `auth.service.register()`:
1. Validate input (Zod — AC3).
2. Normalize phone (AC5).
3. `supabase.auth.admin.createUser({ email, password, phone, email_confirm: false })` → userId.
4. `db.insert(publicUsers).values({ id: userId, email, phone, role: 'user' })`.
5. If step 4 fail → `supabase.auth.admin.deleteUser(userId)` (compensate — AC4c).
6. `queueService.addEmailVerificationJob({ userId, email })` (AD-6 — async).
7. Return `{ userId, email, phoneVerified: false, emailVerified: false }`.

### Web page — `/auth/register`

```
apps/web/app/(auth)/
├── layout.tsx              # Auth layout (centered card) — NEW
└── register/
    └── page.tsx            # Server component wrapper → RegisterForm

apps/web/components/auth/
└── register-form.tsx       # Client component ('use client') — form + validation + fetch

apps/web/app/api/auth/register/
└── route.ts                # Next API thin proxy → POST http://localhost:3101/auth/register (AD-10)
```

### Validation — Zod schema (shared)

```typescript
// packages/shared/src/schemas/register.ts (HOẶC apps/api/src/auth/dto/register.dto.ts)
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().min(1, 'Số điện thoại bắt buộc'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').regex(/[0-9]/, 'Phải có ít nhất 1 số'),
});
// Confirm password: web form only (z.refine trên form schema)
```

### Phone normalization

```typescript
// apps/api/src/auth/phone-normalize.ts
export function normalizePhone(input: string): string {
  let p = input.replace(/[\s\-()]/g, '');  // strip spaces, dashes, parens
  p = p.replace(/^00/, '');                 // strip leading 00
  p = p.replace(/^\+84/, '0');              // +84 → 0
  p = p.replace(/^84/, '0');                // 84 (no +) → 0
  return p;
}
// Validate sau normalize: /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/
```

### PII redaction — UPDATE logger + Sentry

```typescript
// apps/api/src/common/logger/logger.module.ts — UPDATE redact paths
redact: {
  paths: [
    // ... existing (password, key, token, ...)
    '*.email',
    '*.phone',
    '*.confirmPassword',
  ],
  censor: '[Redacted]',
}
```

```typescript
// apps/api/src/main.ts (hoặc sentry config) — UPDATE beforeSend
beforeSend(event) {
  // ... existing secret redact
  // Redact email/phone từ request body + breadcrumbs
  if (event.request?.data) {
    event.request.data = event.request.data
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email-redacted]')
      .replace(/0\d{9,10}/g, '[phone-redacted]');
  }
  return event;
}
```

### Compensate rollback

```typescript
// auth.service.ts
async register(dto: RegisterDto): Promise<RegisterResponse> {
  const normalizedPhone = normalizePhone(dto.phone);
  // ... validate

  let authUser;
  try {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      phone: normalizedPhone,
      email_confirm: false,
    });
    if (error) throw error;
    authUser = data.user;
  } catch (e) {
    // E1: email trùng → 409; E4: network → 500
    if (e.message.includes('already registered')) {
      throw new ConflictException('Email đã được đăng ký');
    }
    throw new InternalServerErrorException('Đăng ký thất bại');
  }

  try {
    await this.db.insert(publicUsers).values({
      id: authUser.id,
      email: dto.email,
      phone: normalizedPhone,
      role: 'user',
    });
  } catch (e) {
    // E5: compensate — xóa Supabase Auth user
    this.logger.error({ userId: authUser.id }, 'public_users insert failed — compensating');
    await this.supabase.auth.admin.deleteUser(authUser.id);
    throw new InternalServerErrorException('Đăng ký thất bại');
  }

  // AD-6: enqueue email job (KHÔNG await)
  await this.queueService.addEmailVerificationJob({ userId: authUser.id, email: dto.email });

  return { userId: authUser.id, email: dto.email, phoneVerified: false, emailVerified: false };
}
```

### Test strategy

- **Unit (jest):**
  - `register.dto.spec.ts` — email/phone/password validation (E2, E3, E10).
  - `phone-normalize.spec.ts` — normalizePhone các format (AC5).
  - `auth.service.spec.ts` — mock supabase.auth.admin + db.insert + queueService:
    - Happy path → 201 + public_users insert called + queue job enqueued.
    - E1 email trùng → ConflictException.
    - E4 supabase fail → InternalServerErrorException, public_users NOT called.
    - E5 db.insert fail → admin.deleteUser called (compensate) + InternalServerErrorException.
- **Integration (jest e2e):**
  - `auth.e2e-spec.ts` — cần Supabase local chạy:
    - `POST /auth/register` hợp lệ → 201, `psql` verify public_users row, Supabase Dashboard verify user.
    - `POST /auth/register` trùng email → 409.
    - `POST /auth/register` validation fail → 400 + details.
  - Skip nếu Supabase không reach (env guard — `describe.skip`).
- **Web (vitest):**
  - `register-form.spec.tsx` — form render, validation inline, submit fetch mock, error display, success redirect.
- **CI gate:** `yarn build && yarn lint && yarn typecheck && yarn test` (Story 1.3).

### Source tree (NEW/UPDATE)

```
bdsai/
├── apps/api/
│   ├── src/
│   │   ├── auth/                              # NEW directory (AD-1 module riêng)
│   │   │   ├── auth.module.ts                 # NEW — NestJS module
│   │   │   ├── auth.controller.ts             # NEW — POST /auth/register
│   │   │   ├── auth.service.ts                # NEW — register logic
│   │   │   ├── auth.service.spec.ts           # NEW — unit test
│   │   │   ├── phone-normalize.ts             # NEW — normalizePhone helper
│   │   │   ├── phone-normalize.spec.ts        # NEW — unit test
│   │   │   └── dto/
│   │   │       ├── register.dto.ts            # NEW — Zod schema
│   │   │       └── register.dto.spec.ts       # NEW — unit test
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   │   ├── index.ts                   # UPDATE — export publicUsers (thay export {})
│   │   │   │   └── public-users.ts            # NEW — pgTable public_users
│   │   │   ├── database.tokens.ts             # UPDATE — DrizzleDB type include publicUsers
│   │   │   └── migrations/
│   │   │       └── 0001_*.sql                 # NEW — drizzle-kit generate (CREATE TABLE + RLS)
│   │   ├── common/
│   │   │   └── logger/
│   │   │       └── logger.module.ts           # UPDATE — redact thêm *.email, *.phone
│   │   ├── queue/
│   │   │   ├── queue.tokens.ts                # UPDATE — thêm EMAIL_QUEUE + EmailJobData
│   │   │   ├── queue.service.ts               # UPDATE — addEmailVerificationJob()
│   │   │   └── queue.processor.ts             # UPDATE — process email job (no-op hoặc SMTP)
│   │   ├── app.module.ts                      # UPDATE — import AuthModule
│   │   └── main.ts                            # UPDATE — Sentry beforeSend redact PII (nếu chưa có)
│   ├── test/
│   │   └── auth.e2e-spec.ts                   # NEW — integration test register
│   ├── package.json                           # KHÔNG cần dep mới (all đã có từ 1.2/1.6)
│   └── .env.example                           # KHÔNG ĐỔI (env đã đủ từ 1.2/1.6)
├── apps/web/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                     # NEW — auth layout (centered card)
│   │   │   └── register/
│   │   │       └── page.tsx                   # NEW — register page (server wrapper)
│   │   └── api/
│   │       └── auth/
│   │           └── register/
│   │               └── route.ts               # NEW — Next API thin proxy (AD-10)
│   ├── components/
│   │   ├── auth/
│   │   │   └── register-form.tsx              # NEW — client component form
│   │   └── shared/
│   │       └── site-header.tsx                # UPDATE — thêm nút "Đăng ký" (/auth/register)
│   ├── __tests__/
│   │   └── register-form.spec.tsx             # NEW — vitest form test
│   └── package.json                           # KHÔNG cần dep mới
├── packages/shared/
│   └── src/
│       └── schemas/
│           └── register.ts                    # NEW — Zod schema shared (optional, hoặc duplicate trong api)
└── supabase/
    └── config.toml                            # UPDATE — [auth.email] + [auth.sms] enabled
```

### Quyết định kiến trúc nhỏ (author chốt, dev có thể điều chỉnh nếu có lý do)

1. **public_users.id = auth.users.id (uuid, FK CASCADE):** Khớp AD-5 (shared user table, role discriminator). KHÔNG auto-generate id — dùng id từ Supabase Auth createUser. FK ON DELETE CASCADE: xóa Supabase Auth user → public_users row tự xóa (Supabase Auth admin deleteUser trigger). Drizzle KHÔNG define `.references()` vì `auth.users` ngoài schema Drizzle — document trong comment + RLS/migration handle.
2. **admin.createUser (service-role) thay vì anon signUp:** AD-5 — service-role chỉ backend. anon signUp tạo user nhưng KHÔNG cho kiểm soát đồng bộ public_users (race condition). admin.createUser + insert public_users trong 1 flow NestJS → nhất quán. Compensate rollback nếu fail.
3. **Phone KHÔNG unique ở story 2.1:** Phone verified mới unique (Story 2.3 — khi phone_verified=true). Story 2.1 cho phép trùng phone (chưa verified). Tránh friction UX.
4. **Email verification job (BullMQ):** Supabase Auth `createUser({ email_confirm: false })` tự gửi email xác thực. Job BullMQ wrapper cho future custom email (SMTP). Story 2.1 job = no-op log (hoặc skip enqueue nếu Supabase đã gửi). Quyết định dev: enqueue job nhưng processor chỉ log (placeholder cho Story 2.3/6.2 custom email).
5. **Next API route thin proxy (AD-10):** `apps/web/app/api/auth/register/route.ts` forward tới NestJS. KHÔNG validation nghiệp vụ trong web. Client form validation chỉ UX (Zod duplicate), server validation là source of truth.
6. **RLS policy:** Drizzle direct PG (DATABASE_URL) bypass RLS (superuser/connection role). RLS protect frontend direct Supabase client access (anon key). Policy: user SELECT own row, service-role full, anon KHÔNG INSERT/UPDATE/DELETE (AD-2). Document trong migration comment.
7. **Zod schema shared:** `packages/shared/src/schemas/register.ts` — cả api + web import (DRY). Hoặc duplicate nếu shared chưa setup export. Ưu tiên shared (AD-1 — single source of truth).

### Risks & mitigations

| Risk | Mitigation |
|------|------------|
| **R1 — Compensate rollback fail (deleteUser fail sau insert fail)** | Log critical + Sentry capture. Orphan Supabase Auth user không có public_users row → login fail (Story 2.2 check public_users). Monitoring cron (Story 1.6) detect orphan. Manual cleanup script. |
| **R2 — Supabase Auth rate limit (spam signup)** | Supabase Auth built-in rate limit (config `[auth] rate_limit`). API catch 429 → user-friendly message. Future: thêm NestJS throttle (@nestjs/throttler) nếu cần. |
| **R3 — RLS policy block Drizzle insert** | Drizzle dùng DATABASE_URL direct PG (bypass RLS). Test verify insert OK. Nếu không bypass → set role hoặc policy adjust. Document rõ. |
| **R4 — Phone normalization edge case (format lạ)** | Unit test cover các format VN (0xxx, +84xxx, 0084xxx, spaces/dashes). Reject nếu sau normalize không khớp regex. KHÔNG accept international (non-VN) — story này VN only. |
| **R5 — Email service không gửi (Inbucket local OK, prod SMTP fail)** | Supabase Auth handle email send. Prod: configure SMTP trong Supabase Dashboard. Job BullMQ wrapper cho custom SMTP fallback (future). |
| **R6 — Migration 0001 RLS policy syntax error** | Test `yarn db:migrate` trên Supabase local trước. RLS policy dùng `auth.uid()` — Supabase extension. Verify `\dp public_users` sau migrate. |
| **R7 — PII redact break log usefulness** | Redact email/phone nhưng giữ context (userId, action). Log `register userId=xxx` thay vì `register email=xxx`. Dev debug dùng Dashboard. |

## References

- [Source:] `_bmad-output/planning-artifacts/epics.md` dòng 242-260 (Epic 2, Story 2.1 AC) + dòng 18 (FR1) + dòng 144 (quy ước test).
- [Source:] `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45), AD-5 (dòng 63), AD-8 (dòng 81), AD-10 (dòng 93), M2 User Management (dòng 312), Stack (dòng 136-160).
- [Source:] `bdsai/apps/api/src/db/schema/index.ts` — schema hiện tại rỗng (`export {}`), comment chỉ public_users → Story 2.1.
- [Source:] `bdsai/apps/api/src/db/database.module.ts` — Drizzle setup (postgres.js, prepare:false, DRIZZLE token).
- [Source:] `bdsai/apps/api/src/db/database.tokens.ts` — DrizzleDB type (cần update include publicUsers).
- [Source:] `bdsai/apps/api/src/supabase/supabase.service.ts` — service-role client, `auth` getter (admin API).
- [Source:] `bdsai/apps/api/src/config/env.validation.ts` — env vars (SUPABASE_URL, SERVICE_ROLE_KEY đã có — KHÔNG cần thêm).
- [Source:] `bdsai/apps/api/src/app.module.ts` — imports hiện tại (cần thêm AuthModule).
- [Source:] `bdsai/apps/api/src/queue/queue.service.ts` — QueueService (addEchoJob pattern — thêm addEmailVerificationJob).
- [Source:] `bdsai/apps/api/src/common/logger/logger.module.ts` — pino redact config (cần thêm *.email, *.phone).
- [Source:] `bdsai/apps/api/src/common/filters/all-exceptions.filter.ts` — exception filter shape (ZodError → 400, HttpException → shape).
- [Source:] `bdsai/apps/web/components/shared/site-header.tsx` — header (nút Đăng nhập /auth/login — cần thêm Đăng ký).
- [Source:] `bdsai/apps/web/app/` — route groups (auth) rỗng, cần tạo register page.
- [Source:] `_bmad-output/implementation-artifacts/1-6-ha-tang-nen-redis-bullmq-drizzle-sentry.md` — format story file, Dev Notes pattern, edge case format.
- [Source:] `bdsai/apps/api/package.json` — deps (all cần đã có: supabase-js, drizzle, zod, bullmq, nestjs-pino).
- [Source:] `bdsai/apps/api/src/db/migrations/0000_vietnamese_fts.sql` — migration 0000 đã có, 0001 sẽ là migration thứ 2.

## Dev Agent Record

- **Story points:** 5 (medium — Drizzle schema + migration + Supabase Auth + API + web form + compensate rollback + PII redact).
- **Dependencies:** Story 1.2 (Supabase client + ConfigService + env validation), Story 1.4 (Base UI header + route groups), Story 1.6 (BullMQ queue + pino logger + exception filter + Sentry redact).
- **Estimated effort:** 1-2 ngày dev + 0.5 ngày test.
- **Status:** ready-for-dev → (dev implement) → review → e2e → done.
