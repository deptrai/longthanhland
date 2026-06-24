# Epic Technical Specification: Quản lý Hoa hồng

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Epic ID**: epic-5
**Status**: Approved
**Dependencies**: Epic 3 (Deals)

---

## Overview

Epic 5 xây dựng module quản lý hoa hồng (Commission) với auto-calculation khi Deal chuyển sang WON, workflow phê duyệt (Admin review), và export CSV cho Finance để chuyển khoản hàng loạt.

---

## Objectives and Scope

### In-Scope ✅

| Item | PRD Section |
|------|-------------|
| Commission Entity | 4.3 |
| Auto-calculate on Deal WON | 4.3.3 |
| Approval workflow (Admin) | 4.3.3 |
| Payment status tracking | 4.3.3 |
| CSV export for batch payment | 4.3.4 |
| Commission reports | 4.3.4 |

### Out-of-Scope ❌

- Payment gateway integration
- Automatic bank transfer

---

## System Architecture Alignment

| Component | Architecture Lines |
|-----------|-------------------|
| commission.workspace-entity.ts | 98 |
| commission.service.ts | 106 |
| DealSubscriber (trigger) | 340-400 |

---

## Detailed Design

### Entity: Commission

```typescript
// standard-objects/commission.workspace-entity.ts
@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.commission,
  namePlural: 'commissions',
  labelSingular: 'Commission',
  labelPlural: 'Commissions',
  icon: 'IconCash',
})
export class CommissionWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.CURRENCY, label: 'Deal Value' })
  dealValue: number;

  @WorkspaceField({ type: FieldMetadataType.NUMBER, label: 'Rate (%)' })
  commissionRate: number;

  @WorkspaceField({ type: FieldMetadataType.CURRENCY, label: 'Amount' })
  commissionAmount: number;

  @WorkspaceField({
    type: FieldMetadataType.SELECT,
    label: 'Status',
    options: [
      { value: 'PENDING', label: 'Pending', color: 'yellow' },
      { value: 'APPROVED', label: 'Approved', color: 'blue' },
      { value: 'REJECTED', label: 'Rejected', color: 'red' },
      { value: 'PAID', label: 'Paid', color: 'green' },
    ],
  })
  status: string;

  @WorkspaceField({ type: FieldMetadataType.DATE, label: 'Approved Date' })
  approvedAt: Date;

  @WorkspaceField({ type: FieldMetadataType.DATE, label: 'Paid Date' })
  paidAt: Date;

  @WorkspaceField({ type: FieldMetadataType.TEXT, label: 'Rejection Reason' })
  rejectionReason: string;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Deal' })
  deal: Relation<DealWorkspaceEntity>;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Property' })
  property: Relation<PropertyWorkspaceEntity>;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Sales Agent' })
  salesAgent: Relation<User>;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Approved By' })
  approvedBy: Relation<User>;
}
```

### Commission Auto-Creation (DealSubscriber)

```typescript
// subscribers/deal.subscriber.ts - Extended from Epic 3
async afterUpdate(event: UpdateEvent<Deal>): Promise<void> {
  const deal = event.entity;
  const oldStage = event.databaseEntity?.stage;
  const newStage = deal.stage;

  // Deal stage changed to WON → Create Commission
  if (oldStage !== 'WON' && newStage === 'WON') {
    const property = await this.propertyRepository.findOne({
      where: { id: deal.propertyId },
      relations: ['project'],
    });

    const commission = new Commission();
    commission.dealId = deal.id;
    commission.propertyId = deal.propertyId;
    commission.salesAgentId = deal.salesAgentId;
    commission.dealValue = deal.dealValue;
    commission.commissionRate = property.project.commissionRate;
    commission.commissionAmount = deal.dealValue * (property.project.commissionRate / 100);
    commission.status = 'PENDING';

    await event.manager.save(commission);

    // Update property status to SOLD
    property.status = 'SOLD';
    await event.manager.save(property);
  }
}
```

### Commission Service

```typescript
// services/commission.service.ts
@Injectable()
export class CommissionService {
  async approveCommission(commissionId: string, userId: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId, status: 'PENDING' },
    });

    if (!commission) {
      throw new BadRequestException('Commission not found or already processed');
    }

    commission.status = 'APPROVED';
    commission.approvedById = userId;
    commission.approvedAt = new Date();

    return this.commissionRepository.save(commission);
  }

  async rejectCommission(commissionId: string, userId: string, reason: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId, status: 'PENDING' },
    });

    if (!commission) {
      throw new BadRequestException('Commission not found or already processed');
    }

    commission.status = 'REJECTED';
    commission.approvedById = userId;
    commission.rejectionReason = reason;

    return this.commissionRepository.save(commission);
  }

  async markPaid(commissionId: string): Promise<Commission> {
    const commission = await this.commissionRepository.findOne({
      where: { id: commissionId, status: 'APPROVED' },
    });

    if (!commission) {
      throw new BadRequestException('Commission not found or not approved');
    }

    commission.status = 'PAID';
    commission.paidAt = new Date();

    return this.commissionRepository.save(commission);
  }

  async exportCsv(filters: CommissionFilters): Promise<string> {
    const commissions = await this.commissionRepository.find({
      where: { status: 'APPROVED' },
      relations: ['salesAgent', 'deal', 'property'],
    });

    const csvRows = [
      'Sales Agent,Bank Account,Amount,Deal,Property,Approved Date',
      ...commissions.map(c =>
        `${c.salesAgent.name},${c.salesAgent.bankAccount},${c.commissionAmount},${c.deal.name},${c.property.plotNumber},${c.approvedAt}`
      ),
    ];

    return csvRows.join('\n');
  }
}
```

### APIs and Interfaces

```graphql
type Mutation {
  approveCommission(commissionId: ID!): Commission!
  rejectCommission(commissionId: ID!, reason: String!): Commission!
  markCommissionPaid(commissionId: ID!): Commission!
}

type Query {
  pendingCommissions: [Commission!]!
  approvedCommissions: [Commission!]!
  commissionReport(period: DateRange!, groupBy: GroupBy): CommissionReport!
  exportCommissionsCsv(status: CommissionStatus!): String!
}

type CommissionReport {
  totalAmount: Float!
  totalCount: Int!
  bySalesAgent: [AgentCommissionSummary!]!
  byProject: [ProjectCommissionSummary!]!
}
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Auto-create commission | <500ms (in Deal transaction) |
| Approval | <200ms |
| CSV export | <5s for 1000 records |

---

## Acceptance Criteria

| AC ID | Criteria |
|-------|----------|
| AC-5.1.1 | Commission auto-created when Deal = WON |
| AC-5.1.2 | Commission amount = dealValue × commissionRate |
| AC-5.1.3 | Commission status = PENDING initially |
| AC-5.2.1 | Admin can approve pending commission |
| AC-5.2.2 | Admin can reject with reason |
| AC-5.2.3 | approvedBy and approvedAt recorded |
| AC-5.3.1 | Finance can export approved commissions to CSV |
| AC-5.3.2 | CSV includes bank account info |
| AC-5.4.1 | Finance can mark commission as PAID |
| AC-5.4.2 | paidAt timestamp recorded |
| AC-5.5.1 | Report shows total by sales agent |
| AC-5.5.2 | Report shows total by project |

---

## Commission Status Flow

```
Deal WON → PENDING → APPROVED → PAID
                  ↓
               REJECTED
```

---

## Traceability

| AC | PRD | Architecture |
|----|-----|--------------|
| AC-5.1.x | 4.3.3 | DealSubscriber |
| AC-5.2.x | 4.3.3 | CommissionService |
| AC-5.3.x | 4.3.4 | exportCsv |
| AC-5.4.x | 4.3.3 | markPaid |
| AC-5.5.x | 4.3.4 | CommissionReport |

---

_Epic 5: Quản lý Hoa hồng - 5 stories_
