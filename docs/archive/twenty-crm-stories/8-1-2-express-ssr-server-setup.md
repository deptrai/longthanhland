# Story 8.1.2: Express SSR Server Setup

Status: drafted

## Story

As a developer,
I want to set up an Express.js SSR server for public pages,
so that search engine bots receive pre-rendered HTML with proper meta tags.

## Acceptance Criteria

1. **Express Server Created**
   - Given project structure set up (Story 8.1.1)
   - When I create Express SSR server
   - Then server entry point exists at `packages/twenty-front/server/index.ts`
   - And Express.js 4.18.x is installed

2. **Server Starts Successfully**
   - Given server created
   - When I start the server with `yarn ssr:dev`
   - Then server listens on port 3002 (configurable via `SSR_PORT`)
   - And startup logs confirm successful initialization
   - And server process is stable (no crashes)

3. **Basic Routing Works**
   - Given server running
   - When I access public routes
   - Then the following routes respond with 200:
     - `GET /` (homepage)
     - `GET /listings` (browse listings)
     - `GET /listings/:id` (listing detail)
   - And routes return HTML content

4. **Health Check Endpoint**
   - Given server running
   - When I access `GET /health`
   - Then response is JSON: `{"status": "ok", "timestamp": <ISO8601>}`
   - And response time is <50ms

5. **Vite Build Integration**
   - Given React app built with Vite
   - When SSR server starts
   - Then server serves static assets from Vite build output
   - And client-side hydration works correctly

6. **Logging and Monitoring**
   - Given server running
   - When requests are processed
   - Then Winston logger logs:
     - Request method, path, status code
     - Response time
     - Errors with stack traces
   - And logs are written to `logs/ssr-server.log`

7. **Graceful Shutdown**
   - Given server running
   - When SIGTERM or SIGINT signal received
   - Then server closes all connections gracefully
   - And logs shutdown message
   - And process exits with code 0

## Tasks / Subtasks

- [ ] **Task 1: Install Dependencies** (AC: #1)
  - [ ] Add to `packages/twenty-front/package.json`:
    - `express@^4.18.0`
    - `winston@^3.11.0` (logging)
    - `compression@^1.7.4` (gzip compression)
    - `helmet@^7.1.0` (security headers)
    - `@types/express@^4.17.21` (dev)
    - `@types/compression@^1.7.5` (dev)
  - [ ] Run `yarn install` in twenty-front

- [ ] **Task 2: Create Server Entry Point** (AC: #1, #2)
  - [ ] Create `packages/twenty-front/server/index.ts`
  - [ ] Import Express and create app instance
  - [ ] Configure port from environment: `process.env.SSR_PORT || 3002`
  - [ ] Setup basic Express middleware:
    - `express.json()`
    - `compression()` for gzip
    - `helmet()` for security headers
  - [ ] Add request logging middleware
  - [ ] Start server with `app.listen()`

- [ ] **Task 3: Setup Winston Logger** (AC: #6)
  - [ ] Create `packages/twenty-front/server/utils/logger.ts`
  - [ ] Configure Winston with:
    - Console transport (colorized for dev)
    - File transport: `logs/ssr-server.log`
    - Format: timestamp, level, message, metadata
    - Log levels: error, warn, info, debug
  - [ ] Export logger instance
  - [ ] Create request logging middleware using logger

- [ ] **Task 4: Implement Basic Routing** (AC: #3)
  - [ ] Create `packages/twenty-front/server/routes/index.ts`
  - [ ] Define routes:
    - `GET /` → placeholder handler (returns "Homepage")
    - `GET /listings` → placeholder handler (returns "Browse Listings")
    - `GET /listings/:id` → placeholder handler (returns "Listing Detail: {id}")
  - [ ] Mount routes in main server file
  - [ ] Add 404 handler for unmatched routes

- [ ] **Task 5: Add Health Check Endpoint** (AC: #4)
  - [ ] Create route: `GET /health`
  - [ ] Return JSON: `{ status: "ok", timestamp: new Date().toISOString() }`
  - [ ] Set response header: `Content-Type: application/json`
  - [ ] Ensure fast response (<50ms)

- [ ] **Task 6: Integrate Vite Build Output** (AC: #5)
  - [ ] Serve static files from Vite build:
    - `app.use(express.static('dist/client'))`
  - [ ] Configure Vite build for SSR:
    - Update `vite.config.ts` with SSR options
    - Set `build.outDir` for client and server builds
  - [ ] Create separate build commands:
    - `yarn build:client` (Vite client build)
    - `yarn build:server` (Vite server build)
  - [ ] Test that static assets (JS, CSS, images) are served correctly

- [ ] **Task 7: Implement Graceful Shutdown** (AC: #7)
  - [ ] Create `packages/twenty-front/server/utils/graceful-shutdown.ts`
  - [ ] Listen for SIGTERM and SIGINT signals
  - [ ] On signal received:
    - Log shutdown message
    - Stop accepting new connections
    - Close existing connections (with timeout)
    - Exit process with code 0
  - [ ] Integrate with server startup

- [ ] **Task 8: Create NPM Scripts**
  - [ ] Add to `packages/twenty-front/package.json`:
    - `"ssr:dev": "tsx watch server/index.ts"` (dev mode with hot reload)
    - `"ssr:build": "tsc -p server/tsconfig.json"` (production build)
    - `"ssr:start": "node dist/server/index.js"` (production start)
  - [ ] Create `server/tsconfig.json` for SSR server compilation

- [ ] **Task 9: Add Environment Variables**
  - [ ] Update `.env.example`:
    - `SSR_ENABLED=true`
    - `SSR_PORT=3002`
    - `NODE_ENV=development`
  - [ ] Load environment variables in server using `dotenv`

- [ ] **Task 10: Testing and Verification**
  - [ ] Start server: `yarn ssr:dev`
  - [ ] Test routes with curl:
    - `curl http://localhost:3002/`
    - `curl http://localhost:3002/listings`
    - `curl http://localhost:3002/listings/123`
    - `curl http://localhost:3002/health`
  - [ ] Verify logs are written to file
  - [ ] Test graceful shutdown: `Ctrl+C` and verify clean exit
  - [ ] Verify no memory leaks (run for 5 minutes)

## Dev Notes

### Architecture Context

**SSR Approach** (ADR-006):
- Express.js middleware for SSR (not Next.js)
- Dynamic rendering: bots get SSR, users get CSR
- Port 3002 for SSR server (separate from main app)
- Redis caching for rendered pages (Story 8.1.6)

**Key Design Decisions**:
- **Separate Server**: SSR server runs independently on port 3002
- **Vite Integration**: Use Vite for building React app, Express serves the output
- **Middleware Pattern**: Modular middleware for bot detection, caching, rendering
- **Graceful Shutdown**: Ensure clean shutdown for production deployments

**Technology Stack**:
- Express.js 4.18.x (web framework)
- Winston 3.x (logging)
- Helmet (security headers)
- Compression (gzip)
- tsx (TypeScript execution for dev)

### Project Structure Notes

**SSR Server Structure**:
```
packages/twenty-front/server/
├── index.ts                 # Main server entry point
├── routes/
│   └── index.ts            # Route definitions
├── middleware/
│   └── request-logger.ts   # Request logging middleware
├── utils/
│   ├── logger.ts           # Winston logger configuration
│   └── graceful-shutdown.ts # Graceful shutdown handler
└── tsconfig.json           # TypeScript config for server
```

**Build Output Structure**:
```
packages/twenty-front/dist/
├── client/                 # Vite client build (static assets)
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/                 # SSR server build
    └── index.js
```

### Learnings from Previous Story

**From Story 8.1.1 (Project Setup)**:
- Module structure created at `packages/twenty-front/server/`
- Environment variables configured in `.env.example`
- TypeScript path aliases configured
- README.md documents module purpose

**Files to Use**:
- Use `packages/twenty-front/server/` directory created in 8.1.1
- Reference environment variables from `.env.example`
- Follow TypeScript configuration patterns

### Implementation Details

**Express Server Setup**:
```typescript
// packages/twenty-front/server/index.ts
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { logger } from './utils/logger';
import routes from './routes';
import { setupGracefulShutdown } from './utils/graceful-shutdown';

const app = express();
const PORT = process.env.SSR_PORT || 3002;

// Middleware
app.use(compression());
app.use(helmet());
app.use(express.json());
app.use(requestLogger); // Custom logging middleware

// Static files from Vite build
app.use(express.static('dist/client'));

// Routes
app.use('/', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`SSR server listening on port ${PORT}`);
});

// Graceful shutdown
setupGracefulShutdown(server, logger);
```

**Winston Logger Configuration**:
```typescript
// packages/twenty-front/server/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/ssr-server.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});
```

**Graceful Shutdown**:
```typescript
// packages/twenty-front/server/utils/graceful-shutdown.ts
import { Server } from 'http';
import { Logger } from 'winston';

export function setupGracefulShutdown(server: Server, logger: Logger) {
  const shutdown = () => {
    logger.info('Received shutdown signal, closing server gracefully...');

    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
```

### Vite Configuration

**Update vite.config.ts**:
```typescript
// packages/twenty-front/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    ssrManifest: true, // Generate SSR manifest
  },
  ssr: {
    noExternal: ['react', 'react-dom'], // Bundle these for SSR
  }
});
```

### Testing Strategy

**Manual Testing**:
```bash
# Start SSR server in dev mode
cd packages/twenty-front
yarn ssr:dev

# Test endpoints
curl http://localhost:3002/
curl http://localhost:3002/listings
curl http://localhost:3002/listings/123
curl http://localhost:3002/health

# Test graceful shutdown
# Press Ctrl+C and verify clean exit in logs
```

**Automated Tests** (Future):
- Unit tests for route handlers
- Integration tests for server startup/shutdown
- Load tests for performance validation

### Performance Targets

**Response Times**:
- Health check: <50ms
- Static assets: <100ms
- SSR routes: <500ms (target for Story 8.1.4)

**Resource Usage**:
- Memory: <200MB idle
- CPU: <5% idle
- No memory leaks over 24 hours

### Security Considerations

**Helmet Configuration**:
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

**Rate Limiting** (Future):
- Add rate limiting middleware in later stories
- Protect against DDoS attacks

### References

- [Architecture Document](../real-estate-platform/architecture.md) - ADR-006 SSR Middleware
- [Frontend Architecture Analysis](../real-estate-platform/frontend-architecture-analysis.md) - Section 5.2
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8 (Public Marketplace)
- [Epic 8.1](../real-estate-platform/epics.md#story-812-express-ssr-server-setup) - Story details
- [Express.js Documentation](https://expressjs.com/) - Official docs
- [Winston Documentation](https://github.com/winstonjs/winston) - Logging

### Success Criteria

**Definition of Done**:
- ✅ Express server starts successfully on port 3002
- ✅ All basic routes respond with 200
- ✅ Health check endpoint works
- ✅ Winston logging configured and working
- ✅ Static assets served from Vite build
- ✅ Graceful shutdown implemented
- ✅ NPM scripts created and tested
- ✅ No TypeScript compilation errors
- ✅ Server stable for 5+ minutes without crashes

**Verification Commands**:
```bash
# Start server
yarn ssr:dev

# Verify routes
curl -i http://localhost:3002/
curl -i http://localhost:3002/health

# Check logs
tail -f logs/ssr-server.log

# Test shutdown
# Ctrl+C and verify clean exit
```

## Dev Agent Record

### Context Reference

<!-- Story context XML will be added by story-context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes List

<!-- To be filled by dev agent after completion -->

### File List

<!-- To be filled by dev agent with NEW/MODIFIED/DELETED files -->
