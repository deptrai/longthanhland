# Story 8.8.3: Performance Optimization & Monitoring

Status: drafted

## Story
As a developer, I want to optimize platform performance and setup monitoring, so that we ensure fast load times and catch issues early.

## Acceptance Criteria

1. **Performance Targets**: SSR render <500ms (P95), API response <200ms (P95), Lighthouse SEO >90, page load <2s (P75), cache hit rate >80%
2. **Optimizations**: Database indexes, query optimization (EXPLAIN ANALYZE), Redis caching, image optimization (WebP, lazy loading), CDN, code splitting, Gzip compression
3. **Monitoring**: APM (New Relic/Datadog), error tracking (Sentry), uptime monitoring (Pingdom), custom metrics (SSR, cache, API latency), alerts (Slack/email)

## Tasks / Subtasks

- [ ] **Task 1: Database Optimization** (AC: #2)
  ```sql
  -- Add indexes on frequently queried fields
  CREATE INDEX idx_public_listing_status ON public_listing(status);
  CREATE INDEX idx_public_listing_category ON public_listing(category);
  CREATE INDEX idx_public_listing_price ON public_listing(price);
  CREATE INDEX idx_public_listing_location ON public_listing(city, district);
  CREATE INDEX idx_inquiry_listing ON inquiry(listing_id);
  CREATE INDEX idx_inquiry_status ON inquiry(status);

  -- Use EXPLAIN ANALYZE to optimize slow queries
  EXPLAIN ANALYZE
  SELECT * FROM public_listing
  WHERE status = 'APPROVED' AND category = 'apartment'
  ORDER BY created_at DESC
  LIMIT 20;
  ```

- [ ] **Task 2: Multi-level Caching** (AC: #2)
  ```typescript
  @Injectable()
  export class CachingService {
    private memoryCache = new Map<string, any>();

    constructor(private readonly redisCache: Cache) {}

    async get(key: string): Promise<any> {
      // L1: Memory cache
      if (this.memoryCache.has(key)) {
        return this.memoryCache.get(key);
      }

      // L2: Redis cache
      const cached = await this.redisCache.get(key);
      if (cached) {
        this.memoryCache.set(key, cached);
        return cached;
      }

      return null;
    }

    async set(key: string, value: any, ttl: number): Promise<void> {
      this.memoryCache.set(key, value);
      await this.redisCache.set(key, value, ttl);
    }
  }
  ```

- [ ] **Task 3: Image Optimization** (AC: #2)
  ```typescript
  import sharp from 'sharp';

  @Injectable()
  export class ImageService {
    async optimizeImage(buffer: Buffer): Promise<Buffer> {
      return await sharp(buffer)
        .resize(1200, 800, { fit: 'inside' })
        .webp({ quality: 80 })
        .toBuffer();
    }

    async generateThumbnail(buffer: Buffer): Promise<Buffer> {
      return await sharp(buffer)
        .resize(300, 200, { fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
    }
  }

  // In React component
  <picture>
    <source srcSet={`${image}.webp`} type="image/webp" />
    <img src={image} loading="lazy" alt={alt} />
  </picture>
  ```

- [ ] **Task 4: Code Splitting** (AC: #2)
  ```typescript
  // Lazy load components
  const SellerAnalyticsDashboard = React.lazy(() => import('./SellerAnalyticsDashboard'));
  const RevenueDashboard = React.lazy(() => import('./RevenueDashboard'));
  const InquiryDashboard = React.lazy(() => import('./InquiryDashboard'));

  // In routes
  <Suspense fallback={<Loading />}>
    <Route path="/analytics" element={<SellerAnalyticsDashboard />} />
    <Route path="/revenue" element={<RevenueDashboard />} />
    <Route path="/inquiries" element={<InquiryDashboard />} />
  </Suspense>
  ```

- [ ] **Task 5: APM Integration** (AC: #3)
  ```typescript
  // New Relic setup
  import newrelic from 'newrelic';

  @Injectable()
  export class PerformanceMonitoringService {
    trackTransaction(name: string, callback: () => Promise<any>) {
      return newrelic.startBackgroundTransaction(name, async () => {
        const start = Date.now();
        try {
          const result = await callback();
          newrelic.recordMetric(`Custom/${name}/Duration`, Date.now() - start);
          return result;
        } catch (error) {
          newrelic.noticeError(error);
          throw error;
        }
      });
    }
  }
  ```

- [ ] **Task 6: Sentry Integration** (AC: #3)
  ```typescript
  import * as Sentry from '@sentry/node';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });

  // Error boundary
  @Catch()
  export class SentryExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
      Sentry.captureException(exception);
      // ... handle error
    }
  }
  ```

- [ ] **Task 7: Custom Metrics** (AC: #3)
  ```typescript
  @Injectable()
  export class MetricsService {
    async trackSSRPerformance(duration: number) {
      await this.record('ssr.render.duration', duration);
    }

    async trackCacheHitRate(hit: boolean) {
      await this.record('cache.hit', hit ? 1 : 0);
    }

    async trackAPILatency(endpoint: string, duration: number) {
      await this.record(`api.${endpoint}.latency`, duration);
    }
  }
  ```

- [ ] **Task 8: Load Testing** (AC: #1)
  ```javascript
  // k6 load test
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export const options = {
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
    },
  };

  export default function () {
    const res = http.get('https://example.com/browse');
    check(res, { 'status is 200': (r) => r.status === 200 });
    sleep(1);
  }
  ```

- [ ] **Task 9: Testing**
  - [ ] Run load tests (k6)
  - [ ] Verify performance targets
  - [ ] Test monitoring alerts
  - [ ] Validate Lighthouse scores
  - [ ] Achieve >80% coverage

## Dev Notes

**Architecture**: Database indexes, multi-level caching (memory + Redis), image optimization (Sharp, WebP), CDN (CloudFlare), code splitting (React.lazy), APM (New Relic), error tracking (Sentry), custom metrics, load testing (k6)

**Key Decisions**: P95 targets (SSR <500ms, API <200ms), cache hit rate >80%, Lighthouse SEO >90, multi-level caching for performance, WebP for images, lazy loading, code splitting for large components

**Implementation**: Database indexes on frequently queried fields, CachingService (memory + Redis), ImageService (Sharp optimization), code splitting (React.lazy), APM integration (New Relic), Sentry error tracking, custom metrics (SSR, cache, API), load testing (k6)

**Testing**: Load tests, performance benchmarks, monitoring alerts

### Success Criteria

- ✅ Performance targets met (SSR <500ms, API <200ms)
- ✅ Database indexes added
- ✅ Caching implemented (>80% hit rate)
- ✅ Images optimized (WebP, lazy loading)
- ✅ CDN configured
- ✅ Code splitting implemented
- ✅ APM integrated
- ✅ Sentry configured
- ✅ Custom metrics tracking
- ✅ Load tests pass
- ✅ Lighthouse SEO >90
- ✅ Manual testing successful

**Estimate**: 16 hours

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
