# Story 3.3: Auto-Create Deal on Deposit

Status: drafted

## Story

As a **System**,
I want to automatically create a Deal when deposit is paid,
so that sales pipeline is updated automatically.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-3.3.1 | Property RESERVED | Deposit paid | Deal created automatically | Deal exists in DB |
| AC-3.3.2 | Deal created | Check fields | Has property, contact, amount | All fields populated |
| AC-3.3.3 | Deal created | Check stage | Stage = DEPOSIT_PAID | Stage is correct |

---

## Backend Tasks

### BE-1: Create Property Subscriber for Deal Creation (AC: 1-3)

> **IMPORTANT**: Twenty uses TypeORM subscribers for entity lifecycle events.

**File**: `packages/twenty-server/src/modules/real-estate/subscribers/property-deal.subscriber.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, DataSource } from 'typeorm';
import { PropertyWorkspaceEntity, PropertyStatus } from '../standard-objects/property.workspace-entity';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

@Injectable()
@EventSubscriber()
export class PropertyDealSubscriber implements EntitySubscriberInterface<PropertyWorkspaceEntity> {
  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return PropertyWorkspaceEntity;
  }

  async afterUpdate(event: UpdateEvent<PropertyWorkspaceEntity>): Promise<void> {
    const property = event.entity as PropertyWorkspaceEntity;
    const oldStatus = event.databaseEntity?.status;
    const newStatus = property.status;

    // Trigger when status changes to DEPOSIT_PAID
    if (oldStatus !== PropertyStatus.DEPOSIT_PAID && newStatus === PropertyStatus.DEPOSIT_PAID) {
      await this.createDealForProperty(event, property);
    }
  }

  private async createDealForProperty(
    event: UpdateEvent<PropertyWorkspaceEntity>,
    property: PropertyWorkspaceEntity,
  ): Promise<void> {
    const opportunityRepository = event.manager.getRepository(OpportunityWorkspaceEntity);

    // Check if deal already exists for this property
    const existingDeal = await opportunityRepository.findOne({
      where: {
        // [ASSUMPTION: Opportunity has propertyId field via extension]
        // If not, use a linking table
      },
    });

    if (existingDeal) {
      console.log(`Deal already exists for property ${property.id}`);
      return;
    }

    // Create new deal (Opportunity)
    const deal = opportunityRepository.create({
      name: `Deal for ${property.plotNumber}`,
      stage: 'DEPOSIT_PAID',
      amount: {
        amountMicros: property.price * 1000000, // Convert to micros
        currencyCode: 'VND',
      },
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      // Extension fields (if supported)
      // propertyId: property.id,
      // depositAmount: property.depositAmount,
    });

    await opportunityRepository.save(deal);
    console.log(`Created deal ${deal.id} for property ${property.id}`);
  }
}
```

**Subtasks**:
- [ ] Create subscriber file
- [ ] Listen to Property entity
- [ ] Trigger on status change to DEPOSIT_PAID
- [ ] Create Opportunity with correct fields
- [ ] Prevent duplicate deals

### BE-2: Alternative - Use Service Method (AC: 1-3)

If subscriber approach is complex, use explicit service method:

**File**: `packages/twenty-server/src/modules/real-estate/services/deal.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

@Injectable()
export class DealService {
  constructor(
    @InjectRepository(OpportunityWorkspaceEntity)
    private opportunityRepository: Repository<OpportunityWorkspaceEntity>,
    @InjectRepository(PropertyWorkspaceEntity)
    private propertyRepository: Repository<PropertyWorkspaceEntity>,
  ) {}

  /**
   * Create a deal when deposit is paid for a property.
   * Called from PropertyService.updateStatus() when status = DEPOSIT_PAID
   */
  async createDealForDeposit(
    propertyId: string,
    contactId: string,
    depositAmount: number,
  ): Promise<OpportunityWorkspaceEntity> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      relations: ['project'],
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const deal = this.opportunityRepository.create({
      name: `${property.project?.name || 'Property'} - ${property.plotNumber}`,
      stage: 'DEPOSIT_PAID',
      amount: {
        amountMicros: property.price * 1000000,
        currencyCode: 'VND',
      },
      closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      pointOfContactId: contactId,
      // Extension fields
      // propertyId: property.id,
      // depositAmount: depositAmount,
    });

    return this.opportunityRepository.save(deal);
  }
}
```

**Subtasks**:
- [ ] Create deal service
- [ ] Implement createDealForDeposit method
- [ ] Call from PropertyService when status changes

### BE-3: Update Module (AC: 1)

```typescript
// Add to real-estate.module.ts
import { PropertyDealSubscriber } from './subscribers/property-deal.subscriber';
import { DealService } from './services/deal.service';

@Module({
  providers: [
    PropertyDealSubscriber,
    DealService,
  ],
})
```

---

## API Tasks

### API-1: Update Property Status to DEPOSIT_PAID (AC: 1)

```graphql
mutation UpdatePropertyToDepositPaid {
  updateRealEstateProperty(id: "property-uuid", data: {
    status: DEPOSIT_PAID
  }) {
    id
    status
  }
}

# This should trigger auto-creation of Deal
# Query to verify:
query VerifyDealCreated {
  opportunities(filter: { name: { contains: "A-101" } }) {
    edges {
      node {
        id
        name
        stage
        amount
      }
    }
  }
}
```

---

## Testing Tasks

### TEST-1: Auto-Creation Tests

```typescript
describe('Auto-Create Deal on Deposit', () => {
  it('should create deal when property status changes to DEPOSIT_PAID (AC: 1)', async () => {
    const property = await createProperty({
      plotNumber: 'A-101',
      status: 'RESERVED',
      price: 1500000000,
    });

    // Update status to DEPOSIT_PAID
    await updateProperty(property.id, { status: 'DEPOSIT_PAID' });

    // Verify deal was created
    const deals = await findOpportunities({ name: { contains: 'A-101' } });
    expect(deals).toHaveLength(1);
    expect(deals[0].stage).toBe('DEPOSIT_PAID');
  });

  it('should populate deal with correct fields (AC: 2)', async () => {
    const property = await createProperty({
      plotNumber: 'B-202',
      price: 2000000000,
    });

    await updateProperty(property.id, { status: 'DEPOSIT_PAID' });

    const deal = await findOpportunity({ name: { contains: 'B-202' } });
    expect(deal.amount.amountMicros).toBe(2000000000 * 1000000);
    expect(deal.amount.currencyCode).toBe('VND');
  });

  it('should not create duplicate deals (AC: 1)', async () => {
    const property = await createProperty({ status: 'RESERVED' });

    // Update twice
    await updateProperty(property.id, { status: 'DEPOSIT_PAID' });
    await updateProperty(property.id, { status: 'DEPOSIT_PAID' });

    const deals = await findOpportunities({ propertyId: property.id });
    expect(deals).toHaveLength(1);
  });
});
```

---

## Definition of Done

- [ ] Subscriber or service created
- [ ] Deal auto-created on DEPOSIT_PAID
- [ ] Deal has correct fields
- [ ] No duplicate deals
- [ ] Tests passing

---

## Dev Notes

### Trigger Options

| Approach | Pros | Cons |
|----------|------|------|
| **TypeORM Subscriber** | Automatic, decoupled | Complex debugging |
| **Service Method** | Explicit, testable | Requires manual call |
| **GraphQL Mutation Hook** | Flexible | Tied to API layer |

### References
- [Source: architecture.md#Commission-Auto-Creation-Pattern]
- [Source: tech-spec-epic-3.md#Auto-Create-Deal]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/subscribers/property-deal.subscriber.ts
- packages/twenty-server/src/modules/real-estate/services/deal.service.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
