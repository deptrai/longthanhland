# Story 8.1.3: Bot Detection Middleware

Status: drafted

## Story

As a developer,
I want to implement bot detection middleware,
so that we can serve SSR content to bots and CSR to regular users.

## Acceptance Criteria

1. **Bot Detection Middleware Created**
   - Given Express SSR server running (Story 8.1.2)
   - When a request comes to the server
   - Then middleware detects if user-agent is a bot
   - And middleware runs before route handlers

2. **Bot User-Agent Detection**
   - Given bot detection middleware active
   - When request has bot user-agent
   - Then `req.isBot = true` is set
   - And the following bots are detected:
     - Search engines: Googlebot, Bingbot, Slurp, DuckDuckBot, Baiduspider, Yandexbot
     - Social media: facebookexternalhit, Twitterbot, LinkedInBot, WhatsApp
     - Other: Slackbot, TelegramBot

3. **Regular User Detection**
   - Given bot detection middleware active
   - When request has regular user-agent (Chrome, Firefox, Safari, etc.)
   - Then `req.isBot = false` is set
   - And request proceeds to normal route handling

4. **Logging and Monitoring**
   - Given bot detection running
   - When detection occurs
   - Then detection results are logged:
     - User-agent string
     - Detection result (bot or user)
     - Request path
   - And logs use debug level (not info)

5. **Case-Insensitive Matching**
   - Given bot detection logic
   - When user-agent has mixed case (e.g., "GoogleBot", "googlebot")
   - Then detection works correctly (case-insensitive)

6. **Performance**
   - Given bot detection middleware
   - When processing requests
   - Then detection adds <5ms overhead
   - And no regex compilation on every request (compiled once)

## Tasks / Subtasks

- [ ] **Task 1: Install Bot Detection Library** (AC: #1, #2)
  - [ ] Add to `packages/twenty-front/package.json`:
    - `isbot@^5.1.0` (bot detection library)
    - `@types/isbot@^4.0.0` (dev)
  - [ ] Run `yarn install`
  - [ ] Review isbot documentation

- [ ] **Task 2: Create Bot Detection Middleware** (AC: #1, #2, #3)
  - [ ] Create `packages/twenty-front/server/middleware/bot-detection.ts`
  - [ ] Import `isbot` library
  - [ ] Create middleware function:
    - Extract user-agent from `req.headers['user-agent']`
    - Use `isbot(userAgent)` to detect bots
    - Set `req.isBot = true/false`
    - Call `next()` to continue
  - [ ] Export middleware

- [ ] **Task 3: Extend Request Type** (AC: #1)
  - [ ] Create `packages/twenty-front/server/types/express.d.ts`
  - [ ] Extend Express Request interface:
    ```typescript
    declare namespace Express {
      interface Request {
        isBot: boolean;
      }
    }
    ```
  - [ ] Ensure TypeScript recognizes the extension

- [ ] **Task 4: Add Custom Bot Patterns** (AC: #2)
  - [ ] Create `packages/twenty-front/server/utils/bot-patterns.ts`
  - [ ] Define additional bot patterns not in isbot:
    - Vietnamese search engines (if any)
    - Custom crawlers
  - [ ] Combine with isbot detection
  - [ ] Use regex for pattern matching (case-insensitive)

- [ ] **Task 5: Add Logging** (AC: #4)
  - [ ] Import logger from `server/utils/logger.ts`
  - [ ] Log detection results at debug level:
    - User-agent string (truncated to 100 chars)
    - Detection result (bot: true/false)
    - Request path
  - [ ] Format: `[Bot Detection] path=/listings/123 isBot=true ua=Googlebot/2.1`

- [ ] **Task 6: Integrate Middleware into Server** (AC: #1)
  - [ ] Update `packages/twenty-front/server/index.ts`
  - [ ] Import bot detection middleware
  - [ ] Add middleware BEFORE route handlers:
    ```typescript
    app.use(botDetectionMiddleware);
    ```
  - [ ] Ensure middleware runs for all routes

- [ ] **Task 7: Create Unit Tests** (AC: #2, #3, #5, #6)
  - [ ] Create `packages/twenty-front/server/middleware/__tests__/bot-detection.spec.ts`
  - [ ] Test cases:
    - Detects Googlebot correctly
    - Detects Bingbot correctly
    - Detects social media bots (Facebook, Twitter)
    - Does NOT detect Chrome as bot
    - Does NOT detect Firefox as bot
    - Case-insensitive matching works
    - Missing user-agent defaults to `isBot = false`
    - Performance: detection completes in <5ms
  - [ ] Use Jest for testing
  - [ ] Mock Express request/response objects

- [ ] **Task 8: Performance Optimization** (AC: #6)
  - [ ] Compile regex patterns once at module load
  - [ ] Cache isbot instance if possible
  - [ ] Avoid string operations in hot path
  - [ ] Benchmark with `console.time()` in tests

- [ ] **Task 9: Add Monitoring Metrics** (AC: #4)
  - [ ] Track bot vs user request counts
  - [ ] Add metrics to health check endpoint:
    ```json
    {
      "status": "ok",
      "metrics": {
        "totalRequests": 1000,
        "botRequests": 150,
        "userRequests": 850,
        "botPercentage": 15
      }
    }
    ```
  - [ ] Reset metrics daily or on server restart

- [ ] **Task 10: Testing and Verification**
  - [ ] Start SSR server: `yarn ssr:dev`
  - [ ] Test with curl using different user-agents:
    ```bash
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/
    curl -H "User-Agent: Mozilla/5.0 (Chrome)" http://localhost:3002/
    ```
  - [ ] Check logs for detection results
  - [ ] Run unit tests: `yarn test bot-detection`
  - [ ] Verify performance: <5ms overhead

## Dev Notes

### Architecture Context

**Dynamic Rendering Pattern**:
- Bots → SSR (pre-rendered HTML)
- Users → CSR (React SPA)
- Bot detection is the first step in this flow

**Key Design Decisions**:
- Use `isbot` library (battle-tested, maintained)
- Extend with custom patterns if needed
- Log at debug level (not info) to avoid log spam
- Performance critical: <5ms overhead

**Technology Stack**:
- isbot 5.x (bot detection library)
- Express middleware pattern
- TypeScript type extensions

### Project Structure Notes

**Middleware Location**:
```
packages/twenty-front/server/middleware/
├── bot-detection.ts        # Main middleware
└── __tests__/
    └── bot-detection.spec.ts  # Unit tests
```

**Type Extensions**:
```
packages/twenty-front/server/types/
└── express.d.ts           # Extend Express Request
```

**Utilities**:
```
packages/twenty-front/server/utils/
└── bot-patterns.ts        # Custom bot patterns
```

### Learnings from Previous Story

**From Story 8.1.2 (Express SSR Server Setup)**:
- Express server running on port 3002
- Winston logger configured at `server/utils/logger.ts`
- Middleware pattern established
- Request logging middleware already in place

**Files to Use**:
- Use logger from `server/utils/logger.ts`
- Follow middleware pattern from `server/index.ts`
- Add middleware before route handlers

### Implementation Details

**Bot Detection Middleware**:
```typescript
// packages/twenty-front/server/middleware/bot-detection.ts
import { Request, Response, NextFunction } from 'express';
import { isbot } from 'isbot';
import { logger } from '../utils/logger';

export function botDetectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userAgent = req.headers['user-agent'] || '';

  // Detect bot using isbot library
  req.isBot = isbot(userAgent);

  // Log detection result (debug level)
  logger.debug('[Bot Detection]', {
    path: req.path,
    isBot: req.isBot,
    userAgent: userAgent.substring(0, 100) // Truncate for logs
  });

  next();
}
```

**Type Extension**:
```typescript
// packages/twenty-front/server/types/express.d.ts
declare namespace Express {
  interface Request {
    isBot: boolean;
  }
}
```

**Custom Bot Patterns** (if needed):
```typescript
// packages/twenty-front/server/utils/bot-patterns.ts
export const customBotPatterns = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /slackbot/i,
  /telegrambot/i,
];

export function isCustomBot(userAgent: string): boolean {
  return customBotPatterns.some(pattern => pattern.test(userAgent));
}
```

**Integration in Server**:
```typescript
// packages/twenty-front/server/index.ts
import { botDetectionMiddleware } from './middleware/bot-detection';

// ... other middleware ...

// Bot detection (before routes)
app.use(botDetectionMiddleware);

// Routes
app.use('/', routes);
```

### Testing Strategy

**Unit Tests**:
```typescript
// packages/twenty-front/server/middleware/__tests__/bot-detection.spec.ts
import { botDetectionMiddleware } from '../bot-detection';

describe('Bot Detection Middleware', () => {
  it('should detect Googlebot', () => {
    const req = { headers: { 'user-agent': 'Googlebot/2.1' } };
    const res = {};
    const next = jest.fn();

    botDetectionMiddleware(req as any, res as any, next);

    expect(req.isBot).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('should NOT detect Chrome as bot', () => {
    const req = { headers: { 'user-agent': 'Mozilla/5.0 (Chrome)' } };
    const res = {};
    const next = jest.fn();

    botDetectionMiddleware(req as any, res as any, next);

    expect(req.isBot).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('should be case-insensitive', () => {
    const req = { headers: { 'user-agent': 'GoogleBot/2.1' } };
    const res = {};
    const next = jest.fn();

    botDetectionMiddleware(req as any, res as any, next);

    expect(req.isBot).toBe(true);
  });

  it('should complete in <5ms', () => {
    const req = { headers: { 'user-agent': 'Googlebot/2.1' } };
    const res = {};
    const next = jest.fn();

    const start = performance.now();
    botDetectionMiddleware(req as any, res as any, next);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });
});
```

**Manual Testing**:
```bash
# Test with Googlebot user-agent
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/ -v

# Test with Chrome user-agent
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" http://localhost:3002/ -v

# Check logs
tail -f logs/ssr-server.log | grep "Bot Detection"
```

### Bot User-Agents to Test

**Search Engine Bots**:
- Googlebot: `Googlebot/2.1 (+http://www.google.com/bot.html)`
- Bingbot: `Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)`
- DuckDuckBot: `DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)`

**Social Media Bots**:
- Facebook: `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`
- Twitter: `Twitterbot/1.0`
- LinkedIn: `LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)`

**Regular Users** (should NOT be detected as bots):
- Chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`
- Firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0`
- Safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15`

### Performance Considerations

**Optimization Techniques**:
- Regex patterns compiled once at module load
- Use `isbot` library (optimized for performance)
- Avoid string operations in hot path
- No database or external API calls

**Benchmarking**:
```typescript
// Performance test
const iterations = 10000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  isbot('Googlebot/2.1');
}

const duration = performance.now() - start;
const avgTime = duration / iterations;

console.log(`Average detection time: ${avgTime.toFixed(3)}ms`);
// Target: <0.01ms per detection
```

### Monitoring and Metrics

**Metrics to Track**:
- Total requests
- Bot requests count
- User requests count
- Bot percentage
- Most common bot user-agents

**Metrics Implementation**:
```typescript
// In-memory metrics (reset on restart)
let metrics = {
  totalRequests: 0,
  botRequests: 0,
  userRequests: 0,
};

// In middleware
if (req.isBot) {
  metrics.botRequests++;
} else {
  metrics.userRequests++;
}
metrics.totalRequests++;

// In health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    metrics: {
      ...metrics,
      botPercentage: (metrics.botRequests / metrics.totalRequests * 100).toFixed(2)
    }
  });
});
```

### References

- [isbot Library](https://github.com/omrilotan/isbot) - Bot detection library
- [Frontend Architecture Analysis](../real-estate-platform/frontend-architecture-analysis.md) - Section 5.2 (Bot Detection)
- [Architecture Document](../real-estate-platform/architecture.md) - ADR-006
- [Epic 8.1](../real-estate-platform/epics.md#story-813-bot-detection-middleware) - Story details
- [Express Middleware Guide](https://expressjs.com/en/guide/using-middleware.html) - Official docs

### Success Criteria

**Definition of Done**:
- ✅ Bot detection middleware created and integrated
- ✅ Detects all major search engine bots
- ✅ Detects social media bots
- ✅ Does NOT detect regular users as bots
- ✅ Case-insensitive matching works
- ✅ Performance <5ms overhead
- ✅ Logging at debug level
- ✅ Unit tests pass (>80% coverage)
- ✅ Manual testing with curl successful
- ✅ Metrics tracked in health check

**Verification Commands**:
```bash
# Run unit tests
yarn test bot-detection

# Start server
yarn ssr:dev

# Test bot detection
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/ -v
curl -H "User-Agent: Mozilla/5.0 (Chrome)" http://localhost:3002/ -v

# Check health metrics
curl http://localhost:3002/health | jq '.metrics'

# Check logs
tail -f logs/ssr-server.log | grep "Bot Detection"
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
