# Story 3.5: Deal-Property Status Sync

Status: drafted

## Story

As a **System**,
I want deal and property statuses to stay synchronized,
so that data is consistent across entities.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-3.5.1 | Deal stage | Changes to WON | Property status = SOLD | Property updated |
| AC-3.5.2 | Deal stage | Changes to LOST | Property = AVAILABLE (if RESERVED) | Property released |
| AC-3.5.3 | Deal stage | Changes to DEPOSIT_PAID | Property = DEPOSIT_PAID | Sync works |

---

## Backend Tasks

### BE-1: Create Deal-Property Sync Subscriber (AC: 1-3)

**File**: `packages/twenty-server/src/modules/real-estate/subscribers/deal-property-sync.subscriber.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, DataSource } from 'typeorm';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { PropertyWorkspaceEntity, PropertyStatus } from '../standard-objects/property.workspace-entity';

const STAGE_TO_PROPERTY_STATUS: Record<string, PropertyStatus> = {
  'RESERVED': PropertyStatus.RESERVED,
  'DEPOSIT_PAID': PropertyStatus.DEPOSIT_PAID,
  'CONTRACT_SIGNED': PropertyStatus.CONTRACTED,
  'WON': PropertyStatus.SOLD,
};

@Injectable()
@EventSubscriber()
export class DealPropertySyncSubscriber implements EntitySubscriberInterface<OpportunityWorkspaceEntity> {
  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return OpportunityWorkspaceEntity;
  }

  async afterUpdate(event: UpdateEvent<OpportunityWorkspaceEntity>): Promise<void> {
    const deal = event.entity as OpportunityWorkspaceEntity;
    const oldStage = event.databaseEntity?.stage;
    const newStage = deal.stage;

    if (oldStage === newStage) return;

    // Get property from deal
    const propertyId = (deal as any).propertyId;
    if (!propertyId) return;

    const propertyRepo = event.manager.getRepository(PropertyWorkspaceEntity);
    const property = await propertyRepo.findOne({ where: { id: propertyId } });

    if (!property) return;

    // Handle LOST - release property
    if (newStage === 'LOST') {
      if (['RESERVED', 'DEPOSIT_PAID'].includes(property.status)) {
        property.status = PropertyStatus.AVAILABLE;
        property.reservedById = null;
        property.reservedUntil = null;
        await propertyRepo.save(property);
        console.log(`Property ${propertyId} released due to LOST deal`);
      }
      return;
    }

    // Map deal stage to property status
    const newPropertyStatus = STAGE_TO_PROPERTY_STATUS[newStage];
    if (newPropertyStatus && property.status !== newPropertyStatus) {
      property.status = newPropertyStatus;
      await propertyRepo.save(property);
      console.log(`Property ${propertyId} status synced to ${newPropertyStatus}`);
    }
  }
}
```

### BE-2: Register Subscriber (AC: 1)

```typescript
// Add to real-estate.module.ts
import { DealPropertySyncSubscriber } from './subscribers/deal-property-sync.subscriber';

@Module({
  providers: [
    DealPropertySyncSubscriber,
  ],
})
```

---

## Testing Tasks

### TEST-1: Status Sync Tests

```typescript
describe('Deal-Property Status Sync', () => {
  it('should set property to SOLD when deal WON (AC: 1)', async () => {
    const property = await createProperty({ status: 'DEPOSIT_PAID' });
    const deal = await createOpportunity({
      stage: 'CONTRACT_SIGNED',
      propertyId: property.id,
    });

    await updateOpportunity(deal.id, { stage: 'WON' });

    const updated = await getProperty(property.id);
    expect(updated.status).toBe('SOLD');
  });

  it('should release property when deal LOST (AC: 2)', async () => {
    const property = await createProperty({ status: 'RESERVED' });
    const deal = await createOpportunity({
      stage: 'RESERVED',
      propertyId: property.id,
    });

    await updateOpportunity(deal.id, { stage: 'LOST' });

    const updated = await getProperty(property.id);
    expect(updated.status).toBe('AVAILABLE');
    expect(updated.reservedById).toBeNull();
  });

  it('should sync to DEPOSIT_PAID (AC: 3)', async () => {
    const property = await createProperty({ status: 'RESERVED' });
    const deal = await createOpportunity({
      stage: 'RESERVED',
      propertyId: property.id,
    });

    await updateOpportunity(deal.id, { stage: 'DEPOSIT_PAID' });

    const updated = await getProperty(property.id);
    expect(updated.status).toBe('DEPOSIT_PAID');
  });
});
```

---

## Definition of Done

- [ ] Subscriber created
- [ ] WON → SOLD sync works
- [ ] LOST → AVAILABLE sync works
- [ ] Other stage syncs work
- [ ] Tests passing

---

## Dev Notes

### Status Mapping

| Deal Stage | Property Status |
|------------|-----------------|
| RESERVED | RESERVED |
| DEPOSIT_PAID | DEPOSIT_PAID |
| CONTRACT_SIGNED | CONTRACTED |
| WON | SOLD |
| LOST | AVAILABLE (release) |

### References
- [Source: tech-spec-epic-3.md#Deal-Property-Status-Sync]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/subscribers/deal-property-sync.subscriber.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
