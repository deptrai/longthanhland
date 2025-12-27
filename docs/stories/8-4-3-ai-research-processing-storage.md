# Story 8.4.3: AI Research Processing & Storage

Status: drafted

## Story
As a developer, I want to process researched data and generate insights, so that we provide valuable information to users.

## Acceptance Criteria

1. **Price Analysis**
   - Given Perplexica returns similar listings (Story 8.4.2)
   - When AI research processes data
   - Then calculates price range:
     - min: Lowest price from similar listings
     - max: Highest price from similar listings
     - avg: Average price from similar listings
   - And compares listing price to market average
   - And flags if price >30% below or above market

2. **Suspicious Pattern Detection**
   - Given similar listings and listing data
   - When patterns analyzed
   - Then detects and flags:
     - **Price Anomaly**: Price >30% below market average
     - **Duplicate Images**: Same images found in other listings (pHash)
     - **Known Scammer**: Contact matches blacklist
     - **Spam Keywords**: Description contains spam keywords
   - And calculates suspicion score (0-100)
   - And stores detected patterns as JSON array

3. **Confidence Score Calculation**
   - Given research results
   - When confidence calculated
   - Then score (0-100) based on:
     - Number of sources checked (max 25 points)
     - Number of similar listings found (max 25 points)
     - Price consistency (max 25 points)
     - No suspicious patterns (max 25 points)
   - And score stored in AIResearchResult

4. **Results Storage**
   - Given processing complete
   - When results stored
   - Then all data saved in AIResearchResult entity:
     - sourcesChecked (JSON array)
     - similarListingsFound (JSON array)
     - priceRange (JSON object)
     - duplicateDetected (BOOLEAN)
     - confidenceScore (NUMBER)
     - status: COMPLETED
     - completedAt: timestamp
   - And raw data stored for debugging (optional, 7 days TTL)

5. **Listing Flag Update**
   - Given AIResearchResult saved
   - When listing updated
   - Then `aiResearchCompleted` flag set to true
   - And listing's `trustScore` recalculated (Story 8.4.4)

6. **Processing Time**
   - Given job processing
   - When measured
   - Then completes within 2 minutes
   - And processing time logged
   - And metrics tracked (success rate, avg time)

## Tasks / Subtasks

- [ ] **Task 1: Create AIResearchService** (AC: #1, #2, #3)
  - [ ] Create service class:
    ```typescript
    @Injectable()
    export class AIResearchService {
      constructor(
        private readonly imageComparisonService: ImageComparisonService,
        private readonly spamDetectionService: SpamDetectionService,
      ) {}

      async analyzeResearch(
        researchData: ResearchData,
        listing: PublicListing
      ): Promise<AnalysisResult> {
        // Price analysis
        const priceRange = this.calculatePriceRange(researchData.similarListings);
        const priceAnomaly = this.detectPriceAnomaly(listing.price, priceRange);

        // Suspicious patterns
        const duplicateImages = await this.detectDuplicateImages(
          listing.imageIds,
          researchData.similarListings
        );
        const knownScammer = await this.checkScammerBlacklist(listing.owner.phone);
        const spamKeywords = this.detectSpamKeywords(listing.description);

        const suspiciousPatterns = [];
        if (priceAnomaly) suspiciousPatterns.push({ type: 'PRICE_ANOMALY', ...priceAnomaly });
        if (duplicateImages) suspiciousPatterns.push({ type: 'DUPLICATE_IMAGES', ...duplicateImages });
        if (knownScammer) suspiciousPatterns.push({ type: 'KNOWN_SCAMMER', ...knownScammer });
        if (spamKeywords.length > 0) suspiciousPatterns.push({ type: 'SPAM_KEYWORDS', keywords: spamKeywords });

        // Confidence score
        const confidenceScore = this.calculateConfidenceScore(
          researchData,
          priceRange,
          suspiciousPatterns
        );

        return {
          priceRange,
          duplicateDetected: duplicateImages !== null,
          suspiciousPatterns,
          confidenceScore,
        };
      }
    }
    ```

- [ ] **Task 2: Implement Price Analysis** (AC: #1)
  - [ ] Calculate price range:
    ```typescript
    private calculatePriceRange(similarListings: SimilarListing[]): PriceRange {
      if (similarListings.length === 0) {
        return { min: 0, max: 0, avg: 0 };
      }

      const prices = similarListings.map(l => l.price).filter(p => p > 0);

      if (prices.length === 0) {
        return { min: 0, max: 0, avg: 0 };
      }

      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      return { min, max, avg };
    }
    ```
  - [ ] Detect price anomaly:
    ```typescript
    private detectPriceAnomaly(
      listingPrice: number,
      priceRange: PriceRange
    ): PriceAnomaly | null {
      if (priceRange.avg === 0) return null;

      const deviation = (listingPrice - priceRange.avg) / priceRange.avg;

      if (deviation < -0.3) {
        return {
          type: 'BELOW_MARKET',
          deviation: Math.abs(deviation),
          message: `Price is ${Math.abs(deviation * 100).toFixed(0)}% below market average`,
        };
      }

      if (deviation > 0.3) {
        return {
          type: 'ABOVE_MARKET',
          deviation,
          message: `Price is ${(deviation * 100).toFixed(0)}% above market average`,
        };
      }

      return null;
    }
    ```

- [ ] **Task 3: Implement Image Comparison** (AC: #2)
  - [ ] Create `ImageComparisonService`:
    ```typescript
    @Injectable()
    export class ImageComparisonService {
      async detectDuplicateImages(
        listingImageIds: string[],
        similarListings: SimilarListing[]
      ): Promise<DuplicateImageResult | null> {
        // Fetch listing images
        const listingImages = await this.fetchImages(listingImageIds);

        // Calculate pHash for each listing image
        const listingHashes = await Promise.all(
          listingImages.map(img => this.calculatePHash(img))
        );

        // Check against similar listings
        for (const similar of similarListings) {
          for (const similarImgUrl of similar.images) {
            try {
              const similarImg = await this.fetchImageFromUrl(similarImgUrl);
              const similarHash = await this.calculatePHash(similarImg);

              // Compare hashes (Hamming distance < 10 = duplicate)
              for (let i = 0; i < listingHashes.length; i++) {
                const distance = this.hammingDistance(listingHashes[i], similarHash);
                if (distance < 10) {
                  return {
                    matchedImageIndex: i,
                    matchedListing: similar.url,
                    similarity: 1 - (distance / 64), // 64-bit hash
                  };
                }
              }
            } catch (error) {
              console.error(`Failed to compare image from ${similar.url}:`, error);
            }
          }
        }

        return null;
      }

      private async calculatePHash(imageBuffer: Buffer): Promise<string> {
        // Use sharp + blockhash-js for perceptual hashing
        const { default: blockhash } = await import('blockhash-js');
        const sharp = require('sharp');

        const resized = await sharp(imageBuffer)
          .resize(32, 32, { fit: 'fill' })
          .grayscale()
          .raw()
          .toBuffer();

        return blockhash(resized, 8, 2); // 8x8 = 64-bit hash
      }

      private hammingDistance(hash1: string, hash2: string): number {
        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
          if (hash1[i] !== hash2[i]) distance++;
        }
        return distance;
      }
    }
    ```

- [ ] **Task 4: Implement Spam Detection** (AC: #2)
  - [ ] Create `SpamDetectionService`:
    ```typescript
    @Injectable()
    export class SpamDetectionService {
      private readonly spamKeywords = [
        'lừa đảo', 'scam', 'fake', 'giả mạo',
        'chiếm đoạt', 'cần gấp', 'giá rẻ bất ngờ',
        'liên hệ ngay', 'cơ hội duy nhất', 'đặt cọc ngay',
      ];

      detectSpamKeywords(description: string): string[] {
        const lowerDesc = description.toLowerCase();
        return this.spamKeywords.filter(keyword =>
          lowerDesc.includes(keyword.toLowerCase())
        );
      }

      async checkScammerBlacklist(phone: string): Promise<boolean> {
        // Check against blacklist in database
        const blacklisted = await this.scammerBlacklistRepository.findOne({
          where: { phone },
        });

        return !!blacklisted;
      }
    }
    ```

- [ ] **Task 5: Calculate Confidence Score** (AC: #3)
  - [ ] Implement scoring algorithm:
    ```typescript
    private calculateConfidenceScore(
      researchData: ResearchData,
      priceRange: PriceRange,
      suspiciousPatterns: any[]
    ): number {
      let score = 0;

      // Sources checked (max 25 points)
      const sourcesScore = Math.min(researchData.sourcesChecked.length * 12.5, 25);
      score += sourcesScore;

      // Similar listings found (max 25 points)
      const listingsCount = researchData.similarListings.length;
      const listingsScore = Math.min(listingsCount * 2.5, 25);
      score += listingsScore;

      // Price consistency (max 25 points)
      if (priceRange.avg > 0) {
        const priceConsistency = 25; // Full points if no price anomaly
        const hasPriceAnomaly = suspiciousPatterns.some(p => p.type === 'PRICE_ANOMALY');
        score += hasPriceAnomaly ? 0 : priceConsistency;
      }

      // No suspicious patterns (max 25 points)
      const suspicionPenalty = suspiciousPatterns.length * 8.33; // -8.33 per pattern
      const noSuspicionScore = Math.max(25 - suspicionPenalty, 0);
      score += noSuspicionScore;

      return Math.round(Math.min(score, 100));
    }
    ```

- [ ] **Task 6: Store Results** (AC: #4)
  - [ ] Save to AIResearchResult:
    ```typescript
    async storeResults(
      listingId: string,
      researchData: ResearchData,
      analysis: AnalysisResult
    ): Promise<void> {
      await this.aiResearchResultService.update(listingId, {
        sourcesChecked: researchData.sourcesChecked,
        similarListingsFound: researchData.similarListings,
        priceRange: analysis.priceRange,
        duplicateDetected: analysis.duplicateDetected,
        confidenceScore: analysis.confidenceScore,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      // Store raw data for debugging (optional, 7 days TTL)
      if (process.env.STORE_RAW_RESEARCH_DATA === 'true') {
        await this.redis.setex(
          `research:raw:${listingId}`,
          604800, // 7 days
          JSON.stringify({ researchData, analysis })
        );
      }
    }
    ```

- [ ] **Task 7: Update Listing Flag** (AC: #5)
  - [ ] Set aiResearchCompleted flag:
    ```typescript
    async updateListingFlag(listingId: string): Promise<void> {
      await this.publicListingService.update(listingId, {
        aiResearchCompleted: true,
      });

      // Trigger trust score recalculation (Story 8.4.4)
      await this.eventEmitter.emit('listing.research.completed', { listingId });
    }
    ```

- [ ] **Task 8: Add Metrics Tracking** (AC: #6)
  - [ ] Track processing metrics:
    ```typescript
    async trackMetrics(
      listingId: string,
      startTime: Date,
      success: boolean,
      error?: Error
    ): Promise<void> {
      const processingTime = Date.now() - startTime.getTime();

      await this.metricsService.record({
        metric: 'ai_research_processing',
        listingId,
        processingTime,
        success,
        error: error?.message,
      });

      // Update aggregated metrics
      await this.redis.hincrby('ai_research:metrics', success ? 'success' : 'failed', 1);
      await this.redis.hincrby('ai_research:metrics', 'total_time', processingTime);
    }
    ```

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test price analysis calculations
  - [ ] Test price anomaly detection
  - [ ] Test image comparison (pHash)
  - [ ] Test spam keyword detection
  - [ ] Test confidence score calculation
  - [ ] Test results storage
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete analysis flow
  - [ ] Test with various suspicious patterns
  - [ ] Test processing time < 2 minutes
  - [ ] Test metrics tracking

- [ ] **Task 11: Manual Testing**
  - [ ] Test with real listing data
  - [ ] Verify price analysis accuracy
  - [ ] Test image duplicate detection
  - [ ] Verify spam detection
  - [ ] Check AIResearchResult stored correctly
  - [ ] Verify listing flag updated

## Dev Notes

### Architecture Context

**AI Research Processing**: Data analysis and insight generation
- Price analysis from similar listings
- Suspicious pattern detection (price, images, spam)
- Confidence score calculation
- Results stored in AIResearchResult entity

**Key Design Decisions**:
- pHash for image comparison (perceptual hashing)
- Spam keyword blacklist (configurable)
- Confidence score: weighted algorithm
- Raw data stored for debugging (7 days TTL)
- Processing time target: < 2 minutes

### Implementation Details

**Price Analysis**:
- Calculate min, max, avg from similar listings
- Flag if price >30% below/above market
- Handle edge cases (no similar listings)

**Image Comparison**:
- Use pHash (perceptual hashing)
- Hamming distance < 10 = duplicate
- Compare against all similar listings
- Graceful failure on image fetch errors

**Spam Detection**:
- Keyword blacklist (Vietnamese + English)
- Scammer phone blacklist in database
- Configurable keywords

**Confidence Score Algorithm**:
```
Score = Sources (25pts) + Listings (25pts) + Price (25pts) + NoSuspicion (25pts)
- Sources: 12.5 points per source (max 2 sources)
- Listings: 2.5 points per listing (max 10 listings)
- Price: 25 points if no price anomaly
- NoSuspicion: 25 points - (8.33 × pattern count)
```

**Suspicious Patterns**:
- PRICE_ANOMALY: >30% deviation
- DUPLICATE_IMAGES: pHash match
- KNOWN_SCAMMER: Phone in blacklist
- SPAM_KEYWORDS: Keyword matches

### Testing Strategy

**Unit Tests**: Price calculations, image comparison, spam detection, confidence scoring
**Integration Tests**: End-to-end analysis flow
**Manual Tests**: Real data validation, accuracy verification

### References

- [Epic 8.4](../real-estate-platform/epics.md#story-843-ai-research-processing--storage)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.4
- [Story 8.4.1](./8-4-1-airesearch-entity-job-setup.md) - Job infrastructure
- [Story 8.4.2](./8-4-2-perplexica-api-integration.md) - Perplexica API

### Success Criteria

**Definition of Done**:
- ✅ Price analysis implemented
- ✅ Suspicious pattern detection working
- ✅ Image comparison (pHash) working
- ✅ Spam detection working
- ✅ Confidence score calculation working
- ✅ Results storage working
- ✅ Listing flag update working
- ✅ Metrics tracking implemented
- ✅ Processing time < 2 minutes
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 8 hours

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
