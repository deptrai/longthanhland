# Story 1.2: Development Environment Setup

Status: drafted

## Story

As a **Developer**,
I want to configure PostgreSQL and Redis infrastructure,
so that the application can run locally.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-1.2.1 | `.env` configured | Run `docker compose up -d` | PostgreSQL 16.4 + Redis 7.4.1 running | `docker ps` shows containers |
| AC-1.2.2 | Infrastructure running | Run migrations | Database schema created | No migration errors |
| AC-1.2.3 | All services running | Access `localhost:3000` | API responds | `curl localhost:3000/health` = 200 |
| AC-1.2.4 | All services running | Access `localhost:3001` | Frontend loads | Browser shows Twenty UI |

---

## Infrastructure Tasks

### INFRA-1: Configure Environment File (AC: 1)

**File**: `packages/twenty-server/.env`

```bash
# Copy example file
cp packages/twenty-server/.env.example packages/twenty-server/.env

# Edit .env file with these values:
```

```env
# Database Configuration
PG_DATABASE_URL=postgres://postgres:postgres@localhost:5432/default

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Server Configuration
SERVER_URL=http://localhost:3000
FRONT_BASE_URL=http://localhost:3001

# Authentication
ACCESS_TOKEN_SECRET=your-secret-key-change-in-production
LOGIN_TOKEN_SECRET=your-login-secret-change-in-production
REFRESH_TOKEN_SECRET=your-refresh-secret-change-in-production
FILE_TOKEN_SECRET=your-file-secret-change-in-production

# Optional: Email (for development, use console)
EMAIL_DRIVER=console

# Optional: Storage (local for development)
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=.local-storage
```

**Subtasks**:
- [ ] Copy `.env.example` to `.env`
- [ ] Set `PG_DATABASE_URL`
- [ ] Set `REDIS_URL`
- [ ] Set `SERVER_URL` and `FRONT_BASE_URL`
- [ ] Generate random secrets for tokens
- [ ] Configure email driver as console
- [ ] Configure local storage

### INFRA-2: Start Docker Infrastructure (AC: 1)

```bash
# Start PostgreSQL and Redis containers
docker compose -f docker-compose.dev.yml up -d

# Verify containers are running
docker ps

# Expected output:
# CONTAINER ID   IMAGE           STATUS          PORTS
# xxxx           postgres:16.4   Up 10 seconds   0.0.0.0:5432->5432/tcp
# xxxx           redis:7.4.1     Up 10 seconds   0.0.0.0:6379->6379/tcp

# Check PostgreSQL connection
docker exec -it $(docker ps -qf "ancestor=postgres") psql -U postgres -c "SELECT version();"
# Expected: PostgreSQL 16.4

# Check Redis connection
docker exec -it $(docker ps -qf "ancestor=redis") redis-cli ping
# Expected: PONG
```

**Subtasks**:
- [ ] Run `docker compose -f docker-compose.dev.yml up -d`
- [ ] Verify containers with `docker ps`
- [ ] Test PostgreSQL connection
- [ ] Test Redis connection

---

## Database Tasks

### DB-1: Run Database Migrations (AC: 2)

```bash
# Run Twenty's database migrations
npx nx database:migrate twenty-server

# This creates all Twenty core tables:
# - workspace, user, person, company, opportunity, etc.
# - metadata tables for custom objects
# - field metadata, relation metadata, etc.

# Verify migration success
npx nx database:check twenty-server
# Expected: No pending migrations
```

**Subtasks**:
- [ ] Run `npx nx database:migrate twenty-server`
- [ ] Verify no errors in output
- [ ] Run `npx nx database:check twenty-server`
- [ ] Verify all migrations applied

### DB-2: Seed Initial Data (Optional)

```bash
# Seed demo data for development
npx nx database:seed twenty-server

# This creates:
# - Demo workspace
# - Demo user (admin@twenty.com / password)
# - Sample contacts, companies, opportunities
```

**Subtasks**:
- [ ] Run seed command (optional)
- [ ] Note demo credentials

---

## Server Tasks

### SERVER-1: Start Backend Server (AC: 3)

```bash
# Start Twenty server in development mode
npx nx start twenty-server

# Or with watch mode for auto-reload
npx nx start twenty-server --watch

# Expected output:
# [Nest] LOG [NestApplication] Nest application successfully started
# Server is running on http://localhost:3000

# Test health endpoint
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Test GraphQL endpoint
curl http://localhost:3000/graphql
# Expected: GraphQL Playground or schema response
```

**Subtasks**:
- [ ] Run `npx nx start twenty-server`
- [ ] Wait for "successfully started" message
- [ ] Test health endpoint: `curl localhost:3000/health`
- [ ] Verify GraphQL endpoint accessible

### SERVER-2: Start Frontend Server (AC: 4)

```bash
# In a new terminal, start Twenty frontend
npx nx start twenty-front

# Expected output:
# Compiled successfully!
# You can now view twenty-front in the browser.
# Local: http://localhost:3001

# Open browser to http://localhost:3001
# Expected: Twenty login page
```

**Subtasks**:
- [ ] Open new terminal
- [ ] Run `npx nx start twenty-front`
- [ ] Wait for compilation success
- [ ] Open browser to `http://localhost:3001`
- [ ] Verify login page displays

---

## Verification Tasks

### VERIFY-1: Complete System Check

```bash
# 1. Check all Docker containers
docker ps
# Should show postgres and redis running

# 2. Check backend health
curl -s http://localhost:3000/health | jq
# Expected: {"status":"ok"}

# 3. Check GraphQL introspection
curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}' | jq '.data.__schema.types | length'
# Expected: Number > 100 (many types defined)

# 4. Check frontend
curl -s http://localhost:3001 | head -20
# Expected: HTML with React app
```

**Subtasks**:
- [ ] Verify all containers running
- [ ] Verify backend health endpoint
- [ ] Verify GraphQL schema accessible
- [ ] Verify frontend serving HTML

### VERIFY-2: Login Test

```bash
# If seeded, login with demo credentials:
# Email: admin@twenty.com
# Password: password (or check seed output)

# After login, verify:
# - Dashboard loads
# - Sidebar navigation works
# - Can access Settings
```

**Subtasks**:
- [ ] Login with demo credentials
- [ ] Verify dashboard loads
- [ ] Verify navigation works

---

## Definition of Done

- [ ] `.env` file configured with all required variables
- [ ] PostgreSQL 16.4 container running
- [ ] Redis 7.4.1 container running
- [ ] Database migrations completed
- [ ] Backend server running on port 3000
- [ ] Frontend server running on port 3001
- [ ] Health endpoint returns 200
- [ ] Login page accessible

---

## Dev Notes

### Architecture Patterns
- **Docker Compose**: Local development infrastructure
- **PostgreSQL 16.4**: Primary database
- **Redis 7.4.1**: Caching, sessions, BullMQ queues

### Port Mapping
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache/Queue |
| Backend | 3000 | API Server |
| Frontend | 3001 | React App |

### Troubleshooting

**Issue: Port already in use**
```bash
# Find process using port
lsof -i :5432
lsof -i :6379

# Kill process or change port in docker-compose
```

**Issue: Database connection refused**
```bash
# Check PostgreSQL logs
docker logs $(docker ps -qf "ancestor=postgres")

# Restart container
docker compose -f docker-compose.dev.yml restart postgres
```

**Issue: Migration fails**
```bash
# Reset database
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
npx nx database:migrate twenty-server
```

### References
- [Source: architecture.md#Project-Initialization lines 38-51]
- [Source: architecture.md#Environment-Configuration lines 730-752]
- [Source: tech-spec-epic-1.md#Story-1.2]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- packages/twenty-server/.env (created from example)
