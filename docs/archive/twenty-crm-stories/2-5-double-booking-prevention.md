# Story 2.5: Double-Booking Prevention

Status: drafted

## Story

As a **System**,
I want to prevent double-booking of properties,
so that two agents cannot reserve the same property simultaneously.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.5.1 | Property AVAILABLE | Two agents reserve simultaneously | Only one succeeds | Second gets error |
| AC-2.5.2 | Property RESERVED | Another agent tries to reserve | Request rejected | 400 error returned |
| AC-2.5.3 | Concurrent requests | 10 simultaneous reservations | Exactly 1 succeeds | Concurrency test passes |

---

## Backend Tasks

### BE-1: Implement Pessimistic Locking (AC: 1, 3)

> **IMPORTANT**: This is already implemented in Story 2.3. This story adds additional safeguards.

**File**: `packages/twenty-server/src/modules/real-estate/services/reservation.service.ts`

```typescript
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { addHours } from 'date-fns';
import { PropertyWorkspaceEntity, PropertyStatus } from '../standard-objects/property.workspace-entity';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(PropertyWorkspaceEntity)
    private propertyRepository: Repository<PropertyWorkspaceEntity>,
    private dataSource: DataSource,
    @InjectQueue('real-estate')
    private reservationQueue: Queue,
  ) {}

  /**
   * Reserve a property with pessimistic locking to prevent double-booking.
   *
   * Uses PostgreSQL FOR UPDATE to lock the row during transaction.
   * Only one concurrent request can acquire the lock.
   */
  async reserveProperty(propertyId: string, userId: string): Promise<PropertyWorkspaceEntity> {
    return this.dataSource.transaction(async (manager) => {
      // Step 1: Lock the property row for update
      // This prevents other transactions from reading/modifying until we commit
      const property = await manager.findOne(PropertyWorkspaceEntity, {
        where: { id: propertyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!property) {
        throw new BadRequestException('Property not found');
      }

      // Step 2: Check if property is available
      if (property.status !== PropertyStatus.AVAILABLE) {
        throw new ConflictException(
          `Property is ${property.status}, cannot reserve. ` +
          `${property.status === PropertyStatus.RESERVED ?
            `Reserved until ${property.reservedUntil?.toISOString()}` : ''}`
        );
      }

      // Step 3: Update property status
      property.status = PropertyStatus.RESERVED;
      property.reservedById = userId;
      property.reservedUntil = addHours(new Date(), 24);

      await manager.save(property);

      // Step 4: Schedule auto-release job
      await this.reservationQueue.add(
        'release-reservation',
        { propertyId },
        {
          delay: 24 * 60 * 60 * 1000, // 24 hours
          jobId: `release-${propertyId}`, // Prevent duplicate jobs
          removeOnComplete: true,
        }
      );

      return property;
    });
  }
}
```

**Key Points**:
- `pessimistic_write` lock ensures exclusive access
- Transaction ensures atomicity
- `ConflictException` (409) for already reserved
- `jobId` prevents duplicate release jobs

**Subtasks**:
- [ ] Verify pessimistic locking in reservation service
- [ ] Add ConflictException for double-booking attempts
- [ ] Add detailed error messages

### BE-2: Add Database Constraint (AC: 2)

**Migration**: Add unique constraint to prevent data corruption

```sql
-- Ensure only one RESERVED status per property at a time
-- This is a safety net in case of race conditions

-- Note: This is enforced at application level, but we add a check constraint
ALTER TABLE property
ADD CONSTRAINT chk_reserved_has_user
CHECK (
  (status != 'RESERVED') OR
  (status = 'RESERVED' AND reserved_by_id IS NOT NULL AND reserved_until IS NOT NULL)
);
```

**Subtasks**:
- [ ] Create migration file
- [ ] Add check constraint
- [ ] Run migration

---

## Testing Tasks

### TEST-1: Concurrency Tests (AC: 1, 3)

**File**: `packages/twenty-server/src/modules/real-estate/__tests__/double-booking.spec.ts`

```typescript
describe('Double-Booking Prevention', () => {
  describe('Concurrent Reservations', () => {
    it('should allow only one reservation when two agents reserve simultaneously (AC: 1)', async () => {
      // Create available property
      const property = await createProperty({ status: 'AVAILABLE' });
      const agent1 = await createUser({ role: 'SALES_AGENT' });
      const agent2 = await createUser({ role: 'SALES_AGENT' });

      // Attempt concurrent reservations
      const results = await Promise.allSettled([
        reservationService.reserveProperty(property.id, agent1.id),
        reservationService.reserveProperty(property.id, agent2.id),
      ]);

      // Exactly one should succeed
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);

      // Verify failure is ConflictException
      const failure = failures[0] as PromiseRejectedResult;
      expect(failure.reason).toBeInstanceOf(ConflictException);
    });

    it('should handle 10 simultaneous reservations correctly (AC: 3)', async () => {
      const property = await createProperty({ status: 'AVAILABLE' });
      const agents = await Promise.all(
        Array(10).fill(null).map(() => createUser({ role: 'SALES_AGENT' }))
      );

      // 10 concurrent reservations
      const results = await Promise.allSettled(
        agents.map(agent => reservationService.reserveProperty(property.id, agent.id))
      );

      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes).toHaveLength(1);

      // Verify property is reserved by exactly one agent
      const updatedProperty = await getProperty(property.id);
      expect(updatedProperty.status).toBe('RESERVED');
      expect(agents.map(a => a.id)).toContain(updatedProperty.reservedById);
    });

    it('should reject reservation for already reserved property (AC: 2)', async () => {
      const property = await createProperty({
        status: 'RESERVED',
        reservedById: 'existing-user-id',
        reservedUntil: addHours(new Date(), 12),
      });
      const agent = await createUser({ role: 'SALES_AGENT' });

      await expect(
        reservationService.reserveProperty(property.id, agent.id)
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

**Subtasks**:
- [ ] Create test file
- [ ] Write concurrent reservation test
- [ ] Write 10-simultaneous test
- [ ] Write already-reserved test
- [ ] Run tests: `npx nx test twenty-server --testPathPattern=double-booking`

### TEST-2: Load Test (Optional)

```bash
# Using k6 for load testing
k6 run --vus 50 --duration 30s scripts/load-test-reservation.js
```

**Subtasks**:
- [ ] Create k6 load test script
- [ ] Run load test
- [ ] Verify no double-bookings

---

## Definition of Done

- [ ] Pessimistic locking implemented
- [ ] ConflictException for double-booking
- [ ] Database constraint added
- [ ] Concurrent reservation test passes
- [ ] 10-simultaneous test passes
- [ ] Already-reserved test passes

---

## Dev Notes

### Why Pessimistic Locking?

| Approach | Pros | Cons |
|----------|------|------|
| **Pessimistic (chosen)** | Guarantees no conflicts | Blocks other transactions |
| Optimistic | No blocking | Requires retry logic |
| Application-level | Simple | Race conditions possible |

### PostgreSQL Lock Modes

| Mode | Use Case |
|------|----------|
| `pessimistic_read` | Shared lock, allows reads |
| `pessimistic_write` | Exclusive lock, blocks all |
| `pessimistic_partial_write` | Locks specific columns |

### References
- [Source: architecture.md#Reservation-Pattern]
- [Source: tech-spec-epic-2.md#Double-Booking-Prevention]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/services/reservation.service.ts (verify)
- packages/twenty-server/src/modules/real-estate/__tests__/double-booking.spec.ts
