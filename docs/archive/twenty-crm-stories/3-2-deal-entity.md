# Story 3.2: Deal Entity

Status: drafted

## Story

As an **Admin**,
I want a Deal entity linked to Property,
so that I can track sales transactions.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-3.2.1 | Deal entity | Created with Property link | Deal saved with propertyId | GraphQL returns deal with property |
| AC-3.2.2 | Deal | Has stage pipeline | Stages: NEW → DEPOSIT → CONTRACT → WON/LOST | Stage field works |
| AC-3.2.3 | Deal | Linked to Contact | contactId saved | Query returns contact |

---

## Backend Tasks

### BE-1: Understand Twenty's Opportunity Entity (AC: 1)

> **IMPORTANT**: Twenty already has `Opportunity` entity which is essentially a Deal. We EXTEND it, not create new.

**Research**: `packages/twenty-server/src/modules/opportunity/standard-objects/opportunity.workspace-entity.ts`

Twenty's Opportunity already has:
- name, amount, closeDate
- stage (SELECT with pipeline stages)
- company, pointOfContact relations
- favorites, taskTargets, noteTargets, attachments

**Our Approach**: Extend Opportunity with Property relation and real estate specific fields.

### BE-2: Create Opportunity Extension (AC: 1-3)

> **[ASSUMPTION]**: We extend Opportunity by adding a relation to Property entity.

**File**: `packages/twenty-server/src/modules/real-estate/extensions/opportunity-extension.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

/**
 * Extension fields for Opportunity entity (Deal)
 *
 * These fields extend Twenty's standard Opportunity object
 * to support real estate deal tracking.
 */
export const OPPORTUNITY_EXTENSION_FIELDS = [
  // Property relation - links deal to specific property
  {
    name: 'property',
    type: 'RELATION',
    relationType: RelationType.MANY_TO_ONE,
    label: msg`Property`,
    description: msg`The property being sold in this deal`,
    icon: 'IconHome',
    inverseSideTarget: 'PropertyWorkspaceEntity',
    inverseSideFieldKey: 'deals',
    onDelete: RelationOnDeleteAction.SET_NULL,
    isNullable: true,
  },
  // Deposit amount
  {
    name: 'depositAmount',
    type: FieldMetadataType.NUMBER,
    label: msg`Deposit Amount`,
    description: msg`Deposit amount paid (VNĐ)`,
    icon: 'IconCash',
    isNullable: true,
  },
  // Deposit date
  {
    name: 'depositDate',
    type: FieldMetadataType.DATE_TIME,
    label: msg`Deposit Date`,
    description: msg`Date deposit was paid`,
    icon: 'IconCalendar',
    isNullable: true,
  },
  // Contract date
  {
    name: 'contractDate',
    type: FieldMetadataType.DATE_TIME,
    label: msg`Contract Date`,
    description: msg`Date contract was signed`,
    icon: 'IconFileText',
    isNullable: true,
  },
  // Commission rate override
  {
    name: 'commissionRateOverride',
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Rate Override`,
    description: msg`Override commission rate for this deal (%)`,
    icon: 'IconPercentage',
    isNullable: true,
  },
  // Sales agent (explicit assignment)
  {
    name: 'salesAgent',
    type: 'RELATION',
    relationType: RelationType.MANY_TO_ONE,
    label: msg`Sales Agent`,
    description: msg`Assigned sales agent`,
    icon: 'IconUser',
    inverseSideTarget: 'WorkspaceMemberWorkspaceEntity',
    isNullable: true,
  },
];

/**
 * Custom stages for real estate deals
 *
 * These replace/extend Twenty's default opportunity stages
 */
export const REAL_ESTATE_DEAL_STAGES = [
  { value: 'NEW', label: 'New Lead', position: 0, color: 'gray' },
  { value: 'QUALIFIED', label: 'Qualified', position: 1, color: 'blue' },
  { value: 'RESERVED', label: 'Reserved', position: 2, color: 'yellow' },
  { value: 'DEPOSIT_PAID', label: 'Deposit Paid', position: 3, color: 'orange' },
  { value: 'CONTRACT_SIGNED', label: 'Contract Signed', position: 4, color: 'purple' },
  { value: 'WON', label: 'Won', position: 5, color: 'green' },
  { value: 'LOST', label: 'Lost', position: 6, color: 'red' },
];
```

### BE-3: Add Property Relation to Opportunity (AC: 1)

Since we can't modify Twenty's core Opportunity entity directly, we use one of these approaches:

**Option A: Custom Field via Metadata API**

```typescript
// In PersonExtensionService or similar
async addPropertyRelationToOpportunity(workspaceId: string) {
  // Use Twenty's metadata API to add relation field
  // This creates a foreign key from Opportunity to Property
}
```

**Option B: Create Wrapper Entity (If needed)**

If Twenty doesn't support adding relations to standard objects, create a linking entity:

**File**: `packages/twenty-server/src/modules/real-estate/standard-objects/deal-property-link.workspace-entity.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';

import { REAL_ESTATE_OBJECT_IDS } from '../constants/real-estate-object-ids';
import { PropertyWorkspaceEntity } from './property.workspace-entity';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.dealPropertyLink,
  namePlural: 'dealPropertyLinks',
  labelSingular: msg`Deal Property Link`,
  labelPlural: msg`Deal Property Links`,
  description: msg`Links deals to properties`,
  icon: 'IconLink',
})
export class DealPropertyLinkWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceRelation({
    type: RelationType.MANY_TO_ONE,
    label: msg`Opportunity`,
    inverseSideTarget: () => OpportunityWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  opportunity: Relation<OpportunityWorkspaceEntity>;

  @WorkspaceJoinColumn('opportunity')
  opportunityId: string;

  @WorkspaceRelation({
    type: RelationType.MANY_TO_ONE,
    label: msg`Property`,
    inverseSideTarget: () => PropertyWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  property: Relation<PropertyWorkspaceEntity>;

  @WorkspaceJoinColumn('property')
  propertyId: string;
}
```

---

## API Tasks

### API-1: Create Deal with Property (AC: 1)

```graphql
mutation CreateDeal {
  createOpportunity(data: {
    name: "Deal for Plot A-101"
    amount: { amountMicros: 1500000000000000, currencyCode: "VND" }
    stage: DEPOSIT_PAID
    # Extension fields (if supported)
    propertyId: "property-uuid"
    depositAmount: 150000000
    depositDate: "2025-01-15T10:00:00Z"
  }) {
    id
    name
    stage
    amount
  }
}
```

### API-2: Query Deal with Property (AC: 1, 3)

```graphql
query GetDealWithProperty {
  opportunity(id: "deal-uuid") {
    id
    name
    stage
    amount
    pointOfContact {
      id
      name { firstName lastName }
    }
    # Extension fields
    property {
      id
      plotNumber
      price
      project { name }
    }
    depositAmount
    salesAgent { id name { firstName lastName } }
  }
}
```

### API-3: Update Deal Stage (AC: 2)

```graphql
mutation UpdateDealStage {
  updateOpportunity(id: "deal-uuid", data: {
    stage: CONTRACT_SIGNED
    contractDate: "2025-01-20T10:00:00Z"
  }) {
    id
    stage
    contractDate
  }
}
```

---

## Frontend Tasks

### FE-1: Verify Deal Pipeline (AC: 2)

Twenty has built-in Kanban view for Opportunities. Verify:

**Subtasks**:
- [ ] Open Opportunities page
- [ ] Verify Kanban view shows stages
- [ ] Drag deal between stages
- [ ] Verify stage updates

### FE-2: Verify Property Link (AC: 1)

**Subtasks**:
- [ ] Open Deal detail
- [ ] Verify Property field appears
- [ ] Link a property to deal
- [ ] Verify property info displays

---

## Testing Tasks

### TEST-1: Deal-Property Integration

```typescript
describe('Deal-Property Integration', () => {
  it('should create deal linked to property', async () => {
    const property = await createProperty({ plotNumber: 'A-101' });
    const deal = await createOpportunity({
      name: 'Deal for A-101',
      propertyId: property.id,
    });

    expect(deal.propertyId).toBe(property.id);
  });

  it('should update property status when deal stage changes', async () => {
    const property = await createProperty({ status: 'RESERVED' });
    const deal = await createOpportunity({
      propertyId: property.id,
      stage: 'DEPOSIT_PAID',
    });

    // Update deal to WON
    await updateOpportunity(deal.id, { stage: 'WON' });

    // Property should be SOLD
    const updatedProperty = await getProperty(property.id);
    expect(updatedProperty.status).toBe('SOLD');
  });
});
```

---

## Definition of Done

- [ ] Opportunity extension fields defined
- [ ] Property relation added to Opportunity
- [ ] Real estate deal stages configured
- [ ] GraphQL queries work with extensions
- [ ] Pipeline Kanban works
- [ ] Tests passing

---

## Dev Notes

### Extending vs Creating New

We EXTEND Twenty's Opportunity because:
1. Reuse existing pipeline/Kanban UI
2. Reuse existing relations (company, contact)
3. Maintain compatibility with Twenty updates
4. Leverage existing permissions

### Deal Stage Flow
```
NEW → QUALIFIED → RESERVED → DEPOSIT_PAID → CONTRACT_SIGNED → WON
                                                            ↘ LOST
```

### References
- [Source: tech-spec-epic-3.md#Deal-Entity]
- [Twenty Opportunity](packages/twenty-server/src/modules/opportunity/standard-objects/opportunity.workspace-entity.ts)

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/extensions/opportunity-extension.ts
- packages/twenty-server/src/modules/real-estate/standard-objects/deal-property-link.workspace-entity.ts (if needed)
