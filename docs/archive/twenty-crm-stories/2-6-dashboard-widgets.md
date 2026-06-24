# Story 2.6: Dashboard Widgets

Status: drafted

## Story

As an **Admin**,
I want to see inventory status on dashboard,
so that I can quickly understand project availability.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.6.1 | Dashboard | Loaded | Shows total plots per project | Stats display |
| AC-2.6.2 | Widget | View | Shows available/reserved/sold counts | Counts correct |
| AC-2.6.3 | Property status | Changes | Widget updates | Real-time update |

---

## Backend Tasks

### BE-1: Create Dashboard Stats Query (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/resolvers/dashboard.resolver.ts`

```typescript
@Query(() => [ProjectStats])
async projectInventoryStats(): Promise<ProjectStats[]> {
  return this.dashboardService.getProjectInventoryStats();
}
```

**File**: `packages/twenty-server/src/modules/real-estate/services/dashboard.service.ts`

```typescript
async getProjectInventoryStats(): Promise<ProjectStats[]> {
  const projects = await this.projectRepository.find({
    relations: ['properties'],
  });

  return projects.map(project => {
    const properties = project.properties || [];
    return {
      projectId: project.id,
      projectName: project.name,
      totalPlots: properties.length,
      available: properties.filter(p => p.status === 'AVAILABLE').length,
      reserved: properties.filter(p => p.status === 'RESERVED').length,
      depositPaid: properties.filter(p => p.status === 'DEPOSIT_PAID').length,
      sold: properties.filter(p => p.status === 'SOLD').length,
    };
  });
}
```

---

## Frontend Tasks

### FE-1: Create Inventory Widget (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/components/InventoryWidget.tsx`

```tsx
import { useQuery } from '@apollo/client';

const PROJECT_INVENTORY_STATS = gql`
  query ProjectInventoryStats {
    projectInventoryStats {
      projectId
      projectName
      totalPlots
      available
      reserved
      depositPaid
      sold
    }
  }
`;

export const InventoryWidget: React.FC = () => {
  const { data, loading } = useQuery(PROJECT_INVENTORY_STATS, {
    pollInterval: 60000, // Refresh every 60 seconds
  });

  if (loading) return <Loading />;

  return (
    <WidgetContainer>
      <WidgetTitle>Inventory Overview</WidgetTitle>
      <ProjectGrid>
        {data?.projectInventoryStats?.map((project: any) => (
          <ProjectCard key={project.projectId}>
            <ProjectName>{project.projectName}</ProjectName>
            <StatsGrid>
              <Stat color="green">
                <StatValue>{project.available}</StatValue>
                <StatLabel>Available</StatLabel>
              </Stat>
              <Stat color="yellow">
                <StatValue>{project.reserved}</StatValue>
                <StatLabel>Reserved</StatLabel>
              </Stat>
              <Stat color="blue">
                <StatValue>{project.sold}</StatValue>
                <StatLabel>Sold</StatLabel>
              </Stat>
            </StatsGrid>
            <ProgressBar
              value={(project.sold / project.totalPlots) * 100}
              label={`${project.sold}/${project.totalPlots} Sold`}
            />
          </ProjectCard>
        ))}
      </ProjectGrid>
    </WidgetContainer>
  );
};
```

---

## Testing Tasks

### TEST-1: Widget Tests

```typescript
describe('InventoryWidget', () => {
  it('should display project stats', async () => {
    await createProject({ name: 'Project A' });
    await createProperty({ status: 'AVAILABLE' });
    await createProperty({ status: 'SOLD' });

    render(<InventoryWidget />);

    await waitFor(() => {
      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Available
    });
  });
});
```

---

## Definition of Done

- [ ] Dashboard service created
- [ ] GraphQL query works
- [ ] Widget component created
- [ ] Real-time polling works
- [ ] Tests passing

---

## Dev Notes

### Polling vs Subscription
Using polling (60s) for simplicity. Can upgrade to WebSocket subscription if needed.

### References
- [Source: tech-spec-epic-2.md#Dashboard-Widgets]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/services/dashboard.service.ts
- packages/twenty-front/src/modules/real-estate/components/InventoryWidget.tsx
