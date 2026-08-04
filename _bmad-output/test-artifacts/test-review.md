---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores']
lastStep: 'step-03f-aggregate-scores'
lastSaved: '2026-08-19'
reviewScope: 'suite'
detectedStack: 'fullstack'
testFramework: 'playwright + jest + vitest'
inputDocuments:
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/test-quality.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/data-factories.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/selector-resilience.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/test-healing-patterns.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/auth-session.md'
  - '.claude/skills/bmad-testarch-test-review/resources/knowledge/intercept-network-call.md'
  - 'bdsai/e2e/playwright.config.ts'
  - 'bdsai/apps/api/jest.config.cjs'
  - 'bdsai/apps/web/vitest.config.ts'
---

# Test Quality Review — bdsai.vn

**Ngày review:** 2026-08-19
**Reviewer:** Murat (Master Test Architect)
**Scope:** Suite (toàn bộ test trong repo)
**Stack:** Fullstack (Next.js + NestJS + Playwright E2E + Jest + Vitest)

---

## 1. Tổng quan Test Suite

| Layer | Framework | Files | Lines | Tests |
|-------|-----------|-------|-------|-------|
| E2E (Playwright) | Playwright | 8 specs + 11 support | 286 + 491 | 17 smoke |
| API Unit (Jest) | Jest | 18 specs | 2,687 | ~80 |
| Web Unit (Vitest) | Vitest + RTL | 7 tests | 1,013 | ~30 |
| **Total** | — | **33 files** | **~4,477** | **~127** |

### Test Files Inventory

**E2E (Playwright) — 8 spec files:**
- `bdsai/e2e/e2e/guest/home.spec.ts` (27 lines) — Home page smoke
- `bdsai/e2e/e2e/guest/listings.spec.ts` (30 lines) — Browse + FTS + sort
- `bdsai/e2e/e2e/guest/detail.spec.ts` (41 lines) — Detail SSR + JSON-LD + inquiry
- `bdsai/e2e/e2e/buyer/auth.spec.ts` (25 lines) — Login + anti-enumeration
- `bdsai/e2e/e2e/seller/dang-tin.spec.ts` (41 lines) — 4-step listing creation
- `bdsai/e2e/e2e/admin/users.spec.ts` (29 lines) — Users table + super-admin badge
- `bdsai/e2e/e2e/admin/moderation.spec.ts` (25 lines) — Moderation queue + approve
- `bdsai/e2e/e2e/super-admin/grant-revoke.spec.ts` (68 lines) — Grant/revoke role

**Support files — 11 files (491 lines):**
- Factories: `user.factory.ts`, `listing.factory.ts`
- Fixtures: `auth.fixture.ts`, `listing.fixture.ts`, `index.ts`
- Page objects: `login.page.ts`, `home.page.ts`, `listings.page.ts`
- Helpers: `auth.ts`, `api-client.ts`, `cleanup.ts`
- Global setup: `global-setup.ts`

**API Unit (Jest) — 18 spec files (2,687 lines):**
- `auth.service.spec.ts` (523 lines) — register, login, refresh, getMe
- `admin.service.spec.ts` (373 lines) — listUsers, ban/unban, grant/revoke
- `marketplace.service.spec.ts` (320 lines) — CRUD listings
- `moderation.service.spec.ts` (132 lines) — approve/reject
- + 14 DTO/guard/filter/config specs

**Web Unit (Vitest) — 7 test files (1,013 lines):**
- `users-table.test.tsx` (489 lines) — UsersTable component
- `profile-form.test.tsx` (213 lines) — Profile form
- `login-form.test.tsx` (129 lines) — Login form
- `auth-context.test.tsx` (95 lines) — AuthProvider + useAuth
- + 3 small component tests

---

## 2. Quality Dimension Scores

| Dimension | Score | Grade | HIGH | MEDIUM | LOW | Status |
|-----------|-------|-------|------|--------|-----|--------|
| **Determinism** | 72 | C | 3 | 7 | 4 | ⚠️ Cần cải thiện |
| **Isolation** | 60 | D | 4 | 4 | 1 | 🔴 Nghiêm trọng |
| **Maintainability** | 60 | D | 4 | 12 | 7 | 🔴 Nghiêm trọng |
| **Performance** | 78 | C | 3 | 2 | 1 | ⚠️ Cần cải thiện |
| **OVERALL** | **67.5** | **D** | **14** | **25** | **13** | 🔴 |

**Scoring methodology:**
- Weighted average: (72 + 60 + 60 + 78) / 4 = 67.5
- Grade: D (60-69)
- Severity weights: HIGH=10, MEDIUM=5, LOW=2

---

## 3. Critical Findings (HIGH Severity — 14 violations)

### 3.1 Isolation — Shared User Roles Race Condition 🔴 CRITICAL

**Vấn đề nghiêm trọng nhất:** `grant-revoke.spec.ts` modify role của `buyer-e2e@bdsai.vn` và `admin-e2e@bdsai.vn` — cùng user được dùng bởi `admin/users.spec.ts`, `admin/moderation.spec.ts`, `buyer/auth.spec.ts` chạy song song (`fullyParallel: true`).

**Files affected:**
- `bdsai/e2e/e2e/super-admin/grant-revoke.spec.ts:8,34,55`
- `bdsai/e2e/global-setup.ts:27`
- `bdsai/e2e/playwright.config.ts:13`

**Root cause:**
1. `global-setup.ts` reset roles 1 lần trước tất cả tests
2. `grant-revoke.spec.ts` grant buyer→admin, revoke admin→user
3. `test.afterAll` cleanup chỉ chạy sau khi tất cả tests trong file xong
4. Trong khi đó, `admin/users.spec.ts` login as admin-e2e → role đã bị revoke → redirect home → test fail

**Fix đề xuất (priority P0):**
```typescript
// Option A: test.describe.configure({ mode: 'serial' }) cho grant-revoke
test.describe.configure({ mode: 'serial' });

// Option B: Dedicated users cho grant-revoke (best practice)
const GRANT_REVOKE_TARGET = 'grant-target-e2e@bdsai.vn'; // user riêng, không dùng cho test khác

// Option C: afterEach reset thay vì afterAll
test.afterEach(() => {
  resetUserRoles();
});
```

### 3.2 Determinism — Unmocked `new Date()` in marketplace.service.spec.ts

**Files affected:**
- `bdsai/apps/api/src/marketplace/marketplace.service.spec.ts:63,120,121`

```typescript
// ❌ BAD — uses current system time
createdAt: new Date(),
updatedAt: new Date(),

// ✅ FIX — use fixed date
createdAt: new Date('2026-01-01T00:00:00.000Z'),
updatedAt: new Date('2026-01-01T00:00:00.000Z'),
```

### 3.3 Maintainability — 4 Test Files Exceed 300 Lines

| File | Lines | Excess |
|------|-------|--------|
| `auth.service.spec.ts` | 523 | +223 |
| `users-table.test.tsx` | 489 | +189 |
| `admin.service.spec.ts` | 373 | +73 |
| `marketplace.service.spec.ts` | 320 | +20 |

**Fix đề xuất:** Split by feature/method:
- `auth.service.spec.ts` → `auth.register.spec.ts`, `auth.login.spec.ts`, `auth.refresh.spec.ts`, `auth.me.spec.ts`
- `users-table.test.tsx` → `users-table.render.test.tsx`, `users-table.ban.test.tsx`, `users-table.role.test.tsx`, `users-table.search.test.tsx`

### 3.4 Performance — Sequential Operations in global-setup.ts

**Files affected:**
- `bdsai/e2e/global-setup.ts:30,69` — 4 DB UPDATEs + 4 logins sequential
- `bdsai/e2e/playwright.config.ts:17` — timeout 120s (exceeds 90s recommended)

**Fix đề xuất:**
```typescript
// Parallelize logins
const tokens = await Promise.all(
  USERS.map(user => loginAndGetToken(user.email, user.password))
);

// Batch DB updates into single SQL
execSync(`PGPASSWORD=postgres psql ... -c "
  UPDATE public.public_users SET role = 'user' WHERE email = 'buyer-e2e@bdsai.vn';
  UPDATE public.public_users SET role = 'user' WHERE email = 'seller-e2e@bdsai.vn';
  UPDATE public.public_users SET role = 'admin' WHERE email = 'admin-e2e@bdsai.vn';
  UPDATE public.public_users SET role = 'super-admin' WHERE email = 'super-e2e@bdsai.vn';
"`);
```

---

## 4. Medium Findings (25 violations)

### 4.1 Hard Waits (Determinism)
- `bdsai/e2e/e2e/guest/listings.spec.ts:19` — `page.waitForTimeout(2000)` → replace with `expect(locator).toBeVisible()`
- `bdsai/apps/web/tests/auth-context.test.tsx:57,77` — `setTimeout(100)` → replace with `vi.waitFor()`

### 4.2 Conditional Test Flow (Determinism)
- `bdsai/e2e/e2e/admin/moderation.spec.ts:20` — `if (await approveBtn.count() > 0)`
- `bdsai/e2e/e2e/super-admin/grant-revoke.spec.ts:38,59` — `if (await grantBtn.count() > 0)`

Tests should be deterministic — ensure test data setup guarantees button presence, or skip gracefully.

### 4.3 Brittle Selectors (Maintainability)
- `bdsai/e2e/e2e/seller/dang-tin.spec.ts:21,28,32` — `button.bg-blue-600` CSS class selector
- `bdsai/e2e/e2e/guest/detail.spec.ts:30,33` — `input[placeholder="Nguyễn Văn A"]`
- `bdsai/e2e/e2e/guest/listings.spec.ts:15,16` — `input[placeholder="Từ khóa..."]`
- `bdsai/e2e/support/page-objects/listings.page.ts:16-20` — 5 placeholder-based selectors

**Fix đề xuất:** Add `data-testid` attributes to app components and use them in tests.

### 4.4 Shared Test Users Race (Isolation)
- `bdsai/e2e/e2e/admin/moderation.spec.ts:6` — uses admin-e2e (modified by grant-revoke)
- `bdsai/e2e/e2e/admin/users.spec.ts:6` — uses admin-e2e (modified by grant-revoke)
- `bdsai/e2e/e2e/buyer/auth.spec.ts:9` — uses buyer-e2e (modified by grant-revoke)

### 4.5 Redundant API Calls (Performance)
- `bdsai/e2e/support/fixtures/auth.fixture.ts:38` — 2 API calls per test (login + /auth/me)
- Cache /auth/me response per role or reuse global-setup tokens

---

## 5. Low Findings (13 violations)

- Flaky `.first()` selectors: `detail.spec.ts:7,23`, `dang-tin.spec.ts:18,19`, `home.page.ts:14`
- No `data-testid` in selectors: `moderation.spec.ts:9`, `users.spec.ts:10`, `dang-tin.spec.ts:11`, `grant-revoke.spec.ts:24`
- Placeholder cleanup function: `cleanup.ts:17` — `confirmEmailViaDb` is a stub
- Missing comments on complex mocks: `marketplace.service.spec.ts:8`

---

## 6. Điểm mạnh (Positive Aspects)

1. **Factory pattern đúng chuẩn** — `user.factory.ts`, `listing.factory.ts` với overrides + faker, tạo unique data cho parallel safety
2. **Page Object pattern** — `LoginPage`, `HomePage`, `ListingsPage` tách selector logic khỏi test logic
3. **Auth fixture với route interception** — giải pháp sáng tạo cho refresh token rotation + path restriction
4. **Anti-enumeration test** — `buyer/auth.spec.ts` verify generic error message cho wrong password
5. **SSR + JSON-LD test** — `detail.spec.ts` verify meta tags + structured data
6. **Unit test mocking tốt** — Jest specs mock Supabase + Drizzle chainable, test cả happy path + edge cases (E1-E9)
7. **Test tags** — `@smoke` tags cho selective execution
8. **Artifact config** — trace retain-on-failure, screenshot only-on-failure, video retain-on-failure
9. **Cross-browser projects** — chromium (primary), firefox (smoke), mobile-safari (a11y)
10. **Global setup** — pre-fetch tokens, reset roles before each run

---

## 7. Priority Action Plan

### P0 — Critical (fix trước, gây flakiness ngay lập tức)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Shared user roles race condition | `grant-revoke.spec.ts` | `test.describe.configure({ mode: 'serial' })` + dedicated users |
| 2 | `afterAll` cleanup quá muộn | `grant-revoke.spec.ts:8` | Move to `afterEach` |
| 3 | `fullyParallel: true` unsafe | `playwright.config.ts:13` | Add `test.describe.configure({ mode: 'serial' })` cho grant-revoke |

### P1 — High (fix trong sprint này)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 4 | Unmocked `new Date()` | `marketplace.service.spec.ts:63,120,121` | Use fixed date |
| 5 | `waitForTimeout(2000)` | `listings.spec.ts:19` | Replace with `expect().toBeVisible()` |
| 6 | Test files >300 lines | 4 files | Split by feature |
| 7 | Timeout 120s | `playwright.config.ts:17` | Reduce to 90s |

### P2 — Medium (fix trong sprint tới)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 8 | CSS class selectors | `dang-tin.spec.ts:21,28,32` | Add `data-testid` |
| 9 | Placeholder selectors | `detail.spec.ts`, `listings.spec.ts`, `listings.page.ts` | Add `data-testid` |
| 10 | Conditional test flow | `moderation.spec.ts:20`, `grant-revoke.spec.ts:38,59` | Ensure test data guarantees preconditions |
| 11 | Sequential global-setup | `global-setup.ts:30,69` | Parallelize with `Promise.all()` |
| 12 | Redundant API calls in fixture | `auth.fixture.ts:38` | Cache /auth/me per role |

### P3 — Low (backlog)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 13 | `.first()` selectors | 5 locations | Add `data-testid` |
| 14 | No `data-testid` in app | Multiple | Add test IDs to key UI elements |
| 15 | Placeholder cleanup | `cleanup.ts:17` | Implement or remove |
| 16 | `setTimeout` in vitest | `auth-context.test.tsx:57,77` | Use `vi.waitFor()` |

---

## 8. Recommendations Summary

1. **Isolation:** Tạo dedicated test users cho grant-revoke tests (không share với admin/buyer tests). Hoặc dùng `test.describe.configure({ mode: 'serial' })` + `afterEach` cleanup.
2. **Determinism:** Replace tất cả `new Date()` trong mock data với fixed dates. Replace `waitForTimeout` với conditional waits. Remove conditional `if (count() > 0)` — ensure test data setup deterministic.
3. **Maintainability:** Split 4 test files >300 lines. Add `data-testid` attributes throughout app. Replace CSS class + placeholder selectors.
4. **Performance:** Parallelize global-setup. Cache /auth/me responses. Reduce timeout to 90s. Batch DB cleanup into single SQL.

---

## 9. Grade Justification

**Overall Grade: D (67.5/100)**

Suite test có nền tảng tốt (factories, page objects, auth fixture sáng tạo, unit test mocking kỹ lưỡng) nhưng có **14 HIGH violations** nghiêm trọng:
- **Isolation race condition** là vấn đề lớn nhất — grant-revoke modify shared users trong parallel mode
- **4 test files vượt 300 lines** vi phạm maintainability standard
- **Unmocked Date** + **hard waits** gây non-determinism

Suite hiện tại **pass 17/17 smoke tests** nhưng **chưa ổn định cho CI** do race condition. Cần fix P0 trước khi enable CI retries.

---

*Review completed by Murat — Master Test Architect*
*Next step: Fix P0 issues → re-run smoke suite → verify stability across 3 consecutive runs*
