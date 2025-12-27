# Story 8.3.6: Listing Detail Page with SSR

Status: drafted

## Story
As a buyer, I want to view detailed listing information, so that I can decide if interested.

## Acceptance Criteria

1. **Comprehensive Detail Page**
   - Given buyer accesses listing detail page
   - When page loads
   - Then displays:
     - **Image Gallery**: Main image + thumbnails, lightbox view, zoom, navigation arrows
     - **Basic Info**: Title, price (VND), listing type (Sale/Rent), property type, status badge
     - **Property Details**: Area (m²), bedrooms, bathrooms, floor, orientation
     - **Location**: Full address, province, district, ward, Google Maps embed with marker
     - **Description**: Full rich text description
     - **Seller Info**: Name, phone (masked), response rate, avg response time, member since
     - **Trust Score**: Badge with score (if calculated)
     - **AI Summary**: Key highlights (if available)
     - **Stats**: Views, inquiries, days listed
     - **Inquiry Form**: Contact seller button → modal with form
   - And layout responsive (mobile, tablet, desktop)

2. **SSR for Bots (SEO Critical)**
   - Given bot/crawler accesses page
   - When page rendered
   - Then server-side rendered with:
     - **Dynamic Meta Tags**:
       - `<title>`: "{title} - {price} - {location}"
       - `<meta name="description">`: First 160 chars of description
       - **Open Graph**: og:title, og:description, og:image, og:url, og:type
       - **Twitter Card**: twitter:card, twitter:title, twitter:description, twitter:image
     - **Structured Data (JSON-LD)**: Schema.org RealEstateListing with all fields
     - **Canonical URL**: `https://domain.com/listings/{id}`
     - **All content pre-rendered**: No client-side data fetching for bots
   - And bot detection via user-agent
   - And cached in Redis (1 hour TTL)

3. **View Tracking**
   - Given user views listing detail page
   - When page loads
   - Then increments `viewCount` by 1
   - And tracks unique views (IP-based, 24h window)
   - And tracks time on page
   - And logs to analytics

4. **Similar Listings Recommendation**
   - Given listing displayed
   - When page loads
   - Then shows 4 similar listings at bottom based on:
     - Same province and district
     - Same property type
     - Price within ±30% range
     - Sorted by relevance score
   - And displays: image, title, price, location, area
   - And links to detail pages

5. **Image Gallery with Lightbox**
   - Given images displayed
   - When user clicks image
   - Then opens lightbox with:
     - Full-screen view
     - Navigation arrows (prev/next)
     - Thumbnail strip at bottom
     - Zoom in/out
     - Close button
     - Keyboard navigation (arrow keys, ESC)
   - And smooth transitions

6. **Google Maps Integration**
   - Given location coordinates
   - When map section displayed
   - Then shows:
     - Google Maps Embed with marker
     - Zoom level 15
     - Marker at exact coordinates
     - "View on Google Maps" link
   - And map interactive (pan, zoom)

7. **Inquiry Form**
   - Given buyer interested
   - When clicks "Contact Seller"
   - Then modal displayed with form:
     - Name (required)
     - Email (required)
     - Phone (required, Vietnamese format)
     - Message (required, max 500 chars)
     - Preferred contact method (Email/Phone)
   - And on submit:
     - Validates fields
     - Sends inquiry to seller via email
     - Increments `contactCount`
     - Shows success message
     - Closes modal

## Tasks / Subtasks

- [ ] **Task 1: Create Listing Detail Query** (AC: #1)
  - [ ] Create `getPublicListingDetail` query:
    ```typescript
    @Query(() => PublicListing)
    async getPublicListingDetail(
      @Args('id') id: string,
      @Context() context: any,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      if (!listing || listing.status !== 'APPROVED') {
        throw new NotFoundException('Listing not found');
      }

      // Track view (async, don't block response)
      this.trackView(id, context.req.ip);

      return listing;
    }
    ```

- [ ] **Task 2: Create Detail Page Component** (AC: #1)
  - [ ] Create `ListingDetailPage` component:
    ```typescript
    const ListingDetailPage = ({ listingId }) => {
      const { data, loading } = useQuery(GET_LISTING_DETAIL, {
        variables: { id: listingId },
      });

      const [lightboxOpen, setLightboxOpen] = useState(false);
      const [currentImageIndex, setCurrentImageIndex] = useState(0);
      const [inquiryModalOpen, setInquiryModalOpen] = useState(false);

      if (loading) return <LoadingSpinner />;
      if (!data?.listing) return <NotFound />;

      const listing = data.listing;

      return (
        <div className="listing-detail-page">
          <Breadcrumbs listing={listing} />

          <ImageGallery
            images={listing.images}
            onImageClick={(index) => {
              setCurrentImageIndex(index);
              setLightboxOpen(true);
            }}
          />

          <div className="detail-content">
            <div className="main-content">
              <ListingHeader
                title={listing.title}
                price={listing.price}
                listingType={listing.listingType}
                status={listing.status}
              />

              <PropertyDetails
                area={listing.area}
                bedrooms={listing.bedrooms}
                bathrooms={listing.bathrooms}
                floor={listing.floor}
                orientation={listing.orientation}
                propertyType={listing.propertyType}
              />

              <Description content={listing.description} />

              <LocationSection
                address={listing.location}
                province={listing.province}
                district={listing.district}
                ward={listing.ward}
                latitude={listing.latitude}
                longitude={listing.longitude}
              />

              <SimilarListings listingId={listing.id} />
            </div>

            <div className="sidebar">
              <SellerCard
                seller={listing.owner}
                trustScore={listing.trustScore}
                onContact={() => setInquiryModalOpen(true)}
              />

              <StatsCard
                viewCount={listing.viewCount}
                contactCount={listing.contactCount}
                daysListed={listing.daysListed}
              />

              {listing.aiSummary && (
                <AISummaryCard summary={listing.aiSummary} />
              )}
            </div>
          </div>

          {lightboxOpen && (
            <ImageLightbox
              images={listing.images}
              currentIndex={currentImageIndex}
              onClose={() => setLightboxOpen(false)}
              onNavigate={setCurrentImageIndex}
            />
          )}

          {inquiryModalOpen && (
            <InquiryModal
              listing={listing}
              onClose={() => setInquiryModalOpen(false)}
            />
          )}
        </div>
      );
    };
    ```

- [ ] **Task 3: Implement SSR** (AC: #2)
  - [ ] Use Epic 8.1 SSR infrastructure
  - [ ] Create SSR route:
    ```typescript
    app.get('/listings/:id', async (req, res) => {
      const { id } = req.params;
      const isBot = /bot|crawler|spider|googlebot|bingbot/i.test(req.headers['user-agent']);

      if (isBot) {
        // Check cache
        const cacheKey = `listing:ssr:${id}`;
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.send(cached);
        }

        // Fetch listing
        const listing = await fetchListing(id);
        if (!listing) {
          return res.status(404).send('Not found');
        }

        // Render
        const html = renderToString(<ListingDetailPage listingId={id} initialData={listing} />);

        // Generate meta tags
        const metaTags = generateMetaTags({
          title: `${listing.title} - ${formatPrice(listing.price)} - ${listing.location}`,
          description: listing.description.substring(0, 160),
          image: listing.images[0]?.url,
          url: `${process.env.PUBLIC_URL}/listings/${id}`,
          type: 'product',
        });

        // Generate structured data
        const structuredData = generateStructuredData(listing);

        const fullHtml = renderFullPage(html, metaTags, structuredData);

        // Cache for 1 hour
        await redis.setex(cacheKey, 3600, fullHtml);

        res.send(fullHtml);
      } else {
        // Client-side render
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
    ```

- [ ] **Task 4: Generate Dynamic Meta Tags** (AC: #2)
  - [ ] Create `generateMetaTags` function:
    ```typescript
    function generateMetaTags(data: MetaTagData): string {
      return `
        <title>${escapeHtml(data.title)}</title>
        <meta name="description" content="${escapeHtml(data.description)}" />
        <link rel="canonical" href="${data.url}" />

        <!-- Open Graph -->
        <meta property="og:title" content="${escapeHtml(data.title)}" />
        <meta property="og:description" content="${escapeHtml(data.description)}" />
        <meta property="og:image" content="${data.image}" />
        <meta property="og:url" content="${data.url}" />
        <meta property="og:type" content="${data.type}" />

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(data.title)}" />
        <meta name="twitter:description" content="${escapeHtml(data.description)}" />
        <meta name="twitter:image" content="${data.image}" />
      `;
    }
    ```

- [ ] **Task 5: Add Structured Data (JSON-LD)** (AC: #2)
  - [ ] Create `generateStructuredData` function:
    ```typescript
    function generateStructuredData(listing: PublicListing): string {
      const data = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": listing.title,
        "description": listing.description,
        "url": `${process.env.PUBLIC_URL}/listings/${listing.id}`,
        "image": listing.images.map(img => img.url),
        "offers": {
          "@type": "Offer",
          "price": listing.price,
          "priceCurrency": "VND",
          "availability": "https://schema.org/InStock",
        },
        "address": {
          "@type": "PostalAddress",
          "streetAddress": listing.location,
          "addressLocality": listing.district,
          "addressRegion": listing.province,
          "addressCountry": "VN",
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": listing.latitude,
          "longitude": listing.longitude,
        },
        "floorSize": {
          "@type": "QuantitativeValue",
          "value": listing.area,
          "unitCode": "MTK", // Square meter
        },
        "numberOfRooms": listing.bedrooms,
        "numberOfBathroomsTotal": listing.bathrooms,
      };

      return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
    }
    ```

- [ ] **Task 6: Implement View Tracking** (AC: #3)
  - [ ] Create `trackView` method:
    ```typescript
    async trackView(listingId: string, ip: string) {
      // Check if already viewed today (unique view)
      const viewKey = `view:${listingId}:${ip}`;
      const alreadyViewed = await this.redis.get(viewKey);

      if (!alreadyViewed) {
        // Increment view count
        await this.publicListingService.incrementViewCount(listingId);

        // Mark as viewed (24h TTL)
        await this.redis.setex(viewKey, 86400, '1');

        // Log to analytics
        await this.analyticsService.track({
          event: 'listing_viewed',
          listingId,
          ip,
          timestamp: new Date(),
        });
      }
    }
    ```

- [ ] **Task 7: Implement Similar Listings** (AC: #4)
  - [ ] Create `getSimilarListings` query:
    ```typescript
    @Query(() => [PublicListing])
    async getSimilarListings(
      @Args('listingId') listingId: string,
      @Args('limit', { defaultValue: 4 }) limit: number,
    ): Promise<PublicListing[]> {
      const listing = await this.publicListingService.findOne(listingId);

      const priceMin = listing.price * 0.7;
      const priceMax = listing.price * 1.3;

      const similar = await this.publicListingRepository
        .createQueryBuilder('listing')
        .where('listing.id != :id', { id: listingId })
        .andWhere('listing.status = :status', { status: 'APPROVED' })
        .andWhere('listing.province = :province', { province: listing.province })
        .andWhere('listing.district = :district', { district: listing.district })
        .andWhere('listing.propertyType = :propertyType', { propertyType: listing.propertyType })
        .andWhere('listing.price BETWEEN :priceMin AND :priceMax', { priceMin, priceMax })
        .orderBy('ABS(listing.price - :price)', 'ASC')
        .setParameter('price', listing.price)
        .take(limit)
        .getMany();

      return similar;
    }
    ```

- [ ] **Task 8: Create Image Gallery Component** (AC: #5)
  - [ ] Main image with thumbnails
  - [ ] Click to open lightbox
  - [ ] Lightbox with navigation
  - [ ] Zoom functionality
  - [ ] Keyboard shortcuts

- [ ] **Task 9: Integrate Google Maps** (AC: #6)
  - [ ] Create `GoogleMapEmbed` component:
    ```typescript
    const GoogleMapEmbed = ({ latitude, longitude, title }) => {
      const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${process.env.GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=15`;

      return (
        <div className="map-container">
          <iframe
            src={mapUrl}
            width="100%"
            height="400"
            frameBorder="0"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
          />
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-on-maps"
          >
            View on Google Maps
          </a>
        </div>
      );
    };
    ```

- [ ] **Task 10: Create Inquiry Form** (AC: #7)
  - [ ] Create `InquiryModal` component with form
  - [ ] Validate fields (name, email, phone, message)
  - [ ] Create `sendInquiry` mutation
  - [ ] Send email to seller
  - [ ] Increment `contactCount`

- [ ] **Task 11: Create Unit Tests**
  - [ ] Test detail query
  - [ ] Test view tracking (unique views)
  - [ ] Test similar listings algorithm
  - [ ] Test meta tag generation
  - [ ] Test structured data generation
  - [ ] Achieve >80% coverage

- [ ] **Task 12: Integration Testing**
  - [ ] Test complete detail page load
  - [ ] Test SSR rendering
  - [ ] Test inquiry form submission
  - [ ] Test view tracking
  - [ ] Test similar listings display

- [ ] **Task 13: Manual Testing**
  - [ ] View listing detail page
  - [ ] Click images (lightbox)
  - [ ] Submit inquiry form
  - [ ] Verify view count incremented
  - [ ] Check similar listings
  - [ ] Verify SSR with curl/bot user-agent
  - [ ] Validate structured data with Google Rich Results Test

## Dev Notes

### Architecture Context

**Detail Page Pattern**: Comprehensive listing view
- Full information display
- SSR for SEO (most critical page)
- View tracking for analytics
- Similar listings for engagement
- Inquiry form for lead generation

**Key Design Decisions**:
- SSR only for bots (performance)
- View tracking with 24h unique window
- Similar listings based on location + price
- Lightbox for image viewing
- Google Maps embed for location
- Redis cache for SSR (1 hour TTL)

### Implementation Details

**Meta Tags**:
- Title: "{title} - {price} - {location}"
- Description: First 160 chars
- OG tags for social sharing
- Twitter Card for Twitter

**Structured Data**:
- Schema.org RealEstateListing
- All property details included
- Geo coordinates
- Price and currency

**View Tracking**:
- Unique views: IP-based, 24h window
- Total views: All page loads
- Time on page tracked
- Analytics logged

**Similar Listings Algorithm**:
1. Same province + district
2. Same property type
3. Price within ±30%
4. Sort by price similarity
5. Limit to 4 results

### Testing Strategy

**Unit Tests**: Query logic, view tracking, similar listings algorithm
**Integration Tests**: End-to-end detail page flows
**Manual Tests**: UI interactions, SSR verification, structured data validation

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-836-listing-detail-page-with-ssr)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3
- [Epic 8.1](../real-estate-platform/epics.md#epic-81-foundation--ssr-setup) - SSR infrastructure
- [Story 8.1.5](./8-1-5-seo-meta-tags-structured-data.md) - Meta tags implementation

### Success Criteria

**Definition of Done**:
- ✅ Detail page displaying all information
- ✅ Image gallery with lightbox working
- ✅ Google Maps integration working
- ✅ SSR for bots working
- ✅ Dynamic meta tags generated
- ✅ Structured data added
- ✅ View tracking implemented
- ✅ Similar listings displayed
- ✅ Inquiry form working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful
- ✅ Structured data validated

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
