# Story 8.5.2: Spam Detection Rules & Filtering

Status: drafted

## Story
As a developer, I want to implement spam detection rules, so that we automatically filter low-quality listings.

## Acceptance Criteria

1. **Comprehensive Spam Checks**
   - Given listing submitted (Epic 8.3)
   - When spam detection runs
   - Then checks multiple spam indicators:
     - **Duplicate Detection**: Same/similar title or description (Levenshtein distance < 10%)
     - **Suspicious Keywords**: Spam keywords ("100% guaranteed", "lừa đảo", etc.)
     - **Contact Spam**: Multiple phone numbers or external URLs in description
     - **Image Spam**: No images uploaded or stock photo detection
     - **Price Anomalies**: Price = 0 or unrealistically low (< 1M VND)
     - **Rapid Posting**: >5 listings posted in 1 hour by same user
   - And each check contributes to spam score
   - And all checks run before admin approval

2. **Spam Score Calculation**
   - Given spam checks completed
   - When score calculated
   - Then listing marked with `spamScore` (0-100):
     - Duplicate content: +30 points
     - Suspicious keywords: +20 points (5 points per keyword, max 20)
     - Contact spam: +15 points
     - No images: +10 points
     - Price anomaly: +15 points
     - Rapid posting: +10 points
   - And spam flags stored in `listing.spamFlags` (JSON array)
   - And score stored in `listing.spamScore` field

3. **Auto-Rejection for High Spam**
   - Given spam score calculated
   - When score > 70
   - Then automatically rejects listing
   - And changes status to REJECTED
   - And sets `rejectedReason` to spam details
   - And notifies admin via email/Slack
   - And temporarily suspends user if repeated offenses (3+ rejections in 24h)

4. **Pre-Approval Execution**
   - Given listing submitted
   - When status changes to PENDING_REVIEW
   - Then spam detection runs automatically
   - And executes before admin approval queue
   - And high-spam listings never reach admin queue

5. **Configurable Spam Rules**
   - Given spam rules defined
   - When stored in database
   - Then rules configurable without code changes:
     - Keyword blacklist
     - Score thresholds
     - Auto-reject threshold
     - Suspension policy
   - And admin can update rules via dashboard

6. **Admin Review Dashboard**
   - Given flagged listings exist
   - When admin accesses dashboard
   - Then shows:
     - List of flagged listings (spam score 40-70)
     - Spam flags highlighted
     - Actions: approve, reject, mark false positive
   - And provides feedback loop to improve detection

## Tasks / Subtasks

- [ ] **Task 1: Create SpamDetectionService** (AC: #1, #2)
  - [ ] Create service class:
    ```typescript
    @Injectable()
    export class SpamDetectionService {
      constructor(
        private readonly spamRuleService: SpamRuleService,
        private readonly publicListingRepository: Repository<PublicListing>,
        private readonly publicUserRepository: Repository<PublicUser>,
      ) {}

      async detectSpam(listing: PublicListing): Promise<SpamDetectionResult> {
        const flags: SpamFlag[] = [];
        let score = 0;

        // Run all spam checks
        const duplicateCheck = await this.checkDuplicateContent(listing);
        if (duplicateCheck.isSpam) {
          flags.push(duplicateCheck.flag);
          score += 30;
        }

        const keywordCheck = await this.checkSuspiciousKeywords(listing);
        if (keywordCheck.isSpam) {
          flags.push(keywordCheck.flag);
          score += Math.min(keywordCheck.count * 5, 20);
        }

        const contactCheck = this.checkContactSpam(listing);
        if (contactCheck.isSpam) {
          flags.push(contactCheck.flag);
          score += 15;
        }

        const imageCheck = this.checkImageSpam(listing);
        if (imageCheck.isSpam) {
          flags.push(imageCheck.flag);
          score += 10;
        }

        const priceCheck = this.checkPriceAnomaly(listing);
        if (priceCheck.isSpam) {
          flags.push(priceCheck.flag);
          score += 15;
        }

        const rapidPostingCheck = await this.checkRapidPosting(listing);
        if (rapidPostingCheck.isSpam) {
          flags.push(rapidPostingCheck.flag);
          score += 10;
        }

        return {
          spamScore: Math.min(score, 100),
          spamFlags: flags,
          shouldAutoReject: score > 70,
        };
      }
    }
    ```

- [ ] **Task 2: Implement Duplicate Detection** (AC: #1)
  - [ ] Check for duplicate content:
    ```typescript
    private async checkDuplicateContent(
      listing: PublicListing
    ): Promise<SpamCheckResult> {
      // Find recent listings from same user
      const recentListings = await this.publicListingRepository.find({
        where: {
          ownerId: listing.ownerId,
          createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
        },
      });

      for (const existing of recentListings) {
        if (existing.id === listing.id) continue;

        // Check title similarity
        const titleSimilarity = this.calculateLevenshteinSimilarity(
          listing.title,
          existing.title
        );

        if (titleSimilarity > 0.9) {
          return {
            isSpam: true,
            flag: {
              type: 'DUPLICATE_CONTENT',
              severity: 'high',
              message: `Title is ${(titleSimilarity * 100).toFixed(0)}% similar to listing ${existing.id}`,
              details: { similarListingId: existing.id, similarity: titleSimilarity },
            },
          };
        }

        // Check description similarity
        const descSimilarity = this.calculateLevenshteinSimilarity(
          listing.description,
          existing.description
        );

        if (descSimilarity > 0.9) {
          return {
            isSpam: true,
            flag: {
              type: 'DUPLICATE_CONTENT',
              severity: 'high',
              message: `Description is ${(descSimilarity * 100).toFixed(0)}% similar to listing ${existing.id}`,
              details: { similarListingId: existing.id, similarity: descSimilarity },
            },
          };
        }
      }

      return { isSpam: false };
    }

    private calculateLevenshteinSimilarity(str1: string, str2: string): number {
      const distance = this.levenshteinDistance(str1, str2);
      const maxLength = Math.max(str1.length, str2.length);
      return 1 - distance / maxLength;
    }

    private levenshteinDistance(str1: string, str2: string): number {
      const matrix = [];

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }

      return matrix[str2.length][str1.length];
    }
    ```

- [ ] **Task 3: Check Suspicious Keywords** (AC: #1)
  - [ ] Implement keyword detection:
    ```typescript
    private async checkSuspiciousKeywords(
      listing: PublicListing
    ): Promise<SpamCheckResult> {
      const keywords = await this.spamRuleService.getSpamKeywords();
      const text = `${listing.title} ${listing.description}`.toLowerCase();

      const foundKeywords = keywords.filter(keyword =>
        text.includes(keyword.toLowerCase())
      );

      if (foundKeywords.length > 0) {
        return {
          isSpam: true,
          count: foundKeywords.length,
          flag: {
            type: 'SUSPICIOUS_KEYWORDS',
            severity: foundKeywords.length > 2 ? 'high' : 'medium',
            message: `Found ${foundKeywords.length} suspicious keyword(s)`,
            details: { keywords: foundKeywords },
          },
        };
      }

      return { isSpam: false };
    }
    ```

- [ ] **Task 4: Check Contact Spam** (AC: #1)
  - [ ] Detect multiple contacts:
    ```typescript
    private checkContactSpam(listing: PublicListing): SpamCheckResult {
      const description = listing.description;

      // Regex for Vietnamese phone numbers
      const phoneRegex = /(\+84|0)[3|5|7|8|9][0-9]{8}/g;
      const phones = description.match(phoneRegex) || [];

      // Regex for URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = description.match(urlRegex) || [];

      if (phones.length > 2 || urls.length > 1) {
        return {
          isSpam: true,
          flag: {
            type: 'CONTACT_SPAM',
            severity: 'medium',
            message: `Multiple contacts found: ${phones.length} phone(s), ${urls.length} URL(s)`,
            details: { phoneCount: phones.length, urlCount: urls.length },
          },
        };
      }

      return { isSpam: false };
    }
    ```

- [ ] **Task 5: Check Image Spam** (AC: #1)
  - [ ] Validate images:
    ```typescript
    private checkImageSpam(listing: PublicListing): SpamCheckResult {
      if (!listing.imageIds || listing.imageIds.length === 0) {
        return {
          isSpam: true,
          flag: {
            type: 'NO_IMAGES',
            severity: 'low',
            message: 'No images uploaded',
            details: {},
          },
        };
      }

      // TODO: Implement stock photo detection using image hashing
      // For now, just check if images exist

      return { isSpam: false };
    }
    ```

- [ ] **Task 6: Check Price Anomaly** (AC: #1)
  - [ ] Detect unrealistic prices:
    ```typescript
    private checkPriceAnomaly(listing: PublicListing): SpamCheckResult {
      if (listing.price === 0) {
        return {
          isSpam: true,
          flag: {
            type: 'PRICE_ANOMALY',
            severity: 'high',
            message: 'Price is 0',
            details: { price: 0 },
          },
        };
      }

      if (listing.price < 1000000) { // < 1M VND
        return {
          isSpam: true,
          flag: {
            type: 'PRICE_ANOMALY',
            severity: 'medium',
            message: `Price is unrealistically low: ${formatPrice(listing.price)} VNĐ`,
            details: { price: listing.price },
          },
        };
      }

      return { isSpam: false };
    }
    ```

- [ ] **Task 7: Check Rapid Posting** (AC: #1)
  - [ ] Track posting rate:
    ```typescript
    private async checkRapidPosting(
      listing: PublicListing
    ): Promise<SpamCheckResult> {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentCount = await this.publicListingRepository.count({
        where: {
          ownerId: listing.ownerId,
          createdAt: MoreThan(oneHourAgo),
        },
      });

      if (recentCount > 5) {
        return {
          isSpam: true,
          flag: {
            type: 'RAPID_POSTING',
            severity: 'high',
            message: `User posted ${recentCount} listings in the last hour`,
            details: { count: recentCount },
          },
        };
      }

      return { isSpam: false };
    }
    ```

- [ ] **Task 8: Store Spam Results** (AC: #2)
  - [ ] Update listing with spam data:
    ```typescript
    async storeSpamResults(
      listingId: string,
      result: SpamDetectionResult
    ): Promise<void> {
      await this.publicListingRepository.update(listingId, {
        spamScore: result.spamScore,
        spamFlags: result.spamFlags,
      });
    }
    ```

- [ ] **Task 9: Implement Auto-Rejection** (AC: #3)
  - [ ] Auto-reject high spam:
    ```typescript
    async handleAutoReject(
      listing: PublicListing,
      result: SpamDetectionResult
    ): Promise<void> {
      if (!result.shouldAutoReject) return;

      // Reject listing
      await this.publicListingRepository.update(listing.id, {
        status: 'REJECTED',
        rejectedReason: this.buildRejectionReason(result.spamFlags),
      });

      // Notify admin
      await this.notificationService.sendAlert({
        type: 'SPAM_AUTO_REJECT',
        message: `Listing ${listing.id} auto-rejected (spam score: ${result.spamScore})`,
        severity: 'medium',
      });

      // Check for repeated offenses
      await this.checkAndSuspendUser(listing.ownerId);
    }

    private buildRejectionReason(flags: SpamFlag[]): string {
      const reasons = flags.map(flag => flag.message);
      return `Listing rejected due to spam detection:\n- ${reasons.join('\n- ')}`;
    }

    private async checkAndSuspendUser(userId: string): Promise<void> {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const rejectionCount = await this.publicListingRepository.count({
        where: {
          ownerId: userId,
          status: 'REJECTED',
          updatedAt: MoreThan(last24h),
        },
      });

      if (rejectionCount >= 3) {
        await this.publicUserRepository.update(userId, {
          suspended: true,
          suspendedReason: 'Multiple spam listings detected',
          suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        await this.notificationService.sendAlert({
          type: 'USER_SUSPENDED',
          message: `User ${userId} suspended for repeated spam (${rejectionCount} rejections in 24h)`,
          severity: 'high',
        });
      }
    }
    ```

- [ ] **Task 10: Create SpamRule Entity** (AC: #5)
  - [ ] Define configurable rules:
    ```typescript
    @Entity()
    export class SpamRule {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column()
      type: string; // 'keyword', 'threshold', 'policy'

      @Column()
      key: string;

      @Column('json')
      value: any;

      @Column({ default: true })
      enabled: boolean;

      @UpdateDateColumn()
      updatedAt: Date;
    }
    ```
  - [ ] Create service to manage rules:
    ```typescript
    @Injectable()
    export class SpamRuleService {
      async getSpamKeywords(): Promise<string[]> {
        const rule = await this.spamRuleRepository.findOne({
          where: { type: 'keyword', key: 'blacklist', enabled: true },
        });

        return rule ? rule.value : DEFAULT_SPAM_KEYWORDS;
      }

      async getAutoRejectThreshold(): Promise<number> {
        const rule = await this.spamRuleRepository.findOne({
          where: { type: 'threshold', key: 'auto_reject', enabled: true },
        });

        return rule ? rule.value : 70;
      }

      async updateRule(key: string, value: any): Promise<void> {
        await this.spamRuleRepository.upsert({
          type: 'keyword',
          key,
          value,
          enabled: true,
        }, ['key']);
      }
    }
    ```

- [ ] **Task 11: Hook into Listing Submission** (AC: #4)
  - [ ] Run spam detection on submission:
    ```typescript
    @Injectable()
    export class ListingEventListener {
      constructor(
        private readonly spamDetectionService: SpamDetectionService,
      ) {}

      @OnEvent('listing.submitted')
      async handleListingSubmitted(event: ListingSubmittedEvent) {
        const listing = await this.publicListingService.findOne(event.listingId);

        // Run spam detection
        const result = await this.spamDetectionService.detectSpam(listing);

        // Store results
        await this.spamDetectionService.storeSpamResults(listing.id, result);

        // Auto-reject if needed
        await this.spamDetectionService.handleAutoReject(listing, result);
      }
    }
    ```

- [ ] **Task 12: Create Admin Dashboard** (AC: #6)
  - [ ] Create moderation queue component
  - [ ] Display flagged listings (spam score 40-70)
  - [ ] Highlight spam flags
  - [ ] Add actions: approve, reject, mark false positive
  - [ ] Implement feedback loop

- [ ] **Task 13: Create Unit Tests**
  - [ ] Test each spam check individually
  - [ ] Test spam score calculation
  - [ ] Test auto-rejection logic
  - [ ] Test user suspension logic
  - [ ] Achieve >80% coverage

- [ ] **Task 14: Integration Testing**
  - [ ] Test complete spam detection flow
  - [ ] Test with various spam scenarios
  - [ ] Test auto-rejection
  - [ ] Test configurable rules

- [ ] **Task 15: Manual Testing**
  - [ ] Submit listings with spam indicators
  - [ ] Verify spam score calculation
  - [ ] Test auto-rejection
  - [ ] Test admin dashboard
  - [ ] Verify user suspension

## Dev Notes

### Architecture Context

**Spam Detection System**: Rule-based spam filtering
- Multiple spam checks (6 types)
- Weighted spam score (0-100)
- Auto-rejection for high spam (>70)
- Configurable rules (database-stored)
- Admin review dashboard for medium spam (40-70)

**Key Design Decisions**:
- Rule-based (not ML) for transparency
- Pre-approval execution (before admin queue)
- Configurable thresholds and keywords
- User suspension for repeated offenses
- Feedback loop for continuous improvement

### Implementation Details

**Spam Checks & Scores**:
1. **Duplicate Content** (+30): Levenshtein distance > 90%
2. **Suspicious Keywords** (+20): 5 points per keyword, max 20
3. **Contact Spam** (+15): >2 phones or >1 URL
4. **No Images** (+10): No images uploaded
5. **Price Anomaly** (+15): Price = 0 or < 1M VND
6. **Rapid Posting** (+10): >5 listings in 1 hour

**Auto-Rejection**:
- Spam score > 70: Auto-reject
- 3+ rejections in 24h: Suspend user for 7 days

**Configurable Rules**:
- Keyword blacklist
- Auto-reject threshold
- Suspension policy
- Score weights

### Testing Strategy

**Unit Tests**: Each spam check, score calculation, auto-rejection
**Integration Tests**: Complete flow, various scenarios
**Manual Tests**: Real spam submissions, dashboard verification

### References

- [Epic 8.5](../real-estate-platform/epics.md#story-852-spam-detection-rules--filtering)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.7

### Success Criteria

**Definition of Done**:
- ✅ All 6 spam checks implemented
- ✅ Spam score calculation working
- ✅ Auto-rejection working (>70 score)
- ✅ User suspension working (3+ rejections)
- ✅ Configurable rules implemented
- ✅ Admin dashboard created
- ✅ Pre-approval execution working
- ✅ Feedback loop implemented
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
