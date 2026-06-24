# Story 8.5.3: Content Moderation Queue

Status: drafted

## Story
As an admin, I want to review flagged listings in moderation queue, so that I can manually verify spam detection.

## Acceptance Criteria

1. **Moderation Queue View**
   - Given spam detection flags listings (Story 8.5.2)
   - When I access moderation queue
   - Then I see list of flagged listings with:
     - Sorted by spam score (highest first)
     - Listing details (title, price, location, owner)
     - Spam flags highlighted with color coding
     - Spam score breakdown (each check contribution)
     - Actions: Approve, Reject, Mark False Positive
   - And paginated (20 per page)
   - And filterable by spam score range, flag type

2. **Approve Flagged Listing**
   - Given listing selected from queue
   - When admin clicks Approve
   - Then spam flags cleared
   - And status changes to APPROVED
   - And listing published to public
   - And owner notified
   - And listing removed from moderation queue

3. **Reject Flagged Listing**
   - Given listing selected from queue
   - When admin clicks Reject
   - Then rejection reason modal displayed
   - And admin provides reason (required)
   - And status changes to REJECTED
   - And owner notified with reason
   - And listing removed from moderation queue

4. **Mark False Positive**
   - Given listing incorrectly flagged
   - When admin marks as false positive
   - Then spam flags cleared
   - And listing approved
   - And false positive recorded for feedback loop
   - And spam rules adjusted automatically:
     - If keyword false positive: reduce keyword weight
     - If duplicate false positive: increase similarity threshold
   - And feedback tracked in analytics

5. **Queue Statistics Dashboard**
   - Given queue accessed
   - When statistics displayed
   - Then shows:
     - Total flagged listings
     - Reviewed today count
     - Pending count
     - Average spam score
     - Most common flag types
   - And updated in real-time

6. **Bulk Actions**
   - Given multiple listings selected
   - When bulk action triggered
   - Then can approve/reject multiple at once
   - And confirmation modal shown
   - And actions applied to all selected
   - And notifications sent to all owners

7. **Queue Alerts**
   - Given queue size monitored
   - When pending count > 50
   - Then admin notified via email/Slack
   - And alert includes queue size and oldest pending item

## Tasks / Subtasks

- [ ] **Task 1: Create ModerationQueue Component** (AC: #1)
  - [ ] Create queue component:
    ```typescript
    const ModerationQueue = () => {
      const [selectedIds, setSelectedIds] = useState<string[]>([]);
      const [filters, setFilters] = useState({
        spamScoreMin: 40,
        spamScoreMax: 100,
        flagType: null,
      });

      const { data: flaggedListings, loading } = useQuery(GET_FLAGGED_LISTINGS, {
        variables: { filters, limit: 20, offset: 0 },
      });

      return (
        <div className="moderation-queue">
          <QueueStatistics />

          <div className="filters">
            <SpamScoreFilter value={filters} onChange={setFilters} />
            <FlagTypeFilter value={filters.flagType} onChange={(type) => setFilters({...filters, flagType: type})} />
          </div>

          <div className="bulk-actions">
            {selectedIds.length > 0 && (
              <>
                <Button onClick={() => handleBulkApprove(selectedIds)}>
                  Approve {selectedIds.length} listings
                </Button>
                <Button onClick={() => handleBulkReject(selectedIds)}>
                  Reject {selectedIds.length} listings
                </Button>
              </>
            )}
          </div>

          <div className="listings-grid">
            {flaggedListings?.map(listing => (
              <FlaggedListingCard
                key={listing.id}
                listing={listing}
                selected={selectedIds.includes(listing.id)}
                onSelect={(id) => toggleSelection(id)}
                onApprove={() => handleApprove(listing.id)}
                onReject={() => handleReject(listing.id)}
                onMarkFalsePositive={() => handleFalsePositive(listing.id)}
              />
            ))}
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 2: Create FlaggedListingCard Component** (AC: #1)
  - [ ] Display listing with spam flags:
    ```typescript
    const FlaggedListingCard = ({ listing, onApprove, onReject, onMarkFalsePositive }) => {
      return (
        <div className="flagged-listing-card border rounded-lg p-4">
          <div className="header flex justify-between">
            <div>
              <h3 className="font-semibold">{listing.title}</h3>
              <div className="text-sm text-gray-600">
                {listing.location} - {formatPrice(listing.price)} VNĐ
              </div>
            </div>
            <div className="spam-score">
              <SpamScoreBadge score={listing.spamScore} />
            </div>
          </div>

          <div className="spam-flags mt-3 space-y-2">
            {listing.spamFlags.map((flag, index) => (
              <SpamFlagItem key={index} flag={flag} />
            ))}
          </div>

          <div className="spam-breakdown mt-3">
            <SpamScoreBreakdown flags={listing.spamFlags} />
          </div>

          <div className="actions mt-4 flex gap-2">
            <Button variant="success" onClick={onApprove}>
              <CheckIcon className="w-4 h-4" />
              Approve
            </Button>
            <Button variant="danger" onClick={onReject}>
              <XIcon className="w-4 h-4" />
              Reject
            </Button>
            <Button variant="secondary" onClick={onMarkFalsePositive}>
              <FlagIcon className="w-4 h-4" />
              False Positive
            </Button>
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 3: Create SpamFlagItem Component** (AC: #1)
  - [ ] Display individual flag:
    ```typescript
    const SpamFlagItem = ({ flag }) => {
      const severityColors = {
        high: 'bg-red-100 border-red-300 text-red-800',
        medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        low: 'bg-gray-100 border-gray-300 text-gray-800',
      };

      return (
        <div className={`flex items-center gap-2 p-2 border rounded ${severityColors[flag.severity]}`}>
          <AlertTriangleIcon className="w-4 h-4" />
          <div className="flex-1">
            <div className="font-semibold text-sm">{flag.type}</div>
            <div className="text-xs">{flag.message}</div>
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 4: Create reviewSpamFlag Mutation** (AC: #2, #3, #4)
  - [ ] Backend mutation:
    ```typescript
    @Mutation(() => PublicListing)
    @RequireAdminPermission()
    async reviewSpamFlag(
      @Args('listingId') listingId: string,
      @Args('action') action: 'approve' | 'reject' | 'false_positive',
      @Args('reason', { nullable: true }) reason?: string,
    ): Promise<PublicListing> {
      const listing = await this.publicListingService.findOne(listingId);

      switch (action) {
        case 'approve':
          return await this.handleApprove(listing);

        case 'reject':
          if (!reason) throw new Error('Rejection reason required');
          return await this.handleReject(listing, reason);

        case 'false_positive':
          return await this.handleFalsePositive(listing);
      }
    }

    private async handleApprove(listing: PublicListing): Promise<PublicListing> {
      // Clear spam flags
      await this.publicListingService.update(listing.id, {
        spamScore: 0,
        spamFlags: [],
        status: 'APPROVED',
        publishedAt: new Date(),
      });

      // Notify owner
      await this.notificationService.sendListingApproved(listing);

      return listing;
    }

    private async handleReject(listing: PublicListing, reason: string): Promise<PublicListing> {
      await this.publicListingService.update(listing.id, {
        status: 'REJECTED',
        rejectedReason: reason,
      });

      // Notify owner
      await this.notificationService.sendListingRejected(listing, reason);

      return listing;
    }

    private async handleFalsePositive(listing: PublicListing): Promise<PublicListing> {
      // Record false positive
      await this.falsePositiveService.record({
        listingId: listing.id,
        spamFlags: listing.spamFlags,
        reviewedBy: this.currentUser.id,
        reviewedAt: new Date(),
      });

      // Adjust spam rules (feedback loop)
      await this.spamRuleService.adjustRulesBasedOnFalsePositive(listing.spamFlags);

      // Clear flags and approve
      await this.publicListingService.update(listing.id, {
        spamScore: 0,
        spamFlags: [],
        status: 'APPROVED',
        publishedAt: new Date(),
      });

      return listing;
    }
    ```

- [ ] **Task 5: Implement Feedback Loop** (AC: #4)
  - [ ] Adjust rules based on false positives:
    ```typescript
    @Injectable()
    export class SpamRuleService {
      async adjustRulesBasedOnFalsePositive(flags: SpamFlag[]): Promise<void> {
        for (const flag of flags) {
          switch (flag.type) {
            case 'SUSPICIOUS_KEYWORDS':
              // Reduce weight of flagged keywords
              const keywords = flag.details.keywords;
              for (const keyword of keywords) {
                await this.reduceKeywordWeight(keyword);
              }
              break;

            case 'DUPLICATE_CONTENT':
              // Increase similarity threshold
              await this.increaseSimilarityThreshold();
              break;

            case 'CONTACT_SPAM':
              // Increase phone/URL count threshold
              await this.increaseContactThreshold();
              break;

            // Handle other flag types
          }
        }

        // Log adjustment
        console.log(`Spam rules adjusted based on false positive feedback`);
      }

      private async reduceKeywordWeight(keyword: string): Promise<void> {
        // Reduce keyword weight by 20%
        const rule = await this.spamRuleRepository.findOne({
          where: { type: 'keyword', key: keyword },
        });

        if (rule) {
          rule.value.weight = Math.max(rule.value.weight * 0.8, 0.1);
          await this.spamRuleRepository.save(rule);
        }
      }

      private async increaseSimilarityThreshold(): Promise<void> {
        // Increase similarity threshold from 0.9 to 0.95
        const rule = await this.spamRuleRepository.findOne({
          where: { type: 'threshold', key: 'duplicate_similarity' },
        });

        if (rule) {
          rule.value = Math.min(rule.value + 0.05, 0.99);
          await this.spamRuleRepository.save(rule);
        }
      }
    }
    ```

- [ ] **Task 6: Create QueueStatistics Component** (AC: #5)
  - [ ] Display queue stats:
    ```typescript
    const QueueStatistics = () => {
      const { data: stats } = useQuery(GET_QUEUE_STATISTICS);

      return (
        <div className="queue-statistics grid grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Total Flagged"
            value={stats?.totalFlagged || 0}
            icon={FlagIcon}
          />
          <StatCard
            label="Reviewed Today"
            value={stats?.reviewedToday || 0}
            icon={CheckCircleIcon}
          />
          <StatCard
            label="Pending"
            value={stats?.pending || 0}
            icon={ClockIcon}
            alert={stats?.pending > 50}
          />
          <StatCard
            label="Avg Spam Score"
            value={stats?.avgSpamScore?.toFixed(0) || 0}
            icon={ShieldIcon}
          />
          <StatCard
            label="Most Common Flag"
            value={stats?.mostCommonFlag || 'N/A'}
            icon={AlertTriangleIcon}
          />
        </div>
      );
    };
    ```

- [ ] **Task 7: Implement Bulk Actions** (AC: #6)
  - [ ] Bulk approve/reject:
    ```typescript
    const handleBulkApprove = async (listingIds: string[]) => {
      const confirmed = await confirmDialog({
        title: 'Bulk Approve',
        message: `Are you sure you want to approve ${listingIds.length} listings?`,
      });

      if (!confirmed) return;

      await bulkReviewSpamFlags({
        variables: {
          listingIds,
          action: 'approve',
        },
      });

      toast.success(`${listingIds.length} listings approved`);
      setSelectedIds([]);
    };

    const handleBulkReject = async (listingIds: string[]) => {
      const reason = await promptDialog({
        title: 'Bulk Reject',
        message: 'Provide rejection reason:',
        required: true,
      });

      if (!reason) return;

      await bulkReviewSpamFlags({
        variables: {
          listingIds,
          action: 'reject',
          reason,
        },
      });

      toast.success(`${listingIds.length} listings rejected`);
      setSelectedIds([]);
    };
    ```

- [ ] **Task 8: Setup Queue Alerts** (AC: #7)
  - [ ] Monitor queue size:
    ```typescript
    @Injectable()
    export class QueueMonitoringService {
      @Cron('*/15 * * * *') // Every 15 minutes
      async checkQueueSize() {
        const pendingCount = await this.publicListingRepository.count({
          where: {
            spamScore: Between(40, 100),
            status: 'PENDING_REVIEW',
          },
        });

        if (pendingCount > 50) {
          const oldestPending = await this.publicListingRepository.findOne({
            where: {
              spamScore: Between(40, 100),
              status: 'PENDING_REVIEW',
            },
            order: { createdAt: 'ASC' },
          });

          await this.notificationService.sendAlert({
            type: 'MODERATION_QUEUE_ALERT',
            message: `Moderation queue has ${pendingCount} pending listings. Oldest: ${oldestPending?.createdAt}`,
            severity: 'high',
          });
        }
      }
    }
    ```

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test review mutations
  - [ ] Test feedback loop
  - [ ] Test bulk actions
  - [ ] Test queue statistics
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete review flow
  - [ ] Test false positive feedback
  - [ ] Test bulk operations
  - [ ] Test queue alerts

- [ ] **Task 11: Manual Testing**
  - [ ] Review flagged listings
  - [ ] Test approve/reject actions
  - [ ] Test false positive marking
  - [ ] Test bulk actions
  - [ ] Verify queue statistics
  - [ ] Test queue alerts

## Dev Notes

### Architecture Context

**Content Moderation Queue**: Admin interface for spam review
- Displays flagged listings (spam score 40-100)
- Spam flags highlighted with color coding
- Actions: Approve, Reject, Mark False Positive
- Feedback loop for continuous improvement
- Bulk actions for efficiency
- Queue statistics and alerts

**Key Design Decisions**:
- Similar UI to approval queue (consistency)
- Color-coded severity (high/medium/low)
- Feedback loop adjusts rules automatically
- Bulk actions with confirmation
- Real-time statistics
- Alerts when queue > 50 pending

### Implementation Details

**Queue Filtering**:
- Spam score range: 40-100 (medium to high)
- Flag type filter
- Sort by spam score (highest first)
- Pagination: 20 per page

**Feedback Loop**:
- False positive recorded
- Rules adjusted automatically:
  - Keyword: Reduce weight by 20%
  - Duplicate: Increase threshold by 0.05
  - Contact: Increase count threshold
- Tracked in analytics

**Queue Alerts**:
- Check every 15 minutes
- Alert if pending > 50
- Includes oldest pending item

### Testing Strategy

**Unit Tests**: Mutations, feedback loop, bulk actions
**Integration Tests**: Complete review flow, feedback
**Manual Tests**: UI/UX verification, bulk operations

### References

- [Epic 8.5](../real-estate-platform/epics.md#story-853-content-moderation-queue)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.7
- [Story 8.5.2](./8-5-2-spam-detection-filtering.md) - Spam Detection

### Success Criteria

**Definition of Done**:
- ✅ Moderation queue component created
- ✅ Spam flags displayed with highlighting
- ✅ Review mutations working (approve, reject, false positive)
- ✅ Feedback loop implemented
- ✅ Bulk actions working
- ✅ Queue statistics displayed
- ✅ Queue alerts working
- ✅ Admin permissions enforced
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
