# bdsai E2E Test Framework

Playwright E2E test framework cho **bdsai.vn** — fullstack monorepo (Next.js 16 + NestJS 11).

## Setup

### Prerequisites

- Node.js 22+ (xem `.nvmrc`)
- bdsai API chạy ở `http://localhost:3101`
- bdsai Web chạy ở `http://localhost:3100`
- Supabase local (port 5435x) + Redis (6379) đang chạy
- 4 test users đã seed: buyer, seller, admin, super-admin (xem `.env.example`)

### Install

```bash
cd bdsai/e2e
npm install
npx playwright install --with-deps chromium
cp .env.example .env  # adjust credentials nếu cần
```

### Test Users

Global setup login 4 roles qua API `/auth/login` và persist tokens vào `.auth/tokens.json`:

| Role | Email | Password | Dùng cho |
|------|-------|----------|----------|
| buyer | `buyer-e2e@bdsai.vn` | `E2eBuyer1234` | buyer/auth, profile |
| seller | `seller-e2e@bdsai.vn` | `E2eSeller1234` | dang-tin, my-listings |
| admin | `admin-e2e@bdsai.vn` | `E2eAdmin1234` | admin/users, admin/listings |
| super-admin | `super-e2e@bdsai.vn` | `E2eSuper1234` | grant/revoke, audit |

**Seed test users** (chạy 1 lần qua API hoặc DB):
```bash
# Via API register + admin grant role
curl -X POST http://localhost:3101/auth/register -H "Content-Type: application/json" \
  -d '{"email":"buyer-e2e@bdsai.vn","password":"E2eBuyer1234","phone":"0900000001","displayName":"E2E Buyer"}'
# Repeat cho seller, admin, super-admin (super-admin cần DB seed trực tiếp)
```

## Running Tests

### Local

```bash
# Tất cả tests
npm test

# Headed mode (nhìn browser)
npm run test:headed

# UI mode (watch + debug)
npm run test:ui

# Debug mode (Playwright Inspector)
npm run test:debug

# Smoke only (@smoke tag)
npm run test:smoke

# Theo phase
npm run test:guest
npm run test:buyer
npm run test:seller
npm run test:admin
npm run test:super-admin

# HTML report
npm run report
```

### CI

```bash
# Full suite + JUnit report
npx playwright test --shard=1/4 --shard=2/4 --shard=3/4 --shard=4/4

# Firefox smoke subset
npx playwright test --project=firefox
```

## Architecture

### Directory Layout

```
e2e/                    # Test specs theo phase (guest/buyer/seller/admin/super-admin)
support/
├── fixtures/           # Playwright fixtures (mergeTests pattern)
│   ├── index.ts        # Merged test object (auth + listing)
│   ├── auth.fixture.ts # authAs(role) → set browser auth
│   └── listing.fixture.ts # createTestListing + auto-cleanup
├── factories/          # Faker-based data factories
│   ├── user.factory.ts # createUser(overrides)
│   └── listing.factory.ts # createListing(overrides)
├── helpers/            # API client, auth, cleanup utilities
│   ├── api-client.ts   # ApiClient class (typed HTTP)
│   ├── auth.ts         # login, getStoredToken, setBrowserAuth
│   └── cleanup.ts      # deleteListing, confirmEmailViaDb
└── page-objects/       # Page Object Model
    ├── home.page.ts
    ├── listings.page.ts
    └── login.page.ts
```

### Patterns

- **Fixtures Composition** (`mergeTests`): Combine auth + listing fixtures vào single test object. Import từ `support/fixtures`.
- **Auth Session**: Global setup login 4 roles via API, persist tokens to `.auth/tokens.json`. Fixtures đọc tokens, inject vào browser localStorage.
- **Data Factories**: `createUser(overrides)`, `createListing(overrides)` — faker-based, parallel-safe (UUID + timestamp), explicit intent qua overrides.
- **API-First**: Setup via API (login, create listing), UI chỉ cho validation — không setup qua UI.
- **Page Objects**: Encapsulate page interactions, data-testid selectors, reusable actions.
- **Auto-Cleanup**: Listing fixture auto-delete sau test (best-effort).

### Best Practices

- **Selectors**: Ưu tiên `getByRole`, `getByLabel`, `data-testid`. Tránh CSS selectors brittle.
- **Isolation**: Mỗi test độc lập — không phụ thuộc test khác. Cleanup sau mỗi test.
- **Waits**: Dùng Playwright auto-waiting (`expect(locator).toBeVisible()`), KHÔNG `page.waitForTimeout()`.
- **Assertions**: Given/When/Then format. Assert trên state, không trên implementation.
- **Tags**: `@smoke` cho critical path, chạy nhanh. Subset Firefox/mobile chỉ chạy smoke.
- **Parallel**: `fullyParallel: true` — mỗi test chạy trong worker riêng. Factories dùng UUID tránh collision.

### CI Integration

- **GitHub Actions**: `npx playwright test --shard=$SHARD/$TOTAL` cho parallel.
- **Artifacts**: trace (retain-on-failure-and-retries), screenshot (only-on-failure), video (retain-on-failure).
- **Reports**: HTML + JUnit XML (`playwright-results.xml`).
- **Cache**: `~/.cache/ms-playwright` cho browser binaries.

## Knowledge Base References

- [Fixtures Composition](https://playwright.dev/docs/test-fixtures) — mergeTests pattern
- [Auth Session](https://playwright.dev/docs/auth) — token persistence, multi-user
- [Data Factories](https://fakerjs.dev/) — faker-based factories
- [Playwright Config](https://playwright.dev/docs/test-configuration) — timeouts, artifacts, projects
- TEA Knowledge Fragments: `.claude/skills/bmad-testarch-framework/resources/knowledge/`
