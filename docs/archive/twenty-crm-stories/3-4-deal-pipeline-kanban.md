# Story 3.4: Deal Pipeline Kanban

Status: drafted

## Story

As a **Sales Agent**,
I want to view deals in a Kanban board,
so that I can visualize my pipeline by stage.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-3.4.1 | Kanban view | Loaded | Deals grouped by stage | Columns display |
| AC-3.4.2 | Deal card | Drag to new stage | Stage updates | Status changed |
| AC-3.4.3 | Stage change | Deal moved | Property status syncs | Sync works |

---

## Backend Tasks

### BE-1: Verify Twenty's Built-in Kanban (AC: 1, 2)

> **IMPORTANT**: Twenty already has a built-in Kanban view for Opportunity (Deal). We just need to configure stages.

**Twenty's Kanban Features**:
- Auto-generated Kanban view for objects with SELECT field
- Drag-and-drop built-in
- Real-time updates

**Verify**: Navigate to Opportunities → Views → Kanban

### BE-2: Configure Real Estate Stages (AC: 1)

Update stage options in Opportunity extension (Story 3.2):

```typescript
// From opportunity-extension.ts
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

---

## Frontend Tasks

### FE-1: Verify Kanban View (AC: 1)

**Subtasks**:
- [ ] Open Opportunities page in Twenty
- [ ] Switch to Kanban view
- [ ] Verify stages display as columns
- [ ] Verify deals appear in correct columns

### FE-2: Test Drag-Drop (AC: 2)

**Subtasks**:
- [ ] Drag a deal from one stage to another
- [ ] Verify stage field updates
- [ ] Verify API call is made
- [ ] Check database for updated value

---

## API Tasks

### API-1: Update Deal Stage (AC: 2)

Twenty handles this automatically via drag-drop, but the underlying mutation is:

```graphql
mutation UpdateDealStage {
  updateOpportunity(id: "deal-uuid", data: {
    stage: DEPOSIT_PAID
  }) {
    id
    stage
  }
}
```

---

## Testing Tasks

### TEST-1: Kanban Functionality Tests

```typescript
describe('Deal Pipeline Kanban', () => {
  it('should display deals in correct stage columns', async () => {
    await createOpportunity({ stage: 'NEW' });
    await createOpportunity({ stage: 'DEPOSIT_PAID' });

    // Navigate to Kanban view
    const newColumn = await findKanbanColumn('New Lead');
    const depositColumn = await findKanbanColumn('Deposit Paid');

    expect(newColumn.cards).toHaveLength(1);
    expect(depositColumn.cards).toHaveLength(1);
  });

  it('should update stage on drag-drop', async () => {
    const deal = await createOpportunity({ stage: 'NEW' });

    // Simulate drag-drop
    await dragCard(deal.id, 'NEW', 'QUALIFIED');

    const updated = await getOpportunity(deal.id);
    expect(updated.stage).toBe('QUALIFIED');
  });
});
```

---

## Definition of Done

- [ ] Kanban view displays correctly
- [ ] Stages configured for real estate
- [ ] Drag-drop updates stage
- [ ] Property status syncs (Story 3.5)
- [ ] Tests passing

---

## Dev Notes

### Twenty's Built-in Kanban
Twenty auto-generates Kanban views for any object with a SELECT field. No custom code needed.

### Stage Colors

| Stage | Color | Hex |
|-------|-------|-----|
| NEW | Gray | #6b7280 |
| QUALIFIED | Blue | #3b82f6 |
| RESERVED | Yellow | #eab308 |
| DEPOSIT_PAID | Orange | #f97316 |
| CONTRACT_SIGNED | Purple | #a855f7 |
| WON | Green | #22c55e |
| LOST | Red | #ef4444 |

### References
- [Source: tech-spec-epic-3.md#Deal-Pipeline-Kanban]

---

## Dev Agent Record

### File List
- Verify Twenty's built-in Kanban (no new files needed)
- Configure stages in opportunity-extension.ts
