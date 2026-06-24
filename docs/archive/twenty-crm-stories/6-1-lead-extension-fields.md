# Story 6.1: Lead Extension Fields

Status: drafted

## Story

As an **Admin**,
I want to extend Lead with assignment fields,
so that I can track lead distribution.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-6.1.1 | Lead entity | Extended | Has assignment fields | Fields exist |
| AC-6.1.2 | Lead | Assigned | assignedTo, assignedAt saved | Query returns data |
| AC-6.1.3 | Lead | SLA tracking | firstContactAt tracked | Timestamp saved |

---

## Backend Tasks

### BE-1: Create Lead Extension (AC: 1-3)

> **IMPORTANT**: Twenty uses Person entity for contacts/leads. We extend it.

**File**: `packages/twenty-server/src/modules/real-estate/extensions/lead-extension.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';
import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

/**
 * Extension fields for Person entity (Lead)
 *
 * These fields support lead assignment and SLA tracking.
 */
export const LEAD_EXTENSION_FIELDS = [
  // Lead source
  {
    name: 'leadSource',
    type: FieldMetadataType.SELECT,
    label: msg`Lead Source`,
    description: msg`How the lead was acquired`,
    icon: 'IconTarget',
    options: [
      { value: 'WEBSITE', label: 'Website', position: 0, color: 'blue' },
      { value: 'REFERRAL', label: 'Referral', position: 1, color: 'green' },
      { value: 'SOCIAL_MEDIA', label: 'Social Media', position: 2, color: 'purple' },
      { value: 'EVENT', label: 'Event', position: 3, color: 'orange' },
      { value: 'COLD_CALL', label: 'Cold Call', position: 4, color: 'gray' },
      { value: 'WALK_IN', label: 'Walk-in', position: 5, color: 'yellow' },
    ],
    isNullable: true,
  },
  // Assigned to (sales agent)
  {
    name: 'assignedTo',
    type: 'RELATION',
    relationType: RelationType.MANY_TO_ONE,
    label: msg`Assigned To`,
    description: msg`Sales agent assigned to this lead`,
    icon: 'IconUser',
    inverseSideTarget: 'WorkspaceMemberWorkspaceEntity',
    onDelete: RelationOnDeleteAction.SET_NULL,
    isNullable: true,
  },
  // Assigned at
  {
    name: 'assignedAt',
    type: FieldMetadataType.DATE_TIME,
    label: msg`Assigned At`,
    description: msg`When the lead was assigned`,
    icon: 'IconCalendar',
    isNullable: true,
  },
  // First contact at (for SLA)
  {
    name: 'firstContactAt',
    type: FieldMetadataType.DATE_TIME,
    label: msg`First Contact At`,
    description: msg`When first contact was made`,
    icon: 'IconPhone',
    isNullable: true,
  },
  // Lead status
  {
    name: 'leadStatus',
    type: FieldMetadataType.SELECT,
    label: msg`Lead Status`,
    description: msg`Current lead status`,
    icon: 'IconProgressCheck',
    options: [
      { value: 'NEW', label: 'New', position: 0, color: 'blue' },
      { value: 'CONTACTED', label: 'Contacted', position: 1, color: 'yellow' },
      { value: 'QUALIFIED', label: 'Qualified', position: 2, color: 'green' },
      { value: 'UNQUALIFIED', label: 'Unqualified', position: 3, color: 'gray' },
      { value: 'CONVERTED', label: 'Converted', position: 4, color: 'purple' },
    ],
    defaultValue: "'NEW'",
    isNullable: false,
  },
  // SLA breached flag
  {
    name: 'slaBreached',
    type: FieldMetadataType.BOOLEAN,
    label: msg`SLA Breached`,
    description: msg`Whether SLA was breached`,
    icon: 'IconAlertTriangle',
    defaultValue: false,
  },
  // Priority
  {
    name: 'priority',
    type: FieldMetadataType.SELECT,
    label: msg`Priority`,
    description: msg`Lead priority level`,
    icon: 'IconFlag',
    options: [
      { value: 'LOW', label: 'Low', position: 0, color: 'gray' },
      { value: 'MEDIUM', label: 'Medium', position: 1, color: 'yellow' },
      { value: 'HIGH', label: 'High', position: 2, color: 'orange' },
      { value: 'URGENT', label: 'Urgent', position: 3, color: 'red' },
    ],
    defaultValue: "'MEDIUM'",
  },
];
```

**Subtasks**:
- [ ] Create extension file
- [ ] Define leadSource field
- [ ] Define assignedTo relation
- [ ] Define assignedAt field
- [ ] Define firstContactAt field
- [ ] Define leadStatus field
- [ ] Define slaBreached field
- [ ] Define priority field

---

## API Tasks

### API-1: Query Lead with Extensions (AC: 2)

```graphql
query GetLead {
  person(id: "lead-uuid") {
    id
    name { firstName lastName }
    email
    phone
    # Extension fields
    leadSource
    assignedTo { id name { firstName lastName } }
    assignedAt
    firstContactAt
    leadStatus
    slaBreached
    priority
  }
}
```

### API-2: Update Lead Assignment (AC: 2)

```graphql
mutation UpdateLeadAssignment {
  updatePerson(id: "lead-uuid", data: {
    assignedToId: "agent-uuid"
    assignedAt: "2025-01-15T10:00:00Z"
    leadStatus: CONTACTED
    firstContactAt: "2025-01-15T10:30:00Z"
  }) {
    id
    assignedTo { id }
    leadStatus
  }
}
```

---

## Testing Tasks

### TEST-1: Extension Tests

```typescript
describe('Lead Extension Fields', () => {
  it('should save assignment fields', async () => {
    const agent = await createUser({ role: 'SALES_AGENT' });
    const lead = await createPerson({ leadSource: 'WEBSITE' });

    const updated = await updatePerson(lead.id, {
      assignedToId: agent.id,
      assignedAt: new Date(),
    });

    expect(updated.assignedToId).toBe(agent.id);
    expect(updated.assignedAt).toBeDefined();
  });

  it('should track first contact for SLA', async () => {
    const lead = await createPerson({ leadStatus: 'NEW' });

    const updated = await updatePerson(lead.id, {
      firstContactAt: new Date(),
      leadStatus: 'CONTACTED',
    });

    expect(updated.firstContactAt).toBeDefined();
    expect(updated.leadStatus).toBe('CONTACTED');
  });
});
```

---

## Definition of Done

- [ ] Extension fields defined
- [ ] Fields available in Person entity
- [ ] Assignment fields work
- [ ] SLA tracking fields work
- [ ] Tests passing

---

## Dev Notes

### Lead Status Flow

```
NEW → CONTACTED → QUALIFIED → CONVERTED
                ↘ UNQUALIFIED
```

### SLA Rules

| Priority | Response Time |
|----------|---------------|
| URGENT | 1 hour |
| HIGH | 4 hours |
| MEDIUM | 24 hours |
| LOW | 48 hours |

### References
- [Source: tech-spec-epic-6.md#Lead-Extension]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/extensions/lead-extension.ts
