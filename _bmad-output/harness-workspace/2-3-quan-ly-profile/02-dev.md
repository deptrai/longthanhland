# Story 2.3 — Dev Log (Quản lý profile)

**Date:** 2026-06-26
**Story:** 2-3-quan-ly-profile (Epic 2 — Story 3)
**Status:** dev → ready for review

## Files Changed

### API (apps/api)

**NEW files:**
- `src/auth/dto/update-me.dto.ts` — Zod schema whitelist (avatarUrl, bio, displayName) + sanitizeText (encode `<>&`)
- `src/auth/dto/update-me.dto.spec.ts` — unit test validation (E2, E3, E4, E13, E14)
- `src/upload/upload.module.ts` — UploadModule (AD-1 module riêng, ThrottlerModule scoped)
- `src/upload/upload.controller.ts` — POST /upload/avatar (JwtAuthGuard + FileInterceptor 10MB + @HttpCode(200))
- `src/upload/upload.service.ts` — sharp WebP convert 512x512 + Supabase Storage upload
- `src/upload/upload.service.spec.ts` — unit test (E5, E6, E7, E15)
- `src/db/migrations/0002_tiny_butterfly.sql` — ALTER TABLE add 3 cột + INSERT bucket avatars + RLS policies
- `test/upload.e2e-spec.ts` — integration test POST /upload/avatar (AC5, E1, E5, E6, E15)

**UPDATE files:**
- `src/db/schema/public-users.ts` — thêm 3 cột avatarUrl, bio, displayName (nullable)
- `src/auth/auth.service.ts` — thêm updateMe() + assertAvatarUrlHost() + MeResponse mở rộng 3 field
- `src/auth/auth.controller.ts` — thêm PATCH /auth/me (@UseGuards + @Throttle 10/15min)
- `src/auth/auth.service.spec.ts` — unit test updateMe (E2, E8, E11, E13)
- `src/common/logger/logger.module.ts` — redact thêm *.bio, *.displayName, *.avatarUrl, *.avatar_url, *.display_name
- `src/supabase/supabase.service.ts` — **FIX CRITICAL**: tách storageClient riêng (service-role, KHÔNG session)
- `src/app.module.ts` — import UploadModule
- `test/auth.e2e-spec.ts` — thêm PATCH /auth/me tests (AC3, E1, E2, E3, E4, E14, E16 rate limit)
- `package.json` — thêm sharp@0.33.5

### Web (apps/web)

**NEW files:**
- `app/profile/page.tsx` — server wrapper → ProfileForm
- `app/profile/profile-form.tsx` — client component (avatar upload + edit + save + auth protect)
- `app/api/upload/avatar/route.ts` — Next API thin proxy (forward multipart → NestJS)
- `tests/profile-form.test.tsx` — vitest (AC6, E9 redirect, E10 error display)

**UPDATE files:**
- `app/api/auth/me/route.ts` — thêm PATCH method (forward PATCH /auth/me)
- `components/shared/header-auth-actions.tsx` — thêm link "Hồ sơ" (/profile) khi authenticated

## Critical Fix: SupabaseService storageClient tách biệt

**Root cause:** `auth.signInWithPassword()` trên service-role client lưu session in-memory
(`persistSession: false` chỉ tắt localStorage, KHÔNG tắt in-memory session). Storage upload
qua client chính → dùng access token user (authenticated role) → RLS reject
("new row violates row-level security policy").

**Fix:** Tạo `storageClient` riêng (service-role key, KHÔNG session). `get storage()` trả
`storageClient.storage` thay vì `client.storage`. Auth operations (signInWithPassword,
admin.createUser) trên `client` KHÔNG ảnh hưởng storage upload.

**Verify:** curl upload avatar → 200 { avatarUrl } (service-role bypass RLS).

## Commands Run + Output

### Build / Lint / Typecheck
```
yarn build → 3 successful, 3 total (exit 0)
yarn lint  → 4 successful, 4 total (exit 0)
yarn typecheck → 4 successful, 4 total (exit 0)
```

### Unit Tests
```
yarn test (api) → 11 suites, 108 tests passed (exit 0)
npx vitest run (web) → 6 files, 23 tests passed (exit 0)
```

### E2E Tests (Supabase + Redis real)
```
yarn test:e2e → 7 suites, 47 tests passed (exit 0)
  - app.e2e-spec.ts: PASS
  - auth.e2e-spec.ts: PASS (PATCH /auth/me, E1, E2, E3, E4, E14, E16 rate limit)
  - upload.e2e-spec.ts: PASS (AC5, E1, E6, E15, missing file)
  - health.e2e-spec.ts: PASS
  - queue.e2e-spec.ts: PASS
  - sentry.e2e-spec.ts: PASS
  - vietnamese-fts.e2e-spec.ts: PASS
```

### Curl Verify (real API + Supabase)
1. **AC2 GET /auth/me** → 200 { id, email, phone, phoneVerified, role, banned, createdAt, avatarUrl: null, bio: null, displayName: null } ✓
2. **AC3 PATCH /auth/me** → 200 { bio: "Môi giới BĐS Long Thành", displayName: "Test User" } ✓
3. **E2 extra field strip** → 200, email/role KHÔNG đổi, bio đổi ✓
4. **E1 no token** → 401 { message: "Thiếu token xác thực" } ✓
5. **E3 bio > 500** → 400 { message: "Validation failed", details: [...] } ✓
6. **AC5 avatar upload** → 200 { avatarUrl: "http://127.0.0.1:54351/storage/v1/object/public/avatars/{userId}/avatar.webp" } ✓
7. **E6 wrong type** → 400 { message: "File phải là ảnh (JPEG, PNG, WebP, GIF)" } ✓
8. **E14 XSS sanitize** → bio: "&lt;script&gt;alert(1)&lt;/script&gt;" ✓
9. **AC8 PII redact** → grep "Môi giới|alert(1)|Long Thành" in log = 0 matches ✓
10. **AC6 web /profile** → curl http://localhost:3100/profile → 200 HTML ✓

### Migration verify (psql)
```
SELECT id FROM drizzle.__drizzle_migrations → 3 rows (0000 + 0001 + 0002) ✓
SELECT * FROM storage.buckets WHERE id='avatars' → avatars, public=true ✓
\d public_users → avatar_url text, bio text, display_name text (nullable) ✓
```

## Teardown
- `docker stop bdsai-redis && docker rm bdsai-redis` → done
- `supabase stop` → done
- Kill api (port 3101) + web (port 3100) → done
- `lsof -i :3100 -i :3101` → empty (ports free) ✓

## AC Pass Summary

| AC | Status | Verify |
|----|--------|--------|
| AC1 — Migration 0002 | PASS | psql: 3 cột + bucket avatars + RLS |
| AC2 — GET /auth/me 9 field | PASS | curl 200 + avatarUrl/bio/displayName null |
| AC3 — PATCH /auth/me whitelist | PASS | curl 200 + bio/displayName updated |
| AC4 — JwtAuthGuard | PASS | E1 no token → 401 |
| AC5 — Avatar upload WebP | PASS | curl 200 { avatarUrl } + sharp convert |
| AC6 — Web /profile page | PASS | curl 200 HTML + vitest 5 test |
| AC7 — Next API thin proxy | PASS | PATCH + upload route forward |
| AC8 — PII redact | PASS | grep raw bio = 0 in log |
| AC9 — Rate limit | PASS | e2e 11 PATCH → 429 |

## Edge Case Pass Summary

| Edge | Status | Verify |
|------|--------|--------|
| E1 — no token | PASS | 401 |
| E2 — extra field strip | PASS | email/role KHÔNG đổi |
| E3 — bio > 500 | PASS | 400 |
| E4 — displayName > 100 | PASS | unit test |
| E5 — avatar > 10MB | PASS | unit test (FileInterceptor) |
| E6 — wrong type | PASS | 400 |
| E7 — Storage fail | PASS | unit test mock → 500 |
| E8 — banned | PASS | unit test → 403 |
| E9 — web redirect | PASS | vitest |
| E10 — save fail | PASS | vitest |
| E11 — orphan | PASS | unit test → 404 |
| E12 — concurrent | N/A | last-write-wins (documented) |
| E13 — avatarUrl inject | PASS | unit test → 400 |
| E14 — XSS | PASS | curl → encoded |
| E15 — sharp fail | PASS | e2e → 400 |
| E16 — rate limit | PASS | e2e 11th → 429 |
