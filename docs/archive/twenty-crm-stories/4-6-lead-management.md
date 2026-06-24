# Story 4.6: Lead Management

Status: drafted

## Story

As a **Sales Agent**,
I want to manage my assigned leads,
so that I can track customer interactions.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.6.1 | Sales agent | Opens leads page | Sees assigned leads | List displays |
| AC-4.6.2 | Lead | Update status | Status changes | Status saved |
| AC-4.6.3 | Lead | Mark first contact | Timestamp saved | SLA tracked |

---

## Frontend Tasks

### FE-1: Create Lead List Page (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/pages/MyLeads.tsx`

```tsx
import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';

const MY_LEADS = gql`
  query MyLeads($status: String) {
    people(
      filter: {
        assignedToId: { eq: $currentUserId }
        leadSource: { is: NOT_NULL }
        ${status ? 'leadStatus: { eq: $status }' : ''}
      }
      orderBy: { createdAt: DescNullsLast }
    ) {
      edges {
        node {
          id
          name { firstName lastName }
          email
          phone
          leadSource
          leadStatus
          priority
          assignedAt
          firstContactAt
          slaBreached
          budgetMin
          budgetMax
          preferredLocations
        }
      }
    }
  }
`;

export const MyLeads: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, loading, refetch } = useQuery(MY_LEADS, {
    variables: { status: statusFilter },
  });

  const leads = data?.people?.edges?.map((e: any) => e.node) || [];

  return (
    <PageContainer>
      <Header>
        <Title>My Leads</Title>
        <LeadStats leads={leads} />
      </Header>

      {/* Status Filters */}
      <FilterBar>
        {['All', 'NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'].map(status => (
          <FilterButton
            key={status}
            active={status === 'All' ? !statusFilter : statusFilter === status}
            onClick={() => setStatusFilter(status === 'All' ? undefined : status)}
          >
            {status}
          </FilterButton>
        ))}
      </FilterBar>

      {/* Lead List */}
      {loading ? (
        <Loading />
      ) : (
        <LeadGrid>
          {leads.map((lead: any) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={refetch} />
          ))}
        </LeadGrid>
      )}

      {leads.length === 0 && !loading && (
        <EmptyState>No leads assigned to you</EmptyState>
      )}
    </PageContainer>
  );
};
```

### FE-2: Create Lead Card Component (AC: 2, 3)

**File**: `packages/twenty-front/src/modules/real-estate/components/LeadCard.tsx`

```tsx
import { useMutation } from '@apollo/client';

interface LeadCardProps {
  lead: Lead;
  onUpdate: () => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onUpdate }) => {
  const [updateLead] = useMutation(UPDATE_PERSON);

  const handleStatusChange = async (newStatus: string) => {
    await updateLead({
      variables: {
        id: lead.id,
        data: { leadStatus: newStatus },
      },
    });
    onUpdate();
  };

  const handleMarkContacted = async () => {
    await updateLead({
      variables: {
        id: lead.id,
        data: {
          firstContactAt: new Date().toISOString(),
          leadStatus: 'CONTACTED',
        },
      },
    });
    onUpdate();
  };

  const fullName = `${lead.name?.firstName || ''} ${lead.name?.lastName || ''}`.trim();

  return (
    <Card slaBreached={lead.slaBreached}>
      <CardHeader>
        <LeadName>{fullName || 'Unknown'}</LeadName>
        <PriorityBadge priority={lead.priority} />
      </CardHeader>

      <CardBody>
        <ContactInfo>
          {lead.phone && <div>📞 {lead.phone}</div>}
          {lead.email && <div>📧 {lead.email}</div>}
        </ContactInfo>

        <DetailRow>
          <Label>Source</Label>
          <Value>{lead.leadSource}</Value>
        </DetailRow>

        <DetailRow>
          <Label>Budget</Label>
          <Value>
            {lead.budgetMin && lead.budgetMax
              ? `${formatCurrency(lead.budgetMin)} - ${formatCurrency(lead.budgetMax)}`
              : 'Not specified'}
          </Value>
        </DetailRow>

        <DetailRow>
          <Label>Preferred</Label>
          <Value>{lead.preferredLocations?.join(', ') || 'Not specified'}</Value>
        </DetailRow>

        <StatusSelect
          value={lead.leadStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="UNQUALIFIED">Unqualified</option>
          <option value="CONVERTED">Converted</option>
        </StatusSelect>
      </CardBody>

      <CardFooter>
        {!lead.firstContactAt && (
          <ContactButton onClick={handleMarkContacted}>
            Mark First Contact
          </ContactButton>
        )}
        {lead.firstContactAt && (
          <ContactedInfo>
            Contacted: {formatDate(lead.firstContactAt)}
          </ContactedInfo>
        )}
        {lead.slaBreached && (
          <SLAWarning>⚠️ SLA Breached</SLAWarning>
        )}
      </CardFooter>
    </Card>
  );
};
```

---

## API Tasks

### API-1: Query My Leads (AC: 1)

```graphql
query MyLeads {
  people(
    filter: {
      assignedToId: { eq: "current-user-id" }
      leadSource: { is: NOT_NULL }
    }
  ) {
    edges {
      node {
        id
        name { firstName lastName }
        email
        phone
        leadStatus
        priority
        firstContactAt
        slaBreached
      }
    }
  }
}
```

### API-2: Update Lead Status (AC: 2)

```graphql
mutation UpdateLeadStatus {
  updatePerson(id: "lead-uuid", data: {
    leadStatus: CONTACTED
  }) {
    id
    leadStatus
  }
}
```

### API-3: Mark First Contact (AC: 3)

```graphql
mutation MarkFirstContact {
  updatePerson(id: "lead-uuid", data: {
    firstContactAt: "2025-01-15T10:30:00Z"
    leadStatus: CONTACTED
  }) {
    id
    firstContactAt
    leadStatus
  }
}
```

---

## Testing Tasks

### TEST-1: Lead Management Tests

```typescript
describe('MyLeads Page', () => {
  it('should display assigned leads', async () => {
    const agent = await getCurrentUser();
    await createLead({ assignedToId: agent.id, leadStatus: 'NEW' });

    render(<MyLeads />);

    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });

  it('should update lead status', async () => {
    const agent = await getCurrentUser();
    const lead = await createLead({ assignedToId: agent.id, leadStatus: 'NEW' });

    render(<MyLeads />);

    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'CONTACTED' } });

    await waitFor(() => {
      const updated = await getLead(lead.id);
      expect(updated.leadStatus).toBe('CONTACTED');
    });
  });

  it('should mark first contact', async () => {
    const agent = await getCurrentUser();
    const lead = await createLead({ assignedToId: agent.id, firstContactAt: null });

    render(<MyLeads />);

    fireEvent.click(screen.getByText('Mark First Contact'));

    await waitFor(() => {
      const updated = await getLead(lead.id);
      expect(updated.firstContactAt).toBeDefined();
    });
  });
});
```

---

## Definition of Done

- [ ] MyLeads page created
- [ ] LeadCard component created
- [ ] Status update works
- [ ] First contact tracking works
- [ ] SLA warning displays
- [ ] Tests passing

---

## Dev Notes

### Lead Status Flow

```
NEW → CONTACTED → QUALIFIED → CONVERTED
                ↘ UNQUALIFIED
```

### References
- [Source: tech-spec-epic-4.md#Lead-Management]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/pages/MyLeads.tsx
- packages/twenty-front/src/modules/real-estate/components/LeadCard.tsx
