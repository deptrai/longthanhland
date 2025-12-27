# Story 8.3.4: Listing Status Management

Status: drafted

## Story
As a seller, I want to manage my listing status, so that I can keep listings up-to-date.

## Acceptance Criteria

1. **Seller Dashboard View**
   - Given seller logged in
   - When accessing my listings dashboard
   - Then displays all my listings grouped by status:
     - DRAFT (can edit, delete, submit)
     - PENDING_REVIEW (can view, cannot edit)
     - APPROVED (can renew, mark sold, edit)
     - REJECTED (can view reason, edit, resubmit)
     - EXPIRED (can renew)
     - SOLD (view only)
   - And shows for each listing: title, status badge, price, location, views, inquiries, days remaining, actions
   - And sortable by: date created, price, views, status
   - And filterable by: status, propertyType

2. **Edit Listing (Requires Re-approval)**
   - Given APPROVED or REJECTED listing
   - When seller clicks Edit
   - Then opens edit form with current data
   - And allows editing all fields
   - And on save, status changes to DRAFT
   - And seller can submit for re-approval
   - And notification sent: "Listing edited, requires re-approval"

3. **Renew Listing (Extends Expiry)**
   - Given APPROVED listing near expiry or EXPIRED listing
   - When seller clicks Renew
   - Then extends `expiresAt` by subscription tier duration:
     - FREE: +30 days
     - BASIC: +60 days
     - PRO: +90 days
   - And status remains APPROVED (or changes from EXPIRED to APPROVED)
   - And notification sent: "Listing renewed until [date]"
   - And audit log created

4. **Mark as Sold**
   - Given APPROVED listing
   - When seller clicks "Mark as Sold"
   - Then confirmation modal displayed
   - And status changes to SOLD
   - And listing hidden from public browse
   - And seller can still view in dashboard
   - And notification sent: "Congratulations on your sale!"
   - And audit log created

5. **Delete Listing**
   - Given DRAFT or REJECTED listing
   - When seller clicks Delete
   - Then confirmation modal displayed
   - And listing permanently deleted
   - And images deleted from storage
   - And cannot be recovered

6. **Auto-expiry Background Job**
   - Given daily job runs at midnight
   - When job executes
   - Then finds all APPROVED listings where `expiresAt < now`
   - And changes status to EXPIRED
   - And sends notification to sellers
   - And logs count of expired listings

7. **Expiry Reminder Notifications**
   - Given APPROVED listings
   - When 3 days before expiry
   - Then sends reminder email to seller
   - And includes renew button/link
   - And shows current listing stats (views, inquiries)

## Tasks / Subtasks

- [ ] **Task 1: Create Update Listing Mutation** (AC: #2)
  - [ ] Create `updatePublicListing` mutation:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.EDIT_OWN_LISTING)
    @Mutation(() => PublicListing)
    async updatePublicListing(
      @Args('id') id: string,
      @Args('data') data: UpdatePublicListingInput,
      @CurrentUser() user: PublicUser,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      // Check ownership
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('You can only edit your own listings');
      }

      // Check if editable
      if (!['APPROVED', 'REJECTED', 'DRAFT'].includes(listing.status)) {
        throw new BadRequestException('Listing cannot be edited in current status');
      }

      // Update listing and change status to DRAFT
      const updated = await this.publicListingService.update(id, {
        ...data,
        status: 'DRAFT',
        approvedAt: null,
        rejectedReason: null,
      });

      // Notification
      await this.notificationService.send({
        userId: user.id,
        type: 'LISTING_EDITED',
        message: 'Listing edited. Submit for re-approval when ready.',
      });

      return updated;
    }
    ```

- [ ] **Task 2: Create Renew Listing Mutation** (AC: #3)
  - [ ] Create `renewPublicListing` mutation:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.EDIT_OWN_LISTING)
    @Mutation(() => PublicListing)
    async renewPublicListing(
      @Args('id') id: string,
      @CurrentUser() user: PublicUser,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      // Check ownership
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('You can only renew your own listings');
      }

      // Check if renewable
      if (!['APPROVED', 'EXPIRED'].includes(listing.status)) {
        throw new BadRequestException('Only approved or expired listings can be renewed');
      }

      // Get subscription tier duration
      const tierLimits = SUBSCRIPTION_TIERS[user.subscriptionTier];
      const daysToAdd = tierLimits.listingDurationDays;

      // Calculate new expiry
      const now = new Date();
      const currentExpiry = listing.expiresAt ? new Date(listing.expiresAt) : now;
      const newExpiry = new Date(Math.max(now.getTime(), currentExpiry.getTime()));
      newExpiry.setDate(newExpiry.getDate() + daysToAdd);

      // Update listing
      const updated = await this.publicListingService.update(id, {
        status: 'APPROVED',
        expiresAt: newExpiry,
      });

      // Notification
      await this.notificationService.send({
        userId: user.id,
        type: 'LISTING_RENEWED',
        message: `Listing renewed until ${format(newExpiry, 'dd/MM/yyyy')}`,
      });

      // Audit log
      await this.auditLogService.log({
        action: 'LISTING_RENEWED',
        userId: user.id,
        resourceId: id,
        metadata: { newExpiry },
      });

      return updated;
    }
    ```

- [ ] **Task 3: Create Mark as Sold Mutation** (AC: #4)
  - [ ] Create `markListingAsSold` mutation:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.EDIT_OWN_LISTING)
    @Mutation(() => PublicListing)
    async markListingAsSold(
      @Args('id') id: string,
      @CurrentUser() user: PublicUser,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      // Check ownership
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('You can only mark your own listings as sold');
      }

      // Check if can be marked as sold
      if (listing.status !== 'APPROVED') {
        throw new BadRequestException('Only approved listings can be marked as sold');
      }

      // Update status
      const updated = await this.publicListingService.update(id, {
        status: 'SOLD',
      });

      // Notification
      await this.notificationService.send({
        userId: user.id,
        type: 'LISTING_SOLD',
        message: 'Congratulations on your sale!',
      });

      // Audit log
      await this.auditLogService.log({
        action: 'LISTING_MARKED_SOLD',
        userId: user.id,
        resourceId: id,
      });

      return updated;
    }
    ```

- [ ] **Task 4: Create Delete Listing Mutation** (AC: #5)
  - [ ] Create `deletePublicListing` mutation:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.EDIT_OWN_LISTING)
    @Mutation(() => Boolean)
    async deletePublicListing(
      @Args('id') id: string,
      @CurrentUser() user: PublicUser,
    ): Promise<boolean> {
      const listing = await this.publicListingService.findOne(id);

      // Check ownership
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('You can only delete your own listings');
      }

      // Check if deletable
      if (!['DRAFT', 'REJECTED'].includes(listing.status)) {
        throw new BadRequestException('Only draft or rejected listings can be deleted');
      }

      // Delete images from storage
      if (listing.imageIds && listing.imageIds.length > 0) {
        for (const imageId of listing.imageIds) {
          await this.fileStorageService.delete(imageId);
        }
      }

      // Delete listing
      await this.publicListingService.delete(id);

      return true;
    }
    ```

- [ ] **Task 5: Create Seller Dashboard Component** (AC: #1)
  - [ ] Create `SellerDashboard` component:
    ```typescript
    const SellerDashboard = () => {
      const { user } = useAuth();
      const [statusFilter, setStatusFilter] = useState<string | null>(null);
      const [sortBy, setSortBy] = useState('createdAt');

      const { data, loading } = useQuery(GET_MY_LISTINGS, {
        variables: { ownerId: user.id, status: statusFilter, sortBy },
      });

      const [renewListing] = useMutation(RENEW_LISTING);
      const [markAsSold] = useMutation(MARK_AS_SOLD);
      const [deleteListing] = useMutation(DELETE_LISTING);

      const groupedListings = useMemo(() => {
        if (!data?.myListings) return {};

        return data.myListings.reduce((acc, listing) => {
          const status = listing.status;
          if (!acc[status]) acc[status] = [];
          acc[status].push(listing);
          return acc;
        }, {});
      }, [data]);

      const handleRenew = async (id: string) => {
        try {
          await renewListing({ variables: { id } });
          toast.success('Listing renewed');
        } catch (error) {
          toast.error(error.message);
        }
      };

      const handleMarkSold = async (id: string) => {
        const confirmed = await confirm('Mark this listing as sold?');
        if (confirmed) {
          await markAsSold({ variables: { id } });
          toast.success('Listing marked as sold');
        }
      };

      const handleDelete = async (id: string) => {
        const confirmed = await confirm('Delete this listing? This cannot be undone.');
        if (confirmed) {
          await deleteListing({ variables: { id } });
          toast.success('Listing deleted');
        }
      };

      return (
        <div className="seller-dashboard">
          <Header>
            <h1>My Listings</h1>
            <Button onClick={() => navigate('/listings/new')}>
              Create New Listing
            </Button>
          </Header>

          <Filters>
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
            <SortSelect value={sortBy} onChange={setSortBy} />
          </Filters>

          <Stats listings={data?.myListings} />

          {Object.entries(groupedListings).map(([status, listings]) => (
            <ListingGroup key={status} status={status}>
              <h2>{status} ({listings.length})</h2>
              <ListingGrid>
                {listings.map(listing => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onEdit={() => navigate(`/listings/${listing.id}/edit`)}
                    onRenew={() => handleRenew(listing.id)}
                    onMarkSold={() => handleMarkSold(listing.id)}
                    onDelete={() => handleDelete(listing.id)}
                  />
                ))}
              </ListingGrid>
            </ListingGroup>
          ))}
        </div>
      );
    };
    ```

- [ ] **Task 6: Create Listing Card with Actions** (AC: #1)
  - [ ] Display listing info: title, price, location, status badge
  - [ ] Show stats: views, inquiries, days remaining
  - [ ] Add action buttons based on status:
    - DRAFT: Edit, Delete, Submit
    - PENDING_REVIEW: View only
    - APPROVED: Edit, Renew, Mark Sold
    - REJECTED: View Reason, Edit, Delete
    - EXPIRED: Renew, Delete
    - SOLD: View only

- [ ] **Task 7: Create Auto-expiry Background Job** (AC: #6)
  - [ ] Create `ExpireListingsJob`:
    ```typescript
    @Injectable()
    export class ExpireListingsJob {
      constructor(
        private readonly publicListingService: PublicListingService,
        private readonly notificationService: NotificationService,
      ) {}

      @Cron('0 0 * * *') // Daily at midnight
      async handleExpiredListings() {
        const now = new Date();

        // Find expired listings
        const expiredListings = await this.publicListingService.findExpired(now);

        console.log(`Found ${expiredListings.length} expired listings`);

        for (const listing of expiredListings) {
          // Update status
          await this.publicListingService.update(listing.id, {
            status: 'EXPIRED',
          });

          // Notify seller
          await this.notificationService.send({
            userId: listing.ownerId,
            type: 'LISTING_EXPIRED',
            message: `Your listing "${listing.title}" has expired. Renew it to make it visible again.`,
            metadata: { listingId: listing.id },
          });
        }

        console.log(`Expired ${expiredListings.length} listings`);
      }
    }
    ```
  - [ ] Register job in module
  - [ ] Add logging for monitoring

- [ ] **Task 8: Create Expiry Reminder Job** (AC: #7)
  - [ ] Create `ExpiryReminderJob`:
    ```typescript
    @Injectable()
    export class ExpiryReminderJob {
      @Cron('0 9 * * *') // Daily at 9 AM
      async sendExpiryReminders() {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        // Find listings expiring in 3 days
        const expiringListings = await this.publicListingService.findExpiringBetween(
          new Date(),
          threeDaysFromNow
        );

        for (const listing of expiringListings) {
          const seller = await this.publicUserService.findOne(listing.ownerId);

          await this.emailService.send({
            to: seller.email,
            subject: 'Your listing is expiring soon',
            template: 'listing-expiry-reminder',
            context: {
              sellerName: seller.fullName,
              listingTitle: listing.title,
              expiryDate: format(listing.expiresAt, 'dd/MM/yyyy'),
              daysRemaining: 3,
              viewCount: listing.viewCount,
              contactCount: listing.contactCount,
              renewUrl: `${process.env.PUBLIC_URL}/listings/${listing.id}/renew`,
            },
          });
        }

        console.log(`Sent ${expiringListings.length} expiry reminders`);
      }
    }
    ```

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test update mutation with ownership check
  - [ ] Test renew mutation with expiry calculation
  - [ ] Test mark as sold mutation
  - [ ] Test delete mutation with image cleanup
  - [ ] Test auto-expiry job logic
  - [ ] Test expiry reminder job
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete edit and resubmit flow
  - [ ] Test renew listing flow
  - [ ] Test mark as sold flow
  - [ ] Test delete listing with images
  - [ ] Test auto-expiry job execution
  - [ ] Test expiry reminder emails sent

- [ ] **Task 11: Manual Testing**
  - [ ] Edit approved listing (verify status changes to DRAFT)
  - [ ] Renew expiring listing (verify new expiry date)
  - [ ] Mark listing as sold (verify hidden from public)
  - [ ] Delete draft listing (verify images deleted)
  - [ ] Wait for auto-expiry job (or trigger manually)
  - [ ] Verify expiry reminder emails received

## Dev Notes

### Architecture Context

**Status Management Pattern**: Seller-controlled lifecycle
- Sellers can edit, renew, mark sold, delete own listings
- Status transitions follow business rules
- Background jobs handle auto-expiry and reminders
- Audit trail maintained

**Key Design Decisions**:
- Edit requires re-approval (quality control)
- Renew extends by subscription tier duration
- Only DRAFT/REJECTED can be deleted
- Auto-expiry runs daily at midnight
- Reminders sent 3 days before expiry

### Implementation Details

**Status Transition Rules**:
```
DRAFT → PENDING_REVIEW (submit)
APPROVED → DRAFT (edit)
APPROVED → SOLD (mark sold)
APPROVED → EXPIRED (auto, daily job)
EXPIRED → APPROVED (renew)
REJECTED → DRAFT (edit)
```

**Renew Duration**:
- FREE: +30 days
- BASIC: +60 days
- PRO: +90 days
- ENTERPRISE: Custom

**Background Jobs**:
- `ExpireListingsJob`: Daily at midnight (00:00)
- `ExpiryReminderJob`: Daily at 9 AM (09:00)

### Testing Strategy

**Unit Tests**: Mutation logic, ownership checks, expiry calculations
**Integration Tests**: End-to-end status management flows
**Manual Tests**: UI interactions, job execution, email delivery

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-834-listing-status-management)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3

### Success Criteria

**Definition of Done**:
- ✅ Seller dashboard displaying all listings
- ✅ Update listing mutation working
- ✅ Renew listing mutation working
- ✅ Mark as sold mutation working
- ✅ Delete listing mutation working
- ✅ Auto-expiry job running daily
- ✅ Expiry reminder job running daily
- ✅ Notifications sent correctly
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
