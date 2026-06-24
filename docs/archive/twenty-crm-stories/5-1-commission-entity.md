# Story 5.1: Commission Entity

Status: drafted

## Story

As an **Admin**,
I want a Commission entity,
so that I can track sales commissions.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-5.1.1 | Commission entity | Created | Has all required fields | Entity exists with fields |
| AC-5.1.2 | Commission | Linked to Deal, Property, SalesAgent | Relations work | Query returns related entities |

---

## Backend Tasks

### BE-1: Create Commission Entity (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/standard-objects/commission.workspace-entity.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';

import { REAL_ESTATE_OBJECT_IDS } from '../constants/real-estate-object-ids';
import { COMMISSION_FIELD_IDS } from '../constants/real-estate-field-ids';
import { PropertyWorkspaceEntity } from './property.workspace-entity';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.commission,
  namePlural: 'commissions',
  labelSingular: msg`Commission`,
  labelPlural: msg`Commissions`,
  description: msg`Sales commission for property deals`,
  icon: 'IconCash',
})
export class CommissionWorkspaceEntity extends BaseWorkspaceEntity {
  // Deal relation
  @WorkspaceRelation({
    standardId: COMMISSION_FIELD_IDS.dealId,
    type: RelationType.MANY_TO_ONE,
    label: msg`Deal`,
    description: msg`The deal this commission is for`,
    icon: 'IconTargetArrow',
    inverseSideTarget: () => OpportunityWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  deal: Relation<OpportunityWorkspaceEntity>;

  @WorkspaceJoinColumn('deal')
  dealId: string;

  // Property relation
  @WorkspaceRelation({
    standardId: COMMISSION_FIELD_IDS.propertyId,
    type: RelationType.MANY_TO_ONE,
    label: msg`Property`,
    description: msg`The property sold`,
    icon: 'IconHome',
    inverseSideTarget: () => PropertyWorkspaceEntity,
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  property: Relation<PropertyWorkspaceEntity> | null;

  @WorkspaceJoinColumn('property')
  propertyId: string | null;

  // Sales Agent relation
  @WorkspaceRelation({
    standardId: COMMISSION_FIELD_IDS.salesAgentId,
    type: RelationType.MANY_TO_ONE,
    label: msg`Sales Agent`,
    description: msg`The sales agent earning this commission`,
    icon: 'IconUser',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  salesAgent: Relation<WorkspaceMemberWorkspaceEntity>;

  @WorkspaceJoinColumn('salesAgent')
  salesAgentId: string;

  // Deal value
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.dealValue,
    type: FieldMetadataType.NUMBER,
    label: msg`Deal Value`,
    description: msg`Total deal value (VNĐ)`,
    icon: 'IconCurrencyDong',
  })
  dealValue: number;

  // Commission rate
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.commissionRate,
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Rate`,
    description: msg`Commission rate (%)`,
    icon: 'IconPercentage',
  })
  commissionRate: number;

  // Commission amount (calculated)
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.commissionAmount,
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Amount`,
    description: msg`Calculated commission amount (VNĐ)`,
    icon: 'IconCash',
  })
  commissionAmount: number;

  // Status
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Commission status`,
    icon: 'IconProgressCheck',
    options: [
      { value: 'PENDING', label: 'Pending', position: 0, color: 'yellow' },
      { value: 'APPROVED', label: 'Approved', position: 1, color: 'green' },
      { value: 'REJECTED', label: 'Rejected', position: 2, color: 'red' },
      { value: 'PAID', label: 'Paid', position: 3, color: 'blue' },
    ],
    defaultValue: "'PENDING'",
  })
  @WorkspaceFieldIndex()
  status: CommissionStatus;

  // Approved by
  @WorkspaceRelation({
    standardId: COMMISSION_FIELD_IDS.approvedById,
    type: RelationType.MANY_TO_ONE,
    label: msg`Approved By`,
    description: msg`User who approved this commission`,
    icon: 'IconUserCheck',
    inverseSideTarget: () => WorkspaceMemberWorkspaceEntity,
    onDelete: RelationOnDeleteAction.SET_NULL,
  })
  @WorkspaceIsNullable()
  approvedBy: Relation<WorkspaceMemberWorkspaceEntity> | null;

  @WorkspaceJoinColumn('approvedBy')
  approvedById: string | null;

  // Approved at
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.approvedAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Approved At`,
    description: msg`When the commission was approved`,
    icon: 'IconCalendarCheck',
  })
  @WorkspaceIsNullable()
  approvedAt: Date | null;

  // Paid at
  @WorkspaceField({
    standardId: COMMISSION_FIELD_IDS.paidAt,
    type: FieldMetadataType.DATE_TIME,
    label: msg`Paid At`,
    description: msg`When the commission was paid`,
    icon: 'IconCalendarDollar',
  })
  @WorkspaceIsNullable()
  paidAt: Date | null;

  // Rejection reason
  @WorkspaceField({
    type: FieldMetadataType.TEXT,
    label: msg`Rejection Reason`,
    description: msg`Reason for rejection if rejected`,
    icon: 'IconAlertCircle',
  })
  @WorkspaceIsNullable()
  rejectionReason: string | null;
}
```

**Subtasks**:
- [ ] Create commission.workspace-entity.ts
- [ ] Add all fields with correct decorators
- [ ] Add relations to Deal, Property, SalesAgent
- [ ] Add CommissionStatus enum

### BE-2: Register Entity in standardObjectMetadataDefinitions (CRITICAL)

> **⚠️ CRITICAL**: Entities are NOT registered via TypeOrmModule.forFeature. They must be added to the central metadata file.

**File**: `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts` (MODIFY)

```typescript
// Add import
import { CommissionWorkspaceEntity } from 'src/modules/real-estate/standard-objects/commission.workspace-entity';

// Add to array
export const standardObjectMetadataDefinitions = [
  // ... existing entities
  RealEstateProjectWorkspaceEntity,
  RealEstatePropertyWorkspaceEntity,
  CommissionWorkspaceEntity, // ADD THIS
];
```

**Why NOT TypeOrmModule.forFeature?**
- Twenty uses its own metadata system, not TypeORM directly
- WorkspaceEntity decorators define metadata that Twenty syncs to workspace
- The entity is auto-discovered via standardObjectMetadataDefinitions

**Subtasks**:
- [ ] Add import for CommissionWorkspaceEntity
- [ ] Add to standardObjectMetadataDefinitions array

---

## Database Tasks

### DB-1: Run Migration (AC: 1)

```bash
npx nx database:migrate twenty-server
```

**Expected Schema**:
```sql
CREATE TABLE commission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
  property_id UUID REFERENCES property(id) ON DELETE SET NULL,
  sales_agent_id UUID NOT NULL REFERENCES workspace_member(id),
  deal_value NUMERIC(15,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  approved_by_id UUID REFERENCES workspace_member(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID NOT NULL
);

CREATE INDEX idx_commission_status ON commission(status);
CREATE INDEX idx_commission_sales_agent ON commission(sales_agent_id);
CREATE INDEX idx_commission_deal ON commission(deal_id);
```

---

## API Tasks

### API-1: Create Commission (AC: 1, 2)

```graphql
mutation CreateCommission {
  createCommission(data: {
    dealId: "deal-uuid"
    propertyId: "property-uuid"
    salesAgentId: "agent-uuid"
    dealValue: 1500000000
    commissionRate: 3.5
    commissionAmount: 52500000
    status: PENDING
  }) {
    id
    dealValue
    commissionAmount
    status
  }
}
```

### API-2: Query Commission with Relations (AC: 2)

```graphql
query GetCommission {
  commission(id: "commission-uuid") {
    id
    dealValue
    commissionRate
    commissionAmount
    status
    deal {
      id
      name
      stage
    }
    property {
      id
      plotNumber
      project { name }
    }
    salesAgent {
      id
      name { firstName lastName }
    }
    approvedBy {
      id
      name { firstName lastName }
    }
    approvedAt
    paidAt
  }
}
```

---

## Testing Tasks

### TEST-1: Commission Entity Tests

```typescript
describe('CommissionWorkspaceEntity', () => {
  it('should create commission with relations', async () => {
    const deal = await createOpportunity({ stage: 'WON' });
    const property = await createProperty({ plotNumber: 'A-101' });
    const agent = await getWorkspaceMember();

    const commission = await createCommission({
      dealId: deal.id,
      propertyId: property.id,
      salesAgentId: agent.id,
      dealValue: 1500000000,
      commissionRate: 3.5,
      commissionAmount: 52500000,
    });

    expect(commission.dealId).toBe(deal.id);
    expect(commission.propertyId).toBe(property.id);
    expect(commission.salesAgentId).toBe(agent.id);
    expect(commission.status).toBe('PENDING');
  });
});
```

---

## Definition of Done

- [ ] Commission entity created with all fields
- [ ] Relations to Deal, Property, SalesAgent work
- [ ] CommissionStatus enum defined
- [ ] Migration run successfully
- [ ] GraphQL CRUD works
- [ ] Tests passing

---

## Dev Notes

### Commission Calculation
```
commissionAmount = dealValue × (commissionRate / 100)
```

### Status Flow
```
PENDING → APPROVED → PAID
       ↘ REJECTED
```

### References
- [Source: tech-spec-epic-5.md#Commission-Entity]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/standard-objects/commission.workspace-entity.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
