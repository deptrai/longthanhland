# Story 8.3.5: Browse & Search Listings

Status: drafted

## Story
As a buyer, I want to browse and search property listings, so that I can find properties matching my criteria.

## Acceptance Criteria

1. **Browse Page with Grid/List View**
   - Given buyer accesses browse page
   - When page loads
   - Then displays APPROVED listings only
   - And shows toggle for grid/list view
   - And grid view shows 3 columns on desktop, 2 on tablet, 1 on mobile
   - And list view shows full-width cards
   - And each listing card shows: image, title, price, location, area, bedrooms, bathrooms, trust score badge
   - And pagination shows 20 listings per page

2. **Advanced Filters**
   - Given filter sidebar displayed
   - When user applies filters
   - Then filters include:
     - **Location**: Province dropdown, District dropdown (dynamic based on province)
     - **Property Type**: Checkboxes (Apartment, House, Land, Villa, Townhouse, Office)
     - **Listing Type**: Radio (Sale, Rent, Both)
     - **Price Range**: Min/Max inputs with VND formatting
     - **Area Range**: Min/Max inputs (m²)
     - **Bedrooms**: Dropdown (1, 2, 3, 4, 5+)
     - **Bathrooms**: Dropdown (1, 2, 3, 4+)
   - And results update dynamically (debounced 500ms)
   - And URL params updated for sharing
   - And filter count badge shown

3. **Sort Options**
   - Given listings displayed
   - When user selects sort option
   - Then options include:
     - Newest First (default)
     - Oldest First
     - Price: Low to High
     - Price: High to Low
     - Area: Small to Large
     - Area: Large to Small
   - And results re-sorted immediately
   - And sort persisted in URL params

4. **Full-text Search with Vietnamese Support**
   - Given search input field
   - When user types query
   - Then searches in: title, description, location
   - And supports Vietnamese diacritics (á, à, ả, ã, ạ, etc.)
   - And searches without diacritics also work
   - And highlights matching terms in results
   - And shows "No results" message if empty
   - And suggests removing filters if no results

5. **Cursor-based Pagination**
   - Given listings paginated
   - When user navigates pages
   - Then uses cursor-based pagination (not offset)
   - And shows: Previous, 1, 2, 3, ..., Last
   - And displays current page and total pages
   - And scrolls to top on page change
   - And loading state shown during fetch

6. **SSR for SEO**
   - Given bot/crawler accesses page
   - When page rendered
   - Then server-side rendered with:
     - All listings pre-rendered
     - Meta tags (title, description, OG tags)
     - Structured data (JSON-LD ItemList)
     - Canonical URL
   - And bot detection via user-agent
   - And cached in Redis (1 hour TTL)

7. **Redis Caching**
   - Given popular filter combinations
   - When query executed
   - Then cache results in Redis:
     - Key: `listings:${filterHash}`
     - TTL: 5 minutes
     - Invalidate on new listing approved
   - And cache hit rate >80% target

## Tasks / Subtasks

- [ ] **Task 1: Create Search Query with Filters** (AC: #1, #2, #3, #4)
  - [ ] Create `searchPublicListings` query:
    ```typescript
    @Query(() => SearchListingsOutput)
    async searchPublicListings(
      @Args('filters', { nullable: true }) filters?: ListingFilters,
      @Args('search', { nullable: true }) search?: string,
      @Args('sortBy', { defaultValue: 'createdAt' }) sortBy?: string,
      @Args('sortOrder', { defaultValue: 'DESC' }) sortOrder?: 'ASC' | 'DESC',
      @Args('cursor', { nullable: true }) cursor?: string,
      @Args('limit', { defaultValue: 20 }) limit?: number,
    ): Promise<SearchListingsOutput> {
      // Build cache key
      const cacheKey = this.buildCacheKey(filters, search, sortBy, sortOrder, cursor);

      // Check cache
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Build query
      const queryBuilder = this.publicListingRepository
        .createQueryBuilder('listing')
        .where('listing.status = :status', { status: 'APPROVED' })
        .andWhere('listing.expiresAt > :now', { now: new Date() });

      // Apply filters
      if (filters?.province) {
        queryBuilder.andWhere('listing.province = :province', { province: filters.province });
      }

      if (filters?.district) {
        queryBuilder.andWhere('listing.district = :district', { district: filters.district });
      }

      if (filters?.propertyTypes && filters.propertyTypes.length > 0) {
        queryBuilder.andWhere('listing.propertyType IN (:...types)', { types: filters.propertyTypes });
      }

      if (filters?.listingType) {
        queryBuilder.andWhere('listing.listingType = :listingType', { listingType: filters.listingType });
      }

      if (filters?.minPrice) {
        queryBuilder.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
      }

      if (filters?.maxPrice) {
        queryBuilder.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });
      }

      if (filters?.minArea) {
        queryBuilder.andWhere('listing.area >= :minArea', { minArea: filters.minArea });
      }

      if (filters?.maxArea) {
        queryBuilder.andWhere('listing.area <= :maxArea', { maxArea: filters.maxArea });
      }

      if (filters?.bedrooms) {
        queryBuilder.andWhere('listing.bedrooms >= :bedrooms', { bedrooms: filters.bedrooms });
      }

      if (filters?.bathrooms) {
        queryBuilder.andWhere('listing.bathrooms >= :bathrooms', { bathrooms: filters.bathrooms });
      }

      // Full-text search (Vietnamese support)
      if (search) {
        queryBuilder.andWhere(
          `to_tsvector('vietnamese', listing.title || ' ' || listing.description || ' ' || listing.location) @@ plainto_tsquery('vietnamese', :search)`,
          { search }
        );
      }

      // Cursor pagination
      if (cursor) {
        const decodedCursor = this.decodeCursor(cursor);
        queryBuilder.andWhere('listing.createdAt < :cursorDate', { cursorDate: decodedCursor });
      }

      // Sort
      queryBuilder.orderBy(`listing.${sortBy}`, sortOrder);
      queryBuilder.take(limit + 1); // Fetch one extra to check if there's next page

      // Execute
      const listings = await queryBuilder.getMany();
      const hasNextPage = listings.length > limit;
      const results = hasNextPage ? listings.slice(0, limit) : listings;
      const nextCursor = hasNextPage ? this.encodeCursor(results[results.length - 1].createdAt) : null;

      const output = {
        listings: results,
        nextCursor,
        hasNextPage,
      };

      // Cache result
      await this.cacheService.set(cacheKey, JSON.stringify(output), 300); // 5 min TTL

      return output;
    }
    ```

- [ ] **Task 2: Create Browse Page Component** (AC: #1, #2, #3)
  - [ ] Create `BrowsePage` component:
    ```typescript
    const BrowsePage = () => {
      const [view, setView] = useState<'grid' | 'list'>('grid');
      const [filters, setFilters] = useState<ListingFilters>({});
      const [search, setSearch] = useState('');
      const [sortBy, setSortBy] = useState('createdAt');
      const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
      const [cursor, setCursor] = useState<string | null>(null);

      const { data, loading, fetchMore } = useQuery(SEARCH_LISTINGS, {
        variables: { filters, search, sortBy, sortOrder, cursor, limit: 20 },
      });

      // Update URL params
      useEffect(() => {
        const params = new URLSearchParams();
        if (filters.province) params.set('province', filters.province);
        if (filters.district) params.set('district', filters.district);
        if (search) params.set('q', search);
        if (sortBy !== 'createdAt') params.set('sort', sortBy);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }, [filters, search, sortBy]);

      const handleLoadMore = () => {
        if (data?.searchListings.hasNextPage) {
          fetchMore({
            variables: { cursor: data.searchListings.nextCursor },
          });
        }
      };

      return (
        <div className="browse-page">
          <Header>
            <h1>Browse Properties</h1>
            <ViewToggle value={view} onChange={setView} />
          </Header>

          <div className="browse-content">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters({})}
            />

            <div className="listings-section">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by title, description, or location..."
              />

              <Toolbar>
                <ResultCount count={data?.searchListings.listings.length} />
                <SortSelect
                  value={sortBy}
                  order={sortOrder}
                  onChange={(sort, order) => {
                    setSortBy(sort);
                    setSortOrder(order);
                  }}
                />
              </Toolbar>

              {loading && <LoadingSpinner />}

              {!loading && data?.searchListings.listings.length === 0 && (
                <EmptyState
                  message="No listings found"
                  suggestion="Try removing some filters"
                />
              )}

              <ListingGrid view={view}>
                {data?.searchListings.listings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    view={view}
                  />
                ))}
              </ListingGrid>

              {data?.searchListings.hasNextPage && (
                <LoadMoreButton onClick={handleLoadMore}>
                  Load More
                </LoadMoreButton>
              )}
            </div>
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 3: Create Filter Sidebar Component** (AC: #2)
  - [ ] Province/District cascading dropdowns
  - [ ] Property type checkboxes
  - [ ] Listing type radio buttons
  - [ ] Price range inputs with VND formatting
  - [ ] Area range inputs
  - [ ] Bedrooms/Bathrooms dropdowns
  - [ ] Reset filters button
  - [ ] Filter count badge

- [ ] **Task 4: Implement Vietnamese Full-text Search** (AC: #4)
  - [ ] Configure PostgreSQL Vietnamese dictionary
  - [ ] Create full-text search index:
    ```sql
    CREATE INDEX idx_listing_search_vi ON public_listing
    USING gin(to_tsvector('vietnamese', title || ' ' || description || ' ' || location));
    ```
  - [ ] Test search with diacritics: "Hà Nội", "Ha Noi" both work
  - [ ] Implement search highlighting in results

- [ ] **Task 5: Implement Cursor-based Pagination** (AC: #5)
  - [ ] Create cursor encoding/decoding:
    ```typescript
    encodeCursor(date: Date): string {
      return Buffer.from(date.toISOString()).toString('base64');
    }

    decodeCursor(cursor: string): Date {
      return new Date(Buffer.from(cursor, 'base64').toString());
    }
    ```
  - [ ] Fetch limit + 1 to check for next page
  - [ ] Return nextCursor and hasNextPage
  - [ ] Implement "Load More" button

- [ ] **Task 6: Implement SSR** (AC: #6)
  - [ ] Use Epic 8.1 SSR infrastructure
  - [ ] Create SSR route in Express:
    ```typescript
    app.get('/listings', async (req, res) => {
      // Detect bot
      const isBot = /bot|crawler|spider/i.test(req.headers['user-agent']);

      if (isBot) {
        // Server-side render
        const filters = parseFiltersFromQuery(req.query);
        const listings = await fetchListings(filters);

        const html = renderToString(
          <BrowsePage initialData={listings} />
        );

        const metaTags = generateMetaTags({
          title: 'Browse Properties | Real Estate Marketplace',
          description: `Find ${listings.length}+ properties for sale and rent`,
          url: req.url,
        });

        const structuredData = generateListingStructuredData(listings);

        res.send(renderFullPage(html, metaTags, structuredData));
      } else {
        // Client-side render
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
    ```
  - [ ] Generate meta tags dynamically
  - [ ] Add structured data (JSON-LD)

- [ ] **Task 7: Implement Redis Caching** (AC: #7)
  - [ ] Create cache key builder:
    ```typescript
    buildCacheKey(filters, search, sortBy, sortOrder, cursor): string {
      const filterStr = JSON.stringify(filters);
      const hash = crypto.createHash('md5').update(filterStr + search + sortBy + sortOrder + cursor).digest('hex');
      return `listings:${hash}`;
    }
    ```
  - [ ] Cache query results (5 min TTL)
  - [ ] Invalidate cache on listing approval
  - [ ] Monitor cache hit rate

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test query with various filter combinations
  - [ ] Test Vietnamese full-text search
  - [ ] Test cursor pagination
  - [ ] Test cache key generation
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Integration Testing**
  - [ ] Test complete browse and filter flow
  - [ ] Test search with Vietnamese text
  - [ ] Test pagination
  - [ ] Test SSR rendering
  - [ ] Test cache hit/miss scenarios

- [ ] **Task 10: Manual Testing**
  - [ ] Browse listings with various filters
  - [ ] Search with Vietnamese keywords
  - [ ] Test pagination (load more)
  - [ ] Verify SSR with curl/bot user-agent
  - [ ] Check cache hit rate in Redis

## Dev Notes

### Architecture Context

**Browse & Search Pattern**: Filtered listing discovery
- Advanced filters for precise search
- Full-text search with Vietnamese support
- Cursor-based pagination for performance
- SSR for SEO optimization
- Redis caching for speed

**Key Design Decisions**:
- Cursor pagination (better than offset for large datasets)
- Vietnamese full-text search (PostgreSQL dictionary)
- SSR only for bots (performance)
- Redis cache with 5 min TTL
- Dynamic filters update URL params (shareable)

### Implementation Details

**Filter Options**:
- Location: Province → District (cascading)
- Property Type: Multiple selection
- Listing Type: Sale/Rent
- Price Range: Min/Max
- Area Range: Min/Max (m²)
- Bedrooms: 1, 2, 3, 4, 5+
- Bathrooms: 1, 2, 3, 4+

**Sort Options**:
- Newest First (default)
- Oldest First
- Price: Low to High / High to Low
- Area: Small to Large / Large to Small

**Pagination**:
- Cursor-based (not offset)
- 20 listings per page
- "Load More" button
- Fetch limit + 1 to check next page

**Caching Strategy**:
- Cache key: MD5 hash of filters + search + sort
- TTL: 5 minutes
- Invalidate on listing approval
- Target: >80% hit rate

### Testing Strategy

**Unit Tests**: Query logic, filter building, cursor encoding
**Integration Tests**: End-to-end browse and search flows
**Manual Tests**: UI interactions, Vietnamese search, SSR verification

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-835-browse--search-listings)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3
- [Epic 8.1](../real-estate-platform/epics.md#epic-81-foundation--ssr-setup) - SSR infrastructure

### Success Criteria

**Definition of Done**:
- ✅ Browse page with grid/list view working
- ✅ Advanced filters working
- ✅ Sort options working
- ✅ Vietnamese full-text search working
- ✅ Cursor-based pagination working
- ✅ SSR for bots working
- ✅ Redis caching implemented
- ✅ URL params for sharing working
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
