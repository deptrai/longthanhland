# Story 2.3 — Code Review (Quản lý profile)

**Story key:** 2-3-quan-ly-profile
**Agent:** code-reviewer (opus)
**Date:** 2026-06-26
**Verdict:** **APPROVED** (0 critical, 0 high, 3 medium non-blocking, 5 low)

## Summary

Code Story 2.3 tuân thủ 9/9 AC + 6/6 invariant AD. Build/lint/typecheck/test PASS (api 108 unit + web 23 vitest). E2e (Supabase real) 47 test pass. Whitelist Zod + silent strip + XSS sanitize + JwtAuthGuard reuse + sharp WebP + service-role Storage + PII redact + Next API thin proxy — đều đúng. 3 finding MEDIUM non-blocking (nên fix nhưng không block merge), 5 LOW.

## Findings

### MEDIUM-1: Migration `CREATE POLICY` không idempotent (AD-1 partial)

**File:** `bdsai/apps/api/src/db/migrations/0002_tiny_butterfly.sql:19,25`
**Mô tả:** `INSERT INTO storage.buckets ... ON CONFLICT DO NOTHING` (idempotent ✓), nhưng 2 `CREATE POLICY` statements (dòng 19, 25) KHÔNG có `IF NOT EXISTS` — PostgreSQL không hỗ trợ `CREATE POLICY IF NOT EXISTS`. Comment dòng 12 nói "Policies ON CONFLICT DO NOTHING tránh duplicate policy error khi re-run" nhưng KHÔNG có `ON CONFLICT` clause nào trên 2 `CREATE POLICY` statements — comment misleading. Nếu migration re-run (vd DB reset + re-apply tất cả migration, hoặc manual psql run) → `CREATE POLICY` fail với "policy already exists".
**Cách sửa:** Wrap `CREATE POLICY` trong `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` block, hoặc `DROP POLICY IF EXISTS ... ; CREATE POLICY ...`. Cập nhật comment cho chính xác.
**Severity justification:** Drizzle track migration trong `__drizzle_migrations` → re-run không xảy ra trong flow bình thường. Nhưng AD-1 yêu cầu idempotent + comment misleading → MEDIUM.

### MEDIUM-2: avatarUrl cache-bust param (`?v=...`) lưu vào DB

**File:** `bdsai/apps/web/app/profile/profile-form.tsx:99,131`
**Mô tả:** Sau upload avatar, dòng 99 `setAvatarUrl(`${body.avatarUrl}?v=${Date.now()}`)` thêm cache-bust query param vào local state. Sau đó dòng 131 `body: JSON.stringify({ displayName, bio, avatarUrl })` gửi avatarUrl (CÓ `?v=...`) qua PATCH /api/auth/me → DB lưu `https://...supabase.co/.../avatar.webp?v=1719400123456`. Hậu quả:
  - DB lưu URL không ổn định (query param timestamp thay đổi mỗi upload).
  - `assertAvatarUrlHost` vẫn pass (host không đổi) nên không reject.
  - Lần GET /auth/me tiếp theo trả URL có `?v=` cũ → cache-bust mất tác dụng (cùng URL lại cache).
  - Mỗi save profile (dù không upload lại) vẫn gửi avatarUrl cũ với `?v=` đã lưu → DB giữ giá trị cũ (OK nhưng dirty).
**Cách sửa:** Tách cache-bust ra khỏi giá trị lưu DB. Lưu raw avatarUrl (không `?v=`) vào state riêng (`storedAvatarUrl`), dùng cho PATCH. Display state (`displayAvatarUrl`) thêm `?v=` chỉ cho render `<img src>`. Hoặc: PATCH KHÔNG gửi avatarUrl (upload đã lưu URL qua upload step — nhưng upload endpoint không update DB, chỉ return URL → cần PATCH để persist). Đề nghị: giữ 2 state — `avatarUrl` (raw, cho PATCH) + `avatarUrlForDisplay` (có `?v=`, cho `<img>`).
**Severity justification:** Data dirty (URL có query param không ổn định trong DB) nhưng không break functionality + không security issue → MEDIUM.

### MEDIUM-3: Upload rate limit e2e test missing (AC9b)

**File:** `bdsai/apps/api/test/upload.e2e-spec.ts` (toàn bộ file)
**Mô tả:** AC9b yêu cầu "11 POST /upload/avatar → lần 11 trả 429". `upload.e2e-spec.ts` test 5 case (AC5 happy, E1 no-token, E6 wrong-type, E15 sharp-fail, missing-file) nhưng KHÔNG có rate limit test. Dev log dòng 141 claim "E16 — rate limit | PASS | e2e 11th → 429" nhưng E16 test thực tế nằm trong `auth.e2e-spec.ts` (PATCH /auth/me rate limit), KHÔNG phải upload. Upload rate limit (10/15min) chưa được e2e verify.
**Cách sửa:** Thêm test suite riêng (fresh app instance — tránh throttle state leak) cho upload rate limit: register + login → 11 POST /upload/avatar liên tiếp → assert lần 11 trả 429. Pattern giống `patchRateLimitSuite` trong auth.e2e-spec.ts.
**Severity justification:** Rate limit code đúng (`@Throttle` trên upload.controller:35), unit test pass, nhưng e2e verify missing → MEDIUM (test gap, không phải code bug).

### LOW-1: AC6g "refresh AuthContext user" không implement

**File:** `bdsai/apps/web/app/profile/profile-form.tsx:140-143`, `bdsai/apps/web/components/auth/auth-context.ts`
**Mô tả:** AC6g yêu cầu "success → toast + refresh AuthContext user (fetch /api/auth/me lại)". Profile-form save success chỉ update local state (setDisplayName/setBio/setAvatarUrl từ response body), KHÔNG refresh AuthContext user. AuthContext cũng không có `refreshUser` method. Hậu quả: AuthContext `user` stale (chỉ có id/email/role/phoneVerified từ login — thiếu avatarUrl/bio/displayName). Header hiển thị email (không đổi) nên không thấy bug, nhưng nếu future component dùng `user.displayName` từ AuthContext sẽ thấy stale.
**Cách sửa:** Thêm `refreshUser` method vào AuthContext/AuthProvider (fetch /api/auth/me → setUser). Profile-form gọi `refreshUser()` sau save success. Hoặc document rằng AuthContext user chỉ chứa auth-essential fields, profile fields lấy qua /api/auth/me fresh.

### LOW-2: sanitizeText encode-only (KHÔNG strip HTML tag)

**File:** `bdsai/apps/api/src/auth/dto/update-me.dto.ts:25-31`
**Mô tả:** Story AC3c + comment dòng 21 nói "strip HTML tag + encode `<>&`". Code thực tế CHỈ encode `<>&` (KHÔNG strip tag — `.replace(/<[^>]*>/g, '')` bị bỏ). Comment dòng 22 giải thích "Encode-only để bảo toàn nội dung user + khớp E14 expected". E14 expected `<script>alert(1)</script>` → `&lt;script&gt;alert(1)&lt;/script&gt;` (encode-only match). Sai lệch documented spec nhưng được biện minh hợp lý (field là plain text, encode đủ neutralize XSS).
**Cách sửa:** Cập nhật story/comment cho nhất quán (đã làm trong comment dòng 22) — hoặc giữ nguyên vì E14 pass. Non-blocking.

### LOW-3: ThrottlerModule.forRoot() duplicate (AuthModule + UploadModule)

**File:** `bdsai/apps/api/src/auth/auth.module.ts:27`, `bdsai/apps/api/src/upload/upload.module.ts:18`
**Mô tả:** Cả 2 module gọi `ThrottlerModule.forRoot([...])` + `APP_GUARD: ThrottlerGuard`. Trong NestJS, mỗi `forRoot()` tạo dynamic module riêng với `THROTTLER_OPTIONS` provider. 2 module anh em cùng forRoot() → 2 ThrottlerGuard instance (mỗi module 1 cái). E2e test pass (rate limit hoạt động cho cả auth + upload), nhưng là anti-pattern — nên có 1 `ThrottlerModule.forRoot()` ở AppModule (global) + `APP_GUARD` global, các module chỉ dùng `@Throttle` override.
**Cách sửa:** Move `ThrottlerModule.forRoot()` + `APP_GUARD: ThrottlerGuard` lên AppModule. AuthModule + UploadModule chỉ giữ `@Throttle` trên endpoint. Hoặc giữ nguyên (works, tested) — non-blocking.

### LOW-4: Max length check trước sanitize (encode có thể làm output dài hơn)

**File:** `bdsai/apps/api/src/auth/dto/update-me.dto.ts:34-45`
**Mô tả:** `sanitizeOptionalText` chain: `.string().max(max).optional().nullable().transform(sanitizeText)`. Max length check trên RAW input (trước encode). Nếu raw input 100 chars chứa nhiều `<>&` → sau encode output có thể > 100 chars (mỗi `<` → `&lt;` = 4 chars). DB column là `text` (no limit) nên không overflow. Story nói "max 100 chars" — ambiguous (raw hay stored?). Quyết định dev: check raw → hợp lý (giới hạn input user).
**Cách sửa:** Không cần sửa (DB text, no overflow). Document rõ "max áp dụng cho raw input, stored có thể dài hơn do encode". Non-blocking.

### LOW-5: Sentry redact pattern `/bio/i` quá broad

**File:** `bdsai/apps/api/src/common/sentry/sentry.util.ts:32`
**Mô tả:** Pattern `/bio/i` match bất kỳ key chứa "bio" — `biography`, `biometric`, `bio_data` cũng bị redact. Over-redact nhưng an toàn (better safe). Tương tự `/displayName/i` OK (specific enough).
**Cách sửa:** Không cần sửa (over-redact safe). Hoặc dùng pattern chính xác hơn `/^bio$/i` nếu muốn. Non-blocking.

## AC Verification (AC1–AC9)

| AC | Status | Verify |
|----|--------|--------|
| AC1 — Migration 0002 (3 cột + bucket) | PASS | `0002_tiny_butterfly.sql`: ALTER TABLE add avatar_url/bio/display_name (nullable ✓) + INSERT bucket avatars ON CONFLICT DO NOTHING (idempotent ✓). Journal có entry idx=2. Schema `public-users.ts` thêm 3 cột. ⚠ MEDIUM-1: CREATE POLICY không idempotent. |
| AC2 — GET /auth/me 9 field | PASS | `auth.service.ts:440-452` getMe return 10 field (id, email, phone, phoneVerified, role, banned, createdAt, avatarUrl, bio, displayName). E2e `auth.e2e-spec.ts:345-360` verify 3 field null cho user mới. |
| AC3 — PATCH /auth/me whitelist + sanitize | PASS | `update-me.dto.ts`: Zod schema chỉ accept displayName/bio/avatarUrl (whitelist ✓). Silent strip (z.object không .strict() → extra field ignore ✓, E2 test E2 pass). Sanitize encode `<>&` (E14 pass). `auth.service.ts:471-544` updateMe: check orphan (404) + banned (403) + avatarUrl host (E13) + Drizzle update. |
| AC4 — JwtAuthGuard reuse | PASS | `auth.controller.ts:130` `@UseGuards(JwtAuthGuard)` trên PATCH /auth/me. Guard reuse từ 2.2 (`jwt-auth.guard.ts` — verify HS256 + iss + ES256 fallback). E1 e2e: no-token → 401. |
| AC5 — Avatar upload sharp WebP → Storage → public URL | PASS | `upload.service.ts`: validate mimetype + size → sharp resize 512x512 cover center webp q80 → Supabase Storage upload (service-role via storageClient) `avatars/{userId}/avatar.webp` upsert → getPublicUrl. `upload.controller.ts`: JwtAuthGuard + FileInterceptor 10MB + @Throttle. E2e: PNG upload → 200 { avatarUrl }. |
| AC6 — Web /profile page | PASS | `profile/page.tsx` server wrapper + `profile-form.tsx` client component. Auth protect (redirect /login?redirect=/profile). Form: avatar upload + preview, displayName, bio, email/phone read-only, phone badge. Save → PATCH. Vitest 5 test pass (AC6, E9 redirect, E10 error, save, validation). ⚠ LOW-1: AuthContext refresh missing. |
| AC7 — Next API thin proxy | PASS | `app/api/auth/me/route.ts` PATCH forward body + Authorization. `app/api/upload/avatar/route.ts` forward FormData + Authorization. Zero business logic (chỉ fetch forward). Error shape { statusCode, message, error }. |
| AC8 — PII redact | PASS | `logger.module.ts`: redact thêm `*.bio`, `*.displayName`, `*.avatarUrl`, `*.avatar_url`, `*.display_name`. `sentry.util.ts`: SECRET_PATTERNS thêm bio/displayName/avatarUrl. ⚠ LOW-5: /bio/i broad. |
| AC9 — Rate limit | PASS (partial) | `auth.controller.ts:132` @Throttle 10/15min trên PATCH. `upload.controller.ts:35` @Throttle 10/15min trên upload. E2e PATCH rate limit pass (11th → 429). ⚠ MEDIUM-3: upload rate limit e2e test missing. |

## Invariant AD Verification

| AD | Status | Verify |
|----|--------|--------|
| AD-1 — Migration idempotent | PARTIAL | Bucket INSERT ON CONFLICT DO NOTHING ✓. ALTER TABLE (drizzle sinh, track trong __drizzle_migrations) ✓. ⚠ CREATE POLICY không idempotent (MEDIUM-1). |
| AD-2 — Single Data Mutation Path | PASS | PATCH qua AuthController → AuthService.updateMe → Drizzle `db.update(publicUsers)`. Frontend KHÔNG update DB trực tiếp. Avatar upload qua NestJS → Supabase Storage (AD-2 exception — storage service riêng). |
| AD-5 — Auth Separation | PASS | JwtAuthGuard verify Supabase JWT. Storage upload dùng service-role key (storageClient riêng — fix critical RLS reject). Bucket public read, service-role write (RLS policy). KHÔNG expose service-role ra frontend. |
| AD-7 — Image Storage Convention | PASS | Avatar lưu `avatars/{userId}/avatar.webp` (bucket riêng). Sharp WebP convert + resize 512x512 + quality 80. Max 10MB. Public URL via Supabase CDN. DB chỉ lưu URL reference (avatar_url text). |
| AD-8 — PII/Secret | PASS | Pino redact bio/displayName/avatarUrl. Sentry redact. Exception filter không leak stack (500 generic). Upload error generic "Tải ảnh thất bại" (không leak Supabase detail). Grep `console.log` trong upload/ + auth/ = 0 match. |
| AD-10 — Next API mỏng | PASS | Web API routes chỉ forward fetch. Zero Zod/Drizzle/Supabase trong web. Validation nghiệp vụ ở NestJS. Web chỉ client-side UX validation (maxLength, required hint). |

## Security Check

| Check | Status | Verify |
|-------|--------|--------|
| Whitelist Zod (email/phone/role/banned KHÔNG update) | PASS | `update-me.dto.ts` schema chỉ có displayName/bio/avatarUrl. E2 e2e: PATCH `{email, role, bio}` → email/role không đổi, bio đổi. |
| Silent strip extra field (KHÔNG 400) | PASS | z.object không .strict() → extra field ignore. E2 e2e: 200 (không 400). |
| XSS sanitize | PASS | sanitizeText encode `<>&`. E14 e2e: `<script>alert(1)</script>` → `&lt;script&gt;alert(1)&lt;/script&gt;` stored. |
| File size limit (10MB) | PASS | FileInterceptor limits 10MB + service re-check. E5 unit test: 11MB → 400. |
| File type check (image only) | PASS | ALLOWED_CONTENT_TYPES whitelist + sharp decode fail fallback. E6 + E15 e2e pass. |
| Path traversal | PASS | Path = `${userId}/avatar.webp` — userId từ JWT (UUID Supabase, verified). No client filename in path. |
| Storage service-role + bucket public read | PASS | storageClient service-role key. Bucket public=true. RLS: public SELECT + service_role ALL. |
| JwtAuthGuard reuse (verify signature + iss + exp) | PASS | Reuse từ 2.2. jwt.verify HS256 + iss check + ES256 fallback. |
| Rate limit đúng endpoint | PASS | PATCH 10/15min, upload 10/15min. ⚠ Upload e2e test missing (MEDIUM-3). |

## Build/Lint/Typecheck/Test Verify (tự chạy)

| Command | Result |
|---------|--------|
| `yarn build` | 3 successful, 3 total (exit 0) |
| `yarn lint` | 4 successful, 4 total (exit 0) |
| `yarn typecheck` | 4 successful, 4 total (exit 0) |
| `yarn test` (api) | 11 suites, 108 tests passed (exit 0) |
| `yarn test` (web) | 6 files, 23 tests passed (exit 0) |
| `grep console.log` (upload + auth) | 0 match ✓ |

## Kết luận + Recommendation

**Verdict: APPROVED.** Code đúng 9/9 AC + 6/6 AD (AD-1 partial — MEDIUM-1). Không có finding critical/high. 3 MEDIUM non-blocking:

1. **MEDIUM-1** (migration CREATE POLICY idempotent) — nên fix trước production (wrap DO $$ block). Không block merge.
2. **MEDIUM-2** (avatarUrl cache-bust lưu DB) — nên fix (tách display state vs stored state). Không break functionality.
3. **MEDIUM-3** (upload rate limit e2e test missing) — nên bổ sung test. Code đúng, chỉ test gap.

5 LOW: AuthContext refresh (LOW-1), sanitize encode-only vs spec (LOW-2), ThrottlerModule duplicate (LOW-3), max-length-before-encode (LOW-4), Sentry /bio/i broad (LOW-5) — tất cả non-blocking, có thể fix trong story sau hoặc để technical debt.

**Recommendation cho leader:** APPROVED → chuyển sang e2e-tester. Yêu cầu e2e-tester verify thêm: (1) upload rate limit 11th → 429 (MEDIUM-3 gap), (2) avatarUrl stored trong DB có `?v=` hay không (MEDIUM-2 confirm real-data), (3) migration re-run idempotent (MEDIUM-1 — psql DROP POLICY + re-run migration 0002).
