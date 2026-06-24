# Epic Technical Specification: Vận hành & Mở rộng

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Epic ID**: epic-7
**Status**: Approved
**Dependencies**: Epic 1-6
**Phase**: Phase 2-3 (NOT MVP)

---

## Overview

Epic 7 bao gồm các tính năng nâng cao cho vận hành và mở rộng: interactive plot map, advanced reports, admin tools, và pilot program support. Đây là epic cuối cùng, triển khai sau khi MVP hoàn thành.

---

## Objectives and Scope

### In-Scope ✅

| Item | PRD Section | Phase |
|------|-------------|-------|
| Interactive plot map (SVG-based) | 16.x | Phase 2 |
| Advanced reports (sales, commission, inventory) | 17.x | Phase 2 |
| Admin tools (user management, impersonation) | 3.x | Phase 2 |
| Pilot program support (training, feedback) | 18.x | Phase 3 |
| Google Maps integration | 16.x | Phase 3 |

### Out-of-Scope ❌

- Customer portal
- Mobile app
- AI recommendations

---

## System Architecture Alignment

| Component | Architecture Lines |
|-----------|-------------------|
| InteractivePlotMap.tsx | Frontend |
| ReportsService | Backend |
| AdminToolsService | Backend |

---

## Detailed Design

### Story 7.1: Interactive Plot Map

#### Component: InteractivePlotMap.tsx

```tsx
// packages/twenty-front/src/modules/real-estate/components/InteractivePlotMap.tsx
interface PlotMapProps {
  projectId: string;
  onPlotClick: (propertyId: string) => void;
}

export const InteractivePlotMap: React.FC<PlotMapProps> = ({ projectId, onPlotClick }) => {
  const { data: project } = useProject(projectId);
  const { data: properties } = useProjectProperties(projectId);

  // SVG-based map rendering
  return (
    <MapContainer>
      {project.masterPlanImage && (
        <MasterPlanBackground src={project.masterPlanImage} />
      )}

      <SVGOverlay viewBox="0 0 1000 800">
        {properties.map((property) => (
          <PlotPolygon
            key={property.id}
            points={property.mapCoordinates}
            status={property.status}
            onClick={() => onPlotClick(property.id)}
          />
        ))}
      </SVGOverlay>

      <MapLegend />
    </MapContainer>
  );
};

const PlotPolygon: React.FC<PlotPolygonProps> = ({ points, status, onClick }) => {
  const fillColor = getStatusColor(status);

  return (
    <polygon
      points={points}
      fill={fillColor}
      stroke="#333"
      strokeWidth="1"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <title>{status}</title>
    </polygon>
  );
};

const getStatusColor = (status: string): string => {
  const colors = {
    AVAILABLE: '#4CAF50',   // Green
    RESERVED: '#FFC107',    // Yellow
    DEPOSIT_PAID: '#FF9800', // Orange
    CONTRACTED: '#2196F3',  // Blue
    SOLD: '#9C27B0',        // Purple
  };
  return colors[status] || '#9E9E9E';
};
```

#### Property Map Coordinates

```typescript
// Add to property entity
@WorkspaceField({
  type: FieldMetadataType.TEXT,
  label: 'Map Coordinates',
  description: 'SVG polygon points for interactive map',
})
mapCoordinates: string; // e.g., "100,100 200,100 200,200 100,200"
```

### Story 7.2: Advanced Reports

#### Reports Service

```typescript
// services/reports.service.ts
@Injectable()
export class ReportsService {
  async getSalesReport(period: DateRange, groupBy: GroupBy): Promise<SalesReport> {
    const deals = await this.dealRepository.find({
      where: {
        closeDate: Between(period.start, period.end),
        stage: 'WON',
      },
      relations: ['salesAgent', 'property', 'property.project'],
    });

    return {
      totalDeals: deals.length,
      totalValue: deals.reduce((sum, d) => sum + d.dealValue, 0),
      byAgent: this.groupByAgent(deals),
      byProject: this.groupByProject(deals),
      byMonth: this.groupByMonth(deals),
    };
  }

  async getInventoryReport(projectId?: string): Promise<InventoryReport> {
    const whereClause = projectId ? { projectId } : {};

    const properties = await this.propertyRepository.find({
      where: whereClause,
      relations: ['project'],
    });

    const statusCounts = properties.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: properties.length,
      available: statusCounts['AVAILABLE'] || 0,
      reserved: statusCounts['RESERVED'] || 0,
      sold: statusCounts['SOLD'] || 0,
      byProject: this.groupByProject(properties),
    };
  }

  async getCommissionReport(period: DateRange): Promise<CommissionReport> {
    const commissions = await this.commissionRepository.find({
      where: {
        createdAt: Between(period.start, period.end),
      },
      relations: ['salesAgent', 'property.project'],
    });

    return {
      totalPending: commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commissionAmount, 0),
      totalApproved: commissions.filter(c => c.status === 'APPROVED').reduce((s, c) => s + c.commissionAmount, 0),
      totalPaid: commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.commissionAmount, 0),
      byAgent: this.groupByAgent(commissions),
      byProject: this.groupByProject(commissions),
    };
  }
}
```

#### GraphQL Queries

```graphql
type Query {
  salesReport(period: DateRange!, groupBy: GroupBy): SalesReport!
  inventoryReport(projectId: ID): InventoryReport!
  commissionReport(period: DateRange!): CommissionReport!
  exportReport(type: ReportType!, period: DateRange!, format: ExportFormat!): String!
}

enum ReportType {
  SALES
  INVENTORY
  COMMISSION
  LEAD_PERFORMANCE
}

enum ExportFormat {
  CSV
  EXCEL
  PDF
}
```

### Story 7.3: Admin Tools

#### User Management

```typescript
// services/admin-tools.service.ts
@Injectable()
export class AdminToolsService {
  async impersonateUser(adminId: string, targetUserId: string): Promise<ImpersonationToken> {
    // Verify admin has permission
    const admin = await this.userRepository.findOne({ where: { id: adminId } });
    if (admin.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can impersonate');
    }

    // Create impersonation session
    const session = await this.impersonationSessionRepository.save({
      adminId,
      targetUserId,
      startedAt: new Date(),
      expiresAt: addHours(new Date(), 1),
    });

    // Generate token
    const token = this.jwtService.sign({
      userId: targetUserId,
      impersonatedBy: adminId,
      sessionId: session.id,
    });

    // Audit log
    await this.auditLogService.log({
      action: 'IMPERSONATION_START',
      adminId,
      targetUserId,
    });

    return { token, expiresAt: session.expiresAt };
  }

  async bulkUpdateUserRoles(updates: UserRoleUpdate[]): Promise<User[]> {
    const users = await Promise.all(
      updates.map(async ({ userId, newRole }) => {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        user.role = newRole;
        return this.userRepository.save(user);
      })
    );

    return users;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return {
      database: await this.checkDatabaseHealth(),
      redis: await this.checkRedisHealth(),
      queue: await this.checkQueueHealth(),
      storage: await this.checkStorageHealth(),
    };
  }
}
```

### Story 7.4: Pilot Program Support

#### Training Materials Integration

```typescript
// In-app help system
export const HELP_TOPICS = {
  PROPERTY_RESERVATION: {
    title: 'Cách giữ chỗ lô đất',
    videoUrl: '/training/reservation.mp4',
    steps: [
      'Chọn dự án từ danh sách',
      'Click vào lô đất AVAILABLE',
      'Nhấn nút "Giữ chỗ"',
      'Xác nhận thông tin',
    ],
  },
  COMMISSION_TRACKING: {
    title: 'Theo dõi hoa hồng',
    videoUrl: '/training/commission.mp4',
    steps: [
      'Vào Dashboard cá nhân',
      'Xem mục "My Commissions"',
      'Filter theo trạng thái',
    ],
  },
  // ... more topics
};

// Feedback collection
@Injectable()
export class FeedbackService {
  async submitFeedback(userId: string, feedback: FeedbackInput): Promise<Feedback> {
    return this.feedbackRepository.save({
      userId,
      category: feedback.category,
      rating: feedback.rating,
      comment: feedback.comment,
      screenshot: feedback.screenshot,
      createdAt: new Date(),
    });
  }

  async getFeedbackSummary(): Promise<FeedbackSummary> {
    const feedbacks = await this.feedbackRepository.find();

    return {
      totalCount: feedbacks.length,
      averageRating: feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length,
      byCategory: this.groupByCategory(feedbacks),
      recentComments: feedbacks.slice(-10),
    };
  }
}
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Map render | <2s for 500 plots |
| Report generation | <5s |
| Export (1000 rows) | <10s |
| Impersonation token | 1 hour expiry |

---

## Acceptance Criteria

### Story 7.1: Interactive Plot Map

| AC ID | Criteria |
|-------|----------|
| AC-7.1.1 | Map displays all plots with status colors |
| AC-7.1.2 | Click on plot shows property details |
| AC-7.1.3 | Legend shows status color meanings |
| AC-7.1.4 | Map overlays on master plan image |

### Story 7.2: Advanced Reports

| AC ID | Criteria |
|-------|----------|
| AC-7.2.1 | Sales report shows by agent, project, month |
| AC-7.2.2 | Inventory report shows status breakdown |
| AC-7.2.3 | Commission report shows pending/approved/paid |
| AC-7.2.4 | Export to CSV/Excel works |

### Story 7.3: Admin Tools

| AC ID | Criteria |
|-------|----------|
| AC-7.3.1 | Admin can impersonate any user |
| AC-7.3.2 | Impersonation logged in audit trail |
| AC-7.3.3 | Impersonation expires after 1 hour |
| AC-7.3.4 | System health dashboard shows all services |

### Story 7.4: Pilot Program Support

| AC ID | Criteria |
|-------|----------|
| AC-7.4.1 | In-app help shows training videos |
| AC-7.4.2 | Users can submit feedback |
| AC-7.4.3 | Admin can view feedback summary |
| AC-7.4.4 | Feedback includes rating and screenshot |

---

## Traceability

| AC | PRD | Phase |
|----|-----|-------|
| AC-7.1.x | 16.x | Phase 2 |
| AC-7.2.x | 17.x | Phase 2 |
| AC-7.3.x | 3.x | Phase 2 |
| AC-7.4.x | 18.x | Phase 3 |

---

## Risks

| Risk | Mitigation |
|------|------------|
| SVG map performance with many plots | Virtualization, lazy loading |
| Report query performance | Pre-computed aggregates, caching |
| Impersonation security | Audit logging, time limit, admin-only |

---

_Epic 7: Vận hành & Mở rộng - 4 stories (Phase 2-3)_
