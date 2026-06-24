# Story 8.7.4: Revenue Tracking & Reporting

Status: drafted

## Story
As an admin, I want to track revenue from subscriptions and featured listings, so that I can monitor business performance.

## Acceptance Criteria

1. **Revenue Metrics**
   - Given payments processed (Story 8.7.1, 8.7.2)
   - When I access revenue dashboard (admin only)
   - Then I see:
     - Total revenue (all time)
     - MRR (Monthly Recurring Revenue)
     - Revenue by source (subscriptions, featured listings)
     - ARPU (Average Revenue Per User)
   - And metrics updated in real-time

2. **Subscription Metrics**
   - Given active subscriptions
   - When viewing subscription metrics
   - Then shows:
     - Active subscriptions by tier (FREE, BASIC, PRO, ENTERPRISE)
     - New subscriptions this month
     - Churned subscriptions this month
     - Conversion rate (trial to paid)
     - Retention rate
   - And displayed as charts

3. **Revenue Trends**
   - Given historical revenue data
   - When viewing trends
   - Then shows:
     - Last 12 months revenue chart (bar chart)
     - Month-over-month growth rate
     - Year-over-year comparison
     - Revenue forecast (next 3 months)
   - And interactive chart with drill-down

4. **Top Customers**
   - Given customer transactions
   - When viewing top customers
   - Then shows top 10 by:
     - Highest lifetime value (LTV)
     - Most active (transaction count)
     - Recent high-value transactions
   - And displays customer details

5. **Date Range Filters**
   - Given date range options
   - When selecting filter
   - Then can filter by:
     - This month
     - Last 3 months
     - Last 6 months
     - Last 12 months
     - Custom range
   - And updates all metrics

6. **Export Reports**
   - Given revenue data
   - When exporting
   - Then can export to:
     - CSV (raw data)
     - PDF (formatted report with charts)
   - And includes all filtered data
   - And timestamp on report

7. **Transaction History**
   - Given all transactions
   - When viewing history
   - Then shows detailed list with:
     - Date, user, amount, tier, status
     - Payment method
     - Transaction ID
     - Refund status
   - And searchable and filterable
   - And paginated (50 per page)

8. **Admin Permissions**
   - Given user role
   - When accessing revenue dashboard
   - Then only admins can access
   - And non-admins see 403 error
   - And audit log records access

## Tasks / Subtasks

- [ ] **Task 1: Create RevenueMetrics Entity** (AC: #1, #2)
  - [ ] Define entity:
    ```typescript
    @Entity()
    export class RevenueMetrics {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column('date')
      month: Date;

      @Column('decimal', { precision: 10, scale: 2 })
      totalRevenue: number;

      @Column('decimal', { precision: 10, scale: 2 })
      subscriptionRevenue: number;

      @Column('decimal', { precision: 10, scale: 2 })
      featuredRevenue: number;

      @Column('int')
      activeSubscriptions: number;

      @Column('int')
      newSubscriptions: number;

      @Column('int')
      churnedSubscriptions: number;

      @Column('decimal', { precision: 5, scale: 2 })
      conversionRate: number;

      @Column('decimal', { precision: 5, scale: 2 })
      retentionRate: number;

      @Column('decimal', { precision: 10, scale: 2 })
      arpu: number;

      @CreateDateColumn()
      createdAt: Date;

      @UpdateDateColumn()
      updatedAt: Date;

      @Index(['month'], { unique: true })
      monthIndex: void;
    }
    ```

- [ ] **Task 2: Create Pre-compute Job** (AC: #1, #2, #3)
  - [ ] Implement monthly aggregation:
    ```typescript
    @Injectable()
    export class ComputeRevenueMetricsJob {
      constructor(
        private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
        private readonly publicUserService: PublicUserService,
        private readonly revenueMetricsRepository: Repository<RevenueMetrics>,
      ) {}

      @Cron('0 2 1 * *') // Monthly on 1st at 2 AM
      async computeMonthlyMetrics() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        lastMonth.setDate(1);
        lastMonth.setHours(0, 0, 0, 0);

        const thisMonth = new Date(lastMonth);
        thisMonth.setMonth(thisMonth.getMonth() + 1);

        // Total revenue
        const transactions = await this.paymentTransactionRepository.find({
          where: {
            status: 'SUCCESS',
            paidAt: Between(lastMonth, thisMonth),
          },
        });

        const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

        // Revenue by source
        const subscriptionRevenue = transactions
          .filter(t => t.tier)
          .reduce((sum, t) => sum + t.amount, 0);

        const featuredRevenue = totalRevenue - subscriptionRevenue;

        // Active subscriptions
        const activeSubscriptions = await this.publicUserService.count({
          where: {
            subscriptionTier: In(['BASIC', 'PRO', 'ENTERPRISE']),
            subscriptionExpiresAt: MoreThan(thisMonth),
          },
        });

        // New subscriptions
        const newSubscriptions = await this.publicUserService.count({
          where: {
            subscriptionUpdatedAt: Between(lastMonth, thisMonth),
            subscriptionTier: In(['BASIC', 'PRO', 'ENTERPRISE']),
          },
        });

        // Churned subscriptions
        const churnedSubscriptions = await this.publicUserService.count({
          where: {
            subscriptionExpiresAt: Between(lastMonth, thisMonth),
            subscriptionTier: 'FREE',
          },
        });

        // Conversion rate (simplified)
        const conversionRate = newSubscriptions > 0
          ? (newSubscriptions / (newSubscriptions + churnedSubscriptions)) * 100
          : 0;

        // Retention rate
        const retentionRate = activeSubscriptions > 0
          ? ((activeSubscriptions - churnedSubscriptions) / activeSubscriptions) * 100
          : 0;

        // ARPU
        const arpu = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

        // Upsert metrics
        await this.revenueMetricsRepository.upsert(
          {
            month: lastMonth,
            totalRevenue,
            subscriptionRevenue,
            featuredRevenue,
            activeSubscriptions,
            newSubscriptions,
            churnedSubscriptions,
            conversionRate,
            retentionRate,
            arpu,
          },
          ['month']
        );

        console.log(`Computed revenue metrics for ${lastMonth.toISOString()}`);
      }
    }
    ```

- [ ] **Task 3: Create getRevenueMetrics Query** (AC: #1, #2, #3, #5)
  - [ ] Implement resolver:
    ```typescript
    @Resolver()
    export class RevenueMetricsResolver {
      constructor(
        private readonly revenueMetricsRepository: Repository<RevenueMetrics>,
        private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
        private readonly publicUserService: PublicUserService,
      ) {}

      @Query(() => RevenueMetricsResponse)
      @UseGuards(AuthGuard, AdminGuard)
      async getRevenueMetrics(
        @CurrentUser() user: User,
        @Args('dateRange', { nullable: true }) dateRange?: string,
        @Args('startDate', { nullable: true }) startDate?: Date,
        @Args('endDate', { nullable: true }) endDate?: Date,
      ): Promise<RevenueMetricsResponse> {
        // Audit log
        await this.auditLog({
          action: 'REVENUE_METRICS_ACCESSED',
          userId: user.id,
          timestamp: new Date(),
        });

        // Get date range
        const { start, end } = this.getDateRange(dateRange, startDate, endDate);

        // Get metrics
        const metrics = await this.revenueMetricsRepository.find({
          where: {
            month: Between(start, end),
          },
          order: { month: 'DESC' },
        });

        // Calculate totals
        const totalRevenue = metrics.reduce((sum, m) => sum + m.totalRevenue, 0);
        const avgMRR = metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.totalRevenue, 0) / metrics.length
          : 0;

        // Revenue by source
        const subscriptionRevenue = metrics.reduce((sum, m) => sum + m.subscriptionRevenue, 0);
        const featuredRevenue = metrics.reduce((sum, m) => sum + m.featuredRevenue, 0);

        // Current ARPU
        const currentArpu = metrics[0]?.arpu || 0;

        // Subscription breakdown
        const subscriptionBreakdown = await this.getSubscriptionBreakdown();

        // Top customers
        const topCustomers = await this.getTopCustomers(start, end);

        // Growth rate
        const growthRate = this.calculateGrowthRate(metrics);

        return {
          overview: {
            totalRevenue,
            mrr: avgMRR,
            subscriptionRevenue,
            featuredRevenue,
            arpu: currentArpu,
          },
          subscriptionMetrics: {
            breakdown: subscriptionBreakdown,
            newThisMonth: metrics[0]?.newSubscriptions || 0,
            churnedThisMonth: metrics[0]?.churnedSubscriptions || 0,
            conversionRate: metrics[0]?.conversionRate || 0,
            retentionRate: metrics[0]?.retentionRate || 0,
          },
          trends: metrics.map(m => ({
            month: m.month,
            revenue: m.totalRevenue,
            subscriptions: m.activeSubscriptions,
          })),
          topCustomers,
          growthRate,
        };
      }

      private async getSubscriptionBreakdown() {
        const tiers = ['BASIC', 'PRO', 'ENTERPRISE'];
        const breakdown = await Promise.all(
          tiers.map(async (tier) => {
            const count = await this.publicUserService.count({
              where: {
                subscriptionTier: tier,
                subscriptionExpiresAt: MoreThan(new Date()),
              },
            });
            return { tier, count };
          })
        );
        return breakdown;
      }

      private async getTopCustomers(start: Date, end: Date) {
        const transactions = await this.paymentTransactionRepository
          .createQueryBuilder('t')
          .select('t.userId', 'userId')
          .addSelect('SUM(t.amount)', 'ltv')
          .addSelect('COUNT(*)', 'transactionCount')
          .where('t.status = :status', { status: 'SUCCESS' })
          .andWhere('t.paidAt BETWEEN :start AND :end', { start, end })
          .groupBy('t.userId')
          .orderBy('ltv', 'DESC')
          .limit(10)
          .getRawMany();

        return await Promise.all(
          transactions.map(async (t) => {
            const user = await this.publicUserService.findOne(t.userId);
            return {
              userId: t.userId,
              userName: user.fullName,
              email: user.email,
              ltv: parseFloat(t.ltv),
              transactionCount: parseInt(t.transactionCount),
            };
          })
        );
      }

      private calculateGrowthRate(metrics: RevenueMetrics[]): number {
        if (metrics.length < 2) return 0;
        const current = metrics[0].totalRevenue;
        const previous = metrics[1].totalRevenue;
        return previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }
    }
    ```

- [ ] **Task 4: Create Admin Guard** (AC: #8)
  - [ ] Implement guard:
    ```typescript
    @Injectable()
    export class AdminGuard implements CanActivate {
      canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.role !== 'ADMIN') {
          throw new ForbiddenException('Admin access required');
        }

        return true;
      }
    }
    ```

- [ ] **Task 5: Create Revenue Dashboard Component** (AC: #1, #2, #3)
  - [ ] Implement frontend:
    ```typescript
    const RevenueDashboard = () => {
      const [dateRange, setDateRange] = useState('12m');

      const { data: metrics, loading } = useQuery(GET_REVENUE_METRICS, {
        variables: { dateRange },
      });

      return (
        <div className="revenue-dashboard">
          <DashboardHeader>
            <h1>Revenue Dashboard</h1>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <ExportButton metrics={metrics} />
          </DashboardHeader>

          <RevenueOverview metrics={metrics?.overview} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <RevenueTrendsChart data={metrics?.trends} />
            <SubscriptionBreakdown data={metrics?.subscriptionMetrics} />
          </div>

          <TopCustomers customers={metrics?.topCustomers} />

          <TransactionHistory />
        </div>
      );
    };
    ```

- [ ] **Task 6: Create PDF Export** (AC: #6)
  - [ ] Implement PDF generation:
    ```typescript
    import PDFDocument from 'pdfkit';

    @Injectable()
    export class RevenueReportService {
      async generatePDFReport(metrics: RevenueMetricsResponse): Promise<Buffer> {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));

        // Header
        doc.fontSize(20).text('Revenue Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // Overview
        doc.fontSize(16).text('Overview');
        doc.fontSize(12);
        doc.text(`Total Revenue: ${metrics.overview.totalRevenue.toLocaleString()} VND`);
        doc.text(`MRR: ${metrics.overview.mrr.toLocaleString()} VND`);
        doc.text(`ARPU: ${metrics.overview.arpu.toLocaleString()} VND`);
        doc.moveDown();

        // Subscription Metrics
        doc.fontSize(16).text('Subscription Metrics');
        doc.fontSize(12);
        metrics.subscriptionMetrics.breakdown.forEach(b => {
          doc.text(`${b.tier}: ${b.count} active`);
        });
        doc.moveDown();

        // Top Customers
        doc.fontSize(16).text('Top Customers');
        doc.fontSize(12);
        metrics.topCustomers.forEach((c, i) => {
          doc.text(`${i + 1}. ${c.userName} - LTV: ${c.ltv.toLocaleString()} VND`);
        });

        doc.end();

        return new Promise((resolve) => {
          doc.on('end', () => resolve(Buffer.concat(chunks)));
        });
      }
    }
    ```

- [ ] **Task 7: Create Transaction History Component** (AC: #7)
  - [ ] Implement component:
    ```typescript
    const TransactionHistory = () => {
      const [filters, setFilters] = useState({ status: 'ALL', search: '' });
      const [page, setPage] = useState(1);

      const { data: transactions, loading } = useQuery(GET_TRANSACTIONS, {
        variables: { filters, page, limit: 50 },
      });

      return (
        <div className="transaction-history">
          <h2>Transaction History</h2>

          <TransactionFilters filters={filters} onChange={setFilters} />

          <table className="w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Amount</th>
                <th>Tier</th>
                <th>Method</th>
                <th>Status</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.items.map(t => (
                <tr key={t.id}>
                  <td>{new Date(t.paidAt).toLocaleDateString()}</td>
                  <td>{t.user.fullName}</td>
                  <td>{t.amount.toLocaleString()} VND</td>
                  <td>{t.tier}</td>
                  <td>{t.paymentMethod}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{t.transactionId}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={page}
            totalPages={transactions?.totalPages}
            onPageChange={setPage}
          />
        </div>
      );
    };
    ```

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test revenue computation
  - [ ] Test query resolver
  - [ ] Test admin guard
  - [ ] Test PDF generation
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Integration Testing**
  - [ ] Test complete dashboard flow
  - [ ] Test permissions
  - [ ] Test export functionality
  - [ ] Test transaction history

- [ ] **Task 10: Manual Testing**
  - [ ] Access as admin
  - [ ] Verify metrics accuracy
  - [ ] Export to CSV/PDF
  - [ ] Test permissions (non-admin)
  - [ ] Verify audit logging

## Dev Notes

### Architecture Context

**Revenue Tracking & Reporting**: Admin-only dashboard
- Pre-computed monthly metrics (background job)
- Real-time revenue overview
- Subscription metrics and breakdown
- Revenue trends (12 months)
- Top customers by LTV
- Transaction history
- CSV/PDF export
- Admin-only permissions
- Audit logging

**Key Design Decisions**:
- Monthly pre-computation for historical data
- Admin-only access with guard
- Audit log for access tracking
- PDF generation with charts
- Redis cache for performance
- Strict permissions enforcement

### Implementation Details

**Metrics Tracked**:
- Total revenue (all time)
- MRR (Monthly Recurring Revenue)
- Revenue by source (subscriptions, featured)
- ARPU (Average Revenue Per User)
- Active subscriptions by tier
- New/churned subscriptions
- Conversion rate
- Retention rate

**Date Ranges**:
- This month
- Last 3 months
- Last 6 months
- Last 12 months (default)
- Custom range

**Security**:
- Admin-only access (AdminGuard)
- Audit logging for all access
- 403 error for non-admins
- Financial data encryption

**Export Formats**:
- CSV: Raw transaction data
- PDF: Formatted report with charts

### Testing Strategy

**Unit Tests**: Revenue computation, query resolver, admin guard
**Integration Tests**: Complete flow, permissions
**Manual Tests**: Admin access, metrics accuracy, exports

### References

- [Epic 8.7](../real-estate-platform/epics.md#story-874-revenue-tracking-reporting)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md)
- [Story 8.7.1](./8-7-1-subscription-payment-integration.md) - Subscription Payment

### Success Criteria

**Definition of Done**:
- ✅ RevenueMetrics entity created
- ✅ Monthly pre-compute job working
- ✅ getRevenueMetrics query working
- ✅ Admin guard working
- ✅ Revenue overview working
- ✅ Subscription metrics working
- ✅ Revenue trends chart working
- ✅ Top customers section working
- ✅ Transaction history working
- ✅ CSV export working
- ✅ PDF export working
- ✅ Admin permissions working
- ✅ Audit logging working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 8 hours

## Dev Agent Record

### Context Reference
<!-- Story context XML will be added by story-context workflow -->

### Agent Model Used
<!-- To be filled by dev agent -->

### Debug Log References
<!-- To be filled by dev agent during implementation -->

### Completion Notes List
<!-- To be filled by dev agent after completion -->

### File List
<!-- To be filled by dev agent with NEW/MODIFIED/DELETED files -->
