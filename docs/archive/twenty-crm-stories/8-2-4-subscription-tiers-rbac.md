# Story 8.2.4: Subscription Tiers & RBAC

Status: drafted

## Story

As a developer,
I want to implement subscription tiers with role-based access control,
so that users have appropriate permissions based on their subscription level.

## Acceptance Criteria

1. **Subscription Tier Limits Defined & Enforced**
   - Given subscription tier system
   - When user has specific tier (FREE, BASIC, PRO, ENTERPRISE)
   - Then limits enforced:
     - **FREE**: 3 active listings max, 30 days duration, basic features
     - **BASIC**: 10 active listings max, 60 days duration, standard features
     - **PRO**: Unlimited listings, 90 days duration, premium features
     - **ENTERPRISE**: Custom limits, custom duration, all features
   - And limits checked before listing creation
   - And error returned if limit exceeded
   - And upgrade prompt shown to user

2. **RBAC Permissions System Implemented**
   - Given public user role system
   - When permissions defined
   - Then includes:
     - `browse_listings`: All users (anonymous + registered)
     - `view_listing_detail`: All users
     - `post_listing`: Registered verified users only
     - `edit_own_listing`: Registered users (own listings only)
     - `delete_own_listing`: Registered users (own listings only)
     - `send_inquiry`: All users
     - `save_favorites`: Registered users only
     - `view_analytics`: Registered users (own listings only)
     - `feature_listing`: PRO/ENTERPRISE users only
   - And permissions stored in database
   - And permissions checked on every protected operation

3. **Permission Decorators & Guards**
   - Given GraphQL resolvers
   - When protected operations defined
   - Then `@RequirePublicUserPermission(permission)` decorator applied
   - And decorator checks user authentication
   - And decorator checks user has required permission
   - And decorator checks subscription tier if needed
   - And returns 403 Forbidden if permission denied
   - And returns clear error message with upgrade path

4. **Subscription Limit Checks**
   - Given user attempts to create listing
   - When `createPublicListing` called
   - Then system checks current active listings count
   - And compares with subscription tier limit
   - And allows creation if under limit
   - And blocks creation if limit exceeded
   - And returns error with current usage and limit
   - And suggests upgrade to higher tier

5. **Tier-based Feature Access**
   - Given different subscription tiers
   - When user accesses features
   - Then feature availability determined by tier:
     - **FREE**: Basic listing, standard photos, basic search
     - **BASIC**: Priority support, enhanced photos, saved searches
     - **PRO**: Featured listings, analytics, API access, priority placement
     - **ENTERPRISE**: Custom branding, dedicated support, bulk operations, advanced analytics
   - And unavailable features show upgrade prompt
   - And feature flags checked in backend and frontend

## Tasks / Subtasks

- [ ] **Task 1: Define Subscription Tier Constants** (AC: #1)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/constants/subscription-tiers.ts`
  - [ ] Define tier limits:
    ```typescript
    export const SUBSCRIPTION_TIERS = {
      FREE: {
        name: 'Free',
        maxActiveListings: 3,
        listingDurationDays: 30,
        features: ['basic_listing', 'standard_photos', 'basic_search'],
        price: 0,
      },
      BASIC: {
        name: 'Basic',
        maxActiveListings: 10,
        listingDurationDays: 60,
        features: ['basic_listing', 'enhanced_photos', 'saved_searches', 'priority_support'],
        price: 99000, // VND per month
      },
      PRO: {
        name: 'Pro',
        maxActiveListings: -1, // unlimited
        listingDurationDays: 90,
        features: ['featured_listing', 'analytics', 'api_access', 'priority_placement', 'all_basic'],
        price: 299000, // VND per month
      },
      ENTERPRISE: {
        name: 'Enterprise',
        maxActiveListings: -1, // unlimited
        listingDurationDays: -1, // custom
        features: ['custom_branding', 'dedicated_support', 'bulk_operations', 'advanced_analytics', 'all_pro'],
        price: null, // custom pricing
      },
    };
    ```
  - [ ] Export helper functions:
    - `getTierLimits(tier: string)`
    - `canCreateListing(user: PublicUser, currentCount: number)`
    - `getTierFeatures(tier: string)`

- [ ] **Task 2: Define RBAC Permissions** (AC: #2)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/constants/permissions.ts`
  - [ ] Define permission constants:
    ```typescript
    export enum PublicUserPermission {
      BROWSE_LISTINGS = 'browse_listings',
      VIEW_LISTING_DETAIL = 'view_listing_detail',
      POST_LISTING = 'post_listing',
      EDIT_OWN_LISTING = 'edit_own_listing',
      DELETE_OWN_LISTING = 'delete_own_listing',
      SEND_INQUIRY = 'send_inquiry',
      SAVE_FAVORITES = 'save_favorites',
      VIEW_OWN_ANALYTICS = 'view_own_analytics',
      FEATURE_LISTING = 'feature_listing',
      ACCESS_API = 'access_api',
      BULK_OPERATIONS = 'bulk_operations',
    }
    ```
  - [ ] Define permission requirements:
    ```typescript
    export const PERMISSION_REQUIREMENTS = {
      [PublicUserPermission.BROWSE_LISTINGS]: {
        requiresAuth: false,
        requiresVerification: false,
        allowedTiers: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
      },
      [PublicUserPermission.POST_LISTING]: {
        requiresAuth: true,
        requiresVerification: true,
        allowedTiers: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'],
      },
      [PublicUserPermission.FEATURE_LISTING]: {
        requiresAuth: true,
        requiresVerification: true,
        allowedTiers: ['PRO', 'ENTERPRISE'],
      },
      // ... other permissions
    };
    ```

- [ ] **Task 3: Implement Permission Service** (AC: #2, #3)
  - [ ] Create `PublicUserPermissionService`:
    ```typescript
    @Injectable()
    export class PublicUserPermissionService {
      hasPermission(
        user: PublicUser | null,
        permission: PublicUserPermission
      ): boolean {
        const requirements = PERMISSION_REQUIREMENTS[permission];

        // Check authentication
        if (requirements.requiresAuth && !user) {
          return false;
        }

        // Check verification
        if (requirements.requiresVerification && user && !user.verified) {
          return false;
        }

        // Check subscription tier
        if (user && !requirements.allowedTiers.includes(user.subscriptionTier)) {
          return false;
        }

        return true;
      }

      checkPermissionOrThrow(user: PublicUser | null, permission: PublicUserPermission): void {
        if (!this.hasPermission(user, permission)) {
          throw new ForbiddenException({
            message: 'Insufficient permissions',
            permission,
            requiredTier: PERMISSION_REQUIREMENTS[permission].allowedTiers,
            currentTier: user?.subscriptionTier,
          });
        }
      }
    }
    ```

- [ ] **Task 4: Create Permission Decorator** (AC: #3)
  - [ ] Create `@RequirePublicUserPermission()` decorator:
    ```typescript
    export const RequirePublicUserPermission = (permission: PublicUserPermission) => {
      return applyDecorators(
        SetMetadata('permission', permission),
        UseGuards(PublicUserAuthGuard, PublicUserPermissionGuard),
      );
    };
    ```
  - [ ] Create `PublicUserPermissionGuard`:
    ```typescript
    @Injectable()
    export class PublicUserPermissionGuard implements CanActivate {
      constructor(
        private readonly reflector: Reflector,
        private readonly permissionService: PublicUserPermissionService,
      ) {}

      canActivate(context: ExecutionContext): boolean {
        const permission = this.reflector.get<PublicUserPermission>(
          'permission',
          context.getHandler(),
        );

        if (!permission) {
          return true;
        }

        const gqlContext = GqlExecutionContext.create(context);
        const { user } = gqlContext.getContext();

        this.permissionService.checkPermissionOrThrow(user, permission);
        return true;
      }
    }
    ```

- [ ] **Task 5: Implement Subscription Limit Checks** (AC: #4)
  - [ ] Create `SubscriptionLimitService`:
    ```typescript
    @Injectable()
    export class SubscriptionLimitService {
      async canCreateListing(userId: string): Promise<{
        allowed: boolean;
        currentCount: number;
        limit: number;
        tier: string;
      }> {
        const user = await this.publicUserService.findOne(userId);
        const tierLimits = SUBSCRIPTION_TIERS[user.subscriptionTier];

        // Count active listings
        const activeListings = await this.publicListingService.countActiveByUser(userId);

        // Check limit (-1 means unlimited)
        const allowed = tierLimits.maxActiveListings === -1 ||
                       activeListings < tierLimits.maxActiveListings;

        return {
          allowed,
          currentCount: activeListings,
          limit: tierLimits.maxActiveListings,
          tier: user.subscriptionTier,
        };
      }

      async checkLimitOrThrow(userId: string): Promise<void> {
        const check = await this.canCreateListing(userId);

        if (!check.allowed) {
          throw new ForbiddenException({
            message: `Listing limit reached for ${check.tier} tier`,
            currentCount: check.currentCount,
            limit: check.limit,
            tier: check.tier,
            upgradeUrl: '/subscription/upgrade',
          });
        }
      }
    }
    ```
  - [ ] Add limit check to `createPublicListing` resolver:
    ```typescript
    @RequirePublicUserPermission(PublicUserPermission.POST_LISTING)
    @Mutation(() => PublicListing)
    async createPublicListing(
      @Args('data') data: CreatePublicListingInput,
      @CurrentUser() user: PublicUser,
    ) {
      // Check subscription limit
      await this.subscriptionLimitService.checkLimitOrThrow(user.id);

      // Create listing
      return this.publicListingService.create(data, user.id);
    }
    ```

- [ ] **Task 6: Apply Permissions to Resolvers** (AC: #3)
  - [ ] Add permission decorators to all protected resolvers:
    ```typescript
    // Browse listings - no auth required
    @Query(() => [PublicListing])
    async publicListings(@Args() filters: ListingFilters) {
      return this.publicListingService.findAll(filters);
    }

    // Post listing - requires auth, verification, and permission
    @RequirePublicUserPermission(PublicUserPermission.POST_LISTING)
    @Mutation(() => PublicListing)
    async createPublicListing(...) { }

    // Edit own listing - requires auth and ownership
    @RequirePublicUserPermission(PublicUserPermission.EDIT_OWN_LISTING)
    @Mutation(() => PublicListing)
    async updatePublicListing(
      @Args('id') id: string,
      @Args('data') data: UpdatePublicListingInput,
      @CurrentUser() user: PublicUser,
    ) {
      // Check ownership
      const listing = await this.publicListingService.findOne(id);
      if (listing.ownerId !== user.id) {
        throw new ForbiddenException('You can only edit your own listings');
      }
      return this.publicListingService.update(id, data);
    }

    // Feature listing - requires PRO/ENTERPRISE tier
    @RequirePublicUserPermission(PublicUserPermission.FEATURE_LISTING)
    @Mutation(() => PublicListing)
    async featurePublicListing(...) { }
    ```

- [ ] **Task 7: Frontend Permission Checks** (AC: #5)
  - [ ] Create `usePermissions` hook:
    ```typescript
    export const usePermissions = () => {
      const { user } = useAuth();

      const hasPermission = (permission: PublicUserPermission): boolean => {
        const requirements = PERMISSION_REQUIREMENTS[permission];

        if (requirements.requiresAuth && !user) return false;
        if (requirements.requiresVerification && !user?.verified) return false;
        if (user && !requirements.allowedTiers.includes(user.subscriptionTier)) {
          return false;
        }

        return true;
      };

      const canCreateListing = (): boolean => {
        return hasPermission(PublicUserPermission.POST_LISTING);
      };

      const canFeatureListing = (): boolean => {
        return hasPermission(PublicUserPermission.FEATURE_LISTING);
      };

      return { hasPermission, canCreateListing, canFeatureListing };
    };
    ```
  - [ ] Use in components:
    ```typescript
    const CreateListingButton = () => {
      const { canCreateListing } = usePermissions();
      const { user } = useAuth();

      if (!canCreateListing()) {
        return (
          <Tooltip content="Please register and verify your account">
            <Button disabled>Create Listing</Button>
          </Tooltip>
        );
      }

      return <Button onClick={handleCreate}>Create Listing</Button>;
    };
    ```

- [ ] **Task 8: Display Subscription Limits in UI** (AC: #1, #5)
  - [ ] Create subscription info component:
    ```typescript
    const SubscriptionInfo = () => {
      const { user } = useAuth();
      const { data } = useQuery(GET_LISTING_COUNT);

      const tierLimits = SUBSCRIPTION_TIERS[user.subscriptionTier];
      const currentCount = data?.activeListingsCount || 0;
      const limit = tierLimits.maxActiveListings;
      const percentage = limit === -1 ? 0 : (currentCount / limit) * 100;

      return (
        <div className="subscription-info">
          <h3>{tierLimits.name} Plan</h3>
          <div className="usage">
            <span>{currentCount} / {limit === -1 ? '∞' : limit} listings</span>
            {limit !== -1 && <ProgressBar value={percentage} />}
          </div>
          {percentage > 80 && (
            <Alert type="warning">
              You're approaching your listing limit.
              <Link to="/subscription/upgrade">Upgrade now</Link>
            </Alert>
          )}
        </div>
      );
    };
    ```
  - [ ] Show upgrade prompts when limits reached
  - [ ] Display tier features comparison table
  - [ ] Add "Upgrade" button in relevant places

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test permission service:
    ```typescript
    describe('PublicUserPermissionService', () => {
      it('should allow browsing for anonymous users', () => {
        const hasPermission = service.hasPermission(
          null,
          PublicUserPermission.BROWSE_LISTINGS
        );
        expect(hasPermission).toBe(true);
      });

      it('should deny posting for anonymous users', () => {
        const hasPermission = service.hasPermission(
          null,
          PublicUserPermission.POST_LISTING
        );
        expect(hasPermission).toBe(false);
      });

      it('should deny posting for unverified users', () => {
        const user = { verified: false, subscriptionTier: 'FREE' };
        const hasPermission = service.hasPermission(
          user,
          PublicUserPermission.POST_LISTING
        );
        expect(hasPermission).toBe(false);
      });

      it('should allow posting for verified FREE users', () => {
        const user = { verified: true, subscriptionTier: 'FREE' };
        const hasPermission = service.hasPermission(
          user,
          PublicUserPermission.POST_LISTING
        );
        expect(hasPermission).toBe(true);
      });

      it('should deny featuring for FREE users', () => {
        const user = { verified: true, subscriptionTier: 'FREE' };
        const hasPermission = service.hasPermission(
          user,
          PublicUserPermission.FEATURE_LISTING
        );
        expect(hasPermission).toBe(false);
      });

      it('should allow featuring for PRO users', () => {
        const user = { verified: true, subscriptionTier: 'PRO' };
        const hasPermission = service.hasPermission(
          user,
          PublicUserPermission.FEATURE_LISTING
        );
        expect(hasPermission).toBe(true);
      });
    });
    ```
  - [ ] Test subscription limits:
    ```typescript
    describe('SubscriptionLimitService', () => {
      it('should allow creation under FREE limit', async () => {
        user.subscriptionTier = 'FREE';
        jest.spyOn(service, 'countActiveByUser').mockResolvedValue(2);

        const result = await service.canCreateListing(user.id);
        expect(result.allowed).toBe(true);
      });

      it('should deny creation at FREE limit', async () => {
        user.subscriptionTier = 'FREE';
        jest.spyOn(service, 'countActiveByUser').mockResolvedValue(3);

        const result = await service.canCreateListing(user.id);
        expect(result.allowed).toBe(false);
      });

      it('should allow unlimited for PRO users', async () => {
        user.subscriptionTier = 'PRO';
        jest.spyOn(service, 'countActiveByUser').mockResolvedValue(100);

        const result = await service.canCreateListing(user.id);
        expect(result.allowed).toBe(true);
      });
    });
    ```
  - [ ] Test permission guard
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test permission enforcement in resolvers
  - [ ] Test subscription limit enforcement
  - [ ] Test upgrade flows
  - [ ] Test error messages and upgrade prompts

- [ ] **Task 11: Manual Testing**
  - [ ] Test as FREE user:
    - Create 3 listings (should succeed)
    - Try to create 4th listing (should fail with upgrade prompt)
    - Try to feature listing (should fail)
  - [ ] Test as PRO user:
    - Create many listings (should succeed)
    - Feature listing (should succeed)
  - [ ] Test anonymous user:
    - Browse listings (should succeed)
    - Try to create listing (should redirect to login)
  - [ ] Test unverified user:
    - Try to create listing (should show verification prompt)

## Dev Notes

### Architecture Context

**RBAC Pattern**: Role-Based Access Control with subscription tiers
- Permissions defined at operation level
- Permissions checked via decorators and guards
- Subscription tiers determine feature access
- Limits enforced before operations

**Key Design Decisions**:
- Separate permissions from subscription tiers (flexible)
- Permission checks in both backend (security) and frontend (UX)
- Soft limits with upgrade prompts (business model)
- Clear error messages with upgrade paths

**Technology Stack**:
- NestJS guards and decorators
- GraphQL field-level permissions
- React hooks for frontend permission checks

### Implementation Details

**Subscription Tiers**:
```typescript
FREE: 3 listings, 30 days, basic features
BASIC: 10 listings, 60 days, enhanced features
PRO: unlimited, 90 days, premium features
ENTERPRISE: custom, custom, all features
```

**Permission Matrix**:
```
Operation              | Anonymous | FREE | BASIC | PRO | ENTERPRISE
--------------------- |-----------|------|-------|-----|------------
Browse listings       | ✓         | ✓    | ✓     | ✓   | ✓
View detail           | ✓         | ✓    | ✓     | ✓   | ✓
Post listing          | ✗         | ✓    | ✓     | ✓   | ✓
Edit own listing      | ✗         | ✓    | ✓     | ✓   | ✓
Send inquiry          | ✓         | ✓    | ✓     | ✓   | ✓
Save favorites        | ✗         | ✓    | ✓     | ✓   | ✓
Feature listing       | ✗         | ✗    | ✗     | ✓   | ✓
View analytics        | ✗         | ✗    | ✓     | ✓   | ✓
API access            | ✗         | ✗    | ✗     | ✓   | ✓
Bulk operations       | ✗         | ✗    | ✗     | ✗   | ✓
```

### Testing Strategy

**Unit Tests**: Permission logic, limit calculations
**Integration Tests**: End-to-end permission enforcement
**Manual Tests**: User flows for each tier

### References

- [Epic 8.2](../real-estate-platform/epics.md#story-824-subscription-tiers--rbac)
- [Architecture](../real-estate-platform/architecture.md) - Section 7 (RBAC)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Subscription tiers

### Success Criteria

**Definition of Done**:
- ✅ Subscription tiers defined with limits
- ✅ RBAC permissions implemented
- ✅ Permission decorators working
- ✅ Subscription limits enforced
- ✅ Frontend permission checks working
- ✅ Upgrade prompts displayed
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
