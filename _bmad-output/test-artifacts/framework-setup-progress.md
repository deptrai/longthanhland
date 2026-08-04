---
stepsCompleted: ['step-01-preflight', 'step-02-select-framework', 'step-03-scaffold-framework', 'step-04-docs-and-scripts', 'step-05-validate-and-summary']
lastStep: 'step-05-validate-and-summary'
lastSaved: '2026-06-26'
---

# Test Framework Setup — Progress

## Step 1: Preflight Checks

### Stack Detection

- **Config `test_stack_type`:** `auto` → auto-detect
- **Detected stack:** `fullstack`
  - **Frontend:** `bdsai/apps/web` — Next.js 16.2.9, React 19.2.7, Vitest 4.1.9 (unit), Tailwind 4, shadcn/ui, Sentry
  - **Backend:** `bdsai/apps/api` — NestJS 11.1.27, Jest 30.4.2, supertest 7.2.2, Drizzle ORM, PostgreSQL (Supabase local 5435x), Redis 7, BullMQ, nestjs-pino
- **Monorepo:** `bdsai/` với `apps/web` + `apps/api` (yarn workspace)

### Prerequisites Validation

| Check | Status |
|-------|--------|
| `package.json` exists (root + bdsai) | ✅ |
| No existing E2E framework in bdsai | ✅ |
| Backend manifest exists (NestJS) | ✅ |
| Architecture context available | ✅ (CLAUDE.md, story-cycle harness) |
| Existing legacy `packages/twenty-e2e-testing/playwright.config.ts` | ⚠️ Twenty CRM legacy — không liên quan bdsai, bỏ qua |

### Project Context

**Frontend (bdsai/apps/web):**
- Framework: Next.js 16 (App Router, Turbopack dev)
- React 19, Tailwind 4 CSS-first, shadcn/ui manual
- Unit tests: Vitest 4 + @testing-library/react — 7 test files (36 tests pass)
- Auth: AuthProvider (accessToken in memory, refresh on mount), useAuthFetch
- Pages: home, listings, detail, login, register, profile, dashboard (dang-tin, my-listings), admin (users, listings)

**Backend (bdsai/apps/api):**
- Framework: NestJS 11 (Express)
- DB: PostgreSQL via Supabase local (port 54352), Drizzle ORM
- Cache/Queue: Redis 7 (port 6379), BullMQ
- Auth: Supabase + JWT hybrid (HS256 local fast → ES256 fallback), AdminGuard, SuperAdminGuard
- Unit tests: Jest 30 + supertest — 18+ spec files (159 pass, 41 fail pre-existing AiService dep)
- Throttle: DevThrottle x10 in non-prod
- Logging: nestjs-pino structured JSON
- Error: global exception filter { statusCode, message, error?, details? }

**Existing test coverage:**
- Unit: Vitest (web) + Jest (api) — đã có
- Integration: supertest (api) — partial
- E2E: **CHƯA CÓ** — cần scaffold (Playwright hoặc Cypress)

**Auth requirements cho E2E:**
- Login: POST /auth/login (email+password) → accessToken + refresh cookie
- Roles: user, admin, super-admin (AdminGuard query DB, không trust JWT)
- Test fixtures cần: buyer (user), seller (user), admin, super-admin

**APIs cần test E2E:**
- Public: GET /marketplace/search, GET /marketplace/listings/:id/detail, POST /inquiries
- Auth: POST /auth/login, POST /auth/register, GET /auth/me, POST /auth/refresh
- Seller: POST /marketplace/listings, GET /marketplace/listings, POST /marketplace/listings/:id/submit
- Admin: GET /admin/users, GET /marketplace/admin/pending, POST /marketplace/listings/:id/approve
- Super-admin: POST /admin/users/:id/role (grant/revoke)

### Findings Summary

- **Project type:** Fullstack monorepo (Next.js + NestJS)
- **Bundler/Build:** Turbopack (web dev), Next.js build (web), tsx (api dev)
- **Framework đã install:** Chưa có E2E framework cho bdsai
- **Context docs:** CLAUDE.md (story-cycle harness, port config 5435x), _bmad/tea/config.yaml
- **Risk threshold:** p1 (từ config)
- **Browser automation:** auto (config), Playwright MCP available
- **CI platform:** auto (GitHub Actions đã có cho bdsai)

## Step 2: Framework Selection

### Decision

- **E2E browser framework:** Playwright
- **Backend integration:** Jest + supertest (giữ nguyên existing)

### Rationale — Playwright

| Tiêu chí | Đánh giá |
|----------|----------|
| Repo complexity | Large monorepo (Next.js + NestJS + Drizzle + Supabase + Redis) |
| Multi-browser | Cần test Chromium + Firefox + WebKit |
| API + UI integration | APIRequestContext cho API calls + Page cho UI — cùng 1 framework |
| CI parallelism | Built-in sharding cho GitHub Actions |
| Config hint | `tea_use_playwright_utils: true` |
| Team familiarity | Legacy `packages/twenty-e2e-testing/` dùng Playwright |
| Playwright MCP | Đã dùng cho browser test session trước (Phase A-F) |
| Risk threshold p1 | Playwright robust hơn cho critical paths |

### Rationale — Jest + supertest (backend)

- Đã có 18+ spec files, 159 tests pass
- NestJS testing module + supertest là standard pattern
- Không cần thay đổi — chỉ thêm E2E integration layer dùng Playwright cho API endpoints thật

## Step 3: Scaffold Framework

### Execution Mode
- Config: `tea_execution_mode: auto`, `tea_capability_probe: true`
- Resolved: `sequential` (files interdependent — config → fixtures → tests)

### Directory Structure (bdsai/e2e/)
```
bdsai/e2e/
├── playwright.config.ts          # Timeouts 15s/30s/60s, trace+screenshot+video, 3 projects (chromium/firefox/mobile)
├── package.json                  # @bdsai/e2e, scripts per phase
├── tsconfig.json                 # Strict TS, paths @support/*
├── .env.example                  # BASE_URL, API_URL, test credentials 4 roles
├── .nvmrc                        # Node 22
├── .gitignore                    # test-results, .auth, node_modules
├── global-setup.ts               # Login 4 roles via API, persist tokens to .auth/tokens.json
├── e2e/
│   ├── guest/
│   │   ├── home.spec.ts          # @smoke — hero + nav
│   │   ├── listings.spec.ts      # @smoke — browse + FTS + sort
│   │   └── detail.spec.ts        # @smoke — SSR + JSON-LD + inquiry
│   ├── buyer/
│   │   └── auth.spec.ts          # @smoke — login + anti-enumeration
│   ├── seller/
│   │   └── dang-tin.spec.ts      # @smoke — 4-step form → PENDING
│   ├── admin/
│   │   ├── users.spec.ts         # @smoke — table + super-admin badge disabled
│   │   └── moderation.spec.ts    # @smoke — queue + approve
│   └── super-admin/
│       └── grant-revoke.spec.ts  # @smoke — guard fix + grant/revoke + audit
├── support/
│   ├── fixtures/
│   │   ├── index.ts              # mergeTests (auth + listing)
│   │   ├── auth.fixture.ts       # authAs(role) → set browser auth
│   │   └── listing.fixture.ts    # createTestListing + auto-cleanup
│   ├── factories/
│   │   ├── user.factory.ts       # createUser/buyer/seller/admin/superAdmin
│   │   └── listing.factory.ts    # createListing/draft/pending/published
│   ├── helpers/
│   │   ├── api-client.ts         # ApiClient class (GET/POST/PATCH/DELETE)
│   │   ├── auth.ts               # login, getStoredToken, setBrowserAuth, createAuthContext
│   │   └── cleanup.ts            # deleteListing, confirmEmailViaDb
│   └── page-objects/
│       ├── home.page.ts          # HomePage (hero, nav)
│       ├── listings.page.ts      # ListingsPage (search, filter, sort)
│       └── login.page.ts         # LoginPage (email, password, submit)
```

### Framework Config Highlights
- **Playwright projects:** chromium (primary), firefox (smoke subset), mobile-safari (responsive)
- **Timeouts:** action 15s, navigation 30s, test 60s
- **Artifacts:** trace retain-on-failure-and-retries, screenshot only-on-failure, video retain-on-failure
- **Reporters:** HTML + JUnit + list
- **Parallelism:** fullyParallel, workers=4 CI, retries=2 CI
- **Global setup:** login 4 roles via API, persist tokens

### Knowledge Fragments Applied
- `fixtures-composition.md` → mergeTests pattern (index.ts)
- `auth-session.md` → token persistence (.auth/tokens.json), multi-user
- `data-factories.md` → faker-based factories with overrides, API-first seeding
- `playwright-config.md` → timeout standards, artifact outputs, env fallback

### Test Files (8 sample specs)
1. `guest/home.spec.ts` — hero + nav smoke
2. `guest/listings.spec.ts` — browse + FTS + sort
3. `guest/detail.spec.ts` — SSR + JSON-LD + inquiry
4. `buyer/auth.spec.ts` — login + anti-enumeration
5. `seller/dang-tin.spec.ts` — 4-step form → PENDING
6. `admin/users.spec.ts` — table + super-admin badge disabled
7. `admin/moderation.spec.ts` — queue + approve
8. `super-admin/grant-revoke.spec.ts` — guard fix + grant/revoke + audit

## Step 4: Documentation & Scripts

### README.md (bdsai/e2e/README.md)
- Setup instructions (prerequisites, install, seed test users)
- Running tests (local/headed/debug/UI/smoke/per-phase/CI)
- Architecture overview (directory layout, patterns)
- Best practices (selectors, isolation, waits, assertions, tags, parallel)
- CI integration (sharding, artifacts, reports, cache)
- Knowledge base references

### Build & Test Scripts (package.json)
- `test`: `playwright test`
- `test:ui`: `playwright test --ui`
- `test:headed`: `playwright test --headed`
- `test:debug`: `playwright test --debug`
- `test:smoke`: `playwright test --grep @smoke`
- `test:guest/buyer/seller/admin/super-admin`: phase-specific
- `report`: `playwright show-report`
- `codegen`: `playwright codegen http://localhost:3100`

## Step 5: Validate & Summarize

### Validation Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Stack type detected (fullstack) | ✅ |
| 2 | Framework selected + justified (Playwright + Jest/supertest) | ✅ |
| 3 | Directory structure created (e2e/ + support/) | ✅ |
| 4 | playwright.config.ts (timeouts, baseURL, artifacts, reporters, parallel) | ✅ |
| 5 | .env.example (TEST_ENV, BASE_URL, API_URL, 4 roles) | ✅ |
| 6 | .nvmrc (Node 22) | ✅ |
| 7 | Fixtures (index.ts mergeTests, auth.fixture, listing.fixture) | ✅ |
| 8 | Factories (user.factory, listing.factory — faker-based) | ✅ |
| 9 | Helpers (api-client, auth, cleanup) | ✅ |
| 10 | Page objects (home, listings, login) | ✅ |
| 11 | Sample tests (8 specs — guest/buyer/seller/admin/super-admin) | ✅ |
| 12 | README.md (setup, running, architecture, best practices, CI) | ✅ |
| 13 | package.json scripts (test/test:ui/test:headed/test:debug/smoke/per-phase) | ✅ |
| 14 | tsconfig.json (strict, paths) | ✅ |
| 15 | .gitignore (test-results, .auth, node_modules) | ✅ |
| 16 | global-setup.ts (login 4 roles, persist tokens) | ✅ |
| 17 | No hardcoded credentials (all via env vars) | ✅ |
| 18 | Given/When/Then format in tests | ✅ |
| 19 | data-testid / getByRole selector strategy | ✅ |
| 20 | Auto-cleanup in listing fixture | ✅ |

### Gaps Fixed
- seller/dang-tin.spec.ts: fixed broken fixture usage (was `test.use(authAs)` → corrected to `authAs` destructured from fixture)
- Removed unused imports (ApiClient, getStoredToken) from moderation + grant-revoke specs

### TS Compilation
- `npx tsc --noEmit` reports `Cannot find module '@playwright/test'` — expected, deps not installed yet. Run `npm install` to resolve.

### Completion Summary

**Framework selected:** Playwright (browser E2E) + Jest/supertest (backend, existing)

**Artifacts created (26 files):**
- Config: playwright.config.ts, package.json, tsconfig.json, .env.example, .nvmrc, .gitignore
- Setup: global-setup.ts, README.md
- Fixtures: index.ts, auth.fixture.ts, listing.fixture.ts
- Factories: user.factory.ts, listing.factory.ts
- Helpers: api-client.ts, auth.ts, cleanup.ts
- Page objects: home.page.ts, listings.page.ts, login.page.ts
- Tests: 8 spec files (guest/home, guest/listings, guest/detail, buyer/auth, seller/dang-tin, admin/users, admin/moderation, super-admin/grant-revoke)

**Knowledge fragments applied:**
- fixtures-composition.md → mergeTests pattern
- auth-session.md → token persistence, multi-user
- data-factories.md → faker-based factories with overrides
- playwright-config.md → timeout standards, artifact outputs

**Next steps:**
1. `cd bdsai/e2e && npm install` — install Playwright + faker + typescript
2. `npx playwright install --with-deps chromium` — install browser binaries
3. Seed 4 test users (buyer/seller/admin/super-admin) via API or DB
4. `cp .env.example .env` — adjust credentials
5. `npm run test:smoke` — run smoke tests
6. `npm run test:guest` — run guest phase
7. Integrate into GitHub Actions CI (sharding)
