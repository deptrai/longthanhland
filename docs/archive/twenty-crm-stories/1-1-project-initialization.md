# Story 1.1: Project Initialization

Status: ready-for-dev

## Story

As a **Developer**,
I want to verify Twenty CRM v0.52.0 setup,
so that I have a working development environment.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-1.1.1 | Forked repository | Check version | Twenty CRM v0.52.0 confirmed | `git describe --tags` shows v0.52.0 |
| AC-1.1.2 | Repository ready | Run `pnpm install` | All dependencies installed | Exit code 0, no errors |
| AC-1.1.3 | Dependencies installed | Check node version | Node.js 20.18.0 LTS confirmed | `node -v` = v20.18.0 |

> **Note**: User has already cloned/forked Twenty CRM. This story focuses on verification and setup.

---

## Setup Tasks

### SETUP-1: Verify Repository Version (AC: 1)

```bash
# Navigate to project directory
cd /path/to/twenty

# Verify we're on v0.52.0
git describe --tags
# Expected: v0.52.0 or v0.52.0-xxx

# If not on correct version, checkout
git checkout v0.52.0

# Verify again
git log --oneline -1
# Should show commit from v0.52.0
```

**Subtasks**:
- [ ] Navigate to project directory
- [ ] Run `git describe --tags`
- [ ] Verify output shows v0.52.0
- [ ] If needed, checkout correct version

### SETUP-2: Verify Node.js Version (AC: 3)

```bash
# Check Node.js version
node -v
# Expected: v20.18.0

# If wrong version, use nvm
nvm install 20.18.0
nvm use 20.18.0

# Verify
node -v
```

**Subtasks**:
- [ ] Run `node -v`
- [ ] Verify output is v20.18.0
- [ ] If needed, install correct version via nvm

### SETUP-3: Verify pnpm Version (AC: 2)

```bash
# Check pnpm version
pnpm -v
# Expected: 9.14.2 or compatible

# If not installed or wrong version
npm install -g pnpm@9.14.2

# Verify
pnpm -v
```

**Subtasks**:
- [ ] Run `pnpm -v`
- [ ] Verify version is 9.14.2 or compatible
- [ ] If needed, install correct version

### SETUP-4: Install Dependencies (AC: 2)

```bash
# Install all dependencies
pnpm install

# This may take 5-10 minutes
# Expected: No errors, exit code 0

# Verify node_modules created
ls -la node_modules/
```

**Subtasks**:
- [ ] Run `pnpm install`
- [ ] Wait for completion (5-10 min)
- [ ] Verify no errors in output
- [ ] Verify node_modules directory exists

---

## Verification Tasks

### VERIFY-1: Check Project Structure

```bash
# Verify key directories exist
ls -la packages/
# Expected: twenty-server, twenty-front, twenty-emails, etc.

ls -la packages/twenty-server/src/
# Expected: modules/, engine/, database/, etc.

ls -la packages/twenty-front/src/
# Expected: modules/, pages/, generated/, etc.
```

**Subtasks**:
- [ ] Verify packages/ directory structure
- [ ] Verify twenty-server/src/ structure
- [ ] Verify twenty-front/src/ structure

### VERIFY-2: Check TypeScript Compilation

```bash
# Build to verify no TypeScript errors
npx nx build twenty-server --skip-nx-cache

# Expected: Build successful
# If errors, check Node.js version and dependencies
```

**Subtasks**:
- [ ] Run build command
- [ ] Verify build succeeds
- [ ] Note any warnings (non-blocking)

---

## Definition of Done

- [ ] Repository version verified as v0.52.0
- [ ] Node.js 20.18.0 LTS confirmed
- [ ] pnpm 9.14.2 or compatible installed
- [ ] `pnpm install` completed without errors
- [ ] Project structure verified
- [ ] TypeScript compilation succeeds

---

## Dev Notes

### Architecture Patterns
- **Extend, Don't Fork**: We're adding to Twenty, not modifying core
- **Version Pinning**: Use exact v0.52.0 for compatibility

### Source Tree Components
```
twenty/
├── packages/
│   ├── twenty-server/      # NestJS backend
│   │   └── src/
│   │       ├── modules/    # Business logic
│   │       ├── engine/     # Core engine
│   │       └── database/   # DB config
│   ├── twenty-front/       # React frontend
│   │   └── src/
│   │       ├── modules/    # Feature modules
│   │       └── pages/      # Route pages
│   └── twenty-emails/      # Email templates
├── docker-compose.yml
└── package.json
```

### Troubleshooting

**Issue: pnpm install fails**
```bash
# Clear cache and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

**Issue: Wrong Node.js version**
```bash
# Use nvm to switch
nvm install 20.18.0
nvm use 20.18.0
nvm alias default 20.18.0
```

**Issue: Build fails**
```bash
# Check for missing dependencies
pnpm install --force
npx nx reset
npx nx build twenty-server
```

### References
- [Source: architecture.md#Project-Initialization lines 28-36]
- [Source: tech-spec-epic-1.md#Story-1.1]

---

## Dev Agent Record

### Context Reference
- [Story Context XML](./1-1-project-initialization-context.xml)

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- No new files created (verification only)
