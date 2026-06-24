# Story 8.7.2: Featured Listings Feature

Status: drafted

## Story
As a seller with PRO subscription, I want to feature my listings, so that they appear prominently in search results.

## Acceptance Criteria

1. **Feature Listing**
   - Given PRO or ENTERPRISE subscription (Story 8.7.1)
   - When I select listing to feature
   - Then system checks quota (5/month for PRO, 10/month for ENTERPRISE)
   - And marks as featured (`isFeatured = true`)
   - And sets `featuredUntil` (30 days from now)
   - And deducts from quota
   - And moves to top of search results
   - And shows success message

2. **Quota Check**
   - Given subscription tier
   - When checking quota
   - Then validates:
     - User has PRO or ENTERPRISE tier
     - Remaining quota > 0
     - Listing not already featured
   - And returns clear error if quota exceeded
   - And shows remaining quota

3. **Featured Display**
   - Given featured listings
   - When displayed
   - Then shows:
     - "Featured" badge (gold star icon)
     - Highlighted styling (border, background)
     - Appears at top of browse page
     - Shows in "Featured Listings" section on homepage
   - And sorted by `featuredUntil DESC` (newest featured first)

4. **Search Results Sorting**
   - Given search/browse query
   - When results returned
   - Then sorted by:
     - `isFeatured DESC` (featured first)
     - `createdAt DESC` (newest first within each group)
   - And featured listings clearly distinguished

5. **Expiry Handling**
   - Given featured status
   - When expires (after 30 days)
   - Then background job removes:
     - Sets `isFeatured = false`
     - Clears `featuredUntil`
   - And runs daily at midnight
   - And logs expiry for analytics

6. **Quota Tracking**
   - Given subscription
   - When tracking quota
   - Then:
     - Stores `featuredQuota` and `featuredQuotaUsed` on PublicUser
     - Resets monthly on subscription renewal
     - Tracks usage per listing
   - And displays remaining quota in UI

7. **Analytics Tracking**
   - Given featured listings
   - When tracking performance
   - Then records:
     - Views (impressions)
     - Inquiries received
     - Click-through rate
     - Conversion rate
   - And compares to non-featured performance

8. **Quota Display**
   - Given user viewing listings
   - When on listing management page
   - Then shows:
     - Total quota for tier
     - Quota used this month
     - Remaining quota
     - Next reset date
   - And feature button disabled if quota exhausted

## Tasks / Subtasks

- [ ] **Task 1: Add Fields to PublicListing Entity** (AC: #1, #5)
  - [ ] Update entity:
    ```typescript
    @WorkspaceField({
      standardId: PUBLIC_LISTING_STANDARD_FIELD_IDS.IS_FEATURED,
      type: FieldMetadataType.BOOLEAN,
      label: 'Is Featured',
      description: 'Whether listing is featured',
      icon: 'IconStar',
      defaultValue: false,
    })
    isFeatured: boolean;

    @WorkspaceField({
      standardId: PUBLIC_LISTING_STANDARD_FIELD_IDS.FEATURED_UNTIL,
      type: FieldMetadataType.DATE_TIME,
      label: 'Featured Until',
      description: 'When featured status expires',
      icon: 'IconClock',
    })
    @IsOptional()
    featuredUntil?: Date;

    @WorkspaceField({
      standardId: PUBLIC_LISTING_STANDARD_FIELD_IDS.FEATURED_COUNT,
      type: FieldMetadataType.NUMBER,
      label: 'Featured Count',
      description: 'Number of times featured',
      icon: 'IconHash',
      defaultValue: 0,
    })
    featuredCount: number;
    ```

- [ ] **Task 2: Add Quota Fields to PublicUser Entity** (AC: #6)
  - [ ] Update entity:
    ```typescript
    @WorkspaceField({
      standardId: PUBLIC_USER_STANDARD_FIELD_IDS.FEATURED_QUOTA,
      type: FieldMetadataType.NUMBER,
      label: 'Featured Quota',
      description: 'Monthly featured listings quota',
      icon: 'IconStar',
      defaultValue: 0,
    })
    featuredQuota: number;

    @WorkspaceField({
      standardId: PUBLIC_USER_STANDARD_FIELD_IDS.FEATURED_QUOTA_USED,
      type: FieldMetadataType.NUMBER,
      label: 'Featured Quota Used',
      description: 'Featured listings used this month',
      icon: 'IconCheck',
      defaultValue: 0,
    })
    featuredQuotaUsed: number;

    @WorkspaceField({
      standardId: PUBLIC_USER_STANDARD_FIELD_IDS.QUOTA_RESET_AT,
      type: FieldMetadataType.DATE_TIME,
      label: 'Quota Reset At',
      description: 'When quota resets',
      icon: 'IconRefresh',
    })
    @IsOptional()
    quotaResetAt?: Date;
    ```

- [ ] **Task 3: Create featureListing Mutation** (AC: #1, #2)
  - [ ] Implement mutation:
    ```typescript
    @Mutation(() => PublicListing)
    @UseGuards(AuthGuard)
    async featureListing(
      @CurrentUser() user: PublicUser,
      @Args('listingId') listingId: string,
    ): Promise<PublicListing> {
      // Get listing
      const listing = await this.publicListingService.findOne(listingId);

      // Verify ownership
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('Not your listing');
      }

      // Check subscription tier
      if (!['PRO', 'ENTERPRISE'].includes(user.subscriptionTier)) {
        throw new BadRequestException('PRO or ENTERPRISE subscription required');
      }

      // Check if already featured
      if (listing.isFeatured && listing.featuredUntil > new Date()) {
        throw new BadRequestException('Listing is already featured');
      }

      // Get quota for tier
      const quota = user.subscriptionTier === 'PRO' ? 5 : 10;

      // Check quota
      if (user.featuredQuotaUsed >= quota) {
        throw new BadRequestException(
          `Featured quota exhausted. Resets on ${user.quotaResetAt.toLocaleDateString()}`
        );
      }

      // Feature listing
      const featuredUntil = new Date();
      featuredUntil.setDate(featuredUntil.getDate() + 30);

      await this.publicListingService.update(listingId, {
        isFeatured: true,
        featuredUntil,
        featuredCount: listing.featuredCount + 1,
      });

      // Update quota
      await this.publicUserService.update(user.id, {
        featuredQuotaUsed: user.featuredQuotaUsed + 1,
      });

      // Track analytics
      await this.analyticsService.track({
        event: 'listing_featured',
        userId: user.id,
        listingId,
        tier: user.subscriptionTier,
      });

      return await this.publicListingService.findOne(listingId);
    }
    ```

- [ ] **Task 4: Modify Search Query** (AC: #4)
  - [ ] Update search service:
    ```typescript
    async searchListings(filters: ListingFilters): Promise<PublicListing[]> {
      const query = this.publicListingRepository.createQueryBuilder('listing')
        .where('listing.status = :status', { status: 'APPROVED' });

      // Apply filters
      if (filters.category) {
        query.andWhere('listing.category = :category', { category: filters.category });
      }

      if (filters.priceMin) {
        query.andWhere('listing.price >= :priceMin', { priceMin: filters.priceMin });
      }

      if (filters.priceMax) {
        query.andWhere('listing.price <= :priceMax', { priceMax: filters.priceMax });
      }

      // Sort: Featured first, then by date
      query.orderBy('listing.isFeatured', 'DESC')
        .addOrderBy('listing.createdAt', 'DESC');

      return await query.getMany();
    }
    ```

- [ ] **Task 5: Create ExpireFeaturedListingsJob** (AC: #5)
  - [ ] Implement background job:
    ```typescript
    @Injectable()
    export class ExpireFeaturedListingsJob {
      constructor(
        private readonly publicListingService: PublicListingService,
        private readonly analyticsService: AnalyticsService,
      ) {}

      @Cron('0 0 * * *') // Daily at midnight
      async expireFeaturedListings() {
        const now = new Date();

        const expiredListings = await this.publicListingService.find({
          where: {
            isFeatured: true,
            featuredUntil: LessThan(now),
          },
        });

        for (const listing of expiredListings) {
          await this.publicListingService.update(listing.id, {
            isFeatured: false,
            featuredUntil: null,
          });

          // Track expiry
          await this.analyticsService.track({
            event: 'listing_featured_expired',
            listingId: listing.id,
            ownerId: listing.ownerId,
          });

          console.log(`Featured status expired for listing ${listing.id}`);
        }

        console.log(`Expired ${expiredListings.length} featured listings`);
      }
    }
    ```

- [ ] **Task 6: Reset Quota on Subscription Renewal** (AC: #6)
  - [ ] Update subscription payment service:
    ```typescript
    private async handlePaymentSuccess(
      transaction: PaymentTransaction,
      gatewayResponse: any,
    ): Promise<void> {
      // ... existing code ...

      // Set quota based on tier
      const quota = transaction.tier === 'PRO' ? 5 : transaction.tier === 'ENTERPRISE' ? 10 : 0;
      const quotaResetAt = new Date(expiryDate);

      await this.publicUserService.update(transaction.userId, {
        subscriptionTier: transaction.tier,
        subscriptionExpiresAt: expiryDate,
        subscriptionUpdatedAt: new Date(),
        featuredQuota: quota,
        featuredQuotaUsed: 0, // Reset quota
        quotaResetAt,
      });

      // ... rest of code ...
    }
    ```

- [ ] **Task 7: Create Frontend Feature Button** (AC: #1, #8)
  - [ ] Implement component:
    ```typescript
    const FeatureListingButton = ({ listing, user }: FeatureListingButtonProps) => {
      const [featureListing, { loading }] = useMutation(FEATURE_LISTING);

      const canFeature = ['PRO', 'ENTERPRISE'].includes(user.subscriptionTier);
      const quotaRemaining = user.featuredQuota - user.featuredQuotaUsed;
      const isAlreadyFeatured = listing.isFeatured && new Date(listing.featuredUntil) > new Date();

      const handleFeature = async () => {
        if (!canFeature) {
          toast.error('PRO or ENTERPRISE subscription required');
          return;
        }

        if (quotaRemaining <= 0) {
          toast.error(`Featured quota exhausted. Resets on ${new Date(user.quotaResetAt).toLocaleDateString()}`);
          return;
        }

        if (isAlreadyFeatured) {
          toast.error('Listing is already featured');
          return;
        }

        try {
          await featureListing({ variables: { listingId: listing.id } });
          toast.success('Listing featured successfully!');
        } catch (error) {
          toast.error(error.message);
        }
      };

      return (
        <div className="feature-listing-button">
          <button
            onClick={handleFeature}
            disabled={loading || !canFeature || quotaRemaining <= 0 || isAlreadyFeatured}
            className="btn-feature"
          >
            <StarIcon className="w-5 h-5" />
            {isAlreadyFeatured ? 'Featured' : 'Feature Listing'}
          </button>

          <div className="quota-info text-sm text-gray-600 mt-2">
            {canFeature ? (
              <>
                <span>Quota: {quotaRemaining}/{user.featuredQuota} remaining</span>
                <span className="ml-2">Resets: {new Date(user.quotaResetAt).toLocaleDateString()}</span>
              </>
            ) : (
              <span>Upgrade to PRO to feature listings</span>
            )}
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 8: Create Featured Badge Component** (AC: #3)
  - [ ] Implement badge:
    ```typescript
    const FeaturedBadge = () => {
      return (
        <div className="featured-badge flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          <StarIcon className="w-4 h-4" />
          Featured
        </div>
      );
    };

    // In listing card
    const ListingCard = ({ listing }: ListingCardProps) => {
      return (
        <div className={`listing-card ${listing.isFeatured ? 'featured' : ''}`}>
          {listing.isFeatured && <FeaturedBadge />}

          {/* Rest of card content */}
        </div>
      );
    };
    ```

- [ ] **Task 9: Track Analytics** (AC: #7)
  - [ ] Implement tracking:
    ```typescript
    @Injectable()
    export class FeaturedListingAnalyticsService {
      async trackView(listingId: string): Promise<void> {
        const listing = await this.publicListingService.findOne(listingId);

        await this.analyticsService.track({
          event: 'listing_viewed',
          listingId,
          isFeatured: listing.isFeatured,
        });
      }

      async trackInquiry(listingId: string): Promise<void> {
        const listing = await this.publicListingService.findOne(listingId);

        await this.analyticsService.track({
          event: 'listing_inquiry',
          listingId,
          isFeatured: listing.isFeatured,
        });
      }

      async getFeaturedPerformance(listingId: string): Promise<FeaturedPerformance> {
        const listing = await this.publicListingService.findOne(listingId);

        const featuredViews = await this.analyticsService.count({
          event: 'listing_viewed',
          listingId,
          isFeatured: true,
        });

        const featuredInquiries = await this.analyticsService.count({
          event: 'listing_inquiry',
          listingId,
          isFeatured: true,
        });

        const normalViews = await this.analyticsService.count({
          event: 'listing_viewed',
          listingId,
          isFeatured: false,
        });

        const normalInquiries = await this.analyticsService.count({
          event: 'listing_inquiry',
          listingId,
          isFeatured: false,
        });

        return {
          featuredViews,
          featuredInquiries,
          featuredCTR: featuredViews > 0 ? (featuredInquiries / featuredViews) * 100 : 0,
          normalViews,
          normalInquiries,
          normalCTR: normalViews > 0 ? (normalInquiries / normalViews) * 100 : 0,
          improvement: featuredViews > 0 && normalViews > 0
            ? ((featuredInquiries / featuredViews) / (normalInquiries / normalViews) - 1) * 100
            : 0,
        };
      }
    }
    ```

- [ ] **Task 10: Create Unit Tests**
  - [ ] Test feature mutation
  - [ ] Test quota checking
  - [ ] Test expiry job
  - [ ] Test search sorting
  - [ ] Achieve >80% coverage

- [ ] **Task 11: Integration Testing**
  - [ ] Test complete feature flow
  - [ ] Test quota enforcement
  - [ ] Test expiry handling
  - [ ] Test search results

- [ ] **Task 12: Manual Testing**
  - [ ] Feature listing as PRO user
  - [ ] Verify quota deduction
  - [ ] Check featured display
  - [ ] Test search sorting
  - [ ] Verify expiry after 30 days

## Dev Notes

### Architecture Context

**Featured Listings**: Premium feature for PRO/ENTERPRISE
- Quota-based system (5/month PRO, 10/month ENTERPRISE)
- 30-day featured period
- Top position in search results
- Visual distinction with badge
- Analytics tracking
- Auto-expiry with daily job

**Key Design Decisions**:
- Quota stored on PublicUser entity
- Quota resets monthly on subscription renewal
- Featured status expires after 30 days
- Search sorting: featured first, then by date
- Analytics tracking for performance comparison
- Background job for expiry handling

### Implementation Details

**Quota System**:
- PRO: 5 featured listings/month
- ENTERPRISE: 10 featured listings/month
- Resets on subscription renewal
- Tracked per user, not per listing

**Featured Period**:
- Duration: 30 days
- Stored in `featuredUntil` field
- Daily cron job checks and expires
- Can be re-featured after expiry (uses quota)

**Search Sorting**:
- Primary: `isFeatured DESC` (featured first)
- Secondary: `createdAt DESC` (newest first)
- Featured listings clearly distinguished

**Analytics**:
- Track views and inquiries
- Compare featured vs non-featured performance
- Calculate CTR and improvement percentage

### Testing Strategy

**Unit Tests**: Feature mutation, quota checking, expiry job
**Integration Tests**: Complete flow, search sorting
**Manual Tests**: End-to-end verification, UI/UX

### References

- [Epic 8.7](../real-estate-platform/epics.md#story-872-featured-listings-feature)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.2 (Subscription Tiers)
- [Story 8.7.1](./8-7-1-subscription-payment-integration.md) - Subscription Payment

### Success Criteria

**Definition of Done**:
- ✅ PublicListing fields added (isFeatured, featuredUntil, featuredCount)
- ✅ PublicUser quota fields added
- ✅ featureListing mutation working
- ✅ Quota checking working
- ✅ Search sorting working (featured first)
- ✅ Featured badge component working
- ✅ ExpireFeaturedListingsJob working
- ✅ Quota reset on renewal working
- ✅ Analytics tracking working
- ✅ Frontend feature button working
- ✅ Quota display working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
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
