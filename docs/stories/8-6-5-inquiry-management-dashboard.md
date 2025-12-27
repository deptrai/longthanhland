# Story 8.6.5: Inquiry Management Dashboard

Status: drafted

## Story
As a seller, I want to view and manage inquiries about my listings, so that I can respond to buyers.

## Acceptance Criteria

1. **Dashboard View**
   - Given seller logged in
   - When accessing inquiry dashboard
   - Then sees list of all inquiries for their listings with:
     - Listing title and thumbnail
     - Inquiry message (truncated)
     - Contact info (name, phone, email)
     - Timestamp (relative: "2 hours ago")
     - Status badge (NEW/CONTACTED/CLOSED)
     - Actions: View details, Mark contacted, Mark closed, Add notes
   - And paginated (20 per page)
   - And responsive design (mobile-friendly)

2. **Filters**
   - Given inquiries displayed
   - When applying filters
   - Then can filter by:
     - Status: All, NEW, CONTACTED, CLOSED
     - Listing: Dropdown of seller's listings
     - Search: Contact name, phone, or message text
   - And filters applied immediately
   - And filter state persisted in URL

3. **Sorting**
   - Given inquiries displayed
   - When sorting
   - Then can sort by:
     - Date (newest first - default)
     - Date (oldest first)
     - Status (NEW first)
   - And sort order persisted

4. **NEW Inquiries Highlighting**
   - Given NEW inquiries exist
   - When displayed
   - Then highlighted with:
     - Blue border
     - "NEW" badge
     - Bold text
   - And count shown in header

5. **Statistics Dashboard**
   - Given inquiries exist
   - When viewing statistics
   - Then shows:
     - Total inquiries (all time)
     - New inquiries (last 24h)
     - Response rate (% contacted within 24h)
     - Average response time
     - Inquiries by listing (chart)
   - And updated in real-time

6. **Real-time Updates**
   - Given dashboard open
   - When new inquiry received
   - Then dashboard updates automatically
   - And browser notification shown
   - And sound alert played (if enabled)

7. **Inquiry Actions**
   - Given inquiry selected
   - When taking action
   - Then can:
     - Mark as contacted (sets status, records timestamp)
     - Mark as closed (sets status, records timestamp)
     - Add notes (seller's private notes)
     - Click-to-call (if browser supports)
     - Send email (opens email client)
   - And actions reflected immediately

8. **Export Functionality**
   - Given inquiries displayed
   - When exporting
   - Then can export to CSV with:
     - All inquiry details
     - Filtered results only
     - Date range selection
   - And CSV downloaded

## Tasks / Subtasks

- [ ] **Task 1: Create Inquiry Dashboard Component** (AC: #1)
  - [ ] Create dashboard layout:
    ```typescript
    const InquiryDashboard = () => {
      const [filters, setFilters] = useState({
        status: 'ALL',
        listingId: null,
        search: '',
      });
      const [sortBy, setSortBy] = useState('date_desc');
      const [page, setPage] = useState(1);

      const { data: inquiries, loading } = useQuery(GET_MY_INQUIRIES, {
        variables: { filters, sortBy, page, limit: 20 },
      });

      const { data: stats } = useQuery(GET_INQUIRY_STATS);

      return (
        <div className="inquiry-dashboard">
          <DashboardHeader stats={stats} />

          <InquiryFilters
            filters={filters}
            onFilterChange={setFilters}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <InquiryList
            inquiries={inquiries?.items || []}
            loading={loading}
            onAction={handleAction}
          />

          <Pagination
            currentPage={page}
            totalPages={inquiries?.totalPages || 1}
            onPageChange={setPage}
          />
        </div>
      );
    };
    ```

- [ ] **Task 2: Create GraphQL Queries** (AC: #1, #5)
  - [ ] Define queries:
    ```typescript
    const GET_MY_INQUIRIES = gql`
      query GetMyInquiries(
        $filters: InquiryFilters
        $sortBy: String
        $page: Int
        $limit: Int
      ) {
        myInquiries(filters: $filters, sortBy: $sortBy, page: $page, limit: $limit) {
          items {
            id
            message
            contactPhone
            contactEmail
            preferredContact
            status
            createdAt
            respondedAt
            listing {
              id
              title
              imageIds
            }
            inquirer {
              id
              fullName
            }
            notes
          }
          totalPages
          totalCount
        }
      }
    `;

    const GET_INQUIRY_STATS = gql`
      query GetInquiryStats {
        myInquiryStats {
          totalInquiries
          newInquiries24h
          responseRate
          avgResponseTimeMs
          inquiriesByListing {
            listingId
            listingTitle
            count
          }
        }
      }
    `;
    ```

- [ ] **Task 3: Create Backend Resolver** (AC: #1, #5)
  - [ ] Implement resolver:
    ```typescript
    @Resolver()
    export class InquiryDashboardResolver {
      constructor(
        private readonly inquiryService: InquiryService,
        private readonly publicListingService: PublicListingService,
      ) {}

      @Query(() => InquiryListResponse)
      @UseGuards(AuthGuard)
      async myInquiries(
        @CurrentUser() user: PublicUser,
        @Args('filters', { nullable: true }) filters?: InquiryFilters,
        @Args('sortBy', { nullable: true }) sortBy?: string,
        @Args('page', { nullable: true }) page: number = 1,
        @Args('limit', { nullable: true }) limit: number = 20,
      ): Promise<InquiryListResponse> {
        // Get seller's listings
        const listings = await this.publicListingService.findByOwner(user.id);
        const listingIds = listings.map(l => l.id);

        // Build query
        const query = this.inquiryService.createQueryBuilder('inquiry')
          .leftJoinAndSelect('inquiry.listing', 'listing')
          .leftJoinAndSelect('inquiry.inquirer', 'inquirer')
          .where('inquiry.listingId IN (:...listingIds)', { listingIds });

        // Apply filters
        if (filters?.status && filters.status !== 'ALL') {
          query.andWhere('inquiry.status = :status', { status: filters.status });
        }

        if (filters?.listingId) {
          query.andWhere('inquiry.listingId = :listingId', { listingId: filters.listingId });
        }

        if (filters?.search) {
          query.andWhere(
            '(inquiry.contactPhone LIKE :search OR inquiry.contactEmail LIKE :search OR inquiry.message LIKE :search)',
            { search: `%${filters.search}%` }
          );
        }

        // Apply sorting
        switch (sortBy) {
          case 'date_asc':
            query.orderBy('inquiry.createdAt', 'ASC');
            break;
          case 'status':
            query.orderBy('inquiry.status', 'ASC').addOrderBy('inquiry.createdAt', 'DESC');
            break;
          default:
            query.orderBy('inquiry.createdAt', 'DESC');
        }

        // Pagination
        const totalCount = await query.getCount();
        const items = await query
          .skip((page - 1) * limit)
          .take(limit)
          .getMany();

        return {
          items,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
        };
      }

      @Query(() => InquiryStats)
      @UseGuards(AuthGuard)
      async myInquiryStats(@CurrentUser() user: PublicUser): Promise<InquiryStats> {
        const listings = await this.publicListingService.findByOwner(user.id);
        const listingIds = listings.map(l => l.id);

        const totalInquiries = await this.inquiryService.count({
          where: { listingId: In(listingIds) },
        });

        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newInquiries24h = await this.inquiryService.count({
          where: {
            listingId: In(listingIds),
            createdAt: MoreThan(last24h),
          },
        });

        // Calculate response rate
        const inquiriesLast24h = await this.inquiryService.find({
          where: {
            listingId: In(listingIds),
            createdAt: MoreThan(last24h),
          },
        });

        const contactedWithin24h = inquiriesLast24h.filter(
          i => i.respondedAt && (i.respondedAt.getTime() - i.createdAt.getTime()) <= 24 * 60 * 60 * 1000
        ).length;

        const responseRate = inquiriesLast24h.length > 0
          ? (contactedWithin24h / inquiriesLast24h.length) * 100
          : 0;

        // Calculate average response time
        const respondedInquiries = await this.inquiryService.find({
          where: {
            listingId: In(listingIds),
            respondedAt: Not(IsNull()),
          },
        });

        const avgResponseTimeMs = respondedInquiries.length > 0
          ? respondedInquiries.reduce(
              (sum, i) => sum + (i.respondedAt.getTime() - i.createdAt.getTime()),
              0
            ) / respondedInquiries.length
          : 0;

        // Inquiries by listing
        const inquiriesByListing = await Promise.all(
          listings.map(async (listing) => {
            const count = await this.inquiryService.count({
              where: { listingId: listing.id },
            });
            return {
              listingId: listing.id,
              listingTitle: listing.title,
              count,
            };
          })
        );

        return {
          totalInquiries,
          newInquiries24h,
          responseRate,
          avgResponseTimeMs,
          inquiriesByListing,
        };
      }
    }
    ```

- [ ] **Task 4: Create Mutations** (AC: #7)
  - [ ] Implement actions:
    ```typescript
    @Mutation(() => Inquiry)
    @UseGuards(AuthGuard)
    async updateInquiryStatus(
      @CurrentUser() user: PublicUser,
      @Args('inquiryId') inquiryId: string,
      @Args('status') status: string,
    ): Promise<Inquiry> {
      const inquiry = await this.inquiryService.findOne(inquiryId);

      // Verify ownership
      if (inquiry.listing.ownerId !== user.id) {
        throw new ForbiddenException('Not your inquiry');
      }

      const updates: any = { status };

      if (status === 'CONTACTED' && !inquiry.respondedAt) {
        updates.respondedAt = new Date();
      }

      if (status === 'CLOSED') {
        updates.closedAt = new Date();
      }

      return await this.inquiryService.update(inquiryId, updates);
    }

    @Mutation(() => Inquiry)
    @UseGuards(AuthGuard)
    async addInquiryNotes(
      @CurrentUser() user: PublicUser,
      @Args('inquiryId') inquiryId: string,
      @Args('notes') notes: string,
    ): Promise<Inquiry> {
      const inquiry = await this.inquiryService.findOne(inquiryId);

      // Verify ownership
      if (inquiry.listing.ownerId !== user.id) {
        throw new ForbiddenException('Not your inquiry');
      }

      return await this.inquiryService.update(inquiryId, { notes });
    }
    ```

- [ ] **Task 5: Implement Real-time Updates** (AC: #6)
  - [ ] Add WebSocket subscription:
    ```typescript
    const NEW_INQUIRY_SUBSCRIPTION = gql`
      subscription OnNewInquiry {
        newInquiry {
          id
          message
          contactPhone
          listing {
            id
            title
          }
          createdAt
        }
      }
    `;

    // In component
    const { data: newInquiry } = useSubscription(NEW_INQUIRY_SUBSCRIPTION);

    useEffect(() => {
      if (newInquiry) {
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification('New Inquiry', {
            body: `New inquiry for ${newInquiry.newInquiry.listing.title}`,
            icon: '/icon.png',
          });
        }

        // Play sound
        if (soundEnabled) {
          new Audio('/notification.mp3').play();
        }

        // Refresh list
        refetch();
      }
    }, [newInquiry]);
    ```

- [ ] **Task 6: Add Export Functionality** (AC: #8)
  - [ ] Implement CSV export:
    ```typescript
    const handleExport = async () => {
      const { data } = await exportInquiries({
        variables: { filters, sortBy },
      });

      const csv = convertToCSV(data.exportInquiries);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inquiries-${new Date().toISOString()}.csv`;
      link.click();
    };

    const convertToCSV = (inquiries: Inquiry[]): string => {
      const headers = ['Date', 'Listing', 'Contact', 'Phone', 'Email', 'Message', 'Status'];
      const rows = inquiries.map(i => [
        i.createdAt,
        i.listing.title,
        i.inquirer?.fullName || 'Anonymous',
        i.contactPhone,
        i.contactEmail || '',
        i.message,
        i.status,
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    };
    ```

- [ ] **Task 7: Create Unit Tests**
  - [ ] Test resolver queries
  - [ ] Test mutations
  - [ ] Test filters and sorting
  - [ ] Test statistics calculation
  - [ ] Achieve >80% coverage

- [ ] **Task 8: Integration Testing**
  - [ ] Test complete dashboard flow
  - [ ] Test real-time updates
  - [ ] Test export functionality
  - [ ] Test permissions

- [ ] **Task 9: Manual Testing**
  - [ ] View dashboard as seller
  - [ ] Apply filters and sorting
  - [ ] Mark inquiries as contacted/closed
  - [ ] Add notes
  - [ ] Test real-time updates
  - [ ] Export to CSV

## Dev Notes

### Architecture Context

**Inquiry Management Dashboard**: Seller interface
- List view with filters and sorting
- Real-time updates (WebSocket)
- Statistics dashboard
- Action buttons (mark contacted, close, add notes)
- Click-to-call and email integration
- CSV export
- Browser notifications

**Key Design Decisions**:
- Real-time updates via WebSocket subscriptions
- Browser notifications for new inquiries
- Responsive design (mobile-friendly)
- Filter state persisted in URL
- CSV export for record keeping
- Permission checks (only owner can view/manage)

### Implementation Details

**Filters**:
- Status: ALL, NEW, CONTACTED, CLOSED
- Listing: Dropdown of seller's listings
- Search: Contact name, phone, or message text

**Sorting**:
- Date (newest first - default)
- Date (oldest first)
- Status (NEW first)

**Statistics**:
- Total inquiries (all time)
- New inquiries (last 24h)
- Response rate (% contacted within 24h)
- Average response time
- Inquiries by listing (chart)

**Real-time Updates**:
- WebSocket subscription for new inquiries
- Browser notification with sound
- Auto-refresh list

### Testing Strategy

**Unit Tests**: Resolver queries, mutations, statistics
**Integration Tests**: Complete flow, real-time updates
**Manual Tests**: UI/UX verification, permissions

### References

- [Epic 8.6](../real-estate-platform/epics.md#story-865-inquiry-management-dashboard)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.8
- [Story 8.6.1](./8-6-1-inquiry-entity-crud.md) - Inquiry Entity

### Success Criteria

**Definition of Done**:
- ✅ Dashboard component created
- ✅ Inquiry list with pagination working
- ✅ Filters working (status, listing, search)
- ✅ Sorting working (date, status)
- ✅ NEW inquiries highlighted
- ✅ Statistics dashboard working
- ✅ Real-time updates working (WebSocket)
- ✅ Browser notifications working
- ✅ Actions working (mark contacted, close, add notes)
- ✅ Click-to-call and email integration working
- ✅ CSV export working
- ✅ Permission checks working
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
