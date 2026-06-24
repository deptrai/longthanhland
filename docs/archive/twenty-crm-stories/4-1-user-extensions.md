# Story 4.1: User Extensions

Status: drafted

## Story

As an **Admin**,
I want to extend User with sales-specific fields,
so that I can track agent performance.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.1.1 | User entity | Extended with fields | Fields available | Fields in user form |
| AC-4.1.2 | User | Add team assignment | Team saved | Query returns team |
| AC-4.1.3 | User | Add performance metrics | Metrics calculated | Dashboard shows data |

---

## Backend Tasks

### BE-1: Understand Twenty's WorkspaceMember (AC: 1)

> **IMPORTANT**: Twenty uses `WorkspaceMember` for users within a workspace.

**Research**: `packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts`

Twenty's WorkspaceMember already has:
- name (firstName, lastName)
- avatarUrl
- locale, timeZone
- user relation

We need to add sales-specific fields.

### BE-2: Create WorkspaceMember Extension (AC: 1-3)

**File**: `packages/twenty-server/src/modules/real-estate/extensions/workspace-member-extension.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType } from 'twenty-shared/types';

/**
 * Extension fields for WorkspaceMember entity
 *
 * These fields support sales agent tracking.
 */
export const WORKSPACE_MEMBER_EXTENSION_FIELDS = [
  {
    name: 'team',
    type: FieldMetadataType.SELECT,
    label: msg`Team`,
    description: msg`Sales team assignment`,
    icon: 'IconUsers',
    options: [
      { value: 'TEAM_A', label: 'Team A', position: 0, color: 'blue' },
      { value: 'TEAM_B', label: 'Team B', position: 1, color: 'green' },
      { value: 'TEAM_C', label: 'Team C', position: 2, color: 'purple' },
    ],
    isNullable: true,
  },
  {
    name: 'salesTarget',
    type: FieldMetadataType.NUMBER,
    label: msg`Sales Target`,
    description: msg`Monthly sales target (VNĐ)`,
    icon: 'IconTarget',
    isNullable: true,
  },
  {
    name: 'commissionRate',
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Rate`,
    description: msg`Personal commission rate override (%)`,
    icon: 'IconPercentage',
    isNullable: true,
  },
  {
    name: 'specializations',
    type: FieldMetadataType.MULTI_SELECT,
    label: msg`Specializations`,
    description: msg`Property type specializations`,
    icon: 'IconHome',
    options: [
      { value: 'LAND', label: 'Land', position: 0, color: 'green' },
      { value: 'HOUSE', label: 'House', position: 1, color: 'blue' },
      { value: 'APARTMENT', label: 'Apartment', position: 2, color: 'purple' },
      { value: 'COMMERCIAL', label: 'Commercial', position: 3, color: 'orange' },
    ],
    isNullable: true,
  },
  {
    name: 'isActive',
    type: FieldMetadataType.BOOLEAN,
    label: msg`Active`,
    description: msg`Whether agent is active for lead assignment`,
    icon: 'IconCheck',
    defaultValue: true,
  },
];
```

**Subtasks**:
- [ ] Create extension file
- [ ] Define team field
- [ ] Define salesTarget field
- [ ] Define commissionRate field
- [ ] Define specializations field

---

## API Tasks

### API-1: Query User with Extensions (AC: 2)

```graphql
query GetSalesAgent {
  workspaceMember(id: "member-uuid") {
    id
    name { firstName lastName }
    # Extension fields
    team
    salesTarget
    commissionRate
    specializations
    isActive
  }
}
```

### API-2: Update User Extensions (AC: 2)

```graphql
mutation UpdateSalesAgent {
  updateWorkspaceMember(id: "member-uuid", data: {
    team: TEAM_A
    salesTarget: 5000000000
    commissionRate: 4.0
    specializations: [LAND, HOUSE]
    isActive: true
  }) {
    id
    team
    salesTarget
  }
}
```

---

## Testing Tasks

### TEST-1: Extension Tests

```typescript
describe('WorkspaceMember Extensions', () => {
  it('should save team assignment', async () => {
    const member = await updateWorkspaceMember(memberId, {
      team: 'TEAM_A',
    });
    expect(member.team).toBe('TEAM_A');
  });

  it('should save sales target', async () => {
    const member = await updateWorkspaceMember(memberId, {
      salesTarget: 5000000000,
    });
    expect(member.salesTarget).toBe(5000000000);
  });
});
```

---

## Definition of Done

- [ ] Extension fields defined
- [ ] Fields available in WorkspaceMember
- [ ] GraphQL queries work
- [ ] UI shows extension fields
- [ ] Tests passing

---

## Dev Notes

### References
- [Source: tech-spec-epic-4.md#User-Extensions]
- [Twenty WorkspaceMember](packages/twenty-server/src/modules/workspace-member/)

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/extensions/workspace-member-extension.ts
