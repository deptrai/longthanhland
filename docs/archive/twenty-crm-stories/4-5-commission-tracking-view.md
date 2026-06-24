# Story 4.5: Commission Viewer

Status: drafted

## Story

As a **Sales Agent**,
I want to view my commissions,
so that I can track my earnings.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.5.1 | Sales agent | Opens commission page | Sees own commissions | List displays |
| AC-4.5.2 | Commission list | Filter by status | Only filtered shown | Filter works |
| AC-4.5.3 | Commission | View details | Shows deal, property info | Details accurate |

---

## Frontend Tasks

### FE-1: Create Commission List Hook (AC: 1, 2)

**File**: `packages/twenty-front/src/modules/real-estate/hooks/useMyCommissions.ts`

```tsx
import { useQuery, gql } from '@apollo/client';

const MY_COMMISSIONS = gql`
  query MyCommissions($status: String) {
    commissions(
      filter: {
        salesAgentId: { eq: $currentUserId }
        ${status ? 'status: { eq: $status }' : ''}
      }
      orderBy: { createdAt: DescNullsLast }
    ) {
      edges {
        node {
          id
          dealValue
          commissionRate
          commissionAmount
          status
          createdAt
          approvedAt
          paidAt
          deal {
            id
            name
          }
          property {
            id
            plotNumber
            project { id name }
          }
        }
      }
    }
  }
`;

export const useMyCommissions = (status?: string) => {
  const { data, loading, error, refetch } = useQuery(MY_COMMISSIONS, {
    variables: { status },
  });

  const commissions = data?.commissions?.edges?.map((e: any) => e.node) || [];

  const totals = {
    total: commissions.reduce((sum: number, c: any) => sum + c.commissionAmount, 0),
    pending: commissions
      .filter((c: any) => c.status === 'PENDING')
      .reduce((sum: number, c: any) => sum + c.commissionAmount, 0),
    approved: commissions
      .filter((c: any) => c.status === 'APPROVED')
      .reduce((sum: number, c: any) => sum + c.commissionAmount, 0),
    paid: commissions
      .filter((c: any) => c.status === 'PAID')
      .reduce((sum: number, c: any) => sum + c.commissionAmount, 0),
  };

  return { commissions, totals, loading, error, refetch };
};
```

### FE-2: Create Commission Page (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/pages/MyCommissions.tsx`

```tsx
import { useState } from 'react';
import styled from '@emotion/styled';
import { useMyCommissions } from '../hooks/useMyCommissions';

export const MyCommissions: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { commissions, totals, loading } = useMyCommissions(statusFilter);

  return (
    <PageContainer>
      <Header>
        <Title>My Commissions</Title>
      </Header>

      {/* Summary Cards */}
      <SummaryGrid>
        <SummaryCard>
          <CardLabel>Total Earned</CardLabel>
          <CardValue>{formatCurrency(totals.paid)}</CardValue>
        </SummaryCard>
        <SummaryCard status="pending">
          <CardLabel>Pending</CardLabel>
          <CardValue>{formatCurrency(totals.pending)}</CardValue>
        </SummaryCard>
        <SummaryCard status="approved">
          <CardLabel>Approved</CardLabel>
          <CardValue>{formatCurrency(totals.approved)}</CardValue>
        </SummaryCard>
      </SummaryGrid>

      {/* Filters */}
      <FilterBar>
        <FilterButton
          active={!statusFilter}
          onClick={() => setStatusFilter(undefined)}
        >
          All
        </FilterButton>
        <FilterButton
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </FilterButton>
        <FilterButton
          active={statusFilter === 'APPROVED'}
          onClick={() => setStatusFilter('APPROVED')}
        >
          Approved
        </FilterButton>
        <FilterButton
          active={statusFilter === 'PAID'}
          onClick={() => setStatusFilter('PAID')}
        >
          Paid
        </FilterButton>
      </FilterBar>

      {/* Commission List */}
      {loading ? (
        <Loading />
      ) : (
        <CommissionTable>
          <thead>
            <tr>
              <th>Date</th>
              <th>Property</th>
              <th>Project</th>
              <th>Deal Value</th>
              <th>Rate</th>
              <th>Commission</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission: any) => (
              <tr key={commission.id}>
                <td>{formatDate(commission.createdAt)}</td>
                <td>{commission.property?.plotNumber}</td>
                <td>{commission.property?.project?.name}</td>
                <td>{formatCurrency(commission.dealValue)}</td>
                <td>{commission.commissionRate}%</td>
                <td>{formatCurrency(commission.commissionAmount)}</td>
                <td>
                  <StatusBadge status={commission.status}>
                    {commission.status}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </CommissionTable>
      )}

      {commissions.length === 0 && !loading && (
        <EmptyState>No commissions found</EmptyState>
      )}
    </PageContainer>
  );
};
```

---

## API Tasks

### API-1: Query My Commissions (AC: 1)

```graphql
query MyCommissions {
  commissions(
    filter: { salesAgentId: { eq: "current-user-id" } }
    orderBy: { createdAt: DescNullsLast }
  ) {
    edges {
      node {
        id
        dealValue
        commissionRate
        commissionAmount
        status
        createdAt
        deal { id name }
        property {
          id
          plotNumber
          project { name }
        }
      }
    }
  }
}
```

---

## Testing Tasks

### TEST-1: Commission Viewer Tests

```typescript
describe('MyCommissions Page', () => {
  it('should display commission list', async () => {
    const agent = await getCurrentUser();
    await createCommission({ salesAgentId: agent.id, status: 'PENDING' });
    await createCommission({ salesAgentId: agent.id, status: 'PAID' });

    render(<MyCommissions />);

    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 rows
    });
  });

  it('should filter by status', async () => {
    const agent = await getCurrentUser();
    await createCommission({ salesAgentId: agent.id, status: 'PENDING' });
    await createCommission({ salesAgentId: agent.id, status: 'PAID' });

    render(<MyCommissions />);

    fireEvent.click(screen.getByText('Paid'));

    await waitFor(() => {
      expect(screen.getAllByRole('row')).toHaveLength(2); // Header + 1 row
    });
  });

  it('should show correct totals', async () => {
    const agent = await getCurrentUser();
    await createCommission({ salesAgentId: agent.id, commissionAmount: 50000000, status: 'PAID' });
    await createCommission({ salesAgentId: agent.id, commissionAmount: 30000000, status: 'PENDING' });

    render(<MyCommissions />);

    await waitFor(() => {
      expect(screen.getByText('50,000,000 ₫')).toBeInTheDocument();
      expect(screen.getByText('30,000,000 ₫')).toBeInTheDocument();
    });
  });
});
```

---

## Definition of Done

- [ ] useMyCommissions hook created
- [ ] MyCommissions page created
- [ ] Summary cards display
- [ ] Status filter works
- [ ] Commission details accurate
- [ ] Tests passing

---

## Dev Notes

### Commission Status Colors

| Status | Color |
|--------|-------|
| PENDING | Yellow |
| APPROVED | Green |
| REJECTED | Red |
| PAID | Blue |

### References
- [Source: tech-spec-epic-4.md#Commission-Viewer]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/hooks/useMyCommissions.ts
- packages/twenty-front/src/modules/real-estate/pages/MyCommissions.tsx
