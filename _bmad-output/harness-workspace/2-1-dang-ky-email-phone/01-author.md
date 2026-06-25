# Story 2.1 — Author Log (story-author)

**Story:** 2-1-dang-ky-email-phone
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-27
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`, Epic 2 `backlog → in-progress`
**Vai trò:** Story ĐẦU TIÊN Epic 2 (User Authentication & Profiles). Khởi động Epic 2 sau khi Epic 1 hoàn tất (6/6 story done).

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/2-1-dang-ky-email-phone.md` | ✅ Đã ghi (8 AC + Invariant AD table 6 AD + 10 Edge Case + Dev Notes + Source tree NEW/UPDATE + References [Source:] + Dev Agent Record) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `2-1-dang-ky-email-phone: ready-for-dev` (dòng 59), `epic-2: in-progress` (dòng 58), `last_updated: 2026-06-27` (dòng 38) |
| 3 | Author log | `_bmad-output/harness-workspace/2-1-dang-ky-email-phone/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `_bmad-output/planning-artifacts/epics.md` (dòng 242-260) — Epic 2, Story 2.1 AC gốc Given/When/Then + FR1 (dòng 18: "User đăng ký bằng email + phone, xác thực qua Supabase Auth") + quy ước test toàn dự án (dòng 144: Story 1.3 CI gate). Đọc thêm Epic 2 goal (dòng 244: AD-5, chống privilege escalation) + Story 2.2-2.5 context.
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (Single Data Mutation Path, dòng 45 — exception auth flows + Storage), AD-5 (Auth Separation, dòng 63 — Supabase Auth public + NestJS guard admin, role column discriminator), AD-8 (PII/secret, dòng 81 — không log raw PII), AD-10 (Next API Route Boundary, dòng 93 — thin proxy, zero business logic), M2 User Management (dòng 312: AD-5, AD-8), Stack (dòng 136-160: Drizzle 0.36, Supabase, Next 16, React 19).
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` — Epic 1 done (6/6), Epic 2 backlog → in-progress (story đầu tiên 2.1 ready-for-dev).
4. `bdsai/apps/api/src/db/schema/index.ts` — schema hiện tại RỖNG (`export {}`), comment chỉ rõ `public_users → Story 2.1`. Drizzle config `schema: './src/db/schema/*'` → thêm `public-users.ts` sẽ được drizzle-kit nhận.
5. `bdsai/apps/api/src/db/database.module.ts` — @Global, postgres.js (`prepare: false` cho Supavisor), DRIZZLE token export. DrizzleDB type cần update khi có bảng.
6. `bdsai/apps/api/src/db/database.tokens.ts` — `DrizzleDB = PostgresJsDatabase<Record<string, never>>` (schema rỗng) → cần update thành `PostgresJsDatabase<typeof schema>` khi export publicUsers.
7. `bdsai/apps/api/src/db/drizzle.config.ts` — dialect postgresql, schema `./src/db/schema/*`, out `./src/db/migrations`, dbCredentials.url (dotenv CLI).
8. `bdsai/apps/api/src/db/migrations/0000_vietnamese_fts.sql` — migration 0000 đã có (Story 1.5, --custom). 0001 sẽ là migration thứ 2 (schema generate, KHÔNG --custom).
9. `bdsai/apps/api/src/supabase/supabase.service.ts` — service-role client (autoRefreshToken:false, persistSession:false), `auth` getter expose `supabase.auth` (admin API: createUser, deleteUser). `storage` getter. AD-5: service-role chỉ backend.
10. `bdsai/apps/api/src/supabase/supabase.module.ts` — @Global, expose SupabaseService.
11. `bdsai/apps/api/src/config/env.validation.ts` — Zod schema: API_PORT, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, DB_POOL_MAX, DB_IDLE_TIMEOUT, REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB. **ĐỦ cho Story 2.1 — KHÔNG cần thêm env.**
12. `bdsai/apps/api/src/app.module.ts` — imports: ConfigModule, LoggerModule, DatabaseModule, SupabaseModule, QueueModule, ScheduleModule, HealthModule. **Cần thêm AuthModule.**
13. `bdsai/apps/api/src/queue/queue.service.ts` — QueueService (BullMQ), `addEchoJob()` pattern, E1 graceful degradation (Redis down → queue disabled), E3 retry 3x. **Cần thêm `addEmailVerificationJob()`.**
14. `bdsai/apps/api/src/queue/queue.tokens.ts` — ECHO_QUEUE, REDIS_CONNECTION, EchoJobData. **Cần thêm EMAIL_QUEUE + EmailJobData.**
15. `bdsai/apps/api/src/common/logger/logger.module.ts` — nestjs-pino, redact paths: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.key`, `*.token`, `*.serviceRoleKey`, `*.SUPABASE_SERVICE_ROLE_KEY`, `*.DATABASE_URL`, `*.REDIS_URL`, `*.SENTRY_DSN`. **Cần thêm `*.email`, `*.phone`, `*.confirmPassword` (AD-8 PII).**
16. `bdsai/apps/api/src/common/filters/all-exceptions.filter.ts` — global filter, ZodError → 400 + details, HttpException → shape chuẩn, non-HttpException → 500 generic. **Sẵn cho Story 2.1 — KHÔNG cần sửa.**
17. `bdsai/apps/web/components/shared/site-header.tsx` — header server component, nút "Đăng nhập" (`/auth/login`), nút "Đăng tin" (`/my-listings/new`), MobileNav. **Cần thêm nút "Đăng ký" (`/auth/register`).**
18. `bdsai/apps/web/app/` — route groups: (public) có layout+page, (dashboard) có layout, (admin) có layout, **(auth) rỗng** (chỉ directory, chưa có layout/page). **Cần tạo (auth)/layout.tsx + (auth)/register/page.tsx.**
19. `bdsai/apps/web/app/api/` — chỉ có `.gitkeep`. **Cần tạo api/auth/register/route.ts (thin proxy — AD-10).**
20. `bdsai/apps/api/package.json` — deps: @supabase/supabase-js 2.108.2, drizzle-orm 0.36.4, zod 3.25.76, bullmq 5.79.1, nestjs-pino 4.6.1. **Tất cả dep cần cho 2.1 đã có — KHÔNG cần thêm.**
21. `bdsai/apps/web/package.json` — Next 16.2.9, React 19.2.7, @supabase/ssr 0.12.0, @supabase/supabase-js 2.108.2, zod (qua shared). **ĐỦ — KHÔNG cần thêm dep.**
22. `bdsai/packages/shared/package.json` — zod 3.25.76. **Có thể thêm register schema shared.**
23. Story 1.6 file + author log — convention AC đánh số + Dev Notes + Edge Case + References [Source:] + Dev Agent Record + output table format.

---

## Quyết định kiến trúc (tự chốt — ghi trong story Dev Notes)

1. **public_users.id = auth.users.id (uuid, FK CASCADE):** Khớp AD-5 (shared user table, role discriminator). Dùng id từ Supabase Auth createUser. FK ON DELETE CASCADE (Supabase Auth deleteUser → public_users tự xóa). Drizzle KHÔNG `.references()` (auth.users ngoài schema) — document + migration handle.
2. **admin.createUser (service-role) thay vì anon signUp:** AD-5 — service-role chỉ backend. anon signUp tạo user nhưng race condition với public_users insert. admin.createUser + insert public_users trong 1 flow NestJS → nhất quán + compensate rollback.
3. **Compensate rollback (AC4c):** public_users insert fail → admin.deleteUser (xóa Supabase Auth user). 2 write KHÔNG cùng PG transaction (Supabase Auth ngoài PG) → compensate là cơ chế thay thế. Log critical + Sentry nếu deleteUser cũng fail (orphan).
4. **Phone KHÔNG unique ở 2.1:** Phone verified mới unique (Story 2.3). Story 2.1 cho phép trùng phone (chưa verified) — tránh friction UX.
5. **Email verification job (BullMQ):** Supabase Auth `createUser({ email_confirm: false })` tự gửi email. Job BullMQ wrapper (no-op log) cho future custom SMTP (Story 6.2). AD-6: async, KHÔNG await.
6. **Next API route thin proxy (AD-10):** `apps/web/app/api/auth/register/route.ts` forward tới NestJS. Zero business logic trong web. Client form validation chỉ UX (Zod duplicate), server validation source of truth.
7. **RLS policy:** Drizzle direct PG (DATABASE_URL) bypass RLS. RLS protect frontend direct Supabase client (anon). Policy: user SELECT own, service-role full, anon KHÔNG INSERT/UPDATE/DELETE (AD-2). Document trong migration.
8. **Zod schema shared:** `packages/shared/src/schemas/register.ts` — api + web import (DRY, AD-1 single source).
9. **PII redact update:** pino redact thêm `*.email`, `*.phone`, `*.confirmPassword`. Sentry beforeSend redact email/phone regex. AD-8 compliance.
10. **Migration 0001:** `yarn db:generate` (KHÔNG --custom — schema change thật). RLS policy thêm thủ công vào cuối file 0001 (sau generate) HOẶC migration 0002 --custom riêng. Ưu tiên: thêm vào 0001 (1 migration cho table + RLS).

---

## AC tóm tắt (8 AC)

| AC | Mô tả | Verify chính |
|----|-------|--------------|
| AC1 | Bảng public_users tạo qua Drizzle migration (schema + RLS) | psql \d public_users + \dp + __drizzle_migrations 2 rows |
| AC2 | Supabase Auth config: enable email + phone provider | config.toml + Dashboard + createUser hoạt động |
| AC3 | Validation: email + phone VN + password ≥ 8 (Zod) | unit test register.dto.spec |
| AC4 | API POST /auth/register: Supabase Auth + public_users + queue job + compensate | curl 201 + psql row + Dashboard user |
| AC5 | Phone normalization: strip + +84→0 + format chuẩn | unit test phone-normalize.spec |
| AC6 | Web page /auth/register (route group (auth), form client) | browser + vitest register-form.spec |
| AC7 | Trùng email → 409, không tạo trùng | e2e register 2 lần → 409 |
| AC8 | Không lộ PII trong log (AD-8) + không phá 1.1-1.6 | unit test redact + build/lint/test pass |

---

## Edge case tóm tắt (10 edge case)

| # | Edge case | Xử lý | Test |
|---|-----------|-------|------|
| E1 | Email trùng | 409 Conflict, KHÔNG tạo public_users | e2e |
| E2 | Phone sai format | 400 Zod reject | unit |
| E3 | Password yếu | 400 Zod reject | unit |
| E4 | Supabase Auth fail (network) | 500 generic, KHÔNG leak | unit mock |
| E5 | public_users insert fail | Compensate deleteUser + 500 | unit mock |
| E6 | Email verify token expire | email_confirmed=false (Supabase handle) | e2e check Dashboard |
| E7 | Phone đã dùng | KHÔNG unique ở 2.1 → OK | e2e |
| E8 | Network timeout | Web "Lỗi mạng" + API timeout config | unit mock |
| E9 | Rate limit Supabase | 429 + user-friendly message | unit mock |
| E10 | SQL injection | Zod reject + Drizzle parameterized | unit |

---

## Risks quan trọng (7 risks)

1. **R1 — Compensate rollback fail (deleteUser fail sau insert fail):** Orphan Supabase Auth user. Mitigation: log critical + Sentry + monitoring cron detect + manual cleanup script.
2. **R2 — Supabase Auth rate limit spam:** Built-in rate limit + API catch 429. Future @nestjs/throttler.
3. **R3 — RLS policy block Drizzle insert:** Drizzle direct PG bypass RLS. Test verify. Document rõ.
4. **R4 — Phone normalization edge case:** Unit test cover VN formats. Reject non-VN.
5. **R5 — Email service không gửi (prod SMTP):** Supabase Auth handle. Configure SMTP Dashboard. Job wrapper fallback.
6. **R6 — Migration 0001 RLS syntax error:** Test local trước. Verify \dp sau migrate.
7. **R7 — PII redact break log usefulness:** Log userId thay vì email. Dev debug dùng Dashboard.

---

## File đã tạo/sửa (3 output)

1. `_bmad-output/implementation-artifacts/2-1-dang-ky-email-phone.md` — story file đầy đủ (8 AC, 6 AD, 10 edge case, dev notes, source tree, risks, references).
2. `_bmad-output/implementation-artifacts/sprint-status.yaml` — `epic-2: in-progress`, `2-1-dang-ky-email-phone: ready-for-dev`, `last_updated: 2026-06-27`.
3. `_bmad-output/harness-workspace/2-1-dang-ky-email-phone/01-author.md` — file này.

---

## Next step

Story 2.1 `ready-for-dev` → story-developer (opus) implement theo story file → code-reviewer (opus) review → e2e-tester (sonnet) real-data test. Trạm tiếp theo: `02-dev.md` trong harness workspace.
