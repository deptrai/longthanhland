# Story 8.2.1: PublicUser Entity & CRUD

Status: drafted

## Story

As a developer,
I want to create the PublicUser entity with CRUD operations,
so that we can store and manage public user data.

## Acceptance Criteria

1. **PublicUser Entity Created**
   - Given module structure from Epic 8.1
   - When I create PublicUser entity
   - Then `PublicUserWorkspaceEntity` created with Twenty's `@WorkspaceEntity` decorator
   - And entity registered in `standardObjectMetadataDefinitions`

2. **Entity Fields Defined**
   - Given entity created
   - When fields defined
   - Then includes all fields from PRD 4.8.2:
     - `email` (EMAIL type, unique, required)
     - `phone` (PHONE type, required, verified)
     - `fullName` (TEXT type)
     - `userType` (SELECT: BUYER, SELLER, BROKER)
     - `verified` (BOOLEAN, default false)
     - `subscriptionTier` (SELECT: FREE, BASIC, PRO, ENTERPRISE)
     - `emailVerified` (BOOLEAN, default false)
     - `phoneVerified` (BOOLEAN, default false)
     - `verifiedAt` (DATE_TIME, nullable)
     - `subscriptionExpiresAt` (DATE_TIME, nullable)

3. **Computed Fields**
   - Given entity complete
   - When computed fields added
   - Then includes:
     - `totalListings` (count of user's listings)
     - `activeListings` (count of APPROVED listings)
     - `responseRate` (percentage of inquiries responded to within 24h)

4. **GraphQL CRUD Operations**
   - Given entity registered
   - When GraphQL schema generated
   - Then CRUD operations auto-generated:
     - `publicUsers` (query all)
     - `publicUser(id)` (query one)
     - `createPublicUser` (mutation)
     - `updatePublicUser` (mutation)
     - `deletePublicUser` (mutation)

5. **Database Migration**
   - Given entity complete
   - When migration generated and run
   - Then `publicUser` table created in PostgreSQL
   - And indexes created on: email, phone, userType, subscriptionTier

6. **Service Layer**
   - Given entity registered
   - When service created
   - Then `PublicUserService` exists with `TwentyORMGlobalManager`
   - And service registered in `PublicMarketplaceModule`

## Tasks / Subtasks

- [ ] **Task 1: Create PublicUser Entity** (AC: #1, #2)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/entities/public-user.workspace-entity.ts`
  - [ ] Add `@WorkspaceEntity` decorator with metadata:
    - `standardId`: Generate UUID for PUBLIC_USER
    - `namePlural`: 'publicUsers'
    - `labelSingular`: 'Public User'
    - `labelPlural`: 'Public Users'
    - `description`: 'Public marketplace users'
    - `icon`: 'IconUser'
  - [ ] Extend `BaseWorkspaceEntity`

- [ ] **Task 2: Define Basic Fields** (AC: #2)
  - [ ] Add `email` field:
    - `@WorkspaceField` with `FieldMetadataType.EMAIL`
    - Unique constraint
    - Required validation
  - [ ] Add `phone` field:
    - `@WorkspaceField` with `FieldMetadataType.PHONE`
    - Required validation
    - Vietnamese phone format validation
  - [ ] Add `fullName` field:
    - `@WorkspaceField` with `FieldMetadataType.TEXT`
    - Max length: 100 characters
  - [ ] Add `password` field:
    - `@WorkspaceField` with `FieldMetadataType.TEXT`
    - Hashed with bcrypt
    - Not exposed in GraphQL (hidden)

- [ ] **Task 3: Define Enum Fields** (AC: #2)
  - [ ] Add `userType` field:
    - `@WorkspaceField` with `FieldMetadataType.SELECT`
    - Options: BUYER, SELLER, BROKER
    - Default: BUYER
  - [ ] Add `subscriptionTier` field:
    - `@WorkspaceField` with `FieldMetadataType.SELECT`
    - Options: FREE, BASIC, PRO, ENTERPRISE
    - Default: FREE

- [ ] **Task 4: Define Boolean and Date Fields** (AC: #2)
  - [ ] Add `verified` field (BOOLEAN, default false)
  - [ ] Add `emailVerified` field (BOOLEAN, default false)
  - [ ] Add `phoneVerified` field (BOOLEAN, default false)
  - [ ] Add `verifiedAt` field (DATE_TIME, nullable)
  - [ ] Add `subscriptionExpiresAt` field (DATE_TIME, nullable)
  - [ ] Add `lastLoginAt` field (DATE_TIME, nullable)

- [ ] **Task 5: Define Computed Fields** (AC: #3)
  - [ ] Add `totalListings` computed field:
    - Count all listings where `owner.id = this.id`
  - [ ] Add `activeListings` computed field:
    - Count listings where `owner.id = this.id AND status = APPROVED`
  - [ ] Add `responseRate` computed field:
    - Calculate: (inquiries responded within 24h / total inquiries) * 100
    - Return as percentage (0-100)

- [ ] **Task 6: Register Entity** (AC: #1)
  - [ ] Add to `packages/twenty-server/src/engine/workspace-manager/standard-objects-prefill-data/standard-objects-metadata.ts`
  - [ ] Import `PublicUserWorkspaceEntity`
  - [ ] Add to `standardObjectMetadataDefinitions` array
  - [ ] Verify entity appears in GraphQL schema

- [ ] **Task 7: Create Database Migration** (AC: #5)
  - [ ] Generate migration: `yarn workspace twenty-server migration:generate`
  - [ ] Review migration SQL
  - [ ] Add indexes:
    - `CREATE INDEX idx_public_user_email ON public_user(email)`
    - `CREATE INDEX idx_public_user_phone ON public_user(phone)`
    - `CREATE INDEX idx_public_user_type ON public_user(user_type)`
    - `CREATE INDEX idx_public_user_subscription ON public_user(subscription_tier)`
  - [ ] Run migration: `yarn workspace twenty-server migration:run`
  - [ ] Verify table created in PostgreSQL

- [ ] **Task 8: Create PublicUserService** (AC: #6)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/services/public-user.service.ts`
  - [ ] Inject `TwentyORMGlobalManager`
  - [ ] Implement methods:
    - `findAll(filters, pagination)`
    - `findOne(id)`
    - `findByEmail(email)`
    - `findByPhone(phone)`
    - `create(data)`
    - `update(id, data)`
    - `delete(id)`
  - [ ] Add validation logic
  - [ ] Add error handling

- [ ] **Task 9: Register Service in Module** (AC: #6)
  - [ ] Update `packages/twenty-server/src/modules/public-marketplace/public-marketplace.module.ts`
  - [ ] Import `PublicUserService`
  - [ ] Add to `providers` array
  - [ ] Add to `exports` array (if needed by other modules)

- [ ] **Task 10: Add Field Validation** (AC: #2)
  - [ ] Email validation:
    - Valid email format
    - Unique constraint
  - [ ] Phone validation:
    - Vietnamese phone format: `^(0|\+84)[3|5|7|8|9][0-9]{8}$`
    - Unique constraint
  - [ ] Password validation:
    - Min length: 8 characters
    - Must contain: uppercase, lowercase, number
  - [ ] FullName validation:
    - Max length: 100 characters
    - No special characters except spaces, hyphens

- [ ] **Task 11: Create Unit Tests**
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/services/__tests__/public-user.service.spec.ts`
  - [ ] Test cases:
    - Create user with valid data
    - Create user with duplicate email (should fail)
    - Create user with duplicate phone (should fail)
    - Update user profile
    - Find user by email
    - Find user by phone
    - Computed fields calculate correctly
  - [ ] Mock `TwentyORMGlobalManager`
  - [ ] Achieve >80% coverage

- [ ] **Task 12: Testing and Verification**
  - [ ] Start server: `yarn workspace twenty-server start:dev`
  - [ ] Open GraphQL Playground: `http://localhost:3000/graphql`
  - [ ] Test queries:
    ```graphql
    query {
      publicUsers {
        edges {
          node {
            id
            email
            fullName
            userType
            subscriptionTier
            verified
          }
        }
      }
    }
    ```
  - [ ] Test mutations:
    ```graphql
    mutation {
      createPublicUser(data: {
        email: "test@example.com"
        phone: "0901234567"
        fullName: "Test User"
        userType: BUYER
        password: "SecurePass123"
      }) {
        id
        email
        fullName
      }
    }
    ```
  - [ ] Verify data in PostgreSQL
  - [ ] Run unit tests: `yarn workspace twenty-server test public-user`

## Dev Notes

### Architecture Context

**Entity Pattern**: Follow Twenty CRM's WorkspaceEntity pattern (architecture.md Section 4.1)
- Use `@WorkspaceEntity` decorator
- Extend `BaseWorkspaceEntity`
- Use `@WorkspaceField` for all fields
- Register in `standardObjectMetadataDefinitions`

**Key Design Decisions**:
- Separate `verified` (overall), `emailVerified`, `phoneVerified` flags
- Password hashed with bcrypt (Twenty's existing auth pattern)
- Subscription tier with expiry date
- Computed fields for analytics

**Technology Stack**:
- NestJS 10.x with decorators
- TypeORM (via TwentyORMGlobalManager)
- GraphQL (auto-generated)
- PostgreSQL 14.x

### Project Structure Notes

**Entity Location**:
```
packages/twenty-server/src/modules/public-marketplace/
├── entities/
│   └── public-user.workspace-entity.ts
├── services/
│   ├── public-user.service.ts
│   └── __tests__/
│       └── public-user.service.spec.ts
└── public-marketplace.module.ts
```

**Standard Object IDs**:
```typescript
// Generate UUIDs for standard objects
export const PUBLIC_MARKETPLACE_OBJECT_IDS = {
  publicUser: '20000000-0000-4000-8000-000000000001',
  publicListing: '20000000-0000-4000-8000-000000000002',
  inquiry: '20000000-0000-4000-8000-000000000003',
  aiResearchResult: '20000000-0000-4000-8000-000000000004',
};
```

### Implementation Details

**PublicUser Entity Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/entities/public-user.workspace-entity.ts
import { WorkspaceEntity, WorkspaceField } from '@/engine/twenty-orm/decorators';
import { BaseWorkspaceEntity } from '@/engine/twenty-orm/base.workspace-entity';
import { FieldMetadataType } from '@/engine/metadata-modules/field-metadata/field-metadata.entity';
import { PUBLIC_MARKETPLACE_OBJECT_IDS } from '../constants';

@WorkspaceEntity({
  standardId: PUBLIC_MARKETPLACE_OBJECT_IDS.publicUser,
  namePlural: 'publicUsers',
  labelSingular: 'Public User',
  labelPlural: 'Public Users',
  description: 'Public marketplace users',
  icon: 'IconUser',
})
export class PublicUserWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: 'email-field-id',
    type: FieldMetadataType.EMAIL,
    label: 'Email',
    description: 'User email address',
    icon: 'IconMail',
  })
  email: string;

  @WorkspaceField({
    standardId: 'phone-field-id',
    type: FieldMetadataType.PHONE,
    label: 'Phone',
    description: 'User phone number',
    icon: 'IconPhone',
  })
  phone: string;

  @WorkspaceField({
    standardId: 'fullname-field-id',
    type: FieldMetadataType.TEXT,
    label: 'Full Name',
    description: 'User full name',
    icon: 'IconUser',
  })
  fullName: string;

  @WorkspaceField({
    standardId: 'usertype-field-id',
    type: FieldMetadataType.SELECT,
    label: 'User Type',
    description: 'Type of user',
    icon: 'IconTag',
    options: [
      { value: 'BUYER', label: 'Buyer', position: 0, color: 'blue' },
      { value: 'SELLER', label: 'Seller', position: 1, color: 'green' },
      { value: 'BROKER', label: 'Broker', position: 2, color: 'purple' },
    ],
    defaultValue: 'BUYER',
  })
  userType: string;

  @WorkspaceField({
    standardId: 'subscription-field-id',
    type: FieldMetadataType.SELECT,
    label: 'Subscription Tier',
    description: 'User subscription level',
    icon: 'IconCrown',
    options: [
      { value: 'FREE', label: 'Free', position: 0, color: 'gray' },
      { value: 'BASIC', label: 'Basic', position: 1, color: 'blue' },
      { value: 'PRO', label: 'Pro', position: 2, color: 'purple' },
      { value: 'ENTERPRISE', label: 'Enterprise', position: 3, color: 'gold' },
    ],
    defaultValue: 'FREE',
  })
  subscriptionTier: string;

  @WorkspaceField({
    standardId: 'verified-field-id',
    type: FieldMetadataType.BOOLEAN,
    label: 'Verified',
    description: 'User verification status',
    icon: 'IconCheck',
    defaultValue: false,
  })
  verified: boolean;

  // ... other fields
}
```

**PublicUserService Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/services/public-user.service.ts
import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from '@/engine/twenty-orm/twenty-orm-global.manager';
import { PublicUserWorkspaceEntity } from '../entities/public-user.workspace-entity';

@Injectable()
export class PublicUserService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async findByEmail(email: string, workspaceId: string) {
    const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      PublicUserWorkspaceEntity,
    );

    return repository.findOne({ where: { email } });
  }

  async create(data: Partial<PublicUserWorkspaceEntity>, workspaceId: string) {
    const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace(
      workspaceId,
      PublicUserWorkspaceEntity,
    );

    // Hash password before saving
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const user = repository.create(data);
    return repository.save(user);
  }

  // ... other methods
}
```

### Validation Rules

**Email Validation**:
- Format: RFC 5322 compliant
- Unique across all public users
- Case-insensitive comparison

**Phone Validation**:
- Vietnamese format: `^(0|\+84)[3|5|7|8|9][0-9]{8}$`
- Examples: `0901234567`, `+84901234567`
- Unique across all public users

**Password Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Optional: 1 special character

**Subscription Tiers**:
- FREE: 3 listings max, 30 days duration
- BASIC: 10 listings max, 60 days duration
- PRO: Unlimited listings, 90 days duration
- ENTERPRISE: Custom limits, custom duration

### Testing Strategy

**Unit Tests**:
```typescript
describe('PublicUserService', () => {
  it('should create user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      phone: '0901234567',
      fullName: 'Test User',
      userType: 'BUYER',
      password: 'SecurePass123',
    };

    const user = await service.create(userData, workspaceId);

    expect(user.email).toBe(userData.email);
    expect(user.verified).toBe(false);
    expect(user.subscriptionTier).toBe('FREE');
  });

  it('should reject duplicate email', async () => {
    await service.create({ email: 'test@example.com', ... }, workspaceId);

    await expect(
      service.create({ email: 'test@example.com', ... }, workspaceId)
    ).rejects.toThrow('Email already exists');
  });
});
```

### References

- [Architecture Document](../real-estate-platform/architecture.md) - Section 4.1 (Custom Objects)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.2 (PublicUser Object)
- [Epic 8.2](../real-estate-platform/epics.md#story-821-publicuser-entity--crud) - Story details
- [Twenty ORM Documentation](https://twenty.com/developers/section/backend/custom-objects) - Custom objects guide

### Success Criteria

**Definition of Done**:
- ✅ PublicUser entity created with all fields
- ✅ Entity registered in Twenty's system
- ✅ GraphQL CRUD operations working
- ✅ Database migration successful
- ✅ Service layer implemented
- ✅ Validation rules enforced
- ✅ Unit tests pass (>80% coverage)
- ✅ Manual testing successful

**Verification Commands**:
```bash
# Start server
yarn workspace twenty-server start:dev

# Run tests
yarn workspace twenty-server test public-user

# Check database
psql -d twenty -c "SELECT * FROM public_user LIMIT 5;"

# Verify GraphQL schema
curl http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query": "{ __type(name: \"PublicUser\") { fields { name type { name } } } }"}'
```

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
