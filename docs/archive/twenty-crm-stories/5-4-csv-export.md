# Story 5.4: CSV Export

Status: drafted

## Story

As a **Finance User**,
I want to export commissions to CSV,
so that I can process payments externally.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-5.4.1 | Commissions | Export | CSV file downloaded | File downloads |
| AC-5.4.2 | CSV | Check content | Has all required columns | Columns correct |
| AC-5.4.3 | Export | Filter by status | Only filtered data | Correct records |

---

## Backend Tasks

### BE-1: Create Export Service (AC: 1-3)

**File**: `packages/twenty-server/src/modules/real-estate/services/commission-export.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionWorkspaceEntity, CommissionStatus } from '../standard-objects/commission.workspace-entity';

@Injectable()
export class CommissionExportService {
  constructor(
    @InjectRepository(CommissionWorkspaceEntity)
    private commissionRepository: Repository<CommissionWorkspaceEntity>,
  ) {}

  async exportToCSV(filters?: {
    status?: CommissionStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    const query = this.commissionRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.deal', 'deal')
      .leftJoinAndSelect('c.property', 'property')
      .leftJoinAndSelect('property.project', 'project')
      .leftJoinAndSelect('c.salesAgent', 'agent');

    if (filters?.status) {
      query.andWhere('c.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      query.andWhere('c.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('c.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const commissions = await query.getMany();

    return this.generateCSV(commissions);
  }

  private generateCSV(commissions: CommissionWorkspaceEntity[]): string {
    const headers = [
      'Commission ID',
      'Deal Name',
      'Property',
      'Project',
      'Sales Agent',
      'Deal Value (VNĐ)',
      'Commission Rate (%)',
      'Commission Amount (VNĐ)',
      'Status',
      'Created At',
      'Approved At',
      'Paid At',
    ];

    const rows = commissions.map(c => [
      c.id,
      c.deal?.name || '',
      c.property?.plotNumber || '',
      (c.property as any)?.project?.name || '',
      `${c.salesAgent?.name?.firstName || ''} ${c.salesAgent?.name?.lastName || ''}`.trim(),
      c.dealValue,
      c.commissionRate,
      c.commissionAmount,
      c.status,
      c.createdAt?.toISOString() || '',
      c.approvedAt?.toISOString() || '',
      c.paidAt?.toISOString() || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
```

**Subtasks**:
- [ ] Create export service
- [ ] Implement CSV generation
- [ ] Add filtering support
- [ ] Handle special characters

### BE-2: Create Export Controller (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/controllers/commission-export.controller.ts`

```typescript
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { CommissionExportService } from '../services/commission-export.service';
import { CommissionStatus } from '../standard-objects/commission.workspace-entity';

@Controller('api/real-estate/commissions')
@UseGuards(JwtAuthGuard)
export class CommissionExportController {
  constructor(private exportService: CommissionExportService) {}

  @Get('export')
  async exportCommissions(
    @Query('status') status?: CommissionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.exportService.exportToCSV({
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const filename = `commissions-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
```

---

## Frontend Tasks

### FE-1: Create Export Button (AC: 1)

```tsx
const ExportButton: React.FC<{ status?: CommissionStatus }> = ({ status }) => {
  const handleExport = async () => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await fetch(`/api/real-estate/commissions/export?${params}`);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} icon={<IconDownload />}>
      Export CSV
    </Button>
  );
};
```

---

## API Tasks

### API-1: Export Endpoint (AC: 1, 3)

```bash
# Export all commissions
GET /api/real-estate/commissions/export

# Export with filters
GET /api/real-estate/commissions/export?status=APPROVED&startDate=2025-01-01&endDate=2025-01-31
```

---

## Testing Tasks

### TEST-1: Export Tests

```typescript
describe('Commission CSV Export', () => {
  it('should export all commissions to CSV', async () => {
    await createCommission({ status: 'PENDING' });
    await createCommission({ status: 'APPROVED' });

    const csv = await exportService.exportToCSV();

    expect(csv).toContain('Commission ID');
    expect(csv.split('\n').length).toBe(3); // Header + 2 rows
  });

  it('should filter by status', async () => {
    await createCommission({ status: 'PENDING' });
    await createCommission({ status: 'APPROVED' });

    const csv = await exportService.exportToCSV({ status: 'APPROVED' });

    expect(csv.split('\n').length).toBe(2); // Header + 1 row
  });

  it('should have correct columns', async () => {
    await createCommission({});

    const csv = await exportService.exportToCSV();
    const headers = csv.split('\n')[0];

    expect(headers).toContain('Commission ID');
    expect(headers).toContain('Deal Value');
    expect(headers).toContain('Commission Amount');
    expect(headers).toContain('Status');
  });
});
```

---

## Definition of Done

- [ ] Export service created
- [ ] Export controller created
- [ ] CSV downloads correctly
- [ ] Filtering works
- [ ] Correct columns
- [ ] Tests passing

---

## Dev Notes

### CSV Columns

| Column | Source |
|--------|--------|
| Commission ID | commission.id |
| Deal Name | deal.name |
| Property | property.plotNumber |
| Project | project.name |
| Sales Agent | salesAgent.name |
| Deal Value | commission.dealValue |
| Commission Rate | commission.commissionRate |
| Commission Amount | commission.commissionAmount |
| Status | commission.status |
| Created At | commission.createdAt |
| Approved At | commission.approvedAt |
| Paid At | commission.paidAt |

### References
- [Source: tech-spec-epic-5.md#CSV-Export]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/services/commission-export.service.ts
- packages/twenty-server/src/modules/real-estate/controllers/commission-export.controller.ts
