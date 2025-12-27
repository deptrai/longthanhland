# Story 8.8.2: Dynamic Sitemap & Structured Data

Status: drafted

## Story
As a developer, I want to generate dynamic sitemap and structured data, so that search engines better index listings.

## Acceptance Criteria

1. **Sitemap Generation**: `/sitemap.xml` endpoint, all public URLs (homepage, browse, approved listings, categories), URL metadata (lastmod, changefreq, priority), daily updates (2 AM), content-type: application/xml, cached in Redis (24h TTL)
2. **Structured Data**: Schema.org RealEstateListing JSON-LD, properties (name, description, price, address, images, offers), validates with Google Rich Results Test, embedded in SSR pages
3. **Submission**: Submitted to Google Search Console, Bing Webmaster Tools, sitemap URL in robots.txt

## Tasks / Subtasks

- [ ] **Task 1: Sitemap Endpoint** (AC: #1)
  ```typescript
  @Controller()
  export class SitemapController {
    constructor(
      private readonly sitemapService: SitemapService,
      private readonly cacheManager: Cache,
    ) {}

    @Get('sitemap.xml')
    @Header('Content-Type', 'application/xml')
    async getSitemap(@Res() res: Response) {
      const cached = await this.cacheManager.get('sitemap');
      if (cached) {
        return res.send(cached);
      }

      const sitemap = await this.sitemapService.generate();
      await this.cacheManager.set('sitemap', sitemap, 86400); // 24h
      return res.send(sitemap);
    }
  }
  ```

- [ ] **Task 2: Sitemap Generation** (AC: #1)
  ```typescript
  import { SitemapStream, streamToPromise } from 'sitemap';

  @Injectable()
  export class SitemapService {
    constructor(
      private readonly publicListingService: PublicListingService,
    ) {}

    async generate(): Promise<string> {
      const stream = new SitemapStream({ hostname: 'https://example.com' });

      // Homepage
      stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });

      // Browse page
      stream.write({ url: '/browse', changefreq: 'daily', priority: 0.9 });

      // Categories
      const categories = ['apartment', 'house', 'land', 'commercial'];
      categories.forEach(cat => {
        stream.write({ url: `/browse?category=${cat}`, changefreq: 'daily', priority: 0.8 });
      });

      // Listings
      const listings = await this.publicListingService.findApproved();
      listings.forEach(listing => {
        stream.write({
          url: `/listing/${listing.id}`,
          lastmod: listing.updatedAt.toISOString(),
          changefreq: 'weekly',
          priority: 0.7,
        });
      });

      stream.end();
      const sitemap = await streamToPromise(stream);
      return sitemap.toString();
    }
  }
  ```

- [ ] **Task 3: Daily Sitemap Job** (AC: #1)
  ```typescript
  @Injectable()
  export class GenerateSitemapJob {
    constructor(
      private readonly sitemapService: SitemapService,
      private readonly cacheManager: Cache,
    ) {}

    @Cron('0 2 * * *') // Daily at 2 AM
    async generateSitemap() {
      const sitemap = await this.sitemapService.generate();
      await this.cacheManager.set('sitemap', sitemap, 86400);
      console.log('Sitemap generated and cached');
    }
  }
  ```

- [ ] **Task 4: Structured Data** (AC: #2)
  ```typescript
  const generateStructuredData = (listing: PublicListing) => {
    return {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: listing.title,
      description: listing.description,
      url: `https://example.com/listing/${listing.id}`,
      image: listing.imageIds.map(id => `https://example.com/images/${id}`),
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'VND',
        availability: 'https://schema.org/InStock',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: listing.district,
        addressRegion: listing.city,
        addressCountry: 'VN',
      },
    };
  };

  // In SSR page
  <Head>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(generateStructuredData(listing)),
      }}
    />
  </Head>
  ```

- [ ] **Task 5: robots.txt** (AC: #3)
  ```
  User-agent: *
  Allow: /
  Sitemap: https://example.com/sitemap.xml
  ```

- [ ] **Task 6: Testing**
  - [ ] Test sitemap generation
  - [ ] Validate structured data with Google Rich Results Test
  - [ ] Test caching
  - [ ] Verify robots.txt
  - [ ] Achieve >80% coverage

## Dev Notes

**Architecture**: Express endpoint for sitemap.xml, daily cron job (2 AM), Redis cache (24h), Schema.org JSON-LD for listings, robots.txt with sitemap URL

**Key Decisions**: Daily sitemap generation, 24h cache, RealEstateListing schema type, priority: homepage (1.0), browse (0.9), categories (0.8), listings (0.7)

**Implementation**: SitemapController (Express endpoint), SitemapService (generation logic), GenerateSitemapJob (daily cron), structured data (JSON-LD in SSR pages)

**Testing**: Sitemap generation, structured data validation, caching

### Success Criteria

- ✅ Sitemap endpoint working
- ✅ Daily generation working
- ✅ Caching working (24h)
- ✅ Structured data validates
- ✅ robots.txt configured
- ✅ Submitted to search consoles
- ✅ Unit tests pass (>80% coverage)
- ✅ Manual testing successful

**Estimate**: 6 hours

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
