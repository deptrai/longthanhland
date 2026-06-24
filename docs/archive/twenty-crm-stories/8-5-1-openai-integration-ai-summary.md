# Story 8.5.1: OpenAI Integration & AI Summary Generation

Status: drafted

## Story
As a developer, I want to integrate OpenAI GPT-4 for generating listing summaries, so that buyers get AI-powered insights.

## Acceptance Criteria

1. **OpenAI API Integration**
   - Given listing approved (Epic 8.3)
   - When AI summary job runs
   - Then calls OpenAI GPT-4 API via v98store key
   - And uses existing OpenAI service (already implemented)
   - And authenticates with API key from environment
   - And sets timeout to 10 seconds
   - And handles API errors gracefully

2. **AI Summary Generation**
   - Given API called successfully
   - When response received
   - Then generates summary with 4 sections:
     - **Property Highlights**: 3-5 key features (bullet points)
     - **Neighborhood Analysis**: Location insights (paragraph)
     - **Investment Potential**: Market analysis and ROI potential (paragraph)
     - **Suitable Buyer Profile**: Target buyer description (paragraph)
   - And summary written in Vietnamese
   - And formatted as rich text (HTML)
   - And length between 300-500 words

3. **Summary Storage**
   - Given summary generated
   - When stored
   - Then saved in `listing.aiSummary` field (RICH_TEXT)
   - And `aiSummaryGeneratedAt` timestamp recorded
   - And token usage logged
   - And cost calculated and tracked

4. **Processing Time**
   - Given job processing
   - When measured
   - Then completes within 10 seconds
   - And processing time logged
   - And timeout triggers retry if exceeded

5. **Error Handling & Retry Logic**
   - Given API errors occur
   - When error detected
   - Then retries 3 times with exponential backoff (1s, 2s, 4s)
   - And logs error details
   - And marks job as failed after max retries
   - And notifies admin if repeated failures

6. **Token Usage & Cost Tracking**
   - Given API call completed
   - When tokens used
   - Then tracks: prompt tokens, completion tokens, total tokens
   - And calculates cost based on GPT-4 pricing
   - And stores in metrics table
   - And alerts if daily cost exceeds budget

## Tasks / Subtasks

- [ ] **Task 1: Create OpenAIService** (AC: #1, #2)
  - [ ] Create service class:
    ```typescript
    @Injectable()
    export class OpenAIService {
      private readonly openai: OpenAI;

      constructor(
        private readonly configService: ConfigService,
      ) {
        this.openai = new OpenAI({
          apiKey: this.configService.get('OPENAI_API_KEY'), // v98store key
        });
      }

      async generateListingSummary(listing: PublicListing): Promise<string> {
        const prompt = this.buildPrompt(listing);

        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4', // or 'gpt-3.5-turbo' for cost optimization
            messages: [
              {
                role: 'system',
                content: 'You are a Vietnamese real estate expert. Generate insightful property summaries for buyers.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 600,
            temperature: 0.7,
            timeout: 10000, // 10 seconds
          });

          const summary = response.choices[0].message.content;

          // Track token usage
          await this.trackTokenUsage(listing.id, response.usage);

          return this.formatSummary(summary);
        } catch (error) {
          console.error('OpenAI API error:', error);
          throw error;
        }
      }
    }
    ```

- [ ] **Task 2: Build Effective Prompt Template** (AC: #2)
  - [ ] Create prompt builder:
    ```typescript
    private buildPrompt(listing: PublicListing): string {
      return `
Analyze this Vietnamese real estate listing and generate a comprehensive summary in Vietnamese:

**Property Details:**
- Title: ${listing.title}
- Type: ${listing.propertyType} - ${listing.listingType}
- Price: ${formatPrice(listing.price)} VNĐ
- Area: ${listing.area} m²
- Location: ${listing.location}, ${listing.district}, ${listing.province}
- Bedrooms: ${listing.bedrooms || 'N/A'}
- Bathrooms: ${listing.bathrooms || 'N/A'}
- Floor: ${listing.floor || 'N/A'}
- Orientation: ${listing.orientation || 'N/A'}

**Description:**
${listing.description}

**Market Context:**
${listing.aiResearchResult ? `
- Similar listings found: ${listing.aiResearchResult.similarListingsFound.length}
- Market average price: ${formatPrice(listing.aiResearchResult.priceRange.avg)} VNĐ
- Price positioning: ${this.getPricePositioning(listing)}
` : 'Market data not available'}

**Generate a summary with these 4 sections:**

1. **Điểm Nổi Bật** (Property Highlights):
   - List 3-5 key features that make this property attractive
   - Use bullet points
   - Focus on unique selling points

2. **Phân Tích Khu Vực** (Neighborhood Analysis):
   - Describe the location and neighborhood
   - Mention nearby amenities, transportation, schools
   - Highlight location advantages

3. **Tiềm Năng Đầu Tư** (Investment Potential):
   - Analyze market trends for this area
   - Discuss potential ROI
   - Mention growth prospects

4. **Phù Hợp Với** (Suitable Buyer Profile):
   - Describe ideal buyer for this property
   - Consider family size, lifestyle, budget
   - Mention use cases (residence, investment, etc.)

Format the response in HTML with proper headings and paragraphs. Keep it concise (300-500 words total).
      `.trim();
    }
    ```

- [ ] **Task 3: Format and Parse Response** (AC: #2, #3)
  - [ ] Format summary as HTML:
    ```typescript
    private formatSummary(rawSummary: string): string {
      // Parse markdown-style formatting to HTML
      let html = rawSummary;

      // Convert headers
      html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
      html = html.replace(/^\*\*(.+)\*\*$/gm, '<h3>$1</h3>');

      // Convert bullet points
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

      // Convert paragraphs
      html = html.replace(/^(?!<[hul])(.*\S.*)$/gm, '<p>$1</p>');

      // Clean up
      html = html.replace(/\n{2,}/g, '\n');

      return html.trim();
    }
    ```

- [ ] **Task 4: Store Summary** (AC: #3)
  - [ ] Save to listing:
    ```typescript
    async storeSummary(
      listingId: string,
      summary: string,
      tokenUsage: TokenUsage
    ): Promise<void> {
      await this.publicListingService.update(listingId, {
        aiSummary: summary,
        aiSummaryGeneratedAt: new Date(),
      });

      // Log token usage
      await this.tokenUsageService.create({
        listingId,
        promptTokens: tokenUsage.prompt_tokens,
        completionTokens: tokenUsage.completion_tokens,
        totalTokens: tokenUsage.total_tokens,
        cost: this.calculateCost(tokenUsage),
        model: 'gpt-4',
        createdAt: new Date(),
      });
    }
    ```

- [ ] **Task 5: Create Background Job** (AC: #1, #4)
  - [ ] Create job:
    ```typescript
    @Processor('ai-summary')
    export class GenerateAISummaryJob {
      constructor(
        private readonly openaiService: OpenAIService,
        private readonly publicListingService: PublicListingService,
      ) {}

      @Process('generate-summary')
      async handleGenerateSummary(job: Job<{ listingId: string }>) {
        const startTime = Date.now();
        const { listingId } = job.data;

        try {
          console.log(`Generating AI summary for listing ${listingId}`);

          // Fetch listing
          const listing = await this.publicListingService.findOne(listingId);

          // Generate summary
          const summary = await this.openaiService.generateListingSummary(listing);

          // Store summary
          await this.openaiService.storeSummary(listingId, summary, null);

          const duration = Date.now() - startTime;
          console.log(`AI summary generated in ${duration}ms`);

          // Track metrics
          await this.metricsService.record({
            metric: 'ai_summary_generation',
            listingId,
            duration,
            success: true,
          });
        } catch (error) {
          console.error(`Failed to generate AI summary for listing ${listingId}:`, error);

          await this.metricsService.record({
            metric: 'ai_summary_generation',
            listingId,
            success: false,
            error: error.message,
          });

          throw error; // Trigger retry
        }
      }
    }
    ```

- [ ] **Task 6: Implement Retry Logic** (AC: #5)
  - [ ] Configure job with retry:
    ```typescript
    // In queue configuration
    export const aiSummaryQueueOptions = {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 2s, 4s
        },
        timeout: 15000, // 15 seconds total (10s API + 5s overhead)
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    };
    ```

- [ ] **Task 7: Implement Rate Limiting** (AC: #6)
  - [ ] Add rate limiter:
    ```typescript
    @Injectable()
    export class OpenAIRateLimiter {
      constructor(private readonly redis: Redis) {}

      async checkLimit(): Promise<void> {
        const key = 'ratelimit:openai:summary';
        const limit = 100; // 100 requests per hour
        const window = 3600; // 1 hour in seconds

        const current = await this.redis.incr(key);

        if (current === 1) {
          await this.redis.expire(key, window);
        }

        if (current > limit) {
          const ttl = await this.redis.ttl(key);
          throw new RateLimitException(
            `OpenAI rate limit exceeded. Retry in ${ttl}s`
          );
        }
      }
    }
    ```

- [ ] **Task 8: Track Token Usage & Cost** (AC: #6)
  - [ ] Calculate cost:
    ```typescript
    private calculateCost(usage: TokenUsage): number {
      // GPT-4 pricing (as of 2024)
      const PROMPT_COST_PER_1K = 0.03; // $0.03 per 1K tokens
      const COMPLETION_COST_PER_1K = 0.06; // $0.06 per 1K tokens

      const promptCost = (usage.prompt_tokens / 1000) * PROMPT_COST_PER_1K;
      const completionCost = (usage.completion_tokens / 1000) * COMPLETION_COST_PER_1K;

      return promptCost + completionCost;
    }
    ```
  - [ ] Create TokenUsage entity:
    ```typescript
    @Entity()
    export class TokenUsage {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column()
      listingId: string;

      @Column()
      model: string;

      @Column()
      promptTokens: number;

      @Column()
      completionTokens: number;

      @Column()
      totalTokens: number;

      @Column('decimal', { precision: 10, scale: 6 })
      cost: number;

      @CreateDateColumn()
      createdAt: Date;
    }
    ```

- [ ] **Task 9: Add Cost Monitoring & Alerts** (AC: #6)
  - [ ] Monitor daily cost:
    ```typescript
    @Injectable()
    export class CostMonitoringService {
      async checkDailyCost(): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyCost = await this.tokenUsageRepository
          .createQueryBuilder('usage')
          .select('SUM(usage.cost)', 'total')
          .where('usage.createdAt >= :today', { today })
          .getRawOne();

        const DAILY_BUDGET = 50; // $50 per day

        if (dailyCost.total > DAILY_BUDGET) {
          await this.alertService.sendAlert({
            type: 'COST_ALERT',
            message: `OpenAI daily cost exceeded budget: $${dailyCost.total.toFixed(2)} / $${DAILY_BUDGET}`,
            severity: 'high',
          });
        }
      }
    }
    ```

- [ ] **Task 10: Queue Job on Listing Approval** (AC: #1)
  - [ ] Hook into approval event:
    ```typescript
    @Injectable()
    export class ListingEventListener {
      constructor(
        private readonly aiSummaryJobService: AISummaryJobService,
      ) {}

      @OnEvent('listing.approved')
      async handleListingApproved(event: ListingApprovedEvent) {
        // Queue AI summary generation
        await this.aiSummaryJobService.queueSummary(event.listingId);
      }
    }
    ```

- [ ] **Task 11: Create Unit Tests**
  - [ ] Test prompt generation
  - [ ] Test summary formatting
  - [ ] Test cost calculation
  - [ ] Test rate limiting
  - [ ] Test retry logic
  - [ ] Achieve >80% coverage

- [ ] **Task 12: Integration Testing**
  - [ ] Test complete flow with mock OpenAI API
  - [ ] Test with real API (limited)
  - [ ] Test error handling and retries
  - [ ] Test cost tracking

- [ ] **Task 13: Manual Testing**
  - [ ] Generate summary for test listing
  - [ ] Verify summary quality and format
  - [ ] Check token usage and cost
  - [ ] Test rate limiting
  - [ ] Verify job retry on failure

## Dev Notes

### Architecture Context

**OpenAI Integration**: GPT-4 for AI-powered listing summaries
- Uses existing v98store OpenAI key
- Background job processing (async)
- Rate limited to 100 requests/hour
- Token usage and cost tracking
- Retry logic with exponential backoff

**Key Design Decisions**:
- GPT-4 for quality (can switch to GPT-3.5-turbo for cost)
- Vietnamese language summaries
- Rich text (HTML) format
- 4-section structure (highlights, neighborhood, investment, buyer profile)
- 300-500 words length
- 10-second timeout
- Daily cost monitoring with alerts

### Implementation Details

**Prompt Engineering**:
- System message: Vietnamese real estate expert
- User message: Structured listing data + market context
- Explicit instructions for 4 sections
- HTML formatting requested
- Word count guidance (300-500 words)

**Summary Sections**:
1. **Điểm Nổi Bật** (Property Highlights): 3-5 bullet points
2. **Phân Tích Khu Vực** (Neighborhood Analysis): Paragraph
3. **Tiềm Năng Đầu Tư** (Investment Potential): Paragraph
4. **Phù Hợp Với** (Suitable Buyer Profile): Paragraph

**Cost Calculation** (GPT-4):
- Prompt: $0.03 per 1K tokens
- Completion: $0.06 per 1K tokens
- Estimated cost per summary: $0.05-0.10

**Rate Limiting**:
- 100 requests/hour (Redis-based)
- Daily budget: $50
- Alerts if budget exceeded

### Testing Strategy

**Unit Tests**: Prompt generation, formatting, cost calculation, rate limiting
**Integration Tests**: Complete flow with mock API, error handling
**Manual Tests**: Real API calls, quality verification

### References

- [Epic 8.5](../real-estate-platform/epics.md#story-851-openai-integration--ai-summary-generation)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.5
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)

### Success Criteria

**Definition of Done**:
- ✅ OpenAI API integrated with v98store key
- ✅ AI summary generation working
- ✅ 4-section summary format implemented
- ✅ Summary stored in listing.aiSummary
- ✅ Processing time < 10 seconds
- ✅ Retry logic implemented
- ✅ Rate limiting working
- ✅ Token usage and cost tracking working
- ✅ Cost monitoring and alerts working
- ✅ Background job working
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
