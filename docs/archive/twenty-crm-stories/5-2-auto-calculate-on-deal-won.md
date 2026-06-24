# Story 5.2: Auto-Calculate Commission on Deal Won

Status: drafted

## Story

As a **System**,
I want to automatically calculate commission when a Deal is won,
so that sales agents see their earnings immediately.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-5.2.1 | Deal exists | Stage changes to WON | Commission created | Commission in DB |
| AC-5.2.2 | Commission created | Check calculation | amount = dealValue × rate | Math is correct |
| AC-5.2.3 | Commission created | Check status | Status = PENDING | Awaits approval |

---

## Backend Tasks

### BE-1: Create Deal Subscriber (AC: 1-3)

> **IMPORTANT**: This follows the pattern from architecture.md

**File**: `packages/twenty-server/src/modules/real-estate/subscribers/deal-commission.subscriber.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, UpdateEvent, DataSource } from 'typeorm';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { CommissionWorkspaceEntity, CommissionStatus } from '../standard-objects/commission.workspace-entity';
import { PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';
import { ProjectWorkspaceEntity } from '../standard-objects/project.workspace-entity';

@Injectable()
@EventSubscriber()
export class DealCommissionSubscriber implements EntitySubscriberInterface<OpportunityWorkspaceEntity> {
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

    // Trigger when stage changes to WON
    if (oldStage !== 'WON' && newStage === 'WON') {
      await this.createCommissionForDeal(event, deal);
    }
  }

  private async createCommissionForDeal(
    event: UpdateEvent<OpportunityWorkspaceEntity>,
    deal: OpportunityWorkspaceEntity,
  ): Promise<void> {
    const commissionRepository = event.manager.getRepository(CommissionWorkspaceEntity);
    const propertyRepository = event.manager.getRepository(PropertyWorkspaceEntity);

    // Check if commission already exists
    const existingCommission = await commissionRepository.findOne({
      where: { dealId: deal.id },
    });

    if (existingCommission) {
      console.log(`Commission already exists for deal ${deal.id}`);
      return;
    }

    // Get property and project for commission rate
    // [ASSUMPTION: Deal has propertyId via extension]
    const property = await propertyRepository.findOne({
      where: { id: (deal as any).propertyId },
      relations: ['project'],
    });

    if (!property) {
      console.warn(`No property found for deal ${deal.id}, cannot calculate commission`);
      return;
    }

    // Calculate commission
    const dealValue = deal.amount?.amountMicros ? deal.amount.amountMicros / 1000000 : 0;
    const commissionRate = property.project?.commissionRate || 3; // Default 3%
    const commissionAmount = dealValue * (commissionRate / 100);

    // Create commission
    const commission = commissionRepository.create({
      dealId: deal.id,
      propertyId: property.id,
      salesAgentId: (deal as any).salesAgentId || deal.createdById,
      dealValue: dealValue,
      commissionRate: commissionRate,
      commissionAmount: commissionAmount,
      status: CommissionStatus.PENDING,
    });

    await commissionRepository.save(commission);
    console.log(`Created commission ${commission.id} for deal ${deal.id}: ${commissionAmount} VNĐ`);
  }
}
```

**Subtasks**:
- [ ] Create subscriber file
- [ ] Listen to Opportunity entity
- [ ] Trigger on stage change to WON
- [ ] Calculate commission amount
- [ ] Create Commission with PENDING status

### BE-2: Commission Calculation Service (AC: 2)

**File**: `packages/twenty-server/src/modules/real-estate/services/commission.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionWorkspaceEntity, CommissionStatus } from '../standard-objects/commission.workspace-entity';

@Injectable()
export class CommissionService {
  constructor(
    @InjectRepository(CommissionWorkspaceEntity)
    private commissionRepository: Repository<CommissionWorkspaceEntity>,
  ) {}

  /**
   * Calculate commission amount
   * Formula: dealValue × (commissionRate / 100)
   */
  calculateCommission(dealValue: number, commissionRate: number): number {
    if (dealValue <= 0 || commissionRate <= 0) {
      return 0;
    }
    return Math.round(dealValue * (commissionRate / 100));
  }

  /**
   * Create commission for a won deal
   */
  async createCommission(params: {
    dealId: string;
    propertyId: string;
    salesAgentId: string;
    dealValue: number;
    commissionRate: number;
  }): Promise<CommissionWorkspaceEntity> {
    const { dealId, propertyId, salesAgentId, dealValue, commissionRate } = params;

    const commissionAmount = this.calculateCommission(dealValue, commissionRate);

    const commission = this.commissionRepository.create({
      dealId,
      propertyId,
      salesAgentId,
      dealValue,
      commissionRate,
      commissionAmount,
      status: CommissionStatus.PENDING,
    });

    return this.commissionRepository.save(commission);
  }

  /**
   * Get commissions for a sales agent
   */
  async getCommissionsForAgent(
    salesAgentId: string,
    status?: CommissionStatus,
  ): Promise<CommissionWorkspaceEntity[]> {
    const where: any = { salesAgentId };
    if (status) {
      where.status = status;
    }
    return this.commissionRepository.find({
      where,
      relations: ['deal', 'property', 'property.project'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get total pending commission for an agent
   */
  async getTotalPendingCommission(salesAgentId: string): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('commission')
      .select('SUM(commission.commissionAmount)', 'total')
      .where('commission.salesAgentId = :salesAgentId', { salesAgentId })
      .andWhere('commission.status = :status', { status: CommissionStatus.PENDING })
      .getRawOne();

    return result?.total || 0;
  }
}
```

**Subtasks**:
- [ ] Create commission service
- [ ] Implement calculateCommission method
- [ ] Implement createCommission method
- [ ] Add helper methods for queries

### BE-3: Update Module (AC: 1)

```typescript
// Add to real-estate.module.ts
import { DealCommissionSubscriber } from './subscribers/deal-commission.subscriber';
import { CommissionService } from './services/commission.service';

@Module({
  providers: [
    DealCommissionSubscriber,
    CommissionService,
  ],
  exports: [CommissionService],
})
```

---

## API Tasks

### API-1: Update Deal to WON (AC: 1)

```graphql
mutation UpdateDealToWon {
  updateOpportunity(id: "deal-uuid", data: {
    stage: WON
  }) {
    id
    stage
  }
}

# Verify commission created
query VerifyCommission {
  commissions(filter: { dealId: { eq: "deal-uuid" } }) {
    edges {
      node {
        id
        dealValue
        commissionRate
        commissionAmount
        status
      }
    }
  }
}
```

---

## Testing Tasks

### TEST-1: Auto-Calculation Tests

```typescript
describe('Auto-Calculate Commission on Deal Won', () => {
  it('should create commission when deal stage changes to WON (AC: 1)', async () => {
    const property = await createProperty({ price: 1500000000 });
    const project = await createProject({ commissionRate: 3.5 });
    await linkPropertyToProject(property.id, project.id);

    const deal = await createOpportunity({
      stage: 'CONTRACT_SIGNED',
      propertyId: property.id,
      amount: { amountMicros: 1500000000000000, currencyCode: 'VND' },
    });

    // Update to WON
    await updateOpportunity(deal.id, { stage: 'WON' });

    // Verify commission created
    const commissions = await findCommissions({ dealId: deal.id });
    expect(commissions).toHaveLength(1);
    expect(commissions[0].status).toBe('PENDING');
  });

  it('should calculate commission correctly (AC: 2)', async () => {
    const dealValue = 2000000000; // 2 billion VND
    const commissionRate = 3.5; // 3.5%
    const expectedCommission = 70000000; // 70 million VND

    const property = await createProperty({ price: dealValue });
    const project = await createProject({ commissionRate });
    await linkPropertyToProject(property.id, project.id);

    const deal = await createOpportunity({
      propertyId: property.id,
      amount: { amountMicros: dealValue * 1000000, currencyCode: 'VND' },
    });

    await updateOpportunity(deal.id, { stage: 'WON' });

    const commission = await findCommission({ dealId: deal.id });
    expect(commission.commissionAmount).toBe(expectedCommission);
  });

  it('should set commission status to PENDING (AC: 3)', async () => {
    const deal = await createOpportunity({ stage: 'CONTRACT_SIGNED' });
    await updateOpportunity(deal.id, { stage: 'WON' });

    const commission = await findCommission({ dealId: deal.id });
    expect(commission.status).toBe('PENDING');
  });

  it('should not create duplicate commissions', async () => {
    const deal = await createOpportunity({ stage: 'CONTRACT_SIGNED' });

    // Update to WON twice
    await updateOpportunity(deal.id, { stage: 'WON' });
    await updateOpportunity(deal.id, { stage: 'WON' });

    const commissions = await findCommissions({ dealId: deal.id });
    expect(commissions).toHaveLength(1);
  });
});
```

---

## Definition of Done

- [ ] DealCommissionSubscriber created
- [ ] CommissionService created
- [ ] Commission auto-created on Deal WON
- [ ] Calculation is correct (dealValue × rate)
- [ ] Status is PENDING
- [ ] No duplicate commissions
- [ ] Tests passing

---

## Dev Notes

### Commission Calculation Formula

```
commissionAmount = dealValue × (commissionRate / 100)

Example:
- Deal Value: 2,000,000,000 VNĐ
- Commission Rate: 3.5%
- Commission Amount: 2,000,000,000 × 0.035 = 70,000,000 VNĐ
```

### Commission Rate Priority

1. Deal-level override (if set)
2. Project-level rate
3. Default rate (3%)

### References
- [Source: architecture.md#Commission-Auto-Creation-Pattern]
- [Source: tech-spec-epic-5.md#Auto-Calculate-Commission]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/subscribers/deal-commission.subscriber.ts
- packages/twenty-server/src/modules/real-estate/services/commission.service.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
