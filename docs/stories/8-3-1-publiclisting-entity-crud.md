# Story 8.3.1: PublicListing Entity & CRUD

Status: drafted

## Story

As a developer,
I want to create the PublicListing entity with CRUD operations,
so that sellers can create and manage property listings.

## Acceptance Criteria

1. **PublicListing Entity Created**
   - Given PublicUser entity exists (Epic 8.2)
   - When I create PublicListing workspace entity
   - Then `PublicListingWorkspaceEntity` created with `@WorkspaceEntity` decorator
   - And all fields from PRD 4.8.3 included:
     - Basic: title, description, listingType, propertyType, price, area
     - Location: location (ADDRESS), province, district, ward, latitude, longitude
     - Details: bedrooms, bathrooms, floor, orientation
     - Media: imageIds (array of file IDs)
     - Status: status, verified, featured
     - Metrics: viewCount, contactCount, trustScore, spamScore
     - Timestamps: publishedAt, expiresAt, approvedAt, rejectedReason
   - And entity registered in Twenty's metadata system

2. **Relations Defined**
   - Given entity fields defined
   - When relations configured
   - Then `owner` relation → PublicUser (required, many-to-one)
   - And `property` relation → Property (optional, one-to-one for converted listings)
   - And cascade delete configured (delete listing when owner deleted)
   - And foreign keys created with indexes

3. **Status Enum & Workflow**
   - Given status field defined
   - When enum created
   - Then includes: DRAFT, PENDING_REVIEW, APPROVED, REJECTED, EXPIRED, SOLD
   - And status transitions validated:
     - DRAFT → PENDING_REVIEW (submit)
     - PENDING_REVIEW → APPROVED/REJECTED (admin action)
     - APPROVED → EXPIRED (auto, after duration)
     - APPROVED → SOLD (seller action)
     - REJECTED → DRAFT (edit & resubmit)

4. **GraphQL CRUD Auto-generated**
   - Given entity complete with decorators
   - When GraphQL schema generated
   - Then CRUD operations available:
     - `publicListings` (query, with filters)
     - `publicListing(id)` (query single)
     - `createPublicListing` (mutation)
     - `updatePublicListing` (mutation)
     - `deletePublicListing` (mutation)
   - And input/output types auto-generated
   - And field resolvers for computed fields

5. **Database Migration & Indexes**
   - Given entity registered
   - When migration generated and run
   - Then `publicListing` table created with columns
   - And indexes created:
     - `idx_public_listing_owner` (ownerId)
     - `idx_public_listing_status` (status)
     - `idx_public_listing_location` (province, district)
     - `idx_public_listing_price` (price)
     - `idx_public_listing_expires` (expiresAt)
   - And full-text search index on title + description (Vietnamese support)

## Tasks / Subtasks

- [ ] **Task 1: Create PublicListing Workspace Entity** (AC: #1)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/entities/public-listing.workspace-entity.ts`
  - [ ] Add `@WorkspaceEntity()` decorator:
    ```typescript
    @WorkspaceEntity({
      standardId: 'publicListing',
      namePlural: 'publicListings',
      labelSingular: 'Public Listing',
      labelPlural: 'Public Listings',
      description: 'Public marketplace property listings',
      icon: 'IconHome',
    })
    export class PublicListingWorkspaceEntity extends BaseWorkspaceEntity {
      // Fields defined below
    }
    ```
  - [ ] Define basic fields:
    ```typescript
    @WorkspaceField({
      standardId: 'title',
      type: FieldMetadataType.TEXT,
      label: 'Title',
      description: 'Listing title',
      icon: 'IconTextSize',
    })
    title: string;

    @WorkspaceField({
      standardId: 'description',
      type: FieldMetadataType.RICH_TEXT,
      label: 'Description',
      description: 'Full listing description',
      icon: 'IconFileText',
    })
    description: string;

    @WorkspaceField({
      standardId: 'listingType',
      type: FieldMetadataType.SELECT,
      label: 'Listing Type',
      description: 'Sale or Rent',
      icon: 'IconTag',
      options: [
        { value: 'SALE', label: 'For Sale', color: 'green' },
        { value: 'RENT', label: 'For Rent', color: 'blue' },
      ],
    })
    listingType: string;

    @WorkspaceField({
      standardId: 'propertyType',
      type: FieldMetadataType.SELECT,
      label: 'Property Type',
      description: 'Type of property',
      icon: 'IconBuilding',
      options: [
        { value: 'APARTMENT', label: 'Apartment', color: 'blue' },
        { value: 'HOUSE', label: 'House', color: 'green' },
        { value: 'LAND', label: 'Land', color: 'orange' },
        { value: 'VILLA', label: 'Villa', color: 'purple' },
        { value: 'TOWNHOUSE', label: 'Townhouse', color: 'yellow' },
        { value: 'OFFICE', label: 'Office', color: 'gray' },
      ],
    })
    propertyType: string;

    @WorkspaceField({
      standardId: 'price',
      type: FieldMetadataType.CURRENCY,
      label: 'Price',
      description: 'Listing price in VND',
      icon: 'IconCurrencyDong',
    })
    price: number;

    @WorkspaceField({
      standardId: 'area',
      type: FieldMetadataType.NUMBER,
      label: 'Area (m²)',
      description: 'Property area in square meters',
      icon: 'IconRuler',
    })
    area: number;
    ```
  - [ ] Define location fields:
    ```typescript
    @WorkspaceField({
      standardId: 'location',
      type: FieldMetadataType.ADDRESS,
      label: 'Address',
      description: 'Full property address',
      icon: 'IconMapPin',
    })
    location: string;

    @WorkspaceField({
      standardId: 'province',
      type: FieldMetadataType.TEXT,
      label: 'Province',
      description: 'Province/City',
      icon: 'IconMap',
    })
    province: string;

    @WorkspaceField({
      standardId: 'district',
      type: FieldMetadataType.TEXT,
      label: 'District',
      description: 'District',
      icon: 'IconMapPin',
    })
    district: string;

    @WorkspaceField({
      standardId: 'ward',
      type: FieldMetadataType.TEXT,
      label: 'Ward',
      description: 'Ward (optional)',
      icon: 'IconMapPin',
    })
    ward?: string;
    ```
  - [ ] Define property details:
    ```typescript
    @WorkspaceField({
      standardId: 'bedrooms',
      type: FieldMetadataType.NUMBER,
      label: 'Bedrooms',
      description: 'Number of bedrooms',
      icon: 'IconBed',
    })
    bedrooms?: number;

    @WorkspaceField({
      standardId: 'bathrooms',
      type: FieldMetadataType.NUMBER,
      label: 'Bathrooms',
      description: 'Number of bathrooms',
      icon: 'IconBath',
    })
    bathrooms?: number;

    @WorkspaceField({
      standardId: 'floor',
      type: FieldMetadataType.NUMBER,
      label: 'Floor',
      description: 'Floor number',
      icon: 'IconStairs',
    })
    floor?: number;

    @WorkspaceField({
      standardId: 'orientation',
      type: FieldMetadataType.SELECT,
      label: 'Orientation',
      description: 'Property orientation',
      icon: 'IconCompass',
      options: [
        { value: 'NORTH', label: 'North', color: 'blue' },
        { value: 'SOUTH', label: 'South', color: 'red' },
        { value: 'EAST', label: 'East', color: 'yellow' },
        { value: 'WEST', label: 'West', color: 'orange' },
        { value: 'NORTHEAST', label: 'Northeast', color: 'cyan' },
        { value: 'NORTHWEST', label: 'Northwest', color: 'purple' },
        { value: 'SOUTHEAST', label: 'Southeast', color: 'pink' },
        { value: 'SOUTHWEST', label: 'Southwest', color: 'brown' },
      ],
    })
    orientation?: string;
    ```
  - [ ] Define status and flags:
    ```typescript
    @WorkspaceField({
      standardId: 'status',
      type: FieldMetadataType.SELECT,
      label: 'Status',
      description: 'Listing status',
      icon: 'IconCircleDot',
      defaultValue: 'DRAFT',
      options: [
        { value: 'DRAFT', label: 'Draft', color: 'gray' },
        { value: 'PENDING_REVIEW', label: 'Pending Review', color: 'yellow' },
        { value: 'APPROVED', label: 'Approved', color: 'green' },
        { value: 'REJECTED', label: 'Rejected', color: 'red' },
        { value: 'EXPIRED', label: 'Expired', color: 'orange' },
        { value: 'SOLD', label: 'Sold', color: 'blue' },
      ],
    })
    status: string;

    @WorkspaceField({
      standardId: 'verified',
      type: FieldMetadataType.BOOLEAN,
      label: 'Verified',
      description: 'Admin verified listing',
      icon: 'IconCheck',
      defaultValue: false,
    })
    verified: boolean;

    @WorkspaceField({
      standardId: 'featured',
      type: FieldMetadataType.BOOLEAN,
      label: 'Featured',
      description: 'Paid featured listing',
      icon: 'IconStar',
      defaultValue: false,
    })
    featured: boolean;
    ```
  - [ ] Define metrics and scores:
    ```typescript
    @WorkspaceField({
      standardId: 'viewCount',
      type: FieldMetadataType.NUMBER,
      label: 'View Count',
      description: 'Total page views',
      icon: 'IconEye',
      defaultValue: 0,
    })
    viewCount: number;

    @WorkspaceField({
      standardId: 'contactCount',
      type: FieldMetadataType.NUMBER,
      label: 'Contact Count',
      description: 'Total inquiries',
      icon: 'IconMessage',
      defaultValue: 0,
    })
    contactCount: number;

    @WorkspaceField({
      standardId: 'trustScore',
      type: FieldMetadataType.NUMBER,
      label: 'Trust Score',
      description: 'AI trust score (0-100)',
      icon: 'IconShield',
    })
    trustScore?: number;

    @WorkspaceField({
      standardId: 'spamScore',
      type: FieldMetadataType.NUMBER,
      label: 'Spam Score',
      description: 'AI spam score (0-100)',
      icon: 'IconAlertTriangle',
    })
    spamScore?: number;
    ```
  - [ ] Define images field:
    ```typescript
    @WorkspaceField({
      standardId: 'imageIds',
      type: FieldMetadataType.MULTI_SELECT,
      label: 'Image IDs',
      description: 'Array of uploaded image file IDs',
      icon: 'IconPhoto',
    })
    imageIds?: string[];
    ```
  - [ ] Define coordinates fields:
    ```typescript
    @WorkspaceField({
      standardId: 'latitude',
      type: FieldMetadataType.NUMBER,
      label: 'Latitude',
      description: 'Location latitude coordinate',
      icon: 'IconMapPin',
    })
    latitude?: number;

    @WorkspaceField({
      standardId: 'longitude',
      type: FieldMetadataType.NUMBER,
      label: 'Longitude',
      description: 'Location longitude coordinate',
      icon: 'IconMapPin',
    })
    longitude?: number;
    ```
  - [ ] Define timestamps:
    ```typescript
    @WorkspaceField({
      standardId: 'publishedAt',
      type: FieldMetadataType.DATE_TIME,
      label: 'Published At',
      description: 'Listing publication timestamp (when approved)',
      icon: 'IconCalendar',
    })
    publishedAt?: Date;

    @WorkspaceField({
      standardId: 'expiresAt',
      type: FieldMetadataType.DATE_TIME,
      label: 'Expires At',
      description: 'Listing expiration date',
      icon: 'IconCalendar',
    })
    expiresAt?: Date;

    @WorkspaceField({
      standardId: 'approvedAt',
      type: FieldMetadataType.DATE_TIME,
      label: 'Approved At',
      description: 'Admin approval timestamp',
      icon: 'IconCheck',
    })
    approvedAt?: Date;

    @WorkspaceField({
      standardId: 'rejectedReason',
      type: FieldMetadataType.TEXT,
      label: 'Rejection Reason',
      description: 'Reason for rejection',
      icon: 'IconX',
    })
    rejectedReason?: string;
    ```

- [ ] **Task 2: Define Relations** (AC: #2)
  - [ ] Add owner relation:
    ```typescript
    @WorkspaceRelation({
      standardId: 'owner',
      type: RelationMetadataType.MANY_TO_ONE,
      label: 'Owner',
      description: 'Listing owner (PublicUser)',
      icon: 'IconUser',
      inverseSideTarget: () => PublicUserWorkspaceEntity,
      inverseSideFieldKey: 'listings',
    })
    owner: Relation<PublicUserWorkspaceEntity>;

    @WorkspaceJoinColumn('owner')
    ownerId: string;
    ```
  - [ ] Add property relation (for converted listings):
    ```typescript
    @WorkspaceRelation({
      standardId: 'property',
      type: RelationMetadataType.ONE_TO_ONE,
      label: 'Property',
      description: 'Linked internal property (if converted)',
      icon: 'IconBuilding',
      inverseSideTarget: () => PropertyWorkspaceEntity,
      inverseSideFieldKey: 'publicListing',
    })
    property?: Relation<PropertyWorkspaceEntity>;

    @WorkspaceJoinColumn('property')
    propertyId?: string;
    ```
  - [ ] Configure cascade options:
    - onDelete: CASCADE for owner (delete listings when user deleted)
    - onDelete: SET NULL for property (keep listing if property deleted)

- [ ] **Task 3: Add Computed Fields** (AC: #1)
  - [ ] Add `daysListed` computed field:
    ```typescript
    @WorkspaceField({
      standardId: 'daysListed',
      type: FieldMetadataType.NUMBER,
      label: 'Days Listed',
      description: 'Days since approval',
      icon: 'IconCalendar',
      isCustom: false,
      isComputed: true,
    })
    get daysListed(): number {
      if (!this.approvedAt) return 0;
      const now = new Date();
      const approved = new Date(this.approvedAt);
      return Math.floor((now.getTime() - approved.getTime()) / (1000 * 60 * 60 * 24));
    }
    ```
  - [ ] Add `daysUntilExpiry` computed field:
    ```typescript
    @WorkspaceField({
      standardId: 'daysUntilExpiry',
      type: FieldMetadataType.NUMBER,
      label: 'Days Until Expiry',
      description: 'Days remaining until expiration',
      icon: 'IconClock',
      isCustom: false,
      isComputed: true,
    })
    get daysUntilExpiry(): number {
      if (!this.expiresAt) return 0;
      const now = new Date();
      const expires = new Date(this.expiresAt);
      return Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }
    ```

- [ ] **Task 4: Create Database Migration** (AC: #5)
  - [ ] Generate migration: `npx nx database:generate-migration twenty-server`
  - [ ] Review generated migration file
  - [ ] Add custom indexes:
    ```typescript
    await queryRunner.createIndex('publicListing', new TableIndex({
      name: 'IDX_PUBLIC_LISTING_OWNER',
      columnNames: ['ownerId'],
    }));

    await queryRunner.createIndex('publicListing', new TableIndex({
      name: 'IDX_PUBLIC_LISTING_STATUS',
      columnNames: ['status'],
    }));

    await queryRunner.createIndex('publicListing', new TableIndex({
      name: 'IDX_PUBLIC_LISTING_LOCATION',
      columnNames: ['province', 'district'],
    }));

    await queryRunner.createIndex('publicListing', new TableIndex({
      name: 'IDX_PUBLIC_LISTING_PRICE',
      columnNames: ['price'],
    }));

    await queryRunner.createIndex('publicListing', new TableIndex({
      name: 'IDX_PUBLIC_LISTING_EXPIRES',
      columnNames: ['expiresAt'],
    }));
    ```
  - [ ] Add full-text search index (PostgreSQL):
    ```sql
    CREATE INDEX idx_public_listing_search ON public_listing
    USING gin(to_tsvector('vietnamese', title || ' ' || description));
    ```
  - [ ] Run migration: `npx nx database:migrate twenty-server`

- [ ] **Task 5: Create PublicListingService** (AC: #4)
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/services/public-listing.service.ts`:
    ```typescript
    @Injectable()
    export class PublicListingService {
      constructor(
        private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
      ) {}

      async findAll(filters?: ListingFilters): Promise<PublicListing[]> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        const queryBuilder = repository.createQueryBuilder('listing');

        if (filters?.status) {
          queryBuilder.andWhere('listing.status = :status', { status: filters.status });
        }

        if (filters?.province) {
          queryBuilder.andWhere('listing.province = :province', { province: filters.province });
        }

        if (filters?.minPrice) {
          queryBuilder.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
        }

        if (filters?.maxPrice) {
          queryBuilder.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });
        }

        return queryBuilder.getMany();
      }

      async findOne(id: string): Promise<PublicListing> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        const listing = await repository.findOne({
          where: { id },
          relations: ['owner'],
        });

        if (!listing) {
          throw new NotFoundException(`Listing ${id} not found`);
        }

        return listing;
      }

      async create(data: CreatePublicListingInput, ownerId: string): Promise<PublicListing> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        const listing = repository.create({
          ...data,
          ownerId,
          status: 'DRAFT',
          viewCount: 0,
          contactCount: 0,
        });

        return repository.save(listing);
      }

      async update(id: string, data: UpdatePublicListingInput): Promise<PublicListing> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        await repository.update(id, data);
        return this.findOne(id);
      }

      async delete(id: string): Promise<void> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        await repository.delete(id);
      }

      async countActiveByOwner(ownerId: string): Promise<number> {
        const repository = await this.twentyORMGlobalManager.getRepositoryForWorkspace<PublicListing>(
          'publicListing',
        );

        return repository.count({
          where: {
            ownerId,
            status: In(['APPROVED', 'PENDING_REVIEW']),
          },
        });
      }
    }
    ```

- [ ] **Task 6: Add Validation** (AC: #1)
  - [ ] Create validation decorators:
    ```typescript
    import { IsNotEmpty, IsPositive, MaxLength, Min } from 'class-validator';

    export class CreatePublicListingInput {
      @IsNotEmpty()
      @MaxLength(100)
      title: string;

      @IsNotEmpty()
      @MaxLength(2000)
      description: string;

      @IsPositive()
      price: number;

      @IsPositive()
      @Min(1)
      area: number;

      @IsNotEmpty()
      location: string;

      @IsNotEmpty()
      province: string;

      @IsNotEmpty()
      district: string;

      // ... other fields
    }
    ```
  - [ ] Add validation pipe to resolver
  - [ ] Add custom validators for Vietnamese address format

- [ ] **Task 7: Register in Module** (AC: #1)
  - [ ] Update `PublicMarketplaceModule`:
    ```typescript
    @Module({
      imports: [TwentyORMModule],
      providers: [
        PublicListingService,
        PublicListingResolver,
      ],
      exports: [PublicListingService],
    })
    export class PublicMarketplaceModule {}
    ```

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test entity creation and field validation
  - [ ] Test CRUD operations
  - [ ] Test computed fields
  - [ ] Test relations
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Manual Testing**
  - [ ] Create listing via GraphQL
  - [ ] Query listings with filters
  - [ ] Update listing
  - [ ] Delete listing
  - [ ] Verify database indexes created
  - [ ] Test full-text search

## Dev Notes

### Architecture Context

**Entity Pattern**: Twenty's workspace entity system
- Use `@WorkspaceEntity` decorator for metadata-driven entities
- Fields defined with `@WorkspaceField` decorators
- Relations with `@WorkspaceRelation` decorators
- Auto-generates GraphQL schema and database migrations

**Key Design Decisions**:
- Status workflow: DRAFT → PENDING_REVIEW → APPROVED/REJECTED
- Computed fields for UX (daysListed, daysUntilExpiry)
- Full-text search for Vietnamese text
- Indexes optimized for common queries

### Implementation Details

**Status Transitions**:
```
DRAFT → PENDING_REVIEW (seller submits)
PENDING_REVIEW → APPROVED (admin approves)
PENDING_REVIEW → REJECTED (admin rejects)
REJECTED → DRAFT (seller edits)
APPROVED → EXPIRED (auto, after duration)
APPROVED → SOLD (seller marks)
```

**Indexes Strategy**:
- `ownerId`: Fast owner lookup
- `status`: Filter by status
- `province, district`: Location search
- `price`: Price range queries
- `expiresAt`: Expiry job queries
- Full-text: Vietnamese search

### Testing Strategy

**Unit Tests**: Entity validation, service methods
**Integration Tests**: CRUD operations, relations
**Manual Tests**: GraphQL operations, database verification

### References

- [Epic 8.3](../real-estate-platform/epics.md#story-831-publiclisting-entity--crud)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.3
- [Architecture](../real-estate-platform/architecture.md) - Section 4.1 (Entity Pattern)

### Success Criteria

**Definition of Done**:
- ✅ PublicListing entity created with all fields
- ✅ Relations configured (owner, property)
- ✅ Status enum and workflow defined
- ✅ GraphQL CRUD operations working
- ✅ Database migration run successfully
- ✅ Indexes created and optimized
- ✅ Service layer implemented
- ✅ Validation working
- ✅ Unit tests pass (>80% coverage)
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
