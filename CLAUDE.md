# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Twenty is an open-source CRM built with modern technologies in a monorepo structure. The codebase is organized as an Nx workspace with multiple packages.

## Key Commands

### Development
```bash
# Start development environment (frontend + backend + worker)
yarn start

# Individual package development
npx nx start twenty-front     # Start frontend dev server
npx nx start twenty-server    # Start backend server
npx nx run twenty-server:worker  # Start background worker
```

### Testing
```bash
# Run tests
npx nx test twenty-front      # Frontend unit tests
npx nx test twenty-server     # Backend unit tests
npx nx run twenty-server:test:integration:with-db-reset  # Integration tests with DB reset

# Storybook
npx nx storybook:build twenty-front         # Build Storybook
npx nx storybook:serve-and-test:static twenty-front     # Run Storybook tests


When testing the UI end to end, click on "Continue with Email" and use the prefilled credentials.
```

### Code Quality
```bash
# Linting
npx nx lint twenty-front      # Frontend linting
npx nx lint twenty-server     # Backend linting
npx nx lint twenty-front --fix  # Auto-fix linting issues

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format code
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build
```bash
# Build packages
npx nx build twenty-front
npx nx build twenty-server
```

### Database Operations
```bash
# Database management
npx nx database:reset twenty-server         # Reset database
npx nx run twenty-server:database:init:prod # Initialize database
npx nx run twenty-server:database:migrate:prod # Run migrations

# Generate migration
npx nx run twenty-server:typeorm migration:generate src/database/typeorm/core/migrations/common/[name] -d src/database/typeorm/core/core.datasource.ts

# Sync metadata
npx nx run twenty-server:command workspace:sync-metadata
```

### GraphQL
```bash
# Generate GraphQL types
npx nx run twenty-front:graphql:generate
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Recoil (state management), Emotion (styling), Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (with GraphQL Yoga)
- **Monorepo**: Nx workspace managed with Yarn 4

### Package Structure
```
packages/
├── twenty-front/          # React frontend application
├── twenty-server/         # NestJS backend API
├── twenty-ui/             # Shared UI components library
├── twenty-shared/         # Common types and utilities
├── twenty-emails/         # Email templates with React Email
├── twenty-website/        # Next.js documentation website
├── twenty-zapier/         # Zapier integration
└── twenty-e2e-testing/    # Playwright E2E tests
```

### Key Development Principles
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Types over interfaces** (except when extending third-party interfaces)
- **String literals over enums** (except for GraphQL enums)
- **No 'any' type allowed**
- **Event handlers preferred over useEffect** for state updates

### State Management
- **Recoil** for global state management
- Component-specific state with React hooks
- GraphQL cache managed by Apollo Client

### Backend Architecture
- **NestJS modules** for feature organization
- **TypeORM** for database ORM with PostgreSQL
- **GraphQL** API with code-first approach
- **Redis** for caching and session management
- **BullMQ** for background job processing

### Database
- **PostgreSQL** as primary database
- **Redis** for caching and sessions
- **TypeORM migrations** for schema management
- **ClickHouse** for analytics (when enabled)

## Development Workflow

IMPORTANT: Use Context7 for code generation, setup or configuration steps, or library/API documentation. Automatically use the Context7 MCP tools to resolve library IDs and get library docs without waiting for explicit requests.

### Before Making Changes
1. Always run linting and type checking after code changes
2. Test changes with relevant test suites
3. Ensure database migrations are properly structured
4. Check that GraphQL schema changes are backward compatible

### Code Style Notes
- Use **Emotion** for styling with styled-components pattern
- Follow **Nx** workspace conventions for imports
- Use **Lingui** for internationalization
- Components should be in their own directories with tests and stories

### Testing Strategy
- **Unit tests** with Jest for both frontend and backend
- **Integration tests** for critical backend workflows
- **Storybook** for component development and testing
- **E2E tests** with Playwright for critical user flows

## Important Files
- `nx.json` - Nx workspace configuration with task definitions
- `tsconfig.base.json` - Base TypeScript configuration
- `package.json` - Root package with workspace definitions
- `.cursor/rules/` - Development guidelines and best practices

---

## 하네스: bdsai.vn Story Cycle

**목표:** Chạy vòng đời từng story Track A của bdsai.vn (create-story → dev → code-review → e2e real-data) bằng đội 4 agent dùng skill BMad với model chỉ định.

**트리거:** Khi user yêu cầu làm/dev/implement story, "làm từng story", "chạy story cycle", "làm story tiếp theo" cho bdsai.vn → dùng skill `bmad-story-cycle-orchestrator`. Câu hỏi planning đơn thuần → trả lời trực tiếp. Track B (Xaction, story 5.x, 4-2b) bị block — không chạy tới khi gỡ gate.

**에이전트:** story-author (opus), story-developer (opus), code-reviewer (opus), e2e-tester (sonnet, real API + browser thật). Định nghĩa tại `.claude/agents/`. Workspace: `_bmad-output/harness-workspace/`.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-24 | Khởi tạo harness story-cycle (4 agent + orchestrator) | 전체 | Yêu cầu Luis: đội BMad làm từng story với model chỉ định + e2e real-data |
| 2026-06-24 | Pin subagent model = opus-4.8 ở project settings (Option A) | .claude/settings.json | Global `CLAUDE_CODE_SUBAGENT_MODEL=sonnet-4.6` override mất ý định opus. Env var "all-or-one" → cả 4 agent opus (e2e gốc muốn sonnet, chấp nhận để không đụng global) |
| 2026-06-24 | Chốt port Supabase local bdsai = **5435x** (API 54351/DB 54352/Studio 54353/Inbucket 54354/Analytics 54359) | infra ràng buộc cứng | 5434x bị project epsilon-local chiếm. Story 1.2+ dùng 5435x nhất quán |
| 2026-06-24 | Story-author phải tự verify ghi đủ 3 output trước khi kết thúc | agents/story-author.md | Bài học pipeline 1.1: agent dừng giữa chừng (1/3 output), leader phải hoàn tất thủ công |
| 2026-06-24 | Story 1.1 DONE qua harness (author→dev→review→e2e, 6/6 real test pass) | bdsai/ monorepo | Pipeline harness chạy thật thành công lần đầu |
| 2026-06-25 | Story 1.2 DONE qua harness (author→dev→review→e2e, 7/7 AC real-data pass) | bdsai/ apps/api + apps/web | Kết nối Supabase (Drizzle + postgres.js + healthcheck). Review APPROVED 0 critical/high (6 low non-blocking). E2e: curl /health/supabase 200 thật, PG15.8 verify, 0 bảng nghiệp vụ, teardown sạch. Resume từ trạm 3 sau gián đoạn session |
| 2026-06-25 | Fix 6 LOW findings Story 1.2 (LOW-1→LOW-6) | bdsai/ apps/api/src | main.ts ConfigService, xoá dead supabase.tokens.ts, bỏ PG_CLIENT export, redact nhánh non-throw, document journal rỗng, DB_IDLE_TIMEOUT positive. Verify build/test/e2e pass |
| 2026-06-26 | Story 1.3 DONE qua harness (author→dev→review→e2e, 7/7 AC) | .github/workflows/ + bdsai/ CI/CD | CI/CD GitHub Actions → Vercel + Dokploy. CI gate + deploy (web Vercel CLI + api Docker→GHCR→Dokploy) + Lighthouse post-deploy gate. Review APPROVED 0 critical/high (3 medium + 5 low). E2e: docker build success, smoke test container HTTP 200 thật (Supabase real), actionlint pass, grep/docker history clean. Fix 3 MEDIUM (M1 /listings gate, M2 GHCR perms, M3 Dockerfile filter api+shared) |
| 2026-06-26 | Story 1.4 DONE qua harness (author→dev→review→e2e, 8/8 AC) | bdsai/apps/web Base UI | Base UI layout/nav/responsive. shadcn/ui manual (Tailwind 4 CSS-first) + 6 components. Header (server) + MobileNav (client island Sheet) + Footer + 3 route group layouts + skeleton demo + Vitest 10 test. Review APPROVED 0 critical/high (2 medium + 3 low). E2e: browser thật (Playwright MCP) 3 viewport 360/768/1440 không vỡ, SSR verify, a11y pass (contrast AA, touch target 44px, aria-label 3 nav). Fix 2 MEDIUM (M1 touch target, M2 aria-label) + E1 (legacyBehavior break dev mode → NavigationMenuLink asChild) |
| 2026-06-26 | Story 1.5 DONE qua harness (author→dev→review→e2e, 8/8 AC) | bdsai/apps/api/src/db/migrations | Vietnamese Full-Text Search. Drizzle migration 0000 (sinh tự động bằng --custom, giải LOW-5): CREATE EXTENSION unaccent + pg_trgm + 2 function IMMUTABLE f_unaccent_to_tsvector/f_unaccent_query (plainto_tsquery simple config). Review APPROVED 0 critical/high/medium (4 low non-blocking). E2e: Supabase real, psql verify extension (pg_trgm 1.6 + unaccent 1.1), FTS match thật (long thanh→Long Thành, can ho→Căn hộ, dat nen→Đất nền), similarity=1, idempotent, 0 bảng nghiệp vụ, 12 e2e test pass |
| 2026-06-26 | Story 1.6 DONE qua harness (author→dev→review→e2e, 9/9 AC) — EPIC 1 HOÀN TẤT | bdsai/apps/api/src/queue + common + health + web/sentry | Hạ tầng nền: Redis 7 Docker + BullMQ (test job echo complete) + Drizzle migration docs (MIGRATIONS.md) + Sentry api/web (DSN optional, beforeSend redact secret) + nestjs-pino structured JSON logger + global exception filter shape { statusCode, message, error?, details? } + monitoring DB>400MB/Storage>800MB cron (NFR5). Review APPROVED 0 critical/high (1 medium M1 QueueModule shutdown order + 4 low). E2e: Redis PONG thật, /health/redis 200, BullMQ job complete returnvalue thật, Sentry redact thật (Authorization/Cookie/SERVICE_ROLE_KEY→[Redacted]), 404 shape đúng, pino JSON log, monitoring DB 11MB, 17 e2e + 25 unit pass. Epic 1 done (6/6 story) |
