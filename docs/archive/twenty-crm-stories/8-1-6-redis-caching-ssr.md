# Story 8.1.6: Redis Caching for SSR

Status: drafted

## Story

As a developer,
I want to implement Redis caching for SSR-rendered pages,
so that we reduce server load and improve response times.

## Acceptance Criteria

1. **Redis Cache Manager Created**
   - Given SSR and meta tags working (Story 8.1.5)
   - When bot requests page
   - Then Redis cache is checked first
   - And cache manager module exists at `server/utils/cache-manager.ts`

2. **Cache Hit Scenario**
   - Given bot requests recently rendered page
   - When HTML found in Redis cache
   - Then cached HTML returned immediately
   - And response time <100ms
   - And cache hit logged

3. **Cache Miss Scenario**
   - Given bot requests page not in cache
   - When HTML not found in Redis
   - Then fresh HTML rendered via SSR
   - And rendered HTML cached in Redis with TTL
   - And cache miss logged

4. **Cache TTL Configuration**
   - Given caching enabled
   - When HTML cached
   - Then 1-hour TTL used (configurable via `SSR_CACHE_TTL`)
   - And TTL can be overridden per route

5. **Cache Key Strategy**
   - Given caching implemented
   - When cache key generated
   - Then format is: `ssr:{route}:{params}:{query}`
   - Examples:
     - Homepage: `ssr:/`
     - Browse: `ssr:/listings?page=1`
     - Detail: `ssr:/listings/123`

6. **Cache Invalidation**
   - Given listing data updated
   - When invalidation webhook called
   - Then specific cache keys deleted
   - And invalidation logged
   - And endpoint: `POST /api/cache/invalidate`

7. **Cache Metrics**
   - Given caching active
   - When metrics monitored
   - Then track:
     - Total requests
     - Cache hits
     - Cache misses
     - Hit rate percentage
   - And metrics available in health check
   - And target: >80% hit rate

8. **Redis Connection**
   - Given Twenty CRM infrastructure
   - When SSR server starts
   - Then reuse existing Redis connection from Twenty
   - And connection pooling configured
   - And graceful handling of Redis unavailable

## Tasks / Subtasks

- [ ] **Task 1: Setup Redis Client** (AC: #1, #8)
  - [ ] Add to `packages/twenty-front/package.json`:
    - `ioredis@^5.3.0` (Redis client)
    - `@types/ioredis@^5.0.0` (dev)
  - [ ] Run `yarn install`
  - [ ] Create `server/utils/redis-client.ts`
  - [ ] Configure Redis connection:
    - Use environment variables: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
    - Connection pooling
    - Retry strategy
    - Error handling

- [ ] **Task 2: Create Cache Manager Module** (AC: #1, #2, #3)
  - [ ] Create `packages/twenty-front/server/utils/cache-manager.ts`
  - [ ] Implement `CacheManager` class with methods:
    - `get(key: string): Promise<string | null>`
    - `set(key: string, value: string, ttl?: number): Promise<void>`
    - `delete(key: string): Promise<void>`
    - `deletePattern(pattern: string): Promise<void>`
  - [ ] Export singleton instance

- [ ] **Task 3: Implement Cache Key Generation** (AC: #5)
  - [ ] Create `generateCacheKey(req: Request)` function
  - [ ] Format: `ssr:{path}:{params}:{query}`
  - [ ] Normalize query parameters (sort alphabetically)
  - [ ] Handle special characters in keys
  - [ ] Examples:
    - `/` → `ssr:/`
    - `/listings` → `ssr:/listings`
    - `/listings/123` → `ssr:/listings/123`
    - `/listings?page=2&sort=price` → `ssr:/listings?page=2&sort=price`

- [ ] **Task 4: Implement Cache Middleware** (AC: #1, #2, #3)
  - [ ] Create `packages/twenty-front/server/middleware/cache-middleware.ts`
  - [ ] Check if bot request (use `req.isBot`)
  - [ ] Generate cache key
  - [ ] Try to get from cache
  - [ ] If hit: return cached HTML, log hit
  - [ ] If miss: continue to SSR, cache result after render

- [ ] **Task 5: Integrate Caching into SSR Flow** (AC: #2, #3)
  - [ ] Update route handlers to use cache middleware
  - [ ] After SSR rendering, cache the HTML:
    ```typescript
    const html = await renderPage(...);
    await cacheManager.set(cacheKey, html, TTL);
    ```
  - [ ] Handle cache errors gracefully (don't block SSR)

- [ ] **Task 6: Configure Cache TTL** (AC: #4)
  - [ ] Add environment variable: `SSR_CACHE_TTL=3600` (1 hour)
  - [ ] Allow per-route TTL override:
    - Homepage: 1 hour
    - Browse listings: 30 minutes
    - Listing detail: 1 hour
  - [ ] Create TTL configuration map

- [ ] **Task 7: Implement Cache Invalidation** (AC: #6)
  - [ ] Create `POST /api/cache/invalidate` endpoint
  - [ ] Accept payload:
    ```json
    {
      "type": "listing",
      "id": "123"
    }
    ```
  - [ ] Delete cache keys matching pattern:
    - `ssr:/listings/123`
    - `ssr:/listings?*` (browse pages)
    - `ssr:/` (homepage if featured)
  - [ ] Require authentication (API key or internal only)
  - [ ] Log invalidation events

- [ ] **Task 8: Add Cache Metrics** (AC: #7)
  - [ ] Track metrics in memory:
    - `totalRequests`
    - `cacheHits`
    - `cacheMisses`
  - [ ] Calculate hit rate: `(hits / total) * 100`
  - [ ] Add to health check endpoint:
    ```json
    {
      "cache": {
        "enabled": true,
        "hits": 850,
        "misses": 150,
        "hitRate": "85.00%"
      }
    }
    ```
  - [ ] Reset metrics daily or on restart

- [ ] **Task 9: Handle Redis Unavailable** (AC: #8)
  - [ ] Wrap Redis operations in try-catch
  - [ ] On Redis error:
    - Log error
    - Continue with SSR (no caching)
    - Don't crash server
  - [ ] Add Redis health check
  - [ ] Monitor Redis connection status

- [ ] **Task 10: Create Unit Tests**
  - [ ] Create `packages/twenty-front/server/utils/__tests__/cache-manager.spec.ts`
  - [ ] Test cases:
    - Get from cache (hit)
    - Get from cache (miss)
    - Set to cache with TTL
    - Delete from cache
    - Delete by pattern
    - Generate cache key correctly
    - Handle Redis errors gracefully

- [ ] **Task 11: Performance Testing**
  - [ ] Benchmark cache hit vs miss:
    - Cache hit: <100ms
    - Cache miss: <500ms (SSR render time)
  - [ ] Load test with high traffic:
    - 100 requests/second
    - Verify hit rate >80%
  - [ ] Monitor memory usage (Redis)

- [ ] **Task 12: Testing and Verification**
  - [ ] Start SSR server: `yarn ssr:dev`
  - [ ] Test cache flow:
    ```bash
    # First request (cache miss)
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -w "\nTime: %{time_total}s\n"

    # Second request (cache hit)
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -w "\nTime: %{time_total}s\n"
    ```
  - [ ] Verify cache hit is faster
  - [ ] Check Redis keys: `redis-cli KEYS "ssr:*"`
  - [ ] Test cache invalidation
  - [ ] Check metrics in health endpoint

## Dev Notes

### Architecture Context

**Caching Strategy**:
- Cache SSR-rendered HTML in Redis
- 1-hour TTL (configurable)
- Cache key includes route + params + query
- Invalidate on listing updates
- Target: >80% hit rate

**Key Design Decisions**:
- Use existing Redis from Twenty CRM (no new infrastructure)
- Cache full HTML (not just data)
- Graceful degradation if Redis unavailable
- Per-route TTL configuration
- Webhook-based invalidation

**Technology Stack**:
- ioredis 5.x (Redis client)
- Redis 7.x (from Twenty infrastructure)
- Express middleware pattern

### Project Structure Notes

**Cache Manager Structure**:
```
packages/twenty-front/server/
├── utils/
│   ├── redis-client.ts         # Redis connection
│   ├── cache-manager.ts        # Cache operations
│   └── __tests__/
│       └── cache-manager.spec.ts
├── middleware/
│   └── cache-middleware.ts     # Cache middleware
└── routes/
    └── cache-invalidation.ts   # Invalidation endpoint
```

### Learnings from Previous Stories

**From Story 8.1.4 (SSR Rendering)**:
- Route handlers render HTML via `renderPage()`
- SSR render time target: <500ms

**From Story 8.1.5 (Meta Tags)**:
- HTML includes dynamic meta tags
- Full HTML document generated

**Files to Modify**:
- Update route handlers to use cache middleware
- Add cache logic after SSR rendering
- Integrate with existing Redis connection

### Implementation Details

**Redis Client Setup**:
```typescript
// packages/twenty-front/server/utils/redis-client.ts
import Redis from 'ioredis';
import { logger } from './logger';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  logger.error('[Redis] Connection error:', err);
});

redis.on('connect', () => {
  logger.info('[Redis] Connected successfully');
});

export default redis;
```

**Cache Manager**:
```typescript
// packages/twenty-front/server/utils/cache-manager.ts
import redis from './redis-client';
import { logger } from './logger';

class CacheManager {
  async get(key: string): Promise<string | null> {
    try {
      const value = await redis.get(key);
      if (value) {
        logger.debug(`[Cache] HIT: ${key}`);
      } else {
        logger.debug(`[Cache] MISS: ${key}`);
      }
      return value;
    } catch (error) {
      logger.error('[Cache] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    try {
      await redis.setex(key, ttl, value);
      logger.debug(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('[Cache] Set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.info(`[Cache] DELETE: ${key}`);
    } catch (error) {
      logger.error('[Cache] Delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`[Cache] DELETE PATTERN: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error('[Cache] Delete pattern error:', error);
    }
  }
}

export const cacheManager = new CacheManager();
```

**Cache Key Generation**:
```typescript
// packages/twenty-front/server/utils/cache-key.ts
import { Request } from 'express';

export function generateCacheKey(req: Request): string {
  const path = req.path;
  const params = req.params;
  const query = req.query;

  // Sort query params for consistent keys
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');

  let key = `ssr:${path}`;

  if (Object.keys(params).length > 0) {
    key += `:${JSON.stringify(params)}`;
  }

  if (sortedQuery) {
    key += `?${sortedQuery}`;
  }

  return key;
}
```

**Cache Middleware**:
```typescript
// packages/twenty-front/server/middleware/cache-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { cacheManager } from '../utils/cache-manager';
import { generateCacheKey } from '../utils/cache-key';
import { logger } from '../utils/logger';

// Metrics
let metrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

export function cacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only cache for bots
  if (!req.isBot) {
    return next();
  }

  metrics.totalRequests++;

  const cacheKey = generateCacheKey(req);

  cacheManager.get(cacheKey).then(cachedHtml => {
    if (cachedHtml) {
      // Cache hit
      metrics.cacheHits++;
      logger.info(`[Cache] HIT: ${cacheKey}`);

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'text/html');
      return res.send(cachedHtml);
    }

    // Cache miss - continue to SSR
    metrics.cacheMisses++;
    logger.info(`[Cache] MISS: ${cacheKey}`);

    // Store original send function
    const originalSend = res.send.bind(res);

    // Override send to cache the response
    res.send = function(body: any) {
      if (typeof body === 'string' && res.statusCode === 200) {
        const ttl = parseInt(process.env.SSR_CACHE_TTL || '3600');
        cacheManager.set(cacheKey, body, ttl);
      }

      res.setHeader('X-Cache', 'MISS');
      return originalSend(body);
    } as any;

    next();
  }).catch(error => {
    logger.error('[Cache] Middleware error:', error);
    next();
  });
}

export function getCacheMetrics() {
  const hitRate = metrics.totalRequests > 0
    ? ((metrics.cacheHits / metrics.totalRequests) * 100).toFixed(2)
    : '0.00';

  return {
    ...metrics,
    hitRate: `${hitRate}%`,
  };
}
```

**Cache Invalidation Endpoint**:
```typescript
// packages/twenty-front/server/routes/cache-invalidation.ts
import { Router } from 'express';
import { cacheManager } from '../utils/cache-manager';
import { logger } from '../utils/logger';

const router = Router();

router.post('/api/cache/invalidate', async (req, res) => {
  const { type, id } = req.body;

  if (!type || !id) {
    return res.status(400).json({ error: 'Missing type or id' });
  }

  try {
    if (type === 'listing') {
      // Invalidate specific listing
      await cacheManager.delete(`ssr:/listings/${id}`);

      // Invalidate browse pages (they may include this listing)
      await cacheManager.deletePattern('ssr:/listings?*');

      // Invalidate homepage (if featured)
      await cacheManager.delete('ssr:/');

      logger.info(`[Cache] Invalidated listing ${id}`);
    }

    res.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    logger.error('[Cache] Invalidation error:', error);
    res.status(500).json({ error: 'Invalidation failed' });
  }
});

export default router;
```

**Updated Health Check**:
```typescript
// In server/index.ts
import { getCacheMetrics } from './middleware/cache-middleware';

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: getCacheMetrics(),
  });
});
```

### Testing Strategy

**Unit Tests**:
```typescript
// packages/twenty-front/server/utils/__tests__/cache-manager.spec.ts
import { cacheManager } from '../cache-manager';

describe('Cache Manager', () => {
  beforeEach(async () => {
    // Clear test cache
    await cacheManager.deletePattern('test:*');
  });

  it('should set and get from cache', async () => {
    await cacheManager.set('test:key1', 'value1', 60);
    const value = await cacheManager.get('test:key1');
    expect(value).toBe('value1');
  });

  it('should return null for cache miss', async () => {
    const value = await cacheManager.get('test:nonexistent');
    expect(value).toBeNull();
  });

  it('should delete from cache', async () => {
    await cacheManager.set('test:key2', 'value2', 60);
    await cacheManager.delete('test:key2');
    const value = await cacheManager.get('test:key2');
    expect(value).toBeNull();
  });

  it('should delete by pattern', async () => {
    await cacheManager.set('test:key3', 'value3', 60);
    await cacheManager.set('test:key4', 'value4', 60);
    await cacheManager.deletePattern('test:*');

    const value3 = await cacheManager.get('test:key3');
    const value4 = await cacheManager.get('test:key4');

    expect(value3).toBeNull();
    expect(value4).toBeNull();
  });

  it('should respect TTL', async () => {
    await cacheManager.set('test:ttl', 'value', 1); // 1 second TTL

    const value1 = await cacheManager.get('test:ttl');
    expect(value1).toBe('value');

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    const value2 = await cacheManager.get('test:ttl');
    expect(value2).toBeNull();
  });
});
```

**Performance Testing**:
```bash
# Load test with Apache Bench
ab -n 1000 -c 10 -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123

# Expected results:
# - First 10-20 requests: ~500ms (cache miss, SSR render)
# - Remaining requests: ~50-100ms (cache hit)
# - Overall hit rate: >80%
```

**Manual Testing**:
```bash
# Start SSR server
yarn ssr:dev

# Test cache miss (first request)
time curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -o /dev/null
# Expected: ~500ms

# Test cache hit (second request)
time curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -o /dev/null
# Expected: ~50-100ms

# Check Redis keys
redis-cli KEYS "ssr:*"

# Check cache metrics
curl http://localhost:3002/health | jq '.cache'

# Test cache invalidation
curl -X POST http://localhost:3002/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"type": "listing", "id": "123"}'

# Verify cache cleared
redis-cli KEYS "ssr:*"
```

### Cache TTL Strategy

**Per-Route TTL**:
```typescript
const CACHE_TTL = {
  homepage: 3600,        // 1 hour (changes less frequently)
  browse: 1800,          // 30 minutes (new listings added)
  listingDetail: 3600,   // 1 hour (listing data stable)
};

// In route handler
const ttl = CACHE_TTL[routeType] || 3600;
await cacheManager.set(cacheKey, html, ttl);
```

**Invalidation Triggers**:
- Listing created → Invalidate browse + homepage
- Listing updated → Invalidate specific listing + browse + homepage
- Listing deleted → Invalidate specific listing + browse + homepage
- Listing approved → Invalidate browse + homepage

### Performance Targets

**Response Times**:
- Cache hit: <100ms (P95)
- Cache miss: <500ms (P95)
- Cache set: <10ms

**Hit Rate**:
- Target: >80%
- Acceptable: >70%
- Poor: <60%

**Redis Memory**:
- Estimate: ~10KB per cached page
- 10,000 cached pages = ~100MB
- Monitor and set max memory limit

### Monitoring and Alerts

**Metrics to Monitor**:
- Cache hit rate (target >80%)
- Cache response time
- Redis memory usage
- Redis connection errors
- Cache invalidation frequency

**Alerts**:
- Hit rate <70% for >1 hour
- Redis connection down
- Redis memory >80% capacity

### References

- [ioredis Documentation](https://github.com/redis/ioredis) - Redis client
- [Redis Caching Strategies](https://redis.io/docs/manual/patterns/caching/) - Best practices
- [Architecture Document](../real-estate-platform/architecture.md) - ADR-006
- [Frontend Architecture Analysis](../real-estate-platform/frontend-architecture-analysis.md) - Section 5.2
- [Epic 8.1](../real-estate-platform/epics.md#story-816-redis-caching-for-ssr) - Story details

### Success Criteria

**Definition of Done**:
- ✅ Redis cache manager created
- ✅ Cache middleware integrated
- ✅ Cache hit/miss flow works
- ✅ Cache TTL configurable
- ✅ Cache key strategy implemented
- ✅ Cache invalidation endpoint works
- ✅ Cache metrics tracked
- ✅ Redis connection reused from Twenty
- ✅ Graceful handling of Redis errors
- ✅ Unit tests pass
- ✅ Performance targets met (<100ms hit, >80% rate)
- ✅ Manual testing successful

**Verification Commands**:
```bash
# Run unit tests
yarn test cache-manager

# Start server
yarn ssr:dev

# Test cache flow
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -w "\nTime: %{time_total}s\n"
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -w "\nTime: %{time_total}s\n"

# Check Redis
redis-cli KEYS "ssr:*"
redis-cli GET "ssr:/listings/123"

# Check metrics
curl http://localhost:3002/health | jq '.cache'

# Test invalidation
curl -X POST http://localhost:3002/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"type": "listing", "id": "123"}'

# Load test
ab -n 1000 -c 10 -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123
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
