# Story 8.7.3: Seller Analytics Dashboard

Status: drafted

## Story
As a seller, I want to view analytics about my listings, so that I can understand performance and optimize.

## Acceptance Criteria

1. **Overview Metrics**
   - Given listings with activity (Epic 8.3, 8.6)
   - When I navigate to analytics dashboard
   - Then I see:
     - Total listings (active count)
     - Total views (all time)
     - Total inquiries (all time)
     - Conversion rate (inquiries/views %)
     - Average response time (hours)
   - And metrics updated in real-time

2. **Listing Performance Table**
   - Given listings with metrics
   - When viewing table
   - Then shows each listing with:
     - Title and thumbnail
     - Views count
     - Inquiries count
     - Conversion rate
     - Response time
     - Featured status
   - And sortable by any column
   - And paginated (20 per page)

3. **Trends Chart**
   - Given activity over time
   - When viewing trends
   - Then shows line chart with:
     - Views over time (blue line)
     - Inquiries over time (green line)
     - Last 30 days by default
     - Daily data points
   - And interactive (hover for details)
   - And responsive (mobile-friendly)

4. **Top Performing Listings**
   - Given listings ranked by performance
   - When viewing top performers
   - Then shows top 5 listings by:
     - Most views
     - Most inquiries
     - Highest conversion rate
   - And displays as cards with key metrics

5. **Date Range Filters**
   - Given date range options
   - When selecting filter
   - Then can filter by:
     - Last 7 days
     - Last 30 days
     - Last 90 days
     - All time
     - Custom range (date picker)
   - And updates all metrics and charts

6. **CSV Export**
   - Given analytics data
   - When clicking export
   - Then downloads CSV with:
     - All listing metrics
     - Filtered date range
     - Timestamp
   - And formatted for Excel

7. **Listing Comparison**
   - Given multiple listings
   - When selecting comparison
   - Then can compare up to 3 listings side-by-side with:
     - All metrics
     - Trends chart overlay
     - Performance indicators
   - And highlights differences

## Tasks / Subtasks

- [ ] **Task 1: Create ListingAnalytics Entity** (AC: #1, #2)
  - [ ] Define entity:
    ```typescript
    @Entity()
    export class ListingAnalytics {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column('uuid')
      listingId: string;

      @Column('date')
      date: Date;

      @Column('int', { default: 0 })
      views: number;

      @Column('int', { default: 0 })
      inquiries: number;

      @Column('decimal', { precision: 5, scale: 2, default: 0 })
      conversionRate: number;

      @Column('int', { nullable: true })
      avgResponseTimeMs: number;

      @CreateDateColumn()
      createdAt: Date;

      @UpdateDateColumn()
      updatedAt: Date;

      @Index(['listingId', 'date'], { unique: true })
      listingDateIndex: void;
    }
    ```

- [ ] **Task 2: Create Pre-compute Job** (AC: #1, #2)
  - [ ] Implement daily aggregation:
    ```typescript
    @Injectable()
    export class ComputeListingAnalyticsJob {
      constructor(
        private readonly publicListingService: PublicListingService,
        private readonly inquiryService: InquiryService,
        private readonly analyticsRepository: Repository<ListingAnalytics>,
      ) {}

      @Cron('0 1 * * *') // Daily at 1 AM
      async computeDailyAnalytics() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date(yesterday);
        today.setDate(today.getDate() + 1);

        const listings = await this.publicListingService.findAll();

        for (const listing of listings) {
          // Count views
          const views = await this.analyticsService.count({
            event: 'listing_viewed',
            listingId: listing.id,
            timestamp: Between(yesterday, today),
          });

          // Count inquiries
          const inquiries = await this.inquiryService.count({
            where: {
              listingId: listing.id,
              createdAt: Between(yesterday, today),
            },
          });

          // Calculate conversion rate
          const conversionRate = views > 0 ? (inquiries / views) * 100 : 0;

          // Calculate avg response time
          const respondedInquiries = await this.inquiryService.find({
            where: {
              listingId: listing.id,
              createdAt: Between(yesterday, today),
              respondedAt: Not(IsNull()),
            },
          });

          const avgResponseTimeMs = respondedInquiries.length > 0
            ? respondedInquiries.reduce(
                (sum, i) => sum + (i.respondedAt.getTime() - i.createdAt.getTime()),
                0
              ) / respondedInquiries.length
            : null;

          // Upsert analytics
          await this.analyticsRepository.upsert(
            {
              listingId: listing.id,
              date: yesterday,
              views,
              inquiries,
              conversionRate,
              avgResponseTimeMs,
            },
            ['listingId', 'date']
          );
        }

        console.log(`Computed analytics for ${listings.length} listings`);
      }
    }
    ```

- [ ] **Task 3: Create getSellerAnalytics Query** (AC: #1, #2, #5)
  - [ ] Implement resolver:
    ```typescript
    @Resolver()
    export class SellerAnalyticsResolver {
      constructor(
        private readonly publicListingService: PublicListingService,
        private readonly analyticsRepository: Repository<ListingAnalytics>,
        private readonly cacheManager: Cache,
      ) {}

      @Query(() => SellerAnalytics)
      @UseGuards(AuthGuard)
      async getSellerAnalytics(
        @CurrentUser() user: PublicUser,
        @Args('dateRange', { nullable: true }) dateRange?: string,
        @Args('startDate', { nullable: true }) startDate?: Date,
        @Args('endDate', { nullable: true }) endDate?: Date,
      ): Promise<SellerAnalytics> {
        // Check cache
        const cacheKey = `seller_analytics:${user.id}:${dateRange || 'custom'}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;

        // Get date range
        const { start, end } = this.getDateRange(dateRange, startDate, endDate);

        // Get seller's listings
        const listings = await this.publicListingService.findByOwner(user.id);
        const listingIds = listings.map(l => l.id);

        // Get analytics
        const analytics = await this.analyticsRepository.find({
          where: {
            listingId: In(listingIds),
            date: Between(start, end),
          },
        });

        // Aggregate overview metrics
        const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);
        const totalInquiries = analytics.reduce((sum, a) => sum + a.inquiries, 0);
        const avgConversionRate = analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.length
          : 0;
        const avgResponseTime = analytics
          .filter(a => a.avgResponseTimeMs)
          .reduce((sum, a) => sum + a.avgResponseTimeMs, 0) / analytics.filter(a => a.avgResponseTimeMs).length;

        // Listing performance
        const listingPerformance = await this.getListingPerformance(listingIds, start, end);

        // Trends data
        const trends = await this.getTrendsData(listingIds, start, end);

        // Top performers
        const topPerformers = await this.getTopPerformers(listingPerformance);

        const result = {
          overview: {
            totalListings: listings.length,
            totalViews,
            totalInquiries,
            conversionRate: avgConversionRate,
            avgResponseTimeHours: avgResponseTime / (1000 * 60 * 60),
          },
          listingPerformance,
          trends,
          topPerformers,
        };

        // Cache for 1 hour
        await this.cacheManager.set(cacheKey, result, 3600);

        return result;
      }

      private getDateRange(dateRange: string, startDate?: Date, endDate?: Date) {
        const end = endDate || new Date();
        let start: Date;

        switch (dateRange) {
          case '7d':
            start = new Date(end);
            start.setDate(start.getDate() - 7);
            break;
          case '30d':
            start = new Date(end);
            start.setDate(start.getDate() - 30);
            break;
          case '90d':
            start = new Date(end);
            start.setDate(start.getDate() - 90);
            break;
          case 'all':
            start = new Date(0);
            break;
          default:
            start = startDate || new Date(end.setDate(end.getDate() - 30));
        }

        return { start, end };
      }
    }
    ```

- [ ] **Task 4: Create Analytics Dashboard Component** (AC: #1, #2, #3)
  - [ ] Implement frontend:
    ```typescript
    const SellerAnalyticsDashboard = () => {
      const [dateRange, setDateRange] = useState('30d');
      const [customRange, setCustomRange] = useState({ start: null, end: null });

      const { data: analytics, loading } = useQuery(GET_SELLER_ANALYTICS, {
        variables: {
          dateRange,
          startDate: customRange.start,
          endDate: customRange.end,
        },
      });

      return (
        <div className="analytics-dashboard">
          <DashboardHeader>
            <h1>Analytics Dashboard</h1>
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              onCustomRange={setCustomRange}
            />
            <ExportButton analytics={analytics} />
          </DashboardHeader>

          <OverviewMetrics metrics={analytics?.overview} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <TrendsChart data={analytics?.trends} />
            <TopPerformers listings={analytics?.topPerformers} />
          </div>

          <ListingPerformanceTable
            data={analytics?.listingPerformance}
            loading={loading}
          />
        </div>
      );
    };
    ```

- [ ] **Task 5: Create Trends Chart Component** (AC: #3)
  - [ ] Implement chart:
    ```typescript
    import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

    const TrendsChart = ({ data }: TrendsChartProps) => {
      return (
        <div className="trends-chart bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Views & Inquiries Trends</h3>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Views"
              />
              <Line
                type="monotone"
                dataKey="inquiries"
                stroke="#10b981"
                strokeWidth={2}
                name="Inquiries"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    };
    ```

- [ ] **Task 6: Create CSV Export** (AC: #6)
  - [ ] Implement export:
    ```typescript
    const handleExport = async () => {
      const csv = convertToCSV(analytics.listingPerformance);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${new Date().toISOString()}.csv`;
      link.click();
    };

    const convertToCSV = (data: ListingPerformance[]): string => {
      const headers = [
        'Listing Title',
        'Views',
        'Inquiries',
        'Conversion Rate (%)',
        'Avg Response Time (hours)',
        'Featured',
      ];

      const rows = data.map(item => [
        item.title,
        item.views,
        item.inquiries,
        item.conversionRate.toFixed(2),
        item.avgResponseTimeHours?.toFixed(2) || 'N/A',
        item.isFeatured ? 'Yes' : 'No',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    };
    ```

- [ ] **Task 7: Create Listing Comparison** (AC: #7)
  - [ ] Implement comparison:
    ```typescript
    const ListingComparison = ({ selectedListings }: ListingComparisonProps) => {
      const [compareIds, setCompareIds] = useState<string[]>([]);

      const { data: comparison } = useQuery(COMPARE_LISTINGS, {
        variables: { listingIds: compareIds },
        skip: compareIds.length === 0,
      });

      return (
        <div className="listing-comparison">
          <ListingSelector
            listings={selectedListings}
            selected={compareIds}
            onSelect={setCompareIds}
            max={3}
          />

          {comparison && (
            <div className="comparison-grid grid grid-cols-3 gap-4">
              {comparison.map(listing => (
                <ComparisonCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      );
    };
    ```

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test analytics computation
  - [ ] Test query resolver
  - [ ] Test date range filtering
  - [ ] Test caching
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Integration Testing**
  - [ ] Test complete dashboard flow
  - [ ] Test chart rendering
  - [ ] Test export functionality
  - [ ] Test comparison feature

- [ ] **Task 10: Manual Testing**
  - [ ] View analytics dashboard
  - [ ] Apply date filters
  - [ ] Export to CSV
  - [ ] Compare listings
  - [ ] Verify metrics accuracy

## Dev Notes

### Architecture Context

**Seller Analytics Dashboard**: Performance insights
- Pre-computed daily metrics (background job)
- Real-time overview metrics
- Interactive trends chart
- Listing performance table
- Top performers section
- CSV export
- Listing comparison (up to 3)
- 1-hour cache for performance

**Key Design Decisions**:
- Daily pre-computation for historical data
- Real-time aggregation for current day
- Redis cache (1 hour TTL)
- Responsive charts (Recharts library)
- CSV export for record keeping
- Comparison limited to 3 listings

### Implementation Details

**Metrics Tracked**:
- Views: Page impressions
- Inquiries: Contact form submissions
- Conversion rate: (inquiries/views) * 100
- Response time: Time to first response (hours)

**Date Ranges**:
- Last 7 days
- Last 30 days (default)
- Last 90 days
- All time
- Custom range (date picker)

**Charts**:
- Library: Recharts (React)
- Type: Line chart (views & inquiries)
- Responsive: Mobile-friendly
- Interactive: Hover tooltips

**Caching**:
- Key: `seller_analytics:{userId}:{dateRange}`
- TTL: 1 hour (3600 seconds)
- Storage: Redis

### Testing Strategy

**Unit Tests**: Analytics computation, query resolver, caching
**Integration Tests**: Complete flow, chart rendering
**Manual Tests**: UI/UX verification, metrics accuracy

### References

- [Epic 8.7](../real-estate-platform/epics.md#story-873-seller-analytics-dashboard)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md)
- [Story 8.7.2](./8-7-2-featured-listings-feature.md) - Featured Listings

### Success Criteria

**Definition of Done**:
- ✅ ListingAnalytics entity created
- ✅ Daily pre-compute job working
- ✅ getSellerAnalytics query working
- ✅ Overview metrics working
- ✅ Performance table working
- ✅ Trends chart working
- ✅ Top performers section working
- ✅ Date range filters working
- ✅ CSV export working
- ✅ Listing comparison working
- ✅ Caching working (1 hour)
- ✅ Responsive design working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 10 hours

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
