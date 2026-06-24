# Story 8.4.5: Display Trust Score & Research Results

Status: drafted

## Story
As a buyer, I want to see trust score and AI research results, so that I can make informed decisions.

## Acceptance Criteria

1. **Trust Score Badge Display**
   - Given trust score calculated (Story 8.4.4)
   - When I view listing detail
   - Then I see trust score badge with:
     - Score number (0-100)
     - Color coding:
       - 80-100: Green (High Trust)
       - 50-79: Yellow (Medium Trust)
       - 0-49: Red (Low Trust)
     - Icon (shield)
     - Tooltip explaining score
   - And badge positioned prominently near listing title

2. **AI Research Summary**
   - Given AI research completed (Story 8.4.3)
   - When I view listing detail
   - Then I see research summary with:
     - Similar listings count (e.g., "12 similar listings found")
     - Price range (min, max, avg)
     - Market alignment (e.g., "Price is 5% below market average")
     - Research timestamp
   - And summary displayed in collapsible panel

3. **Warning Flags for Suspicious Patterns**
   - Given suspicious patterns detected
   - When I view listing detail
   - Then I see warning flags:
     - Price anomaly warning (if >30% deviation)
     - Duplicate image warning (if detected)
     - Spam keyword warning (if detected)
   - And warnings displayed with red alert icon
   - And warnings positioned above trust score

4. **Expandable Details Section**
   - Given "View Details" clicked
   - When expanded
   - Then I see:
     - **Trust Score Breakdown**: All 6 factors with points earned
     - **Similar Listings**: List of similar listings from other platforms
     - **Research Sources**: Sources checked (batdongsan, chottot)
     - **Confidence Score**: AI research confidence (0-100)
     - **Research Timestamp**: When research completed
   - And details displayed in modal or expandable panel
   - And can collapse details

5. **Similar Listings Links**
   - Given similar listings displayed
   - When I click on similar listing
   - Then opens in new tab
   - And links to original listing on external platform
   - And includes: title, price, location, source

6. **User-Friendly Format**
   - Given all information displayed
   - When rendered
   - Then uses:
     - Icons for visual clarity (shield, warning, check, etc.)
     - Color coding for quick assessment
     - Tooltips for explanations
     - Responsive layout (mobile, tablet, desktop)
   - And information easy to understand

## Tasks / Subtasks

- [ ] **Task 1: Create TrustScoreBadge Component** (AC: #1)
  - [ ] Create badge component:
    ```typescript
    const TrustScoreBadge = ({ score }: { score: number }) => {
      const getColorClass = (score: number): string => {
        if (score >= 80) return 'bg-green-500 text-white';
        if (score >= 50) return 'bg-yellow-500 text-white';
        return 'bg-red-500 text-white';
      };

      const getLabel = (score: number): string => {
        if (score >= 80) return 'High Trust';
        if (score >= 50) return 'Medium Trust';
        return 'Low Trust';
      };

      return (
        <Tooltip content="Trust score based on seller verification, listing quality, market data, and AI research">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getColorClass(score)}`}>
            <ShieldCheckIcon className="w-5 h-5" />
            <div>
              <div className="text-2xl font-bold">{score}</div>
              <div className="text-xs">{getLabel(score)}</div>
            </div>
          </div>
        </Tooltip>
      );
    };
    ```

- [ ] **Task 2: Create AIResearchPanel Component** (AC: #2, #3, #4)
  - [ ] Create research panel:
    ```typescript
    const AIResearchPanel = ({ listing }: { listing: PublicListing }) => {
      const [expanded, setExpanded] = useState(false);
      const { data: research } = useQuery(GET_AI_RESEARCH, {
        variables: { listingId: listing.id },
      });

      if (!research) return null;

      const { similarListingsFound, priceRange, confidenceScore, completedAt } = research;

      // Calculate market alignment
      const priceDeviation = priceRange.avg > 0
        ? ((listing.price - priceRange.avg) / priceRange.avg) * 100
        : 0;

      return (
        <div className="ai-research-panel border rounded-lg p-4 mt-4">
          {/* Warning Flags */}
          {research.duplicateDetected && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangleIcon className="w-5 h-5" />
              <span>Duplicate images detected in other listings</span>
            </Alert>
          )}

          {Math.abs(priceDeviation) > 30 && (
            <Alert variant="warning" className="mb-4">
              <AlertTriangleIcon className="w-5 h-5" />
              <span>
                Price is {Math.abs(priceDeviation).toFixed(0)}%
                {priceDeviation < 0 ? ' below' : ' above'} market average
              </span>
            </Alert>
          )}

          {/* Summary */}
          <div className="summary">
            <h3 className="text-lg font-semibold mb-2">AI Research Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Similar Listings</div>
                <div className="text-lg font-semibold">
                  {similarListingsFound.length} found
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Price Range</div>
                <div className="text-lg font-semibold">
                  {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Market Average</div>
                <div className="text-lg font-semibold">
                  {formatPrice(priceRange.avg)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Confidence Score</div>
                <div className="text-lg font-semibold">{confidenceScore}/100</div>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-blue-600 hover:underline flex items-center gap-2"
          >
            {expanded ? 'Hide Details' : 'View Details'}
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {expanded && (
            <div className="details mt-4 space-y-4">
              {/* Trust Score Breakdown */}
              <TrustScoreBreakdown breakdown={listing.trustScoreBreakdown} />

              {/* Similar Listings */}
              <SimilarListingsSection listings={similarListingsFound} />

              {/* Research Metadata */}
              <div className="text-sm text-gray-600">
                Research completed: {format(completedAt, 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          )}
        </div>
      );
    };
    ```

- [ ] **Task 3: Create TrustScoreBreakdown Component** (AC: #4)
  - [ ] Display score breakdown:
    ```typescript
    const TrustScoreBreakdown = ({ breakdown }: { breakdown: any }) => {
      const factors = [
        { key: 'sellerVerification', label: 'Seller Verification', icon: UserCheckIcon },
        { key: 'listingCompleteness', label: 'Listing Completeness', icon: CheckCircleIcon },
        { key: 'marketAlignment', label: 'Market Alignment', icon: TrendingUpIcon },
        { key: 'researchValidation', label: 'Research Validation', icon: SearchIcon },
        { key: 'engagement', label: 'Engagement', icon: HeartIcon },
        { key: 'platformHistory', label: 'Platform History', icon: ClockIcon },
      ];

      return (
        <div className="trust-score-breakdown">
          <h4 className="font-semibold mb-3">Trust Score Breakdown</h4>
          <div className="space-y-2">
            {factors.map(({ key, label, icon: Icon }) => {
              const factor = breakdown[key];
              const percentage = (factor.points / factor.maxPoints) * 100;

              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{label}</span>
                      <span className="font-semibold">
                        {factor.points}/{factor.maxPoints}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {factor.details && (
                      <div className="text-xs text-gray-600 mt-1">
                        {factor.details.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };
    ```

- [ ] **Task 4: Create SimilarListingsSection Component** (AC: #5)
  - [ ] Display similar listings:
    ```typescript
    const SimilarListingsSection = ({ listings }: { listings: any[] }) => {
      if (!listings || listings.length === 0) return null;

      return (
        <div className="similar-listings">
          <h4 className="font-semibold mb-3">Similar Listings from Other Platforms</h4>
          <div className="space-y-3">
            {listings.slice(0, 5).map((listing, index) => (
              <a
                key={index}
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition"
              >
                {listing.images && listing.images[0] && (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{listing.title}</div>
                  <div className="text-sm text-gray-600">{listing.location}</div>
                  <div className="text-sm font-semibold text-blue-600">
                    {formatPrice(listing.price)}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {listing.source}
                </div>
                <ExternalLinkIcon className="w-4 h-4 text-gray-400" />
              </a>
            ))}
          </div>
          {listings.length > 5 && (
            <div className="text-sm text-gray-600 mt-2">
              +{listings.length - 5} more similar listings
            </div>
          )}
        </div>
      );
    };
    ```

- [ ] **Task 5: Create Warning Alert Component** (AC: #3)
  - [ ] Reusable alert component:
    ```typescript
    const Alert = ({
      variant,
      children
    }: {
      variant: 'warning' | 'error' | 'info';
      children: React.ReactNode
    }) => {
      const variantClasses = {
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
      };

      return (
        <div className={`flex items-center gap-3 p-3 border rounded-lg ${variantClasses[variant]}`}>
          {children}
        </div>
      );
    };
    ```

- [ ] **Task 6: Integrate Components into Listing Detail Page** (AC: #1, #2, #6)
  - [ ] Add to listing detail page:
    ```typescript
    const ListingDetailPage = ({ listing }: { listing: PublicListing }) => {
      return (
        <div className="listing-detail">
          {/* Existing content */}
          <div className="listing-header">
            <h1>{listing.title}</h1>
            {listing.trustScore && (
              <TrustScoreBadge score={listing.trustScore} />
            )}
          </div>

          {/* Existing content */}

          {/* AI Research Panel */}
          {listing.aiResearchCompleted && (
            <AIResearchPanel listing={listing} />
          )}

          {/* Rest of content */}
        </div>
      );
    };
    ```

- [ ] **Task 7: Add GraphQL Query for AI Research** (AC: #2)
  - [ ] Create query:
    ```typescript
    const GET_AI_RESEARCH = gql`
      query GetAIResearch($listingId: ID!) {
        aiResearchResult(listingId: $listingId) {
          sourcesChecked
          similarListingsFound
          priceRange
          duplicateDetected
          confidenceScore
          completedAt
        }
      }
    `;
    ```

- [ ] **Task 8: Add Tooltips and Help Text** (AC: #6)
  - [ ] Create tooltip component
  - [ ] Add tooltips to trust score badge
  - [ ] Add help text explaining each factor
  - [ ] Add info icons with explanations

- [ ] **Task 9: Responsive Design** (AC: #6)
  - [ ] Mobile layout (stack vertically)
  - [ ] Tablet layout (2-column grid)
  - [ ] Desktop layout (full grid)
  - [ ] Test on various screen sizes

- [ ] **Task 10: Create Unit Tests**
  - [ ] Test TrustScoreBadge color coding
  - [ ] Test AIResearchPanel expand/collapse
  - [ ] Test TrustScoreBreakdown rendering
  - [ ] Test SimilarListingsSection links
  - [ ] Achieve >80% coverage

- [ ] **Task 11: Integration Testing**
  - [ ] Test complete display flow
  - [ ] Test with various trust scores
  - [ ] Test with/without research data
  - [ ] Test warning flags display

- [ ] **Task 12: Manual Testing**
  - [ ] View listing with high trust score
  - [ ] View listing with low trust score
  - [ ] Expand/collapse details
  - [ ] Click similar listing links
  - [ ] Test on mobile device
  - [ ] Verify tooltips working

## Dev Notes

### Architecture Context

**Trust Score Display**: User-facing visualization
- Trust score badge with color coding
- AI research summary
- Warning flags for suspicious patterns
- Expandable details for transparency
- Similar listings with external links

**Key Design Decisions**:
- Color coding for quick assessment (green/yellow/red)
- Expandable details (avoid overwhelming)
- External links open in new tab
- Tooltips for explanations
- Responsive design (mobile-first)

### Implementation Details

**Color Coding**:
- 80-100: Green (High Trust)
- 50-79: Yellow (Medium Trust)
- 0-49: Red (Low Trust)

**Warning Flags**:
- Price anomaly (>30% deviation)
- Duplicate images detected
- Spam keywords detected
- Known scammer detected

**Trust Score Breakdown**:
- 6 factors displayed with progress bars
- Points earned / max points
- Details for each factor
- Icons for visual clarity

**Similar Listings**:
- Show top 5 similar listings
- Link to original listing (new tab)
- Display: image, title, price, location, source
- "+X more" indicator if >5 listings

### Testing Strategy

**Unit Tests**: Component rendering, color coding, expand/collapse
**Integration Tests**: Complete display flow with various data
**Manual Tests**: UI/UX verification, responsive design

### References

- [Epic 8.4](../real-estate-platform/epics.md#story-845-display-trust-score--research-results)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.6
- [Story 8.4.4](./8-4-4-trust-score-calculation.md) - Trust Score Calculation
- [Story 8.4.3](./8-4-3-ai-research-processing-storage.md) - AI Research

### Success Criteria

**Definition of Done**:
- ✅ Trust score badge displayed with color coding
- ✅ AI research summary displayed
- ✅ Warning flags displayed for suspicious patterns
- ✅ Expandable details section working
- ✅ Trust score breakdown displayed
- ✅ Similar listings displayed with links
- ✅ Tooltips and help text added
- ✅ Responsive design implemented
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 6 hours

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
