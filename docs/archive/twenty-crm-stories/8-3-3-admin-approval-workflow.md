# Story 8.3.3: Admin Approval Workflow

Status: drafted

## Story
As an admin, I want to review and approve/reject pending listings, so that we maintain quality and prevent spam.

## Acceptance Criteria

1. **Moderation Queue Display**
   - Given admin logged in
   - When accessing moderation queue
   - Then displays all PENDING_REVIEW listings with:
     - Listing preview (title, price, location, images)
     - Seller info (name, email, phone, responseRate)
     - Trust score badge (if calculated)
     - Spam score warning (if high)
     - Days pending
     - Approve/Reject buttons
   - And sorted by submission date (oldest first)
   - And paginated (20 per page)
   - And filterable by province, propertyType, trustScore

2. **Approve Listing**
   - Given pending listing selected
   - When admin clicks Approve
   - Then status changes to APPROVED
   - And `approvedAt` timestamp set to now
   - And `publishedAt` timestamp set to now
   - And `expiresAt` calculated based on seller's subscription tier
   - And seller notified via email
   - And listing appears in public browse
   - And audit log entry created

3. **Reject Listing with Reason**
   - Given pending listing selected
   - When admin clicks Reject
   - Then rejection reason modal displayed
   - And admin provides reason (required, max 500 chars)
   - And status changes to REJECTED
   - And `rejectedReason` saved
   - And seller notified via email with reason
   - And listing hidden from public
   - And audit log entry created

4. **Bulk Actions**
   - Given multiple listings selected
   - When bulk approve/reject clicked
   - Then confirmation modal displayed
   - And all selected listings processed
   - And notifications sent to all sellers
   - And success message shown with count
   - And queue refreshed

5. **Email Notifications**
   - Given listing approved/rejected
   - When status changed
   - Then email sent to seller with:
     - **Approved**: Congratulations message, listing URL, expiry date
     - **Rejected**: Reason, instructions to edit and resubmit, support contact
   - And email template uses seller's name
   - And email sent within 1 minute

6. **Admin Permissions**
   - Given user role
   - When accessing moderation queue
   - Then only admins can access
   - And returns 403 for non-admin users
   - And approve/reject mutations protected

## Tasks / Subtasks

- [ ] **Task 1: Create Approval Mutations** (AC: #2, #3)
  - [ ] Create `approvePublicListing` mutation:
    ```typescript
    @RequireRole('ADMIN')
    @Mutation(() => PublicListing)
    async approvePublicListing(
      @Args('id') id: string,
      @CurrentUser() admin: User,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      if (listing.status !== 'PENDING_REVIEW') {
        throw new BadRequestException('Listing is not pending review');
      }

      // Get seller's subscription tier
      const seller = await this.publicUserService.findOne(listing.ownerId);
      const tierLimits = SUBSCRIPTION_TIERS[seller.subscriptionTier];

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + tierLimits.listingDurationDays);

      // Update listing
      const updated = await this.publicListingService.update(id, {
        status: 'APPROVED',
        approvedAt: new Date(),
        publishedAt: new Date(),
        expiresAt,
      });

      // Send notification
      await this.notificationService.sendListingApproved(listing, seller);

      // Audit log
      await this.auditLogService.log({
        action: 'LISTING_APPROVED',
        userId: admin.id,
        resourceId: id,
        timestamp: new Date(),
      });

      return updated;
    }
    ```
  - [ ] Create `rejectPublicListing` mutation:
    ```typescript
    @RequireRole('ADMIN')
    @Mutation(() => PublicListing)
    async rejectPublicListing(
      @Args('id') id: string,
      @Args('reason') reason: string,
      @CurrentUser() admin: User,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(id);

      if (listing.status !== 'PENDING_REVIEW') {
        throw new BadRequestException('Listing is not pending review');
      }

      if (!reason || reason.length > 500) {
        throw new BadRequestException('Reason required (max 500 chars)');
      }

      // Update listing
      const updated = await this.publicListingService.update(id, {
        status: 'REJECTED',
        rejectedReason: reason,
      });

      // Get seller
      const seller = await this.publicUserService.findOne(listing.ownerId);

      // Send notification
      await this.notificationService.sendListingRejected(listing, seller, reason);

      // Audit log
      await this.auditLogService.log({
        action: 'LISTING_REJECTED',
        userId: admin.id,
        resourceId: id,
        metadata: { reason },
        timestamp: new Date(),
      });

      return updated;
    }
    ```

- [ ] **Task 2: Create Bulk Actions Mutations** (AC: #4)
  - [ ] Create `bulkApproveListings` mutation:
    ```typescript
    @RequireRole('ADMIN')
    @Mutation(() => BulkActionResult)
    async bulkApproveListings(
      @Args('ids', { type: () => [String] }) ids: string[],
      @CurrentUser() admin: User,
    ): Promise<BulkActionResult> {
      const results = { success: 0, failed: 0, errors: [] };

      for (const id of ids) {
        try {
          await this.approvePublicListing(id, admin);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({ id, error: error.message });
        }
      }

      return results;
    }
    ```
  - [ ] Create `bulkRejectListings` mutation with same pattern

- [ ] **Task 3: Create Moderation Queue Query** (AC: #1)
  - [ ] Create `getModerationQueue` query:
    ```typescript
    @RequireRole('ADMIN')
    @Query(() => ModerationQueueOutput)
    async getModerationQueue(
      @Args('filters', { nullable: true }) filters?: ModerationFilters,
      @Args('page', { defaultValue: 1 }) page: number,
      @Args('pageSize', { defaultValue: 20 }) pageSize: number,
    ): Promise<ModerationQueueOutput> {
      const queryBuilder = this.publicListingRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.owner', 'owner')
        .where('listing.status = :status', { status: 'PENDING_REVIEW' })
        .orderBy('listing.createdAt', 'ASC');

      // Apply filters
      if (filters?.province) {
        queryBuilder.andWhere('listing.province = :province', { province: filters.province });
      }

      if (filters?.propertyType) {
        queryBuilder.andWhere('listing.propertyType = :propertyType', { propertyType: filters.propertyType });
      }

      if (filters?.minTrustScore) {
        queryBuilder.andWhere('listing.trustScore >= :minTrustScore', { minTrustScore: filters.minTrustScore });
      }

      // Pagination
      const skip = (page - 1) * pageSize;
      queryBuilder.skip(skip).take(pageSize);

      const [listings, total] = await queryBuilder.getManyAndCount();

      return {
        listings,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }
    ```

- [ ] **Task 4: Create Moderation Queue Component** (AC: #1)
  - [ ] Create `ModerationQueue` component:
    ```typescript
    const ModerationQueue = () => {
      const [selectedIds, setSelectedIds] = useState<string[]>([]);
      const [filters, setFilters] = useState<ModerationFilters>({});
      const [page, setPage] = useState(1);

      const { data, loading, refetch } = useQuery(GET_MODERATION_QUEUE, {
        variables: { filters, page, pageSize: 20 },
      });

      const [approveListing] = useMutation(APPROVE_LISTING);
      const [rejectListing] = useMutation(REJECT_LISTING);
      const [bulkApprove] = useMutation(BULK_APPROVE_LISTINGS);
      const [bulkReject] = useMutation(BULK_REJECT_LISTINGS);

      const handleApprove = async (id: string) => {
        try {
          await approveListing({ variables: { id } });
          toast.success('Listing approved');
          refetch();
        } catch (error) {
          toast.error(error.message);
        }
      };

      const handleReject = async (id: string, reason: string) => {
        try {
          await rejectListing({ variables: { id, reason } });
          toast.success('Listing rejected');
          refetch();
        } catch (error) {
          toast.error(error.message);
        }
      };

      const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return;

        const confirmed = await confirm(
          `Approve ${selectedIds.length} listings?`
        );

        if (confirmed) {
          const result = await bulkApprove({ variables: { ids: selectedIds } });
          toast.success(`${result.data.bulkApproveListings.success} listings approved`);
          setSelectedIds([]);
          refetch();
        }
      };

      return (
        <div className="moderation-queue">
          <Header>
            <h1>Moderation Queue</h1>
            <Stats total={data?.getModerationQueue.total} />
          </Header>

          <Filters filters={filters} onChange={setFilters} />

          <BulkActions
            selectedCount={selectedIds.length}
            onApprove={handleBulkApprove}
            onReject={() => {/* bulk reject */}}
          />

          <ListingGrid>
            {data?.getModerationQueue.listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                selected={selectedIds.includes(listing.id)}
                onSelect={(id) => toggleSelection(id)}
                onApprove={() => handleApprove(listing.id)}
                onReject={(reason) => handleReject(listing.id, reason)}
              />
            ))}
          </ListingGrid>

          <Pagination
            page={page}
            totalPages={data?.getModerationQueue.totalPages}
            onChange={setPage}
          />
        </div>
      );
    };
    ```

- [ ] **Task 5: Create Listing Card Component** (AC: #1)
  - [ ] Display listing preview with images
  - [ ] Show seller info and stats
  - [ ] Display trust score badge
  - [ ] Show spam score warning if high
  - [ ] Add approve/reject buttons
  - [ ] Add checkbox for bulk selection

- [ ] **Task 6: Create Rejection Modal** (AC: #3)
  - [ ] Create `RejectionModal` component:
    ```typescript
    const RejectionModal = ({ listing, onConfirm, onCancel }) => {
      const [reason, setReason] = useState('');
      const [errors, setErrors] = useState<string[]>([]);

      const predefinedReasons = [
        'Incomplete information',
        'Suspicious pricing',
        'Poor quality images',
        'Duplicate listing',
        'Violates terms of service',
        'Other (specify below)',
      ];

      const handleSubmit = () => {
        if (!reason || reason.trim().length === 0) {
          setErrors(['Reason is required']);
          return;
        }

        if (reason.length > 500) {
          setErrors(['Reason too long (max 500 characters)']);
          return;
        }

        onConfirm(reason);
      };

      return (
        <Modal title="Reject Listing" onClose={onCancel}>
          <div className="rejection-modal">
            <p>You are about to reject: <strong>{listing.title}</strong></p>

            <div className="predefined-reasons">
              {predefinedReasons.map(r => (
                <Button
                  key={r}
                  variant="outline"
                  onClick={() => setReason(r)}
                >
                  {r}
                </Button>
              ))}
            </div>

            <Textarea
              label="Rejection Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed reason for rejection..."
              rows={4}
              maxLength={500}
              error={errors[0]}
            />

            <div className="actions">
              <Button onClick={onCancel}>Cancel</Button>
              <Button variant="danger" onClick={handleSubmit}>
                Reject Listing
              </Button>
            </div>
          </div>
        </Modal>
      );
    };
    ```

- [ ] **Task 7: Implement Notification Service** (AC: #5)
  - [ ] Create email templates:
    ```typescript
    // templates/listing-approved.html
    <h1>Congratulations! Your listing has been approved</h1>
    <p>Hi {{sellerName}},</p>
    <p>Your listing "<strong>{{listingTitle}}</strong>" has been approved and is now live on our marketplace!</p>
    <p><a href="{{listingUrl}}">View your listing</a></p>
    <p>Your listing will expire on <strong>{{expiryDate}}</strong>. You can renew it before expiry.</p>
    ```
  - [ ] Create `NotificationService.sendListingApproved()`:
    ```typescript
    async sendListingApproved(listing: PublicListing, seller: PublicUser) {
      await this.emailService.send({
        to: seller.email,
        subject: 'Your listing has been approved!',
        template: 'listing-approved',
        context: {
          sellerName: seller.fullName,
          listingTitle: listing.title,
          listingUrl: `${process.env.PUBLIC_URL}/listings/${listing.id}`,
          expiryDate: format(listing.expiresAt, 'dd/MM/yyyy'),
        },
      });
    }
    ```
  - [ ] Create `NotificationService.sendListingRejected()` with similar pattern

- [ ] **Task 8: Add Admin Permission Guards** (AC: #6)
  - [ ] Create `@RequireRole('ADMIN')` decorator
  - [ ] Apply to all moderation mutations and queries
  - [ ] Return 403 for non-admin users
  - [ ] Add frontend route protection

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test approve mutation
  - [ ] Test reject mutation with reason validation
  - [ ] Test bulk actions
  - [ ] Test permission guards
  - [ ] Test notification sending
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete approval flow
  - [ ] Test complete rejection flow
  - [ ] Test bulk operations
  - [ ] Test email notifications sent
  - [ ] Test audit logging

- [ ] **Task 11: Manual Testing**
  - [ ] Approve listing as admin
  - [ ] Reject listing with reason
  - [ ] Bulk approve multiple listings
  - [ ] Verify emails received
  - [ ] Test as non-admin (should be blocked)
  - [ ] Check audit logs

## Dev Notes

### Architecture Context

**Admin Workflow Pattern**: Queue-based moderation
- Pending listings displayed in queue
- Admin reviews and approves/rejects
- Notifications sent automatically
- Audit trail maintained

**Key Design Decisions**:
- Only admins can access moderation queue
- Rejection requires reason (max 500 chars)
- Bulk actions for efficiency
- Email notifications within 1 minute
- Audit log for compliance

### Implementation Details

**Status Transitions**:
```
PENDING_REVIEW → APPROVED (admin approves)
PENDING_REVIEW → REJECTED (admin rejects)
```

**Expiry Calculation**:
- FREE: +30 days from approval
- BASIC: +60 days from approval
- PRO: +90 days from approval
- ENTERPRISE: Custom

**Email Templates**:
- Approved: Congratulations + listing URL + expiry date
- Rejected: Reason + edit instructions + support contact

### Testing Strategy

**Unit Tests**: Mutation logic, permission guards, notification service
**Integration Tests**: End-to-end approval/rejection flows
**Manual Tests**: UI interactions, email delivery, bulk actions

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-833-admin-approval-workflow)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3

### Success Criteria

**Definition of Done**:
- ✅ Moderation queue displaying pending listings
- ✅ Approve mutation working
- ✅ Reject mutation with reason working
- ✅ Bulk actions working
- ✅ Email notifications sent
- ✅ Admin permissions enforced
- ✅ Audit logging implemented
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
