# Story 8.4.2: Perplexica API Integration

Status: drafted

## Story
As a developer, I want to integrate Perplexica API for web research, so that we can research similar listings from other platforms.

## Acceptance Criteria

1. **Perplexica API Integration**
   - Given AIResearchJob processing (Story 8.4.1)
   - When job runs
   - Then Perplexica API called to research similar listings
   - And API endpoint configured via environment variables
   - And authentication token included in requests
   - And timeout set to 30 seconds per request
   - And errors handled gracefully with retries

2. **Multi-Source Search**
   - Given listing data (location, price, area, propertyType)
   - When search executed
   - Then searches multiple sources:
     - batdongsan.com.vn
     - chottot.vn
   - And searches by location + price range (±20%)
   - And searches by property type
   - And results aggregated from all sources

3. **Data Extraction from Results**
   - Given API response received
   - When data extracted
   - Then extracts for each similar listing:
     - title (TEXT)
     - price (NUMBER)
     - location (TEXT)
     - contact (TEXT, phone/email)
     - images (ARRAY of URLs)
     - source (TEXT, e.g., "batdongsan")
     - url (TEXT, link to original listing)
   - And validates extracted data
   - And sanitizes HTML/special characters

4. **Data Storage**
   - Given extracted data validated
   - When stored
   - Then saved in `similarListingsFound` field as JSON array
   - And each item contains all extracted fields
   - And array sorted by price similarity
   - And duplicates removed (same URL)

5. **Rate Limiting**
   - Given multiple requests to same source
   - When rate limit enforced
   - Then max 10 requests/minute per source
   - And rate limit tracked in Redis
   - And requests queued if limit exceeded
   - And exponential backoff on rate limit errors

6. **Caching Strategy**
   - Given search query executed
   - When results cached
   - Then cache key based on: location + price range + property type
   - And cache TTL set to 24 hours
   - And cache hit returns cached results
   - And cache miss triggers new API call

## Tasks / Subtasks

- [ ] **Task 1: Setup Perplexica API Configuration** (AC: #1)
  - [ ] Add environment variables:
    ```bash
    PERPLEXICA_API_URL=https://api.perplexica.ai/v1
    PERPLEXICA_API_KEY=your_api_key_here
    PERPLEXICA_TIMEOUT=30000
    ```
  - [ ] Create config service:
    ```typescript
    @Injectable()
    export class PerplexicaConfig {
      get apiUrl(): string {
        return process.env.PERPLEXICA_API_URL || 'https://api.perplexica.ai/v1';
      }

      get apiKey(): string {
        if (!process.env.PERPLEXICA_API_KEY) {
          throw new Error('PERPLEXICA_API_KEY not configured');
        }
        return process.env.PERPLEXICA_API_KEY;
      }

      get timeout(): number {
        return parseInt(process.env.PERPLEXICA_TIMEOUT || '30000');
      }
    }
    ```

- [ ] **Task 2: Create PerplexicaService** (AC: #1, #2)
  - [ ] Create service class:
    ```typescript
    @Injectable()
    export class PerplexicaService {
      private readonly httpService: HttpService;

      constructor(
        private readonly config: PerplexicaConfig,
        private readonly rateLimitService: RateLimitService,
        private readonly cacheService: CacheService,
      ) {
        this.httpService = new HttpService();
      }

      async researchListing(listing: PublicListing): Promise<ResearchData> {
        // Build search query
        const query = this.buildSearchQuery(listing);

        // Check cache
        const cacheKey = this.buildCacheKey(query);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }

        // Search all sources
        const results = await Promise.all([
          this.searchBatDongSan(query),
          this.searchChoTot(query),
        ]);

        // Aggregate results
        const similarListings = results.flat();

        // Cache results
        await this.cacheService.set(cacheKey, JSON.stringify({
          sourcesChecked: ['batdongsan', 'chottot'],
          similarListings,
        }), 86400); // 24 hours

        return {
          sourcesChecked: ['batdongsan', 'chottot'],
          similarListings,
        };
      }

      private buildSearchQuery(listing: PublicListing): SearchQuery {
        const priceMin = listing.price * 0.8;
        const priceMax = listing.price * 1.2;

        return {
          location: `${listing.district}, ${listing.province}`,
          priceMin,
          priceMax,
          area: listing.area,
          propertyType: listing.propertyType,
        };
      }

      private buildCacheKey(query: SearchQuery): string {
        return `perplexica:${query.location}:${query.priceMin}-${query.priceMax}:${query.propertyType}`;
      }
    }
    ```

- [ ] **Task 3: Implement Source-Specific Search Methods** (AC: #2, #3)
  - [ ] Create `searchBatDongSan` method:
    ```typescript
    private async searchBatDongSan(query: SearchQuery): Promise<SimilarListing[]> {
      const source = 'batdongsan';

      // Check rate limit
      await this.rateLimitService.checkLimit(source);

      try {
        const response = await this.httpService.post(
          `${this.config.apiUrl}/search`,
          {
            source: 'batdongsan.com.vn',
            query: {
              location: query.location,
              priceMin: query.priceMin,
              priceMax: query.priceMax,
              propertyType: query.propertyType,
            },
            limit: 20,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.config.timeout,
          }
        ).toPromise();

        // Extract and validate data
        return this.extractListings(response.data.results, source);
      } catch (error) {
        console.error(`BatDongSan search failed:`, error);
        return [];
      }
    }
    ```
  - [ ] Create `searchChoTot` method (similar structure)

- [ ] **Task 4: Implement Data Extraction** (AC: #3)
  - [ ] Create extraction method:
    ```typescript
    private extractListings(results: any[], source: string): SimilarListing[] {
      return results.map(result => {
        try {
          return {
            title: this.sanitize(result.title),
            price: this.parsePrice(result.price),
            location: this.sanitize(result.location),
            contact: this.extractContact(result),
            images: this.extractImages(result.images),
            source,
            url: result.url,
          };
        } catch (error) {
          console.error(`Failed to extract listing from ${source}:`, error);
          return null;
        }
      }).filter(listing => listing !== null && this.validateListing(listing));
    }

    private sanitize(text: string): string {
      if (!text) return '';
      return text
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .trim();
    }

    private parsePrice(priceStr: string): number {
      if (!priceStr) return 0;
      // Remove non-numeric characters except dots and commas
      const cleaned = priceStr.replace(/[^\d.,]/g, '');
      return parseFloat(cleaned.replace(',', '.'));
    }

    private extractContact(result: any): string {
      return result.phone || result.email || result.contact || '';
    }

    private extractImages(images: any): string[] {
      if (!Array.isArray(images)) return [];
      return images.filter(img => typeof img === 'string' && img.startsWith('http'));
    }

    private validateListing(listing: SimilarListing): boolean {
      return !!(
        listing.title &&
        listing.price > 0 &&
        listing.location &&
        listing.url
      );
    }
    ```

- [ ] **Task 5: Implement Rate Limiting** (AC: #5)
  - [ ] Create `RateLimitService`:
    ```typescript
    @Injectable()
    export class RateLimitService {
      constructor(private readonly redis: Redis) {}

      async checkLimit(source: string): Promise<void> {
        const key = `ratelimit:perplexica:${source}`;
        const limit = 10; // 10 requests per minute
        const window = 60; // 60 seconds

        const current = await this.redis.incr(key);

        if (current === 1) {
          await this.redis.expire(key, window);
        }

        if (current > limit) {
          const ttl = await this.redis.ttl(key);
          throw new RateLimitException(`Rate limit exceeded for ${source}. Retry in ${ttl}s`);
        }
      }
    }
    ```
  - [ ] Handle rate limit errors with exponential backoff:
    ```typescript
    async searchWithRetry(searchFn: () => Promise<any>, maxRetries = 3): Promise<any> {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await searchFn();
        } catch (error) {
          if (error instanceof RateLimitException && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`Rate limited, retrying in ${delay}ms...`);
            await this.sleep(delay);
          } else {
            throw error;
          }
        }
      }
    }

    private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    ```

- [ ] **Task 6: Implement Caching** (AC: #6)
  - [ ] Cache search results:
    ```typescript
    async getCachedOrFetch(
      cacheKey: string,
      fetchFn: () => Promise<any>,
      ttl: number = 86400
    ): Promise<any> {
      // Check cache
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Fetch fresh data
      const data = await fetchFn();

      // Cache result
      await this.cacheService.set(cacheKey, JSON.stringify(data), ttl);
      console.log(`Cached result for ${cacheKey} (TTL: ${ttl}s)`);

      return data;
    }
    ```

- [ ] **Task 7: Create Unit Tests**
  - [ ] Test API configuration
  - [ ] Test search query building
  - [ ] Test data extraction and sanitization
  - [ ] Test rate limiting
  - [ ] Test caching
  - [ ] Test error handling
  - [ ] Achieve >80% coverage

- [ ] **Task 8: Integration Testing**
  - [ ] Test complete research flow with mock API
  - [ ] Test rate limit enforcement
  - [ ] Test cache hit/miss scenarios
  - [ ] Test error handling and retries

- [ ] **Task 9: Manual Testing**
  - [ ] Test with real Perplexica API (if available)
  - [ ] Verify data extraction accuracy
  - [ ] Test rate limiting with multiple requests
  - [ ] Verify cache working correctly
  - [ ] Check Redis for rate limit and cache keys

## Dev Notes

### Architecture Context

**Perplexica API Integration**: External API for web scraping
- Searches batdongsan.com.vn and chottot.vn
- Rate limited to 10 requests/minute per source
- Results cached for 24 hours
- Exponential backoff on errors

**Key Design Decisions**:
- Use Perplexica API (not direct scraping)
- Cache results to reduce API costs
- Rate limiting per source (not global)
- Sanitize and validate all extracted data
- Graceful degradation on API failures

### Implementation Details

**Search Query**:
- Location: District + Province
- Price Range: ±20% of listing price
- Property Type: Exact match
- Limit: 20 results per source

**Data Extraction**:
- Title: Sanitized text
- Price: Parsed number (VND)
- Location: Sanitized text
- Contact: Phone or email
- Images: Array of URLs
- Source: "batdongsan" or "chottot"
- URL: Link to original listing

**Rate Limiting**:
- Redis-based sliding window
- 10 requests/minute per source
- Exponential backoff on limit exceeded

**Caching**:
- Cache key: location + price range + property type
- TTL: 24 hours
- Stored in Redis

### Testing Strategy

**Unit Tests**: API calls (mocked), data extraction, rate limiting, caching
**Integration Tests**: End-to-end research flow with mock API
**Manual Tests**: Real API calls, data validation

### References

- [Epic 8.4](../real-estate-platform/epics.md#story-842-perplexica-api-integration)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.4
- [Story 8.4.1](./8-4-1-airesearch-entity-job-setup.md) - Job infrastructure

### Success Criteria

**Definition of Done**:
- ✅ Perplexica API integrated
- ✅ Multi-source search working (batdongsan, chottot)
- ✅ Data extraction and validation working
- ✅ Rate limiting implemented
- ✅ Caching implemented
- ✅ Error handling with retries
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 10 hours

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
