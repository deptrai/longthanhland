# Story 2.3: Reservation System

Status: drafted

## Story

As a **Sales Agent**,
I want to reserve a property for 24 hours,
so that I have time to collect customer deposit.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.3.1 | AVAILABLE property | Sales reserves | Status = RESERVED | GraphQL returns RESERVED |
| AC-2.3.2 | Reserved property | Check reservedUntil | = NOW + 24 hours | Timestamp correct |
| AC-2.3.3 | RESERVED property | Another Sales reserves | Error returned | 400 Bad Request |
| AC-2.3.4 | Reservation | Check reservedById | = current user ID | Field matches |

---

## Backend Tasks

### BE-1: Create Reservation Service (AC: 1-4)

> **⚠️ CRITICAL PATTERNS**:
> - Use `TwentyORMGlobalManager` instead of `@InjectRepository`
> - Use `@InjectMessageQueue` instead of `@InjectQueue`
> - All methods need `workspaceId` parameter

**File**: `packages/twenty-server/src/modules/real-estate/services/reservation.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { type RealEstatePropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';
import { ReleaseReservationJob } from '../jobs/release-reservation.job';

@Injectable()
export class ReservationService {
  private readonly RESERVATION_DURATION_HOURS = 24;

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectMessageQueue(MessageQueue.workspaceQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async reserveProperty(
    workspaceId: string,
    propertyId: string,
    userId: string,
  ): Promise<RealEstatePropertyWorkspaceEntity> {
    const schemaName = getWorkspaceSchemaName(workspaceId);

    // Use raw SQL for pessimistic locking with workspace schema
    return this.dataSource.transaction(async (manager) => {
      // Acquire lock on the property row using raw SQL
      const [property] = await manager.query(
        `SELECT * FROM "${schemaName}"."realEstateProperty"
         WHERE id = $1
         FOR UPDATE`,
        [propertyId]
      );

      if (!property) {
        throw new BadRequestException('Property not found');
      }

      if (property.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Property is not available. Current status: ${property.status}`
        );
      }

      // Calculate reservation expiry
      const reservedUntil = new Date();
      reservedUntil.setHours(reservedUntil.getHours() + this.RESERVATION_DURATION_HOURS);

      // Update property
      await manager.query(
        `UPDATE "${schemaName}"."realEstateProperty"
         SET status = $1, "reservedById" = $2, "reservedUntil" = $3
         WHERE id = $4`,
        ['RESERVED', userId, reservedUntil, propertyId]
      );

      // Schedule auto-release job using Twenty's MessageQueue
      await this.messageQueueService.add<ReleaseReservationJob>(
        ReleaseReservationJob.name,
        {
          workspaceId,
          propertyId,
        },
        {
          delay: this.RESERVATION_DURATION_HOURS * 60 * 60 * 1000,
        }
      );

      // Return updated property
      const propertyRepository = await this.twentyORMGlobalManager
        .getRepositoryForWorkspace<RealEstatePropertyWorkspaceEntity>(
          workspaceId,
          'realEstateProperty',
        );

      return propertyRepository.findOne({ where: { id: propertyId } });
    });
  }

  async releaseProperty(
    workspaceId: string,
    propertyId: string,
    userId: string,
  ): Promise<RealEstatePropertyWorkspaceEntity> {
    const propertyRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace<RealEstatePropertyWorkspaceEntity>(
        workspaceId,
        'realEstateProperty',
      );

    const property = await propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new BadRequestException('Property not found');
    }

    if (property.status !== 'RESERVED') {
      throw new BadRequestException('Property is not reserved');
    }

    // Only owner or admin can release
    if (property.reservedById !== userId) {
      throw new BadRequestException('Only the reservation owner can release');
    }

    // Update property
    await propertyRepository.update(propertyId, {
      status: 'AVAILABLE',
      reservedById: null,
      reservedUntil: null,
    });

    return propertyRepository.findOne({ where: { id: propertyId } });
  }
}
```

**Key Changes from Original**:
1. Use `TwentyORMGlobalManager` instead of `@InjectRepository`
2. Use `MessageQueueService` instead of BullMQ
3. Use raw SQL with workspace schema for pessimistic locking
4. All methods require `workspaceId` parameter

**Subtasks**:
- [ ] Create service file
- [ ] Inject TwentyORMGlobalManager and MessageQueueService
- [ ] Implement reserveProperty with pessimistic locking
- [ ] Implement releaseProperty
- [ ] Schedule auto-release job via MessageQueue
- [ ] Add error handling for edge cases

### BE-2: Create Property Resolver (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/resolvers/property.resolver.ts`

```typescript
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ReservationService } from '../services/reservation.service';
import { PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

@Resolver(() => PropertyWorkspaceEntity)
@UseGuards(JwtAuthGuard)
export class PropertyResolver {
  constructor(private reservationService: ReservationService) {}

  @Mutation(() => PropertyWorkspaceEntity, {
    description: 'Reserve a property for 24 hours',
  })
  async reserveProperty(
    @Args('propertyId') propertyId: string,
    @CurrentUser() user: { id: string },
  ): Promise<PropertyWorkspaceEntity> {
    return this.reservationService.reserveProperty(propertyId, user.id);
  }

  @Mutation(() => PropertyWorkspaceEntity, {
    description: 'Release a property reservation',
  })
  async releaseProperty(
    @Args('propertyId') propertyId: string,
    @CurrentUser() user: { id: string },
  ): Promise<PropertyWorkspaceEntity> {
    return this.reservationService.releaseProperty(propertyId, user.id);
  }
}
```

**Subtasks**:
- [ ] Create resolver file
- [ ] Add reserveProperty mutation
- [ ] Add releaseProperty mutation
- [ ] Add JWT authentication guard
- [ ] Add CurrentUser decorator

### BE-3: Update Module (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/real-estate.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PropertyWorkspaceEntity } from './standard-objects/property.workspace-entity';
import { ReservationService } from './services/reservation.service';
import { PropertyResolver } from './resolvers/property.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([PropertyWorkspaceEntity]),
    BullModule.registerQueue({ name: 'real-estate' }),
  ],
  providers: [ReservationService, PropertyResolver],
  exports: [ReservationService],
})
export class RealEstateModule {}
```

**Subtasks**:
- [ ] Add BullModule.registerQueue
- [ ] Add ReservationService to providers
- [ ] Add PropertyResolver to providers
- [ ] Export ReservationService

---

## Database Tasks

### DB-1: Property Fields for Reservation (AC: 2, 4)

Ensure Property entity has these fields (from Story 2.2):

```sql
ALTER TABLE property ADD COLUMN IF NOT EXISTS reserved_by_id UUID REFERENCES "user"(id);
ALTER TABLE property ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMPTZ;

CREATE INDEX idx_property_reserved_until ON property(reserved_until)
  WHERE status = 'RESERVED';
```

**Subtasks**:
- [ ] Verify reservedById field exists
- [ ] Verify reservedUntil field exists
- [ ] Add index for expired reservation queries

---

## API Tasks

### API-1: Reserve Property Mutation (AC: 1, 2, 4)

```graphql
mutation ReserveProperty {
  reserveProperty(propertyId: "property-uuid") {
    id
    plotNumber
    status
    reservedById
    reservedUntil
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "reserveProperty": {
      "id": "property-uuid",
      "plotNumber": "A-101",
      "status": "RESERVED",
      "reservedById": "user-uuid",
      "reservedUntil": "2025-12-10T19:30:00Z"
    }
  }
}
```

**Subtasks**:
- [ ] Test successful reservation
- [ ] Verify status = RESERVED
- [ ] Verify reservedUntil = NOW + 24h
- [ ] Verify reservedById = current user

### API-2: Release Property Mutation (AC: 1)

```graphql
mutation ReleaseProperty {
  releaseProperty(propertyId: "property-uuid") {
    id
    status
    reservedById
    reservedUntil
  }
}
```

**Expected Response**:
```json
{
  "data": {
    "releaseProperty": {
      "id": "property-uuid",
      "status": "AVAILABLE",
      "reservedById": null,
      "reservedUntil": null
    }
  }
}
```

**Subtasks**:
- [ ] Test successful release
- [ ] Verify status = AVAILABLE
- [ ] Verify reservedById = null

### API-3: Error Cases (AC: 3)

**Already Reserved**:
```graphql
mutation ReserveProperty {
  reserveProperty(propertyId: "already-reserved-uuid") {
    id
  }
}
```

**Expected Error**:
```json
{
  "errors": [{
    "message": "Property is not available. Current status: RESERVED",
    "extensions": { "code": "BAD_REQUEST" }
  }]
}
```

**Subtasks**:
- [ ] Test reservation of already reserved property
- [ ] Verify error message is clear
- [ ] Test release by non-owner (should fail)

---

## Frontend Tasks

### FE-1: Reserve Button (AC: 1)

**File**: `packages/twenty-front/src/modules/real-estate/components/ReserveButton.tsx`

```tsx
import { Button, useToast } from '@/ui';
import { useReserveProperty } from '../hooks/useReserveProperty';

interface ReserveButtonProps {
  propertyId: string;
  status: string;
  onSuccess?: () => void;
}

export const ReserveButton: React.FC<ReserveButtonProps> = ({
  propertyId,
  status,
  onSuccess,
}) => {
  const { reserveProperty, loading, error } = useReserveProperty();
  const toast = useToast();

  const handleReserve = async () => {
    try {
      await reserveProperty(propertyId);
      toast.success('Property reserved for 24 hours');
      onSuccess?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (status !== 'AVAILABLE') {
    return null;
  }

  return (
    <Button
      onClick={handleReserve}
      loading={loading}
      variant="primary"
    >
      Reserve Property
    </Button>
  );
};
```

**Subtasks**:
- [ ] Create ReserveButton component
- [ ] Add loading state
- [ ] Add success toast
- [ ] Add error handling

### FE-2: useReserveProperty Hook (AC: 1)

**File**: `packages/twenty-front/src/modules/real-estate/hooks/useReserveProperty.ts`

```typescript
import { useMutation, gql } from '@apollo/client';

const RESERVE_PROPERTY = gql`
  mutation ReserveProperty($propertyId: ID!) {
    reserveProperty(propertyId: $propertyId) {
      id
      status
      reservedById
      reservedUntil
    }
  }
`;

export const useReserveProperty = () => {
  const [mutate, { loading, error }] = useMutation(RESERVE_PROPERTY, {
    refetchQueries: ['GetProperty', 'ListProperties'],
  });

  const reserveProperty = async (propertyId: string) => {
    const result = await mutate({ variables: { propertyId } });
    return result.data.reserveProperty;
  };

  return { reserveProperty, loading, error };
};
```

**Subtasks**:
- [ ] Create hook file
- [ ] Define GraphQL mutation
- [ ] Add refetch queries for cache update
- [ ] Export hook

### FE-3: Reservation Timer Display (AC: 2)

**File**: `packages/twenty-front/src/modules/real-estate/components/ReservationTimer.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Badge } from '@/ui';

interface ReservationTimerProps {
  reservedUntil: Date;
}

export const ReservationTimer: React.FC<ReservationTimerProps> = ({ reservedUntil }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(reservedUntil));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(reservedUntil));
    }, 1000);
    return () => clearInterval(timer);
  }, [reservedUntil]);

  const isExpiringSoon = timeLeft.hours < 2;

  if (timeLeft.total <= 0) {
    return <Badge variant="error">Expired</Badge>;
  }

  return (
    <Badge variant={isExpiringSoon ? 'warning' : 'info'}>
      {timeLeft.hours}h {timeLeft.minutes}m remaining
    </Badge>
  );
};

function calculateTimeLeft(reservedUntil: Date) {
  const total = new Date(reservedUntil).getTime() - Date.now();
  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  return { total, hours, minutes };
}
```

**Subtasks**:
- [ ] Create timer component
- [ ] Add countdown logic
- [ ] Add warning state for <2h
- [ ] Add expired state

---

## Testing Tasks

### TEST-1: Unit Tests (AC: 1-4)

**File**: `packages/twenty-server/src/modules/real-estate/services/__tests__/reservation.service.spec.ts`

```typescript
describe('ReservationService', () => {
  describe('reserveProperty', () => {
    it('should reserve an AVAILABLE property', async () => {
      const property = await createProperty({ status: 'AVAILABLE' });
      const result = await reservationService.reserveProperty(property.id, userId);

      expect(result.status).toBe('RESERVED');
      expect(result.reservedById).toBe(userId);
      expect(result.reservedUntil).toBeDefined();
    });

    it('should reject reservation of non-AVAILABLE property', async () => {
      const property = await createProperty({ status: 'RESERVED' });

      await expect(
        reservationService.reserveProperty(property.id, userId)
      ).rejects.toThrow('Property is not available');
    });

    it('should set reservedUntil to 24 hours from now', async () => {
      const property = await createProperty({ status: 'AVAILABLE' });
      const before = Date.now();

      const result = await reservationService.reserveProperty(property.id, userId);

      const expectedTime = before + 24 * 60 * 60 * 1000;
      const actualTime = new Date(result.reservedUntil).getTime();
      expect(actualTime).toBeCloseTo(expectedTime, -4); // Within 10 seconds
    });
  });

  describe('releaseProperty', () => {
    it('should release a reserved property', async () => {
      const property = await createProperty({
        status: 'RESERVED',
        reservedById: userId
      });

      const result = await reservationService.releaseProperty(property.id, userId);

      expect(result.status).toBe('AVAILABLE');
      expect(result.reservedById).toBeNull();
    });

    it('should reject release by non-owner', async () => {
      const property = await createProperty({
        status: 'RESERVED',
        reservedById: 'other-user'
      });

      await expect(
        reservationService.releaseProperty(property.id, userId)
      ).rejects.toThrow('Only the reservation owner can release');
    });
  });
});
```

**Subtasks**:
- [ ] Write test for successful reservation
- [ ] Write test for reservation rejection
- [ ] Write test for 24h expiry time
- [ ] Write test for successful release
- [ ] Write test for release rejection

### TEST-2: Concurrency Test (AC: 3)

**File**: `packages/twenty-server/src/modules/real-estate/__tests__/reservation.concurrency.spec.ts`

```typescript
describe('Reservation Concurrency', () => {
  it('should only allow one reservation for concurrent requests', async () => {
    const property = await createProperty({ status: 'AVAILABLE' });

    // Simulate concurrent requests
    const results = await Promise.allSettled([
      reservationService.reserveProperty(property.id, 'user-1'),
      reservationService.reserveProperty(property.id, 'user-2'),
      reservationService.reserveProperty(property.id, 'user-3'),
    ]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(2);
  });
});
```

**Subtasks**:
- [ ] Write concurrency test
- [ ] Verify only one request succeeds
- [ ] Verify others get clear error

---

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] ReservationService created with locking
- [ ] PropertyResolver created with mutations
- [ ] BullMQ queue configured
- [ ] GraphQL mutations tested
- [ ] Frontend components created
- [ ] Unit tests passing
- [ ] Concurrency test passing
- [ ] Code reviewed

---

## Dev Notes

### Architecture Patterns
- **Pessimistic Locking**: `setLock('pessimistic_write')` prevents race conditions
- **Transaction**: Ensures atomic operation
- **BullMQ**: Schedules auto-release job with delay

### Sequence Diagram
```
Sales Agent → GraphQL → ReservationService → DB (SELECT FOR UPDATE)
                                           → DB (UPDATE status)
                                           → BullMQ (schedule release)
                                           ← Property (RESERVED)
```

### References
- [Source: architecture.md lines 285-330]
- [Source: tech-spec-epic-2.md#Reservation-Sequence]
- [Source: PRD v1.3 Section 4.2.3]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- packages/twenty-server/src/modules/real-estate/services/reservation.service.ts
- packages/twenty-server/src/modules/real-estate/resolvers/property.resolver.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts
- packages/twenty-front/src/modules/real-estate/components/ReserveButton.tsx
- packages/twenty-front/src/modules/real-estate/hooks/useReserveProperty.ts
- packages/twenty-front/src/modules/real-estate/components/ReservationTimer.tsx
