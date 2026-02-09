# Epic Technical Specification: Công cụ cho Sales Agent

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Epic ID**: epic-4
**Status**: Approved
**Dependencies**: Epic 2 (Properties), Epic 3 (Deals), Epic 5 (Commission)

---

## Overview

Epic 4 xây dựng các công cụ self-service cho Sales Agent: dashboard hiệu suất cá nhân, widgets theo dõi deals/commissions, và view "My Reserved Properties". Đây là epic tập trung vào frontend với React components.

---

## Objectives and Scope

### In-Scope ✅

| Item | PRD Section |
|------|-------------|
| User extensions (sales-specific fields) | 3.1 |
| Personal performance dashboard | 4.8 |
| Performance widgets (deals, commissions, leaderboard) | 4.8 |
| "My Reserved Properties" widget | 4.8 |
| Commission tracking (view-only) | 4.8 |

### Out-of-Scope ❌

- Commission approval (Finance role - Epic 5)
- Lead assignment (Epic 6)
- Admin impersonation (Epic 7)

---

## System Architecture Alignment

| Component | Architecture Lines |
|-----------|-------------------|
| SalesDashboard.tsx | 148 |
| PropertyCard.tsx | 138 |
| PropertyStatusBadge.tsx | 139 |
| ReservationTimer.tsx | 140 |
| CommissionTable.tsx | 141 |
| useReserveProperty.ts | 144 |
| useCommissions.ts | 145 |

---

## Detailed Design

### User Extension Fields

```typescript
// Extend Twenty's User entity for sales-specific fields
export const SALES_USER_EXTENSION_FIELDS = {
  salesTeam: {
    type: FieldMetadataType.TEXT,
    label: 'Sales Team',
  },
  capacity: {
    type: FieldMetadataType.NUMBER,
    label: 'Lead Capacity',
    description: 'Max leads this agent can handle',
  },
  activeLeadCount: {
    type: FieldMetadataType.NUMBER,
    label: 'Active Leads',
    description: 'Current active lead count',
  },
  totalDeals: {
    type: FieldMetadataType.NUMBER,
    label: 'Total Deals',
  },
  totalCommission: {
    type: FieldMetadataType.CURRENCY,
    label: 'Total Commission (VNĐ)',
  },
};
```

### Frontend Components

#### SalesDashboard.tsx

```tsx
// packages/twenty-front/src/modules/real-estate/pages/SalesDashboard.tsx
export const SalesDashboard: React.FC = () => {
  const { data: performance } = useMySalesPerformance();
  const { data: reservedProperties } = useMyReservedProperties();
  const { data: commissions } = useMyCommissions();

  return (
    <PageContainer>
      <PageHeader title="My Dashboard" />

      <WidgetGrid>
        <PerformanceWidget data={performance} />
        <ReservedPropertiesWidget properties={reservedProperties} />
        <CommissionsWidget commissions={commissions} />
        <LeaderboardWidget />
      </WidgetGrid>
    </PageContainer>
  );
};
```

#### PerformanceWidget.tsx

```tsx
export const PerformanceWidget: React.FC<{ data: SalesPerformance }> = ({ data }) => {
  return (
    <Widget title="My Performance">
      <StatCard label="Total Deals" value={data.totalDeals} />
      <StatCard label="Won Deals" value={data.wonDeals} />
      <StatCard label="Total Commission" value={formatCurrency(data.totalCommission)} />
      <StatCard label="This Month" value={formatCurrency(data.monthlyCommission)} />
    </Widget>
  );
};
```

#### ReservationTimer.tsx

```tsx
export const ReservationTimer: React.FC<{ reservedUntil: Date }> = ({ reservedUntil }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(reservedUntil));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(reservedUntil));
    }, 1000);
    return () => clearInterval(timer);
  }, [reservedUntil]);

  const isExpiringSoon = timeLeft.hours < 2;

  return (
    <TimerBadge variant={isExpiringSoon ? 'warning' : 'default'}>
      {timeLeft.hours}h {timeLeft.minutes}m remaining
    </TimerBadge>
  );
};
```

### GraphQL Queries

```graphql
type Query {
  mySalesPerformance: SalesPerformance!
  myReservedProperties: [Property!]!
  myCommissions(status: CommissionStatus): [Commission!]!
  salesLeaderboard(period: DateRange!, limit: Int): [SalesRanking!]!
}

type SalesPerformance {
  totalDeals: Int!
  wonDeals: Int!
  lostDeals: Int!
  totalCommission: Float!
  monthlyCommission: Float!
  conversionRate: Float!
}

type SalesRanking {
  rank: Int!
  userId: ID!
  userName: String!
  totalDeals: Int!
  totalCommission: Float!
}
```

### Custom Hooks

```typescript
// hooks/useMySalesPerformance.ts
export const useMySalesPerformance = () => {
  return useQuery(MY_SALES_PERFORMANCE_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000, // Refresh every minute
  });
};

// hooks/useMyReservedProperties.ts
export const useMyReservedProperties = () => {
  return useQuery(MY_RESERVED_PROPERTIES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
};
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Dashboard load | <1s |
| Widget refresh | Every 60s |
| Leaderboard | <500ms |

---

## Acceptance Criteria

| AC ID | Criteria |
|-------|----------|
| AC-4.1.1 | User has salesTeam, capacity fields |
| AC-4.2.1 | Dashboard shows personal stats |
| AC-4.2.2 | Stats update in real-time |
| AC-4.3.1 | Performance widget shows deals count |
| AC-4.3.2 | Performance widget shows commission total |
| AC-4.3.3 | Leaderboard shows top 10 sales |
| AC-4.4.1 | "My Reserved" shows properties with timer |
| AC-4.4.2 | Timer shows countdown to expiry |
| AC-4.4.3 | Warning when <2h remaining |
| AC-4.5.1 | Commission list shows status (Pending/Approved/Paid) |
| AC-4.5.2 | Sales cannot edit commission (view-only) |

---

## Traceability

| AC | PRD | Architecture |
|----|-----|--------------|
| AC-4.1.x | 3.1 | User extension |
| AC-4.2.x | 4.8 | SalesDashboard.tsx |
| AC-4.3.x | 4.8 | Widgets |
| AC-4.4.x | 4.8 | ReservationTimer.tsx |
| AC-4.5.x | 4.8 | CommissionTable.tsx |

---

_Epic 4: Công cụ cho Sales Agent - 6 stories_
