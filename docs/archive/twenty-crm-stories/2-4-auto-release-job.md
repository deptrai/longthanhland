# Story 2.4: Auto-Release Job

Status: drafted

## Story

As a **System**,
I want to automatically release expired reservations,
so that properties don't stay locked indefinitely.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.4.1 | Cron job | Runs every 5 minutes | Expired reservations found | Job logs show execution |
| AC-2.4.2 | Expired reservation | Job runs | Status = AVAILABLE | Property status updated |
| AC-2.4.3 | Non-expired reservation | Job runs | Status unchanged | No modification |
| AC-2.4.4 | Job runs multiple times | Same expired property | Idempotent | No duplicate releases |

---

## Backend Tasks

### BE-1: Create Release Reservation Job (AC: 1-4)

> **⚠️ CRITICAL**: Use Twenty's `@Processor` and `@Process` decorators, NOT BullMQ directly.

**File**: `packages/twenty-server/src/modules/real-estate/jobs/release-reservation.job.ts`

```typescript
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { type RealEstatePropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

export interface ReleaseReservationJobData {
  workspaceId: string;
  propertyId: string;
}

@Processor({
  queueName: MessageQueue.workspaceQueue,
})
export class ReleaseReservationJob {
  private readonly logger = new Logger(ReleaseReservationJob.name);

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
  ) {}

  @Process(ReleaseReservationJob.name)
  async handle(job: { data: ReleaseReservationJobData }): Promise<void> {
    const { workspaceId, propertyId } = job.data;

    this.logger.log(`Processing release for property ${propertyId} in workspace ${workspaceId}`);

    try {
      const propertyRepository = await this.twentyORMGlobalManager
        .getRepositoryForWorkspace<RealEstatePropertyWorkspaceEntity>(
          workspaceId,
          'realEstateProperty',
        );

      const property = await propertyRepository.findOne({
        where: { id: propertyId },
      });

      if (!property) {
        this.logger.warn(`Property ${propertyId} not found`);
        return;
      }

      // Only release if still RESERVED
      if (property.status !== 'RESERVED') {
        this.logger.log(`Property ${propertyId} is ${property.status}, skipping release`);
        return;
      }

      // Check if reservation has expired
      if (property.reservedUntil && property.reservedUntil > new Date()) {
        this.logger.log(`Property ${propertyId} reservation not yet expired, skipping`);
        return;
      }

      // Release the property
      await propertyRepository.update(propertyId, {
        status: 'AVAILABLE',
        reservedById: null,
        reservedUntil: null,
      });

      this.logger.log(`Released property ${propertyId} successfully`);
    } catch (error) {
      this.logger.error(`Failed to release property ${propertyId}: ${error.message}`);
      throw error; // Re-throw to trigger retry
    }
  }
}
```

**Key Points**:
- Use `@Processor({ queueName: MessageQueue.workspaceQueue })`
- Use `@Process(JobName)` to handle job
- Use `TwentyORMGlobalManager` for workspace entities
- Job data includes `workspaceId` for multi-tenant support

**Subtasks**:
- [ ] Create job file
- [ ] Use Twenty's Processor decorator
- [ ] Use TwentyORMGlobalManager
- [ ] Handle property release logic
- [ ] Add logging

### BE-2: Create Cron Job for Safety Net (AC: 2)

> **Note**: This runs periodically to catch any missed releases

**File**: `packages/twenty-server/src/modules/real-estate/crons/release-expired-reservations.cron.job.ts`

```typescript
import { Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WorkspaceActivationStatus } from 'twenty-shared/workspace';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { SentryCronMonitor } from 'src/engine/core-modules/cron/sentry-cron-monitor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

export const RELEASE_EXPIRED_RESERVATIONS_CRON_PATTERN = '*/5 * * * *'; // Every 5 minutes

@Processor({
  queueName: MessageQueue.cronQueue,
})
export class ReleaseExpiredReservationsCronJob {
  private readonly logger = new Logger(ReleaseExpiredReservationsCronJob.name);

  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Process(ReleaseExpiredReservationsCronJob.name)
  @SentryCronMonitor(
    ReleaseExpiredReservationsCronJob.name,
    RELEASE_EXPIRED_RESERVATIONS_CRON_PATTERN,
  )
  async handle(): Promise<void> {
    this.logger.log('Starting expired reservations release cron...');

    const activeWorkspaces = await this.workspaceRepository.find({
      where: { activationStatus: WorkspaceActivationStatus.ACTIVE },
    });

    for (const workspace of activeWorkspaces) {
      try {
        const schemaName = getWorkspaceSchemaName(workspace.id);

        // Release all expired reservations in this workspace
        const result = await this.dataSource.query(
          `UPDATE "${schemaName}"."realEstateProperty"
           SET status = 'AVAILABLE', "reservedById" = NULL, "reservedUntil" = NULL
           WHERE status = 'RESERVED' AND "reservedUntil" < NOW()
           RETURNING id`
        );

        if (result.length > 0) {
          this.logger.log(
            `Released ${result.length} expired reservations in workspace ${workspace.id}`
          );
        }
      } catch (error) {
        this.logger.error(`Error in workspace ${workspace.id}: ${error.message}`);
      }
    }

    this.logger.log('Expired reservations release cron completed');
  }
}
```

**Subtasks**:
- [ ] Create cron job file
- [ ] Use Twenty's Processor/Process decorators
- [ ] Iterate over all active workspaces
- [ ] Use raw SQL for multi-tenant update
- [ ] Add logging

### BE-3: Update Module (AC: 1)

> **Note**: No BullModule or ScheduleModule needed - Twenty handles this.

```typescript
// Add to real-estate.module.ts
import { ReleaseReservationJob } from './jobs/release-reservation.job';
import { ReleaseExpiredReservationsCronJob } from './crons/release-expired-reservations.cron.job';

@Module({
  imports: [],  // No ScheduleModule or BullModule needed!
  providers: [
    ReleaseReservationJob,
    ReleaseExpiredReservationsCronJob,
    ProjectService,
  ],
})
export class RealEstateModule {}
```

**Key Points**:
- Twenty's MessageQueue system handles job processing
- No need for `@nestjs/schedule` or `@nestjs/bullmq` imports
- Just add job classes to providers

**Subtasks**:
- [ ] Add job classes to providers
- [ ] No additional imports needed

---

## Database Tasks

### DB-1: Add Index for Expired Reservations (AC: 1)

```sql
-- Partial index for efficient expired reservation queries
CREATE INDEX idx_property_expired_reservations
ON property(reserved_until)
WHERE status = 'RESERVED';
```

**Subtasks**:
- [ ] Add partial index
- [ ] Verify query uses index

---

## Testing Tasks

### TEST-1: Unit Tests (AC: 1-4)

**File**: `packages/twenty-server/src/modules/real-estate/jobs/__tests__/reservation-release.job.spec.ts`

```typescript
describe('ReservationReleaseJob', () => {
  beforeEach(async () => {
    // Setup test module
  });

  describe('handleCron', () => {
    it('should release expired reservations (AC: 2)', async () => {
      // Create expired reservation
      const property = await createProperty({
        status: 'RESERVED',
        reservedUntil: new Date(Date.now() - 1000), // 1 second ago
        reservedById: 'user-id',
      });

      // Run job
      await job.handleCron();

      // Verify released
      const updated = await getProperty(property.id);
      expect(updated.status).toBe('AVAILABLE');
      expect(updated.reservedById).toBeNull();
      expect(updated.reservedUntil).toBeNull();
    });

    it('should not release non-expired reservations (AC: 3)', async () => {
      // Create non-expired reservation
      const property = await createProperty({
        status: 'RESERVED',
        reservedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        reservedById: 'user-id',
      });

      // Run job
      await job.handleCron();

      // Verify not released
      const updated = await getProperty(property.id);
      expect(updated.status).toBe('RESERVED');
      expect(updated.reservedById).toBe('user-id');
    });

    it('should be idempotent (AC: 4)', async () => {
      // Create expired reservation
      const property = await createProperty({
        status: 'RESERVED',
        reservedUntil: new Date(Date.now() - 1000),
        reservedById: 'user-id',
      });

      // Run job twice
      await job.handleCron();
      await job.handleCron();

      // Verify released only once (no errors)
      const updated = await getProperty(property.id);
      expect(updated.status).toBe('AVAILABLE');
    });

    it('should update project availablePlots (AC: 2)', async () => {
      const project = await createProject({ totalPlots: 10, availablePlots: 9 });
      await createProperty({
        projectId: project.id,
        status: 'RESERVED',
        reservedUntil: new Date(Date.now() - 1000),
      });

      await job.handleCron();

      const updatedProject = await getProject(project.id);
      expect(updatedProject.availablePlots).toBe(10);
    });
  });
});
```

**Subtasks**:
- [ ] Write test for expired release
- [ ] Write test for non-expired skip
- [ ] Write test for idempotency
- [ ] Write test for availablePlots update
- [ ] Run tests

### TEST-2: Integration Test

```typescript
describe('Reservation Release Integration', () => {
  it('should release via BullMQ after 24 hours', async () => {
    // Create reservation
    const property = await reserveProperty('property-id', 'user-id');

    // Fast-forward time (mock)
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

    // Process queue
    await processQueue('real-estate');

    // Verify released
    const updated = await getProperty(property.id);
    expect(updated.status).toBe('AVAILABLE');
  });
});
```

**Subtasks**:
- [ ] Write integration test
- [ ] Test BullMQ processing
- [ ] Run tests

---

## Definition of Done

- [ ] ReservationReleaseJob created with @Cron
- [ ] ReservationReleaseProcessor created for BullMQ
- [ ] Module updated with ScheduleModule
- [ ] Partial index added
- [ ] Job releases expired reservations
- [ ] Job skips non-expired reservations
- [ ] Job is idempotent
- [ ] Project availablePlots updated
- [ ] Unit tests passing
- [ ] Integration tests passing

---

## Dev Notes

### Two-Layer Release Strategy

1. **BullMQ Delayed Job**: Scheduled when reservation is created, fires after 24h
2. **Cron Safety Net**: Runs every 5 minutes, catches any missed releases

### Why Both?
- BullMQ: Precise timing, efficient
- Cron: Handles edge cases (server restart, queue failure)

### Sequence Diagram
```
Reserve Property
      │
      ├──► Update status = RESERVED
      │
      └──► Schedule BullMQ job (24h delay)
                    │
                    ▼ (after 24h)
            ReservationReleaseProcessor
                    │
                    ├──► Check status still RESERVED
                    │
                    ├──► Update status = AVAILABLE
                    │
                    └──► Update project.availablePlots

Every 5 minutes:
      │
      ▼
ReservationReleaseJob (Cron)
      │
      ├──► Find expired reservations
      │
      ├──► Release each property
      │
      └──► Update project.availablePlots
```

### References
- [Source: architecture.md lines 403-448]
- [Source: tech-spec-epic-2.md#Auto-Release-Job]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/jobs/reservation-release.job.ts
- packages/twenty-server/src/modules/real-estate/jobs/reservation-release.processor.ts
- packages/twenty-server/src/modules/real-estate/jobs/__tests__/reservation-release.job.spec.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
