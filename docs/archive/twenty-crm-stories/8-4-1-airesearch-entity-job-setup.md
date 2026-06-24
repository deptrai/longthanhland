# Story 8.4.1: AIResearchResult Entity & Job Setup

Status: drafted

## Story
As a developer, I want to create the AIResearchResult entity and background job infrastructure, so that we can store and process AI research results.

## Acceptance Criteria

1. **AIResearchResult Entity Created**
   - Given PublicListing entity exists (Epic 8.3)
   - When I create AIResearchResult workspace entity
   - Then `AIResearchResultWorkspaceEntity` created with `@WorkspaceEntity` decorator
   - And all fields from PRD 4.8.4 included:
     - listing (RELATION to PublicListing)
     - sourcesChecked (JSON array)
     - similarListingsFound (JSON array)
     - priceRange (JSON object: min, max, avg)
     - duplicateDetected (BOOLEAN)
     - confidenceScore (NUMBER 0-100)
     - completedAt (DATETIME)
     - status (SELECT: PENDING, COMPLETED, FAILED)
   - And entity registered in Twenty's metadata system

2. **Relation to PublicListing Defined**
   - Given entity fields defined
   - When relation configured
   - Then `listing` relation → PublicListing (required, one-to-one)
   - And cascade delete configured (delete research when listing deleted)
   - And foreign key created with index

3. **BullMQ Job Infrastructure Created**
   - Given BullMQ installed and configured
   - When job infrastructure created
   - Then `AIResearchJob` job class created
   - And job queue named `public-marketplace-ai-research`
   - And job registered in module
   - And queue monitored in Bull Board (dev environment)

4. **Job Processor Implemented**
   - Given job infrastructure created
   - When processor implemented
   - Then `AIResearchProcessor` class created with `@Processor()` decorator
   - And `@Process()` method handles job execution
   - And processor calls PerplexicaService (Story 8.4.2)
   - And processor calls AIResearchService (Story 8.4.3)
   - And processor updates AIResearchResult entity
   - And processor handles errors gracefully

5. **Auto-Queue on Listing Approval**
   - Given listing status changes to APPROVED
   - When status change event triggered
   - Then AIResearchJob automatically queued
   - And job data includes: listingId, ownerId, timestamp
   - And job priority set to NORMAL
   - And job logged to monitoring

6. **Job Execution with Retry Logic**
   - Given job processing
   - When job executes
   - Then completes within 2 minutes (timeout)
   - And max 3 retry attempts on failure
   - And exponential backoff between retries (1s, 2s, 4s)
   - And job status tracked (PENDING → ACTIVE → COMPLETED/FAILED)
   - And errors logged with context

## Tasks / Subtasks

- [ ] **Task 1: Create AIResearchResult Workspace Entity** (AC: #1)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/entities/ai-research-result.workspace-entity.ts`
  - [ ] Add `@WorkspaceEntity()` decorator:
    ```typescript
    @WorkspaceEntity({
      standardId: 'aiResearchResult',
      namePlural: 'aiResearchResults',
      labelSingular: 'AI Research Result',
      labelPlural: 'AI Research Results',
      description: 'AI research results for public listings',
      icon: 'IconRobot',
    })
    export class AIResearchResultWorkspaceEntity extends BaseWorkspaceEntity {
      // Fields defined below
    }
    ```
  - [ ] Define fields:
    ```typescript
    @WorkspaceField({
      standardId: 'sourcesChecked',
      type: FieldMetadataType.RAW_JSON,
      label: 'Sources Checked',
      description: 'Array of sources checked',
      icon: 'IconList',
    })
    sourcesChecked: string[]; // JSON array

    @WorkspaceField({
      standardId: 'similarListingsFound',
      type: FieldMetadataType.RAW_JSON,
      label: 'Similar Listings Found',
      description: 'Array of similar listings data',
      icon: 'IconHome',
    })
    similarListingsFound: any[]; // JSON array

    @WorkspaceField({
      standardId: 'priceRange',
      type: FieldMetadataType.RAW_JSON,
      label: 'Price Range',
      description: 'Price range from similar listings',
      icon: 'IconCurrencyDong',
    })
    priceRange: { min: number; max: number; avg: number }; // JSON object

    @WorkspaceField({
      standardId: 'duplicateDetected',
      type: FieldMetadataType.BOOLEAN,
      label: 'Duplicate Detected',
      description: 'Whether duplicate listing detected',
      icon: 'IconAlertTriangle',
      defaultValue: false,
    })
    duplicateDetected: boolean;

    @WorkspaceField({
      standardId: 'confidenceScore',
      type: FieldMetadataType.NUMBER,
      label: 'Confidence Score',
      description: 'Research confidence score (0-100)',
      icon: 'IconShield',
    })
    confidenceScore?: number;

    @WorkspaceField({
      standardId: 'completedAt',
      type: FieldMetadataType.DATE_TIME,
      label: 'Completed At',
      description: 'Research completion timestamp',
      icon: 'IconCheck',
    })
    completedAt?: Date;

    @WorkspaceField({
      standardId: 'status',
      type: FieldMetadataType.SELECT,
      label: 'Status',
      description: 'Research status',
      icon: 'IconCircleDot',
      defaultValue: 'PENDING',
      options: [
        { value: 'PENDING', label: 'Pending', color: 'yellow' },
        { value: 'COMPLETED', label: 'Completed', color: 'green' },
        { value: 'FAILED', label: 'Failed', color: 'red' },
      ],
    })
    status: string;
    ```

- [ ] **Task 2: Define Relation to PublicListing** (AC: #2)
  - [ ] Add listing relation:
    ```typescript
    @WorkspaceRelation({
      standardId: 'listing',
      type: RelationMetadataType.ONE_TO_ONE,
      label: 'Listing',
      description: 'Public listing being researched',
      icon: 'IconHome',
      inverseSideTarget: () => PublicListingWorkspaceEntity,
      inverseSideFieldKey: 'aiResearchResult',
    })
    listing: Relation<PublicListingWorkspaceEntity>;

    @WorkspaceJoinColumn('listing')
    listingId: string;
    ```
  - [ ] Configure cascade delete: onDelete: CASCADE

- [ ] **Task 3: Setup BullMQ Infrastructure** (AC: #3)
  - [ ] Install BullMQ if not already: `pnpm add bullmq`
  - [ ] Create queue configuration:
    ```typescript
    // packages/twenty-server/src/modules/public-marketplace/config/queue.config.ts
    export const AI_RESEARCH_QUEUE = 'public-marketplace-ai-research';

    export const queueOptions = {
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
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
      },
    };
    ```
  - [ ] Register queue in module

- [ ] **Task 4: Create AIResearchJob** (AC: #3)
  - [ ] Create job data interface:
    ```typescript
    export interface AIResearchJobData {
      listingId: string;
      ownerId: string;
      timestamp: Date;
    }
    ```
  - [ ] Create job service:
    ```typescript
    @Injectable()
    export class AIResearchJobService {
      private queue: Queue;

      constructor() {
        this.queue = new Queue(AI_RESEARCH_QUEUE, queueOptions);
      }

      async queueResearch(listingId: string, ownerId: string): Promise<void> {
        await this.queue.add('research-listing', {
          listingId,
          ownerId,
          timestamp: new Date(),
        }, {
          priority: 5, // Normal priority
          timeout: 120000, // 2 minutes
        });

        console.log(`AI research job queued for listing ${listingId}`);
      }
    }
    ```

- [ ] **Task 5: Create AIResearchProcessor** (AC: #4)
  - [ ] Create processor class:
    ```typescript
    @Processor(AI_RESEARCH_QUEUE)
    export class AIResearchProcessor {
      constructor(
        private readonly perplexicaService: PerplexicaService, // Story 8.4.2
        private readonly aiResearchService: AIResearchService, // Story 8.4.3
        private readonly aiResearchResultService: AIResearchResultService,
      ) {}

      @Process('research-listing')
      async handleResearch(job: Job<AIResearchJobData>): Promise<void> {
        const { listingId, ownerId } = job.data;

        try {
          console.log(`Starting AI research for listing ${listingId}`);

          // Update status to PENDING
          await this.aiResearchResultService.create({
            listingId,
            status: 'PENDING',
          });

          // Step 1: Fetch listing
          const listing = await this.publicListingService.findOne(listingId);

          // Step 2: Research via Perplexica (Story 8.4.2)
          const researchData = await this.perplexicaService.researchListing(listing);

          // Step 3: Process and analyze (Story 8.4.3)
          const analysis = await this.aiResearchService.analyzeResearch(researchData, listing);

          // Step 4: Save results
          await this.aiResearchResultService.update(listingId, {
            sourcesChecked: researchData.sourcesChecked,
            similarListingsFound: researchData.similarListings,
            priceRange: analysis.priceRange,
            duplicateDetected: analysis.duplicateDetected,
            confidenceScore: analysis.confidenceScore,
            status: 'COMPLETED',
            completedAt: new Date(),
          });

          console.log(`AI research completed for listing ${listingId}`);
        } catch (error) {
          console.error(`AI research failed for listing ${listingId}:`, error);

          await this.aiResearchResultService.update(listingId, {
            status: 'FAILED',
          });

          throw error; // Trigger retry
        }
      }
    }
    ```

- [ ] **Task 6: Auto-Queue on Listing Approval** (AC: #5)
  - [ ] Hook into listing approval event:
    ```typescript
    // In PublicListingService or ApprovalWorkflow
    async approveListing(listingId: string): Promise<void> {
      // ... existing approval logic ...

      // Queue AI research job
      await this.aiResearchJobService.queueResearch(listingId, listing.ownerId);
    }
    ```
  - [ ] Alternative: Use event emitter pattern
    ```typescript
    @Injectable()
    export class ListingEventListener {
      constructor(
        private readonly aiResearchJobService: AIResearchJobService,
      ) {}

      @OnEvent('listing.approved')
      async handleListingApproved(event: ListingApprovedEvent) {
        await this.aiResearchJobService.queueResearch(
          event.listingId,
          event.ownerId
        );
      }
    }
    ```

- [ ] **Task 7: Implement Job Monitoring** (AC: #6)
  - [ ] Add Bull Board for dev environment:
    ```typescript
    import { createBullBoard } from '@bull-board/api';
    import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
    import { ExpressAdapter } from '@bull-board/express';

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [new BullMQAdapter(aiResearchQueue)],
      serverAdapter,
    });

    app.use('/admin/queues', serverAdapter.getRouter());
    ```
  - [ ] Add metrics tracking:
    - Job success rate
    - Average processing time
    - Retry rate
    - Failed jobs count

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test entity creation and field validation
  - [ ] Test job queuing
  - [ ] Test processor execution (mock services)
  - [ ] Test retry logic
  - [ ] Test error handling
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Integration Testing**
  - [ ] Test complete flow: listing approval → job queued → job processed
  - [ ] Test job retry on failure
  - [ ] Test timeout handling
  - [ ] Test concurrent job processing

- [ ] **Task 10: Manual Testing**
  - [ ] Approve listing and verify job queued
  - [ ] Monitor job in Bull Board
  - [ ] Verify AIResearchResult created
  - [ ] Test job failure and retry
  - [ ] Check Redis for job data

## Dev Notes

### Architecture Context

**Background Job Pattern**: BullMQ for async processing
- Job queue: `public-marketplace-ai-research`
- Processor: `AIResearchProcessor`
- Triggered on listing approval
- Max 2 minutes processing time
- Max 3 retry attempts

**Key Design Decisions**:
- One-to-one relation (listing ↔ research result)
- Auto-queue on approval (not on submission)
- Exponential backoff for retries
- Store results as JSON (flexible schema)
- Bull Board for monitoring (dev only)

### Implementation Details

**Job Flow**:
```
Listing Approved → Event Emitted → Job Queued → Processor Executes
→ Perplexica Research (Story 8.4.2) → Analysis (Story 8.4.3)
→ Save Results → Update Status
```

**Retry Strategy**:
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds (final)

**Status Transitions**:
```
PENDING → COMPLETED (success)
PENDING → FAILED (all retries exhausted)
```

### Testing Strategy

**Unit Tests**: Entity validation, job queuing, processor logic
**Integration Tests**: End-to-end job flow
**Manual Tests**: Bull Board monitoring, Redis inspection

### References

- [Epic 8.4](../real-estate-platform/epics.md#story-841-airesearchresult-entity--job-setup)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.4
- [Architecture](../real-estate-platform/architecture.md) - Section 4.4 (Background Jobs)

### Success Criteria

**Definition of Done**:
- ✅ AIResearchResult entity created with all fields
- ✅ Relation to PublicListing configured
- ✅ BullMQ infrastructure setup
- ✅ AIResearchJob created
- ✅ AIResearchProcessor implemented
- ✅ Auto-queue on listing approval working
- ✅ Retry logic implemented
- ✅ Job monitoring setup (Bull Board)
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
