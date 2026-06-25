# Story 2.2 — Author Log (story-author)

**Story:** 2-2-dang-nhap-dang-xuat-jwt
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-28
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`, Epic 2 vẫn `in-progress`
**Vai trò:** Story THỨ 2 Epic 2 (User Authentication & Profiles). Xây trên Story 2.1 (register DONE — AuthModule + public_users + Supabase Auth đã sẵn).

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/2-2-dang-nhap-dang-xuat-jwt.md` | ✅ Đã ghi (9 AC + Invariant AD table 6 AD + 12 Edge Case + Dev Notes + Source tree NEW/UPDATE + References [Source:] + Dev Agent Record) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `2-2-dang-nhap-dang-xuat-jwt: ready-for-dev` (dòng 60), `epic-2: in-progress` (dòng 58, giữ nguyên), `last_updated: 2026-06-28` (dòng 38) |
| 3 | Author log | `_bmad-output/harness-workspace/2-2-dang-nhap-dang-xuat-jwt/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `_bmad-output/planning-artifacts/epics.md` (dòng 262-275) — Epic 2, Story 2.2 AC gốc Given/When/Then + FR2 (dòng 19: "User đăng nhập, quản lý profile") + quy ước test (dòng 144) + JWT expire edge case pattern (dòng 358). Đọc thêm Epic 2 goal (dòng 244: AD-5, chống privilege escalation) + Story 2.3-2.5 context.
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-2 (dòng 45 — exception auth flows `auth.*`), AD-5 (dòng 63 — Supabase Auth JWT + NestJS guard, role discriminator), AD-8 (dòng 81 — PII handling), AD-10 (dòng 93 — Next API thin proxy, zero business logic), Auth token convention (dòng 132 — "Supabase JWT in Authorization: Bearer header, verified server-side"), Stack (dòng 136-160), M2 User Management (dòng 312: AD-5, AD-8).
3. `bdsai/apps/api/src/auth/auth.module.ts` — AuthModule hiện tại (Story 2.1, exports AuthService, controllers [AuthController], providers [AuthService]).
4. `bdsai/apps/api/src/auth/auth.controller.ts` — controller hiện tại (POST /auth/register, Zod validation pattern, throw ZodError → filter 400).
5. `bdsai/apps/api/src/auth/auth.service.ts` — service hiện tại (register logic, safeErr redact pattern, isDuplicateEmail/isRateLimited helpers, compensate rollback — reuse pattern cho login).
6. `bdsai/apps/api/src/auth/dto/register.dto.ts` — Zod schema pattern (preprocess normalize + shared import @bdsai/shared).
7. `bdsai/apps/api/src/supabase/supabase.service.ts` — service-role client (autoRefreshToken:false, persistSession:false), `auth` getter expose `supabase.auth` (signInWithPassword, signOut, refreshSession, admin.signOut). AD-5: service-role chỉ backend.
8. `bdsai/apps/api/src/supabase/supabase.module.ts` — @Global, expose SupabaseService.
9. `bdsai/apps/api/src/config/env.validation.ts` — env schema: API_PORT, DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, DB_POOL_MAX, DB_IDLE_TIMEOUT, REDIS_URL, SENTRY_DSN, DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB. **Cần thêm SUPABASE_JWT_SECRET (AC6).**
10. `bdsai/apps/api/src/app.module.ts` — imports: ConfigModule, LoggerModule, DatabaseModule, SupabaseModule, QueueModule, ScheduleModule, HealthModule, AuthModule (đã có từ 2.1). **KHÔNG cần thêm module import — AuthModule đã có.**
11. `bdsai/apps/api/src/main.ts` — bootstrap (Sentry init, pino logger, enableShutdownHooks, ConfigService port). **Cần thêm cookie-parser() + CORS credentials:true.**
12. `bdsai/apps/api/src/queue/queue.service.ts` — QueueService pattern (E1 graceful degradation, E3 retry — tham khảo cho throttler pattern).
13. `bdsai/apps/api/src/common/logger/logger.module.ts` — pino redact paths: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.confirmPassword`, `*.key`, `*.token`, `*.serviceRoleKey`, `*.email`, `*.phone` (đã có từ Story 2.1). **ĐỦ cho 2.2 — KHÔNG cần thêm (token đã redact).**
14. `bdsai/apps/api/src/common/filters/all-exceptions.filter.ts` — global filter, ZodError → 400, HttpException → shape chuẩn, non-HttpException → 500. UnauthorizedException → 401 shape. **Sẵn — KHÔNG cần sửa.**
15. `bdsai/apps/api/src/common/sentry/sentry.util.ts` — Sentry redact (Authorization header strip, email/phone PII redact, JWT pattern redact). **Sẵn — KHÔNG cần sửa.**
16. `bdsai/apps/api/src/db/schema/public-users.ts` — public_users table (id, email, phone, phoneVerified, role, banned, createdAt, updatedAt). Read cho banned check (AC1b) + getMe (AC7).
17. `bdsai/apps/api/src/db/database.tokens.ts` — DrizzleDB type (đã include publicUsers từ 2.1). **Sẵn.**
18. `bdsai/apps/api/src/health/health.service.ts` — HealthService pattern (checkAuth via admin.listUsers — tham khảo).
19. `bdsai/apps/api/package.json` — deps: @supabase/supabase-js 2.108.2, drizzle-orm 0.36.4, zod 3.25.76, bullmq 5.79.1, nestjs-pino 4.6.1, @nestjs/schedule 6.1.3. **Cần thêm: jsonwebtoken 9.0.2, @nestjs/throttler 6.4.2, cookie-parser 1.4.7 + types.**
20. `bdsai/apps/api/test/auth.e2e-spec.ts` — e2e test pattern (env guard isSupabaseReachable, supabaseAvailable, describe.skip, uniqueSuffix, pre-cleanup, afterAll cleanup). **UPDATE — thêm login/logout/refresh/me/rate-limit tests.**
21. `bdsai/apps/web/app/(auth)/layout.tsx` — auth layout (centered card, max-w-md). **Dùng chung cho login + register — KHÔNG cần sửa.**
22. `bdsai/apps/web/app/(auth)/register/page.tsx` — server wrapper pattern → RegisterForm (client). **Tham khảo cho /login page.**
23. `bdsai/apps/web/app/(auth)/register/register-form.tsx` — client form pattern (useState, useRouter, Zod validation, fetch /api/auth/register, error display, success redirect). **Tham khảo cho LoginForm.**
24. `bdsai/apps/web/app/api/auth/register/route.ts` — Next API thin proxy pattern (forward NestJS, AD-10, 503 fallback). **Tham khảo cho login/logout/refresh routes (thêm pass-through Set-Cookie).**
25. `bdsai/apps/web/components/shared/site-header.tsx` — header (nút Đăng nhập /login, Đăng ký /register, Đăng tin). **Cần update: hiện email + "Đăng xuất" khi authenticated (dùng useAuth).**
26. `bdsai/apps/web/app/layout.tsx` — root layout (html/body, Geist font, skip nav). **Cần wrap AuthProvider (client boundary).**
27. `bdsai/apps/web/package.json` — deps: Next 16.2.9, React 19.2.7, @supabase/ssr 0.12.0, @supabase/supabase-js 2.108.2. **KHÔNG cần thêm dep (fetch native, React context built-in).**
28. `bdsai/packages/shared/src/schemas/register.ts` — Zod shared schema pattern (registerSchema, registerFormSchema, VN_PHONE_REGEX). **Tham khảo cho login.ts (optional shared).**
29. `bdsai/supabase/config.toml` — `[auth]` jwt_expiry=3600 (1h access token), enable_refresh_token_rotation=true, refresh_token_reuse_interval=10, `[auth.rate_limit]` sign_in_sign_ups=30/5min, `[auth.email]` enable_confirmations=true (E3 — unconfirmed email block login). **KHÔNG cần đổi config.**
30. `bdsai/apps/api/.env.example` — env mẫu (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, etc.). **Cần thêm SUPABASE_JWT_SECRET.**
31. Story 2.1 file + author log — convention AC đánh số + Dev Notes + Edge Case + References [Source:] + Dev Agent Record + output table format.
32. `.claude/skills/bmad-create-story/template.md` — BMad story template (AC, Tasks, Dev Notes, References, Dev Agent Record). Project đã evolve format riêng (giàu hơn template gốc) — theo format Story 2.1.

---

## Quyết định kiến trúc (tự chốt — ghi trong story Dev Notes)

1. **JWT verify local (jsonwebtoken) thay vì supabase.auth.getUser(token):** AC6 — local verify nhanh (~0.1ms vs ~10-20ms network call). Cần SUPABASE_JWT_SECRET env (new). Trade-off: secret phải sync với Supabase. Ưu tiên performance (NFR2 < 200ms P95).
2. **refresh_token httpOnly cookie + access_token in memory:** AC4 — httpOnly cookie bảo vệ refresh token khỏi XSS. access_token in memory (React state) — ngắn hạn (1h), KHÔNG cookie. Refresh page → restore qua /auth/refresh. Pattern chuẩn SPA auth (OWASP).
3. **SameSite=Lax + Path=/api/auth:** CSRF protection — Lax block cross-site POST. Path restrict cookie chỉ /api/auth/*. Dev local (HTTP): Secure omitted.
4. **Generic error anti-enumeration (AC3):** Sai password + email không tồn tại → cùng message "Email hoặc mật khẩu không đúng". Supabase signInWithPassword đã trả cùng error → API forward generic. Email chưa verify → 403 message khác (OK — user biết email mình).
5. **@nestjs/throttler cho rate limit (E9):** 5 login / 15 phút / IP. Simple, NestJS-native. In-memory (OK single instance prod Dokploy). Future multi-instance: Redis store.
6. **Logout global (scope: 'global'):** Revoke tất cả session (multi-tab/device). User expect logout = logout everywhere.
7. **AuthContext client component (KHÔNG localStorage):** access_token trong React state (memory). KHÔNG localStorage (XSS). httpOnly cookie server-managed. AuthProvider wrap app, restore session on mount.
8. **Next API thin proxy pass-through Set-Cookie (AD-10):** Login route forward NestJS response + Set-Cookie header. Zero business logic. Logout/refresh tương tự.
9. **JwtAuthGuard verify-only (KHÔNG query role):** Guard chỉ verify JWT + extract sub (user id). Role query trong service khi cần. Tránh DB call mỗi request.
10. **Zod login schema shared (optional):** packages/shared/src/schemas/login.ts — api + web import (DRY). Hoặc duplicate (schema đơn giản). Ưu tiên shared cho consistency.
11. **CORS credentials:true (web 3100 → API 3101):** Cross-origin + cookie. app.enableCors({ credentials:true, origin: web_url }). Test browser thật.
12. **cookie-parser middleware:** Parse httpOnly cookie cho /auth/refresh. app.use(cookieParser()) trong main.ts.

---

## AC tóm tắt (9 AC)

| AC | Mô tả | Verify chính |
|----|-------|--------------|
| AC1 | POST /auth/login — Supabase signInWithPassword + banned check + tokens | curl 200 + JWT + Set-Cookie |
| AC2 | POST /auth/logout — signOut global + clear cookie + idempotent | curl 200 + Set-Cookie clear |
| AC3 | Generic error anti-enumeration (sai password = email không tồn tại) | e2e so sánh 2 response identical |
| AC4 | refresh_token httpOnly cookie + access_token in memory | curl -v Set-Cookie HttpOnly + document.cookie empty |
| AC5 | POST /auth/refresh — refreshSession + rotate cookie | curl -b cookie → 200 new token |
| AC6 | JwtAuthGuard — verify Supabase JWT local (jsonwebtoken + secret) | unit test guard + curl /auth/me |
| AC7 | GET /auth/me — profile từ public_users (cần guard) | e2e login → GET /auth/me → 200 profile |
| AC8 | Web /login + auth context + JWT refresh interceptor + header update | browser + vitest |
| AC9 | Không lộ PII/secret (AD-8) + không phá 1.1-2.1 | unit redact + build/lint/test pass |

---

## Edge case tóm tắt (12 edge case)

| # | Edge case | Xử lý | Test |
|---|-----------|-------|------|
| E1 | Sai mật khẩu (email tồn tại) | 401 generic "Email hoặc mật khẩu không đúng" | e2e |
| E2 | Email không tồn tại | 401 identical message (anti-enumeration) | e2e so sánh |
| E3 | Email chưa verify | 403 "Vui lòng xác thực email trước khi đăng nhập" | e2e register→login ngay |
| E4 | JWT hết hạn (1h) | Guard 401 → client auto refresh → retry | unit + e2e |
| E5 | Refresh token hết hạn/revoked | 401 + clear cookie → redirect /login | e2e |
| E6 | Logout khi chưa đăng nhập | 200 idempotent (KHÔNG lỗi) | e2e |
| E7 | User bị banned | 403 "Tài khoản đã bị khóa" (sau Supabase Auth OK) | unit mock |
| E8 | Concurrent login (multi-tab) | Multi-session OK, logout global revoke tất cả | e2e 2 login |
| E9 | Rate limit brute force (5/15p/IP) | 429 "Quá nhiều lần thử" (@nestjs/throttler) | e2e 6 lần |
| E10 | JWT malformed/signature invalid | 401 "Token hết hạn hoặc không hợp lệ" | unit |
| E11 | Network timeout | Web "Lỗi mạng" + API timeout | unit mock |
| E12 | CSRF (SameSite=Lax) | Browser-enforced, POST cross-site blocked | document |

---

## Risks quan trọng (9 risks)

1. **R1 — SUPABASE_JWT_SECRET sai (local vs prod mismatch):** Local demo secret cố định (document .env.example). Prod từ Dashboard. Verify: jwt.verify(anonKey, secret) thành công.
2. **R2 — CORS + cookie cross-origin (web 3100 → API 3101):** enableCors credentials:true + SameSite=Lax. Test browser thật.
3. **R3 — Refresh token rotation race (concurrent refresh):** Supabase reuse_interval=10s cho phép reuse. Test 2 refresh gần nhau.
4. **R4 — access_token in memory mất khi refresh page:** AuthProvider mount → /auth/refresh restore. UX flash loading.
5. **R5 — Throttler in-memory KHÔNG sync multi-instance:** Prod single container OK. Future: Redis store.
6. **R6 — JWT secret rotate → existing JWT invalid:** User bị logout (401 → refresh fail → login). Mitigation: grace period HOẶC announce.
7. **R7 — Email chưa verify block login (E3) — UX friction:** Message rõ. Future: resend email (Story 2.3/6.2).
8. **R8 — cookie-parser + CORS credentials complexity:** Dev local cross-origin + cookie. Test kỹ e2e browser. Fallback: access_token header cho refresh.
9. **R9 — jsonwebtoken dep mới (supply chain):** 9.0.2 widely used. yarn audit pass. Alternative: jose (transitive).

---

## File đã tạo/sửa (3 output)

1. `_bmad-output/implementation-artifacts/2-2-dang-nhap-dang-xuat-jwt.md` — story file đầy đủ (9 AC, 6 AD, 12 edge case, dev notes, source tree, risks, references).
2. `_bmad-output/implementation-artifacts/sprint-status.yaml` — `2-2-dang-nhap-dang-xuat-jwt: ready-for-dev` (dòng 60), `last_updated: 2026-06-28` (dòng 38). Epic 2 giữ `in-progress`.
3. `_bmad-output/harness-workspace/2-2-dang-nhap-dang-xuat-jwt/01-author.md` — file này.

---

## Next step

Story 2.2 `ready-for-dev` → story-developer (opus) implement theo story file → code-reviewer (opus) review → e2e-tester (sonnet) real-data test. Trạm tiếp theo: `02-dev.md` trong harness workspace.
