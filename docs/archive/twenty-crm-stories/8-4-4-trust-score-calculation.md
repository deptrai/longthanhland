# Story 8.4.4: Trust Score Calculation Algorithm

Status: drafted

## Story
As a developer, I want to implement the trust score calculation algorithm, so that buyers can assess listing reliability.

## Acceptance Criteria

1. **Trust Score Calculation**
   - Given AI research results (Story 8.4.3)
   - When trust score calculated
   - Then score (0-100) based on weighted factors:
     - **Seller Verification** (30 points max):
       - Phone verified: +15 points
       - Email verified: +15 points
     - **Listing Completeness** (20 points max):
       - All required fields filled: +10 points
       - Multiple images (≥3): +10 points
     - **Market Alignment** (20 points max):
       - Price within ±30% of market average: +20 points
       - Price outside range: 0 points
     - **Research Validation** (15 points max):
       - Similar listings found (≥3): +10 points
       - No suspicious patterns: +5 points
     - **Engagement** (10 points max):
       - View count, inquiry count, response rate
     - **Platform History** (5 points max):
       - Account age, previous listings
   - And score rounded to integer

2. **Score Storage**
   - Given score calculated
   - When stored
   - Then saved in `listing.trustScore` field (NUMBER 0-100)
   - And score breakdown saved as JSON
   - And calculation timestamp recorded

3. **Score Breakdown for Transparency**
   - Given score calculated
   - When breakdown stored
   - Then includes for each factor:
     - Factor name
     - Points earned
     - Points possible
     - Percentage
   - And stored in `listing.trustScoreBreakdown` (JSON)

4. **Daily Recalculation**
   - Given background job scheduled
   - When job runs daily at 2 AM
   - Then recalculates all APPROVED listing scores
   - And updates `listing.trustScore` field
   - And logs count of updated listings
   - And tracks processing time

5. **Configurable Weights**
   - Given scoring weights
   - When configured
   - Then weights stored in database config table
   - And can be updated without code changes
   - And changes apply to next calculation

6. **Score History Tracking**
   - Given score calculated
   - When stored
   - Then history entry created with:
     - listingId
     - score
     - breakdown
     - calculatedAt
   - And history retained for 90 days
   - And used for trend analysis

## Tasks / Subtasks

- [ ] **Task 1: Create TrustScoreService** (AC: #1)
  - [ ] Create service class:
    ```typescript
    @Injectable()
    export class TrustScoreService {
      constructor(
        private readonly publicUserService: PublicUserService,
        private readonly aiResearchResultService: AIResearchResultService,
        private readonly configService: ConfigService,
      ) {}

      async calculateTrustScore(listing: PublicListing): Promise<TrustScoreResult> {
        const weights = await this.getWeights();

        // Calculate each factor
        const sellerVerification = await this.calculateSellerVerification(listing);
        const listingCompleteness = this.calculateListingCompleteness(listing);
        const marketAlignment = await this.calculateMarketAlignment(listing);
        const researchValidation = await this.calculateResearchValidation(listing);
        const engagement = this.calculateEngagement(listing);
        const platformHistory = await this.calculatePlatformHistory(listing);

        // Calculate total score
        const score = Math.round(
          sellerVerification.points +
          listingCompleteness.points +
          marketAlignment.points +
          researchValidation.points +
          engagement.points +
          platformHistory.points
        );

        // Build breakdown
        const breakdown = {
          sellerVerification,
          listingCompleteness,
          marketAlignment,
          researchValidation,
          engagement,
          platformHistory,
          total: score,
        };

        return { score, breakdown };
      }
    }
    ```

- [ ] **Task 2: Implement Seller Verification Factor** (AC: #1)
  - [ ] Calculate seller verification score:
    ```typescript
    private async calculateSellerVerification(
      listing: PublicListing
    ): Promise<ScoreFactor> {
      const seller = await this.publicUserService.findOne(listing.ownerId);

      let points = 0;
      const details = [];

      if (seller.phoneVerified) {
        points += 15;
        details.push('Phone verified (+15)');
      }

      if (seller.emailVerified) {
        points += 15;
        details.push('Email verified (+15)');
      }

      return {
        name: 'Seller Verification',
        points,
        maxPoints: 30,
        percentage: (points / 30) * 100,
        details,
      };
    }
    ```

- [ ] **Task 3: Implement Listing Completeness Factor** (AC: #1)
  - [ ] Calculate listing completeness score:
    ```typescript
    private calculateListingCompleteness(
      listing: PublicListing
    ): ScoreFactor {
      let points = 0;
      const details = [];

      // Check required fields
      const requiredFields = [
        'title', 'description', 'price', 'area',
        'location', 'province', 'district',
        'propertyType', 'listingType',
      ];

      const allFieldsFilled = requiredFields.every(field =>
        listing[field] !== null && listing[field] !== undefined && listing[field] !== ''
      );

      if (allFieldsFilled) {
        points += 10;
        details.push('All required fields filled (+10)');
      }

      // Check images
      if (listing.imageIds && listing.imageIds.length >= 3) {
        points += 10;
        details.push(`${listing.imageIds.length} images uploaded (+10)`);
      }

      return {
        name: 'Listing Completeness',
        points,
        maxPoints: 20,
        percentage: (points / 20) * 100,
        details,
      };
    }
    ```

- [ ] **Task 4: Implement Market Alignment Factor** (AC: #1)
  - [ ] Calculate market alignment score:
    ```typescript
    private async calculateMarketAlignment(
      listing: PublicListing
    ): Promise<ScoreFactor> {
      const researchResult = await this.aiResearchResultService.findByListingId(listing.id);

      let points = 0;
      const details = [];

      if (researchResult && researchResult.priceRange) {
        const { avg } = researchResult.priceRange;

        if (avg > 0) {
          const deviation = Math.abs(listing.price - avg) / avg;

          if (deviation <= 0.3) {
            points = 20;
            details.push(`Price within ±30% of market average (+20)`);
          } else {
            details.push(`Price ${(deviation * 100).toFixed(0)}% from market average (0)`);
          }
        }
      } else {
        details.push('No market data available (0)');
      }

      return {
        name: 'Market Alignment',
        points,
        maxPoints: 20,
        percentage: (points / 20) * 100,
        details,
      };
    }
    ```

- [ ] **Task 5: Implement Research Validation Factor** (AC: #1)
  - [ ] Calculate research validation score:
    ```typescript
    private async calculateResearchValidation(
      listing: PublicListing
    ): Promise<ScoreFactor> {
      const researchResult = await this.aiResearchResultService.findByListingId(listing.id);

      let points = 0;
      const details = [];

      if (researchResult) {
        // Similar listings found
        if (researchResult.similarListingsFound &&
            researchResult.similarListingsFound.length >= 3) {
          points += 10;
          details.push(`${researchResult.similarListingsFound.length} similar listings found (+10)`);
        }

        // No suspicious patterns
        if (!researchResult.duplicateDetected &&
            researchResult.confidenceScore >= 70) {
          points += 5;
          details.push('No suspicious patterns detected (+5)');
        } else if (researchResult.duplicateDetected) {
          details.push('Suspicious patterns detected (0)');
        }
      } else {
        details.push('Research not completed (0)');
      }

      return {
        name: 'Research Validation',
        points,
        maxPoints: 15,
        percentage: (points / 15) * 100,
        details,
      };
    }
    ```

- [ ] **Task 6: Implement Engagement Factor** (AC: #1)
  - [ ] Calculate engagement score:
    ```typescript
    private calculateEngagement(listing: PublicListing): ScoreFactor {
      let points = 0;
      const details = [];

      // View count (max 4 points)
      const viewScore = Math.min(listing.viewCount / 25, 4); // 1 point per 25 views
      points += viewScore;
      if (viewScore > 0) {
        details.push(`${listing.viewCount} views (+${viewScore.toFixed(1)})`);
      }

      // Contact count (max 4 points)
      const contactScore = Math.min(listing.contactCount / 5, 4); // 1 point per 5 contacts
      points += contactScore;
      if (contactScore > 0) {
        details.push(`${listing.contactCount} inquiries (+${contactScore.toFixed(1)})`);
      }

      // Response rate (max 2 points)
      if (listing.owner.responseRate >= 80) {
        points += 2;
        details.push(`${listing.owner.responseRate}% response rate (+2)`);
      }

      return {
        name: 'Engagement',
        points: Math.round(points),
        maxPoints: 10,
        percentage: (points / 10) * 100,
        details,
      };
    }
    ```

- [ ] **Task 7: Implement Platform History Factor** (AC: #1)
  - [ ] Calculate platform history score:
    ```typescript
    private async calculatePlatformHistory(
      listing: PublicListing
    ): Promise<ScoreFactor> {
      const seller = await this.publicUserService.findOne(listing.ownerId);

      let points = 0;
      const details = [];

      // Account age (max 3 points)
      const accountAgeDays = Math.floor(
        (Date.now() - seller.memberSince.getTime()) / (1000 * 60 * 60 * 24)
      );
      const ageScore = Math.min(accountAgeDays / 30, 3); // 1 point per 30 days, max 3
      points += ageScore;
      if (ageScore > 0) {
        details.push(`Account ${accountAgeDays} days old (+${ageScore.toFixed(1)})`);
      }

      // Previous listings (max 2 points)
      if (seller.totalListings >= 5) {
        points += 2;
        details.push(`${seller.totalListings} total listings (+2)`);
      } else if (seller.totalListings >= 2) {
        points += 1;
        details.push(`${seller.totalListings} total listings (+1)`);
      }

      return {
        name: 'Platform History',
        points: Math.round(points),
        maxPoints: 5,
        percentage: (points / 5) * 100,
        details,
      };
    }
    ```

- [ ] **Task 8: Store Score and Breakdown** (AC: #2, #3)
  - [ ] Save to listing:
    ```typescript
    async updateListingScore(
      listingId: string,
      result: TrustScoreResult
    ): Promise<void> {
      await this.publicListingService.update(listingId, {
        trustScore: result.score,
        trustScoreBreakdown: result.breakdown,
        trustScoreCalculatedAt: new Date(),
      });

      // Store history
      await this.trustScoreHistoryService.create({
        listingId,
        score: result.score,
        breakdown: result.breakdown,
        calculatedAt: new Date(),
      });
    }
    ```

- [ ] **Task 9: Create Daily Recalculation Job** (AC: #4)
  - [ ] Create background job:
    ```typescript
    @Injectable()
    export class RecalculateTrustScoresJob {
      constructor(
        private readonly publicListingService: PublicListingService,
        private readonly trustScoreService: TrustScoreService,
      ) {}

      @Cron('0 2 * * *') // Daily at 2 AM
      async recalculateAllScores() {
        const startTime = Date.now();
        console.log('Starting trust score recalculation...');

        // Get all APPROVED listings
        const listings = await this.publicListingService.findAll({
          where: { status: 'APPROVED' },
        });

        let successCount = 0;
        let failCount = 0;

        for (const listing of listings) {
          try {
            const result = await this.trustScoreService.calculateTrustScore(listing);
            await this.trustScoreService.updateListingScore(listing.id, result);
            successCount++;
          } catch (error) {
            console.error(`Failed to calculate trust score for listing ${listing.id}:`, error);
            failCount++;
          }
        }

        const duration = Date.now() - startTime;
        console.log(`Trust score recalculation completed in ${duration}ms`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
      }
    }
    ```

- [ ] **Task 10: Implement Configurable Weights** (AC: #5)
  - [ ] Create config table and service:
    ```typescript
    @Injectable()
    export class TrustScoreConfigService {
      async getWeights(): Promise<TrustScoreWeights> {
        const config = await this.configRepository.findOne({
          where: { key: 'trust_score_weights' },
        });

        if (config) {
          return JSON.parse(config.value);
        }

        // Default weights
        return {
          sellerVerification: 30,
          listingCompleteness: 20,
          marketAlignment: 20,
          researchValidation: 15,
          engagement: 10,
          platformHistory: 5,
        };
      }

      async updateWeights(weights: TrustScoreWeights): Promise<void> {
        await this.configRepository.upsert({
          key: 'trust_score_weights',
          value: JSON.stringify(weights),
        });
      }
    }
    ```

- [ ] **Task 11: Create Unit Tests**
  - [ ] Test each factor calculation
  - [ ] Test total score calculation
  - [ ] Test score breakdown generation
  - [ ] Test configurable weights
  - [ ] Test daily recalculation job
  - [ ] Achieve >80% coverage

- [ ] **Task 12: Integration Testing**
  - [ ] Test complete score calculation flow
  - [ ] Test with various listing scenarios
  - [ ] Test daily recalculation job
  - [ ] Test score history tracking

- [ ] **Task 13: Manual Testing**
  - [ ] Calculate score for test listings
  - [ ] Verify score breakdown accuracy
  - [ ] Test weight configuration
  - [ ] Trigger daily job manually
  - [ ] Verify score history stored

## Dev Notes

### Architecture Context

**Trust Score Algorithm**: Multi-factor weighted scoring
- 6 factors with configurable weights
- Score range: 0-100
- Breakdown stored for transparency
- Daily recalculation for all listings
- History tracking for trend analysis

**Key Design Decisions**:
- Weighted algorithm (not ML-based)
- Configurable weights (database config)
- Daily recalculation (2 AM)
- Score history (90 days retention)
- Breakdown for transparency

### Implementation Details

**Scoring Factors**:
1. **Seller Verification** (30 pts):
   - Phone verified: +15
   - Email verified: +15

2. **Listing Completeness** (20 pts):
   - All fields filled: +10
   - ≥3 images: +10

3. **Market Alignment** (20 pts):
   - Price within ±30% of market: +20
   - Outside range: 0

4. **Research Validation** (15 pts):
   - ≥3 similar listings found: +10
   - No suspicious patterns: +5

5. **Engagement** (10 pts):
   - Views: 1 pt per 25 views (max 4)
   - Inquiries: 1 pt per 5 inquiries (max 4)
   - Response rate ≥80%: +2

6. **Platform History** (5 pts):
   - Account age: 1 pt per 30 days (max 3)
   - ≥5 listings: +2, ≥2 listings: +1

**Daily Recalculation**:
- Runs at 2 AM daily
- Processes all APPROVED listings
- Updates trustScore field
- Logs success/fail counts

### Testing Strategy

**Unit Tests**: Each factor calculation, total score, breakdown
**Integration Tests**: Complete calculation flow, daily job
**Manual Tests**: Various listing scenarios, weight configuration

### References

- [Epic 8.4](../real-estate-platform/epics.md#story-844-trust-score-calculation-algorithm)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.6
- [Story 8.4.3](./8-4-3-ai-research-processing-storage.md) - AI Research

### Success Criteria

**Definition of Done**:
- ✅ Trust score calculation implemented
- ✅ All 6 factors working correctly
- ✅ Score stored in listing.trustScore
- ✅ Breakdown stored for transparency
- ✅ Daily recalculation job working
- ✅ Configurable weights implemented
- ✅ Score history tracking working
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
