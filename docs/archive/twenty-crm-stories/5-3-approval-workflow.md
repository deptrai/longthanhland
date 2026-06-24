# Story 5.3: Commission Approval Workflow

Status: drafted

## Story

As a **Finance User**,
I want to approve or reject commissions,
so that only valid commissions are paid.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-5.3.1 | Commission PENDING | Finance approves | Status = APPROVED | Status updated |
| AC-5.3.2 | Commission PENDING | Finance rejects | Status = REJECTED, reason saved | Reason in DB |
| AC-5.3.3 | Commission APPROVED | Finance marks paid | Status = PAID, paidAt set | Timestamp saved |
| AC-5.3.4 | Non-Finance user | Tries to approve | Access denied | 403 error |

---

## Backend Tasks

### BE-1: Create Commission Resolver (AC: 1-4)

**File**: `packages/twenty-server/src/modules/real-estate/resolvers/commission.resolver.ts`

```typescript
import { Resolver, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { CommissionService } from '../services/commission.service';
import { CommissionWorkspaceEntity } from '../standard-objects/commission.workspace-entity';

@Resolver(() => CommissionWorkspaceEntity)
@UseGuards(JwtAuthGuard)
export class CommissionResolver {
  constructor(private commissionService: CommissionService) {}

  @Mutation(() => CommissionWorkspaceEntity)
  async approveCommission(
    @Args('commissionId', { type: () => ID }) commissionId: string,
    @Context() context: any,
  ): Promise<CommissionWorkspaceEntity> {
    const user = context.req.user;

    // Check if user has Finance role
    if (!this.hasFinanceRole(user)) {
      throw new ForbiddenException('Only Finance users can approve commissions');
    }

    return this.commissionService.approveCommission(commissionId, user.id);
  }

  @Mutation(() => CommissionWorkspaceEntity)
  async rejectCommission(
    @Args('commissionId', { type: () => ID }) commissionId: string,
    @Args('reason') reason: string,
    @Context() context: any,
  ): Promise<CommissionWorkspaceEntity> {
    const user = context.req.user;

    if (!this.hasFinanceRole(user)) {
      throw new ForbiddenException('Only Finance users can reject commissions');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    return this.commissionService.rejectCommission(commissionId, reason, user.id);
  }

  @Mutation(() => CommissionWorkspaceEntity)
  async markCommissionPaid(
    @Args('commissionId', { type: () => ID }) commissionId: string,
    @Context() context: any,
  ): Promise<CommissionWorkspaceEntity> {
    const user = context.req.user;

    if (!this.hasFinanceRole(user)) {
      throw new ForbiddenException('Only Finance users can mark commissions as paid');
    }

    return this.commissionService.markAsPaid(commissionId, user.id);
  }

  private hasFinanceRole(user: any): boolean {
    // [ASSUMPTION: User has role property from Twenty's RBAC]
    return user.role === 'FINANCE' || user.role === 'ADMIN';
  }
}
```

**Subtasks**:
- [ ] Create resolver file
- [ ] Implement approveCommission mutation
- [ ] Implement rejectCommission mutation
- [ ] Implement markCommissionPaid mutation
- [ ] Add role checks

### BE-2: Update Commission Service (AC: 1-3)

**File**: `packages/twenty-server/src/modules/real-estate/services/commission.service.ts` (ADD)

```typescript
// Add to existing CommissionService

async approveCommission(
  commissionId: string,
  approvedById: string,
): Promise<CommissionWorkspaceEntity> {
  const commission = await this.commissionRepository.findOne({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new Error('Commission not found');
  }

  if (commission.status !== CommissionStatus.PENDING) {
    throw new Error(`Cannot approve commission with status ${commission.status}`);
  }

  commission.status = CommissionStatus.APPROVED;
  commission.approvedById = approvedById;
  commission.approvedAt = new Date();

  return this.commissionRepository.save(commission);
}

async rejectCommission(
  commissionId: string,
  reason: string,
  rejectedById: string,
): Promise<CommissionWorkspaceEntity> {
  const commission = await this.commissionRepository.findOne({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new Error('Commission not found');
  }

  if (commission.status !== CommissionStatus.PENDING) {
    throw new Error(`Cannot reject commission with status ${commission.status}`);
  }

  commission.status = CommissionStatus.REJECTED;
  commission.rejectionReason = reason;
  commission.approvedById = rejectedById; // Track who rejected
  commission.approvedAt = new Date();

  return this.commissionRepository.save(commission);
}

async markAsPaid(
  commissionId: string,
  paidById: string,
): Promise<CommissionWorkspaceEntity> {
  const commission = await this.commissionRepository.findOne({
    where: { id: commissionId },
  });

  if (!commission) {
    throw new Error('Commission not found');
  }

  if (commission.status !== CommissionStatus.APPROVED) {
    throw new Error('Only approved commissions can be marked as paid');
  }

  commission.status = CommissionStatus.PAID;
  commission.paidAt = new Date();

  return this.commissionRepository.save(commission);
}
```

**Subtasks**:
- [ ] Add approveCommission method
- [ ] Add rejectCommission method
- [ ] Add markAsPaid method
- [ ] Add status validation

---

## API Tasks

### API-1: Approve Commission (AC: 1)

```graphql
mutation ApproveCommission {
  approveCommission(commissionId: "commission-uuid") {
    id
    status
    approvedBy { id name { firstName lastName } }
    approvedAt
  }
}
```

### API-2: Reject Commission (AC: 2)

```graphql
mutation RejectCommission {
  rejectCommission(
    commissionId: "commission-uuid"
    reason: "Invalid deal documentation"
  ) {
    id
    status
    rejectionReason
  }
}
```

### API-3: Mark as Paid (AC: 3)

```graphql
mutation MarkCommissionPaid {
  markCommissionPaid(commissionId: "commission-uuid") {
    id
    status
    paidAt
  }
}
```

---

## Testing Tasks

### TEST-1: Approval Workflow Tests

```typescript
describe('Commission Approval Workflow', () => {
  it('should approve pending commission (AC: 1)', async () => {
    const commission = await createCommission({ status: 'PENDING' });
    const financeUser = await createUser({ role: 'FINANCE' });

    const result = await approveCommission(commission.id, financeUser);

    expect(result.status).toBe('APPROVED');
    expect(result.approvedById).toBe(financeUser.id);
    expect(result.approvedAt).toBeDefined();
  });

  it('should reject with reason (AC: 2)', async () => {
    const commission = await createCommission({ status: 'PENDING' });
    const financeUser = await createUser({ role: 'FINANCE' });
    const reason = 'Missing documentation';

    const result = await rejectCommission(commission.id, reason, financeUser);

    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe(reason);
  });

  it('should mark approved commission as paid (AC: 3)', async () => {
    const commission = await createCommission({ status: 'APPROVED' });
    const financeUser = await createUser({ role: 'FINANCE' });

    const result = await markCommissionPaid(commission.id, financeUser);

    expect(result.status).toBe('PAID');
    expect(result.paidAt).toBeDefined();
  });

  it('should deny non-finance user (AC: 4)', async () => {
    const commission = await createCommission({ status: 'PENDING' });
    const salesUser = await createUser({ role: 'SALES_AGENT' });

    await expect(
      approveCommission(commission.id, salesUser)
    ).rejects.toThrow(ForbiddenException);
  });
});
```

---

## Definition of Done

- [ ] CommissionResolver created
- [ ] Approve mutation works
- [ ] Reject mutation works with reason
- [ ] Mark paid mutation works
- [ ] Role checks implemented
- [ ] Tests passing

---

## Dev Notes

### Status Flow

```
PENDING → APPROVED → PAID
    ↓
REJECTED
```

### Role Requirements

| Action | Required Role |
|--------|---------------|
| Approve | FINANCE, ADMIN |
| Reject | FINANCE, ADMIN |
| Mark Paid | FINANCE, ADMIN |
| View Own | SALES_AGENT |
| View All | MANAGER, ADMIN |

### References
- [Source: tech-spec-epic-5.md#Approval-Workflow]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/resolvers/commission.resolver.ts
- packages/twenty-server/src/modules/real-estate/services/commission.service.ts (modified)
