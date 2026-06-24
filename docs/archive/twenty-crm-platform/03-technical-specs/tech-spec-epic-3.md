# Epic Technical Specification: Quản lý Khách hàng & Giao dịch

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Epic ID**: epic-3
**Status**: Approved
**Dependencies**: Epic 2 (Properties)

---

## Overview

Epic 3 xây dựng module quản lý khách hàng (Contact/Customer) và giao dịch (Deal/Transaction). Đây là module kết nối Property với Commission thông qua Deal entity. Key feature: auto-create Deal khi khách đặt cọc, trigger Commission khi Deal chuyển sang WON.

---

## Objectives and Scope

### In-Scope ✅

| Item | PRD Section |
|------|-------------|
| Contact/Customer Entity (extend Twenty's Person) | 4.5 |
| Deal Entity | 4.6 |
| Deal-Property sync (status cascade) | 4.6.3 |
| Deal pipeline Kanban view | 4.6.4 |
| Auto-create Deal on deposit | 4.6.3 |

### Out-of-Scope ❌

- Commission auto-creation (Epic 5)
- Lead assignment (Epic 6)
- Customer portal (Phase 3)

---

## System Architecture Alignment

| Component | Architecture Lines |
|-----------|-------------------|
| contact-extension.ts | 96 |
| deal.workspace-entity.ts | 98 |
| DealService | 105 |
| DealSubscriber | 340-400 |

---

## Detailed Design

### Entity: Contact (Extension)

```typescript
// standard-objects/contact-extension.ts
// Extends Twenty's built-in Person entity
export const CONTACT_EXTENSION_FIELDS = {
  idNumber: {
    standardId: CONTACT_FIELD_IDS.idNumber,
    type: FieldMetadataType.TEXT,
    label: 'ID Number (CCCD)',
    isSystem: true, // PII - encrypted
  },
  budget: {
    standardId: CONTACT_FIELD_IDS.budget,
    type: FieldMetadataType.CURRENCY,
    label: 'Budget (VNĐ)',
  },
  timeline: {
    standardId: CONTACT_FIELD_IDS.timeline,
    type: FieldMetadataType.SELECT,
    label: 'Purchase Timeline',
    options: [
      { value: 'IMMEDIATE', label: '< 1 month' },
      { value: 'SHORT', label: '1-3 months' },
      { value: 'MEDIUM', label: '3-6 months' },
      { value: 'LONG', label: '> 6 months' },
    ],
  },
  source: {
    standardId: CONTACT_FIELD_IDS.source,
    type: FieldMetadataType.SELECT,
    label: 'Lead Source',
    options: [
      { value: 'REFERRAL', label: 'Referral' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'ZALO', label: 'Zalo' },
      { value: 'DIRECT', label: 'Direct' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
};
```

### Entity: Deal

```typescript
// standard-objects/deal.workspace-entity.ts
@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.deal,
  namePlural: 'deals',
  labelSingular: 'Deal',
  labelPlural: 'Deals',
  icon: 'IconHandshake',
})
export class DealWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({ type: FieldMetadataType.TEXT, label: 'Deal Name' })
  name: string;

  @WorkspaceField({
    type: FieldMetadataType.SELECT,
    label: 'Stage',
    options: [
      { value: 'ACTIVE', color: 'blue' },
      { value: 'NEGOTIATING', color: 'yellow' },
      { value: 'PENDING_DEPOSIT', color: 'orange' },
      { value: 'DEPOSIT_PAID', color: 'purple' },
      { value: 'CONTRACTED', color: 'green' },
      { value: 'WON', color: 'green' },
      { value: 'LOST', color: 'red' },
    ],
  })
  stage: string;

  @WorkspaceField({ type: FieldMetadataType.CURRENCY, label: 'Deal Value' })
  dealValue: number;

  @WorkspaceField({ type: FieldMetadataType.DATE, label: 'Close Date' })
  closeDate: Date;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Property' })
  property: Relation<PropertyWorkspaceEntity>;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Contact' })
  contact: Relation<Contact>;

  @WorkspaceRelation({ type: RelationType.MANY_TO_ONE, label: 'Sales Agent' })
  salesAgent: Relation<User>;
}
```

### Deal Subscriber (Auto-Create Deal)

```typescript
// subscribers/deal.subscriber.ts
@EventSubscriber()
export class DealSubscriber implements EntitySubscriberInterface<Property> {
  listenTo() {
    return Property;
  }

  async afterUpdate(event: UpdateEvent<Property>): Promise<void> {
    const property = event.entity;
    const oldStatus = event.databaseEntity?.status;
    const newStatus = property.status;

    // Property status changed to DEPOSIT_PAID → Create Deal
    if (oldStatus !== 'DEPOSIT_PAID' && newStatus === 'DEPOSIT_PAID') {
      const deal = new Deal();
      deal.name = `Deal for ${property.plotNumber}`;
      deal.propertyId = property.id;
      deal.salesAgentId = property.reservedById;
      deal.stage = 'DEPOSIT_PAID';
      deal.dealValue = property.price;
      await event.manager.save(deal);
    }
  }
}
```

### APIs and Interfaces

```graphql
type Mutation {
  createDeal(input: CreateDealInput!): Deal!
  updateDealStage(dealId: ID!, stage: DealStage!): Deal!
  markDealWon(dealId: ID!): Deal!
  markDealLost(dealId: ID!, reason: String): Deal!
}

type Query {
  myDeals(stage: DealStage): [Deal!]!
  dealPipeline(projectId: ID): DealPipelineData!
}
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Deal create | <300ms |
| Pipeline query | <500ms |
| PII encryption | Contact.idNumber |

---

## Acceptance Criteria

| AC ID | Criteria |
|-------|----------|
| AC-3.1.1 | Contact extends Person with budget, timeline, source |
| AC-3.1.2 | Contact.idNumber is encrypted |
| AC-3.2.1 | Deal created with all required fields |
| AC-3.2.2 | Deal linked to Property, Contact, SalesAgent |
| AC-3.3.1 | Property DEPOSIT_PAID → Deal auto-created |
| AC-3.3.2 | Deal stage sync with Property status |
| AC-3.4.1 | Kanban pipeline shows deals by stage |
| AC-3.5.1 | Deal WON triggers Commission (Epic 5 integration point) |

---

## Traceability

| AC | PRD | Architecture |
|----|-----|--------------|
| AC-3.1.x | 4.5 | contact-extension.ts |
| AC-3.2.x | 4.6.2 | deal.workspace-entity.ts |
| AC-3.3.x | 4.6.3 | DealSubscriber |
| AC-3.4.x | 4.6.4 | Kanban view |
| AC-3.5.x | 4.6.3 | Epic 5 trigger |

---

## Risks

| Risk | Mitigation |
|------|------------|
| PII compliance | Encrypt idNumber, audit access |
| Cascade failures | Wrap in transaction |

---

_Epic 3: Quản lý Khách hàng & Giao dịch - 5 stories_
