# Story 7.2: Sales Report & Export

Status: drafted

## Story

As a **Manager**,
I want sales reports with export,
so that I can analyze team performance.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-7.2.1 | Report page | Load | Shows sales metrics | Data displays |
| AC-7.2.2 | Report | Filter by date | Data filtered | Correct period |
| AC-7.2.3 | Report | Export | PDF/Excel downloads | File downloads |

---

## Backend Tasks

### BE-1: Create Report Service (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/services/report.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CommissionWorkspaceEntity } from '../standard-objects/commission.workspace-entity';
import { PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

export interface SalesReportData {
  period: { start: Date; end: Date };
  summary: {
    totalSales: number;
    totalCommissions: number;
    propertiesSold: number;
    averageDealValue: number;
  };
  byProject: ProjectSalesData[];
  byAgent: AgentSalesData[];
  topPerformers: AgentSalesData[];
}

interface ProjectSalesData {
  projectId: string;
  projectName: string;
  totalSales: number;
  propertiesSold: number;
}

interface AgentSalesData {
  agentId: string;
  agentName: string;
  totalSales: number;
  commissions: number;
  dealsCount: number;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(CommissionWorkspaceEntity)
    private commissionRepository: Repository<CommissionWorkspaceEntity>,
    @InjectRepository(PropertyWorkspaceEntity)
    private propertyRepository: Repository<PropertyWorkspaceEntity>,
  ) {}

  async generateSalesReport(
    startDate: Date,
    endDate: Date,
  ): Promise<SalesReportData> {
    const [summary, byProject, byAgent] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getByProject(startDate, endDate),
      this.getByAgent(startDate, endDate),
    ]);

    return {
      period: { start: startDate, end: endDate },
      summary,
      byProject,
      byAgent,
      topPerformers: byAgent.slice(0, 10),
    };
  }

  private async getSummary(startDate: Date, endDate: Date) {
    const result = await this.commissionRepository
      .createQueryBuilder('c')
      .select([
        'SUM(c.dealValue) as totalSales',
        'SUM(c.commissionAmount) as totalCommissions',
        'COUNT(c.id) as propertiesSold',
        'AVG(c.dealValue) as averageDealValue',
      ])
      .where('c.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('c.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] })
      .getRawOne();

    return {
      totalSales: Number(result.totalSales) || 0,
      totalCommissions: Number(result.totalCommissions) || 0,
      propertiesSold: Number(result.propertiesSold) || 0,
      averageDealValue: Number(result.averageDealValue) || 0,
    };
  }

  private async getByProject(startDate: Date, endDate: Date): Promise<ProjectSalesData[]> {
    const results = await this.commissionRepository
      .createQueryBuilder('c')
      .leftJoin('c.property', 'property')
      .leftJoin('property.project', 'project')
      .select([
        'project.id as projectId',
        'project.name as projectName',
        'SUM(c.dealValue) as totalSales',
        'COUNT(c.id) as propertiesSold',
      ])
      .where('c.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('c.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] })
      .groupBy('project.id, project.name')
      .orderBy('SUM(c.dealValue)', 'DESC')
      .getRawMany();

    return results.map(r => ({
      projectId: r.projectId,
      projectName: r.projectName,
      totalSales: Number(r.totalSales) || 0,
      propertiesSold: Number(r.propertiesSold) || 0,
    }));
  }

  private async getByAgent(startDate: Date, endDate: Date): Promise<AgentSalesData[]> {
    const results = await this.commissionRepository
      .createQueryBuilder('c')
      .leftJoin('c.salesAgent', 'agent')
      .select([
        'agent.id as agentId',
        'agent.name as agentName',
        'SUM(c.dealValue) as totalSales',
        'SUM(c.commissionAmount) as commissions',
        'COUNT(c.id) as dealsCount',
      ])
      .where('c.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('c.status IN (:...statuses)', { statuses: ['APPROVED', 'PAID'] })
      .groupBy('agent.id, agent.name')
      .orderBy('SUM(c.dealValue)', 'DESC')
      .getRawMany();

    return results.map(r => ({
      agentId: r.agentId,
      agentName: r.agentName,
      totalSales: Number(r.totalSales) || 0,
      commissions: Number(r.commissions) || 0,
      dealsCount: Number(r.dealsCount) || 0,
    }));
  }
}
```

### BE-2: Create Report Resolver (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/resolvers/report.resolver.ts`

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { ReportService, SalesReportData } from '../services/report.service';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ReportResolver {
  constructor(private reportService: ReportService) {}

  @Query(() => SalesReportData)
  async salesReport(
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
  ): Promise<SalesReportData> {
    return this.reportService.generateSalesReport(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
```

---

## Frontend Tasks

### FE-1: Create Report Page (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/pages/SalesReport.tsx`

```tsx
import { useState } from 'react';
import { useQuery } from '@apollo/client';

export const SalesReport: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });

  const { data, loading } = useQuery(GET_SALES_REPORT, {
    variables: {
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString(),
    },
  });

  const report = data?.salesReport;

  const handleExport = async (format: 'pdf' | 'excel') => {
    const response = await fetch(
      `/api/real-estate/reports/export?` +
      `format=${format}&` +
      `startDate=${dateRange.start.toISOString()}&` +
      `endDate=${dateRange.end.toISOString()}`
    );
    const blob = await response.blob();
    downloadBlob(blob, `sales-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
  };

  return (
    <ReportContainer>
      <Header>
        <Title>Sales Report</Title>
        <Actions>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
          <ExportButton onClick={() => handleExport('excel')}>
            Export Excel
          </ExportButton>
          <ExportButton onClick={() => handleExport('pdf')}>
            Export PDF
          </ExportButton>
        </Actions>
      </Header>

      {loading && <Loading />}

      {report && (
        <>
          <SummaryCards>
            <MetricCard title="Total Sales" value={formatCurrency(report.summary.totalSales)} />
            <MetricCard title="Commissions" value={formatCurrency(report.summary.totalCommissions)} />
            <MetricCard title="Properties Sold" value={report.summary.propertiesSold} />
            <MetricCard title="Avg Deal Value" value={formatCurrency(report.summary.averageDealValue)} />
          </SummaryCards>

          <Section>
            <SectionTitle>Sales by Project</SectionTitle>
            <DataTable data={report.byProject} columns={projectColumns} />
          </Section>

          <Section>
            <SectionTitle>Top Performers</SectionTitle>
            <DataTable data={report.topPerformers} columns={agentColumns} />
          </Section>
        </>
      )}
    </ReportContainer>
  );
};
```

---

## API Tasks

### API-1: Get Sales Report (AC: 1, 2)

```graphql
query GetSalesReport($startDate: String!, $endDate: String!) {
  salesReport(startDate: $startDate, endDate: $endDate) {
    period { start end }
    summary {
      totalSales
      totalCommissions
      propertiesSold
      averageDealValue
    }
    byProject {
      projectId
      projectName
      totalSales
      propertiesSold
    }
    topPerformers {
      agentId
      agentName
      totalSales
      commissions
      dealsCount
    }
  }
}
```

---

## Testing Tasks

### TEST-1: Report Tests

```typescript
describe('Sales Report', () => {
  it('should generate report with summary', async () => {
    await createCommission({ dealValue: 1000000000, status: 'PAID' });
    await createCommission({ dealValue: 2000000000, status: 'PAID' });

    const report = await reportService.generateSalesReport(
      new Date('2025-01-01'),
      new Date('2025-12-31'),
    );

    expect(report.summary.totalSales).toBe(3000000000);
    expect(report.summary.propertiesSold).toBe(2);
  });

  it('should group by project', async () => {
    const project1 = await createProject({ name: 'Project A' });
    const project2 = await createProject({ name: 'Project B' });

    await createCommission({ projectId: project1.id });
    await createCommission({ projectId: project2.id });

    const report = await reportService.generateSalesReport(
      new Date('2025-01-01'),
      new Date('2025-12-31'),
    );

    expect(report.byProject.length).toBe(2);
  });
});
```

---

## Definition of Done

- [ ] ReportService created
- [ ] ReportResolver created
- [ ] Report page created
- [ ] Date filtering works
- [ ] Export to Excel/PDF works
- [ ] Tests passing

---

## Dev Notes

### Report Metrics

| Metric | Calculation |
|--------|-------------|
| Total Sales | Sum of dealValue where status = APPROVED/PAID |
| Total Commissions | Sum of commissionAmount |
| Properties Sold | Count of commissions |
| Avg Deal Value | Average of dealValue |

### References
- [Source: tech-spec-epic-7.md#Sales-Report]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/services/report.service.ts
- packages/twenty-server/src/modules/real-estate/resolvers/report.resolver.ts
- packages/twenty-front/src/modules/real-estate/pages/SalesReport.tsx
