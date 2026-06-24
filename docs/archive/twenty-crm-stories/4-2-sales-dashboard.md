# Story 4.2: Sales Dashboard

Status: drafted

## Story

As a **Sales Agent**,
I want a personal dashboard,
so that I can see my performance at a glance.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.2.1 | Sales agent | Opens dashboard | Sees personal stats | Dashboard loads |
| AC-4.2.2 | Dashboard | Shows metrics | Total sales, commissions, leads | Data accurate |
| AC-4.2.3 | Dashboard | Real-time | Updates on new data | Refresh works |

---

## Backend Tasks

### BE-1: Create Dashboard Query (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/resolvers/dashboard.resolver.ts`

```typescript
import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { DashboardService } from '../services/dashboard.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class DashboardResolver {
  constructor(private dashboardService: DashboardService) {}

  @Query(() => SalesPerformance)
  async mySalesPerformance(@Context() context: any): Promise<SalesPerformance> {
    const userId = context.req.user.id;
    return this.dashboardService.getSalesPerformance(userId);
  }
}
```

### BE-2: Create Dashboard Service (AC: 2)

**File**: `packages/twenty-server/src/modules/real-estate/services/dashboard.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionWorkspaceEntity } from '../standard-objects/commission.workspace-entity';
import { PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

export interface SalesPerformance {
  totalSales: number;
  totalCommissions: number;
  pendingCommissions: number;
  reservedProperties: number;
  closedDeals: number;
  monthlyTarget: number;
  monthlyProgress: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(CommissionWorkspaceEntity)
    private commissionRepository: Repository<CommissionWorkspaceEntity>,
    @InjectRepository(PropertyWorkspaceEntity)
    private propertyRepository: Repository<PropertyWorkspaceEntity>,
  ) {}

  async getSalesPerformance(userId: string): Promise<SalesPerformance> {
    const [
      totalSales,
      totalCommissions,
      pendingCommissions,
      reservedProperties,
      closedDeals,
    ] = await Promise.all([
      this.getTotalSales(userId),
      this.getTotalCommissions(userId),
      this.getPendingCommissions(userId),
      this.getReservedProperties(userId),
      this.getClosedDeals(userId),
    ]);

    return {
      totalSales,
      totalCommissions,
      pendingCommissions,
      reservedProperties,
      closedDeals,
      monthlyTarget: 5000000000, // From user settings
      monthlyProgress: (totalSales / 5000000000) * 100,
    };
  }

  private async getTotalSales(userId: string): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.dealValue)', 'total')
      .where('c.salesAgentId = :userId', { userId })
      .andWhere('c.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] })
      .getRawOne();
    return result?.total || 0;
  }

  private async getTotalCommissions(userId: string): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commissionAmount)', 'total')
      .where('c.salesAgentId = :userId', { userId })
      .andWhere('c.status = :status', { status: 'PAID' })
      .getRawOne();
    return result?.total || 0;
  }

  private async getPendingCommissions(userId: string): Promise<number> {
    const result = await this.commissionRepository
      .createQueryBuilder('c')
      .select('SUM(c.commissionAmount)', 'total')
      .where('c.salesAgentId = :userId', { userId })
      .andWhere('c.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
      .getRawOne();
    return result?.total || 0;
  }

  private async getReservedProperties(userId: string): Promise<number> {
    return this.propertyRepository.count({
      where: { reservedById: userId, status: 'RESERVED' },
    });
  }

  private async getClosedDeals(userId: string): Promise<number> {
    return this.commissionRepository.count({
      where: { salesAgentId: userId },
    });
  }
}
```

---

## Frontend Tasks

### FE-1: Create Dashboard Page (AC: 1, 3)

**File**: `packages/twenty-front/src/modules/real-estate/pages/SalesDashboard.tsx`

```tsx
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const MY_SALES_PERFORMANCE = gql`
  query MySalesPerformance {
    mySalesPerformance {
      totalSales
      totalCommissions
      pendingCommissions
      reservedProperties
      closedDeals
      monthlyTarget
      monthlyProgress
    }
  }
`;

export const SalesDashboard = () => {
  const { data, loading, refetch } = useQuery(MY_SALES_PERFORMANCE, {
    pollInterval: 30000, // Refresh every 30 seconds
  });

  if (loading) return <Loading />;

  const performance = data?.mySalesPerformance;

  return (
    <DashboardContainer>
      <Header>
        <Title>My Performance</Title>
        <RefreshButton onClick={() => refetch()} />
      </Header>

      <MetricsGrid>
        <MetricCard
          title="Total Sales"
          value={formatCurrency(performance.totalSales)}
          icon="IconCash"
        />
        <MetricCard
          title="Commissions Earned"
          value={formatCurrency(performance.totalCommissions)}
          icon="IconCoin"
        />
        <MetricCard
          title="Pending Commissions"
          value={formatCurrency(performance.pendingCommissions)}
          icon="IconClock"
        />
        <MetricCard
          title="Reserved Properties"
          value={performance.reservedProperties}
          icon="IconHome"
        />
        <MetricCard
          title="Closed Deals"
          value={performance.closedDeals}
          icon="IconCheck"
        />
      </MetricsGrid>

      <ProgressSection>
        <ProgressBar
          label="Monthly Target Progress"
          value={performance.monthlyProgress}
          target={100}
        />
      </ProgressSection>
    </DashboardContainer>
  );
};
```

**Subtasks**:
- [ ] Create dashboard page
- [ ] Add metric cards
- [ ] Add progress bar
- [ ] Add auto-refresh

---

## API Tasks

### API-1: Query Sales Performance (AC: 2)

```graphql
query MySalesPerformance {
  mySalesPerformance {
    totalSales
    totalCommissions
    pendingCommissions
    reservedProperties
    closedDeals
    monthlyTarget
    monthlyProgress
  }
}
```

---

## Definition of Done

- [ ] Dashboard resolver created
- [ ] Dashboard service created
- [ ] Frontend page created
- [ ] Metrics accurate
- [ ] Auto-refresh works
- [ ] Tests passing

---

## Dev Notes

### Metrics Definitions

| Metric | Calculation |
|--------|-------------|
| Total Sales | Sum of dealValue where status = APPROVED/PAID |
| Total Commissions | Sum of commissionAmount where status = PAID |
| Pending Commissions | Sum where status = PENDING/APPROVED |
| Reserved Properties | Count where reservedById = user |
| Closed Deals | Count of commissions for user |

### References
- [Source: tech-spec-epic-4.md#Sales-Dashboard]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/resolvers/dashboard.resolver.ts
- packages/twenty-server/src/modules/real-estate/services/dashboard.service.ts
- packages/twenty-front/src/modules/real-estate/pages/SalesDashboard.tsx
