# Story 8.6.1: Inquiry Entity & CRUD

Status: drafted

## Story
As a developer, I want to create the Inquiry entity with CRUD operations, so that buyers can send inquiries to sellers.

## Acceptance Criteria

1. **Inquiry Entity Created**
   - Given PublicListing entity (Epic 8.3)
   - When I create Inquiry entity
   - Then `InquiryWorkspaceEntity` created with fields from PRD 4.8.8:
     - message (TEXT, required)
     - contactPhone (VARCHAR, required)
     - contactEmail (VARCHAR, optional)
     - preferredContact (ENUM: PHONE, EMAIL, BOTH)
     - status (ENUM: NEW, CONTACTED, CLOSED)
     - notes (TEXT, optional, for seller)
     - convertedToDeal (UUID, nullable, for lead conversion)
   - And entity follows Twenty workspace entity pattern

2. **Relations Defined**
   - Given entity created
   - When relations defined
   - Then includes:
     - `listing` → PublicListing (many-to-one, required)
     - `inquirer` → PublicUser (many-to-one, nullable for anonymous)
   - And foreign keys properly indexed
   - And cascade delete configured

3. **Status Enum Defined**
   - Given status field
   - When enum created
   - Then includes:
     - NEW: Initial status when inquiry submitted
     - CONTACTED: Seller has responded
     - CLOSED: Inquiry resolved/closed
   - And default value is NEW

4. **Validation Rules**
   - Given field validation
   - When entity saved
   - Then validates:
     - message: min 10 chars, max 500 chars
     - contactPhone: Vietnamese phone format
     - contactEmail: valid email format (if provided)
     - preferredContact: one of enum values
   - And returns clear error messages

5. **Timestamps Added**
   - Given entity lifecycle
   - When timestamps defined
   - Then includes:
     - createdAt: When inquiry submitted
     - respondedAt: When seller first responds
     - closedAt: When inquiry closed
   - And automatically managed

6. **GraphQL CRUD Operations**
   - Given entity created
   - When GraphQL generated
   - Then CRUD operations available:
     - createInquiry (mutation)
     - updateInquiry (mutation)
     - deleteInquiry (mutation)
     - inquiry (query, by ID)
     - inquiries (query, with filters)
   - And properly typed

7. **Database Migration**
   - Given entity defined
   - When migration created
   - Then Inquiry table created with:
     - All fields
     - Foreign keys
     - Indexes
     - Constraints
   - And migration reversible

8. **Anonymous Inquiry Support**
   - Given anonymous buyer
   - When inquiry submitted
   - Then inquirer field is null
   - And contact info still captured
   - And inquiry processed normally

## Tasks / Subtasks

- [ ] **Task 1: Create Inquiry Workspace Entity** (AC: #1, #2)
  - [ ] Create entity file:
    ```typescript
    @WorkspaceEntity({
      standardId: STANDARD_OBJECT_IDS.inquiry,
      namePlural: 'inquiries',
      labelSingular: 'Inquiry',
      labelPlural: 'Inquiries',
      description: 'Buyer inquiries about listings',
      icon: 'IconMessageCircle',
    })
    export class InquiryWorkspaceEntity extends BaseWorkspaceEntity {
      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.MESSAGE,
        type: FieldMetadataType.TEXT,
        label: 'Message',
        description: 'Inquiry message from buyer',
        icon: 'IconMessage',
      })
      @IsNotEmpty()
      @Length(10, 500)
      message: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.CONTACT_PHONE,
        type: FieldMetadataType.TEXT,
        label: 'Contact Phone',
        description: 'Buyer contact phone',
        icon: 'IconPhone',
      })
      @IsNotEmpty()
      @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/)
      contactPhone: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.CONTACT_EMAIL,
        type: FieldMetadataType.EMAIL,
        label: 'Contact Email',
        description: 'Buyer contact email',
        icon: 'IconMail',
      })
      @IsOptional()
      @IsEmail()
      contactEmail?: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.PREFERRED_CONTACT,
        type: FieldMetadataType.SELECT,
        label: 'Preferred Contact',
        description: 'Preferred contact method',
        icon: 'IconPhone',
        options: [
          { value: 'PHONE', label: 'Phone', position: 0, color: 'blue' },
          { value: 'EMAIL', label: 'Email', position: 1, color: 'green' },
          { value: 'BOTH', label: 'Both', position: 2, color: 'purple' },
        ],
        defaultValue: "'PHONE'",
      })
      preferredContact: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.STATUS,
        type: FieldMetadataType.SELECT,
        label: 'Status',
        description: 'Inquiry status',
        icon: 'IconCircleDot',
        options: [
          { value: 'NEW', label: 'New', position: 0, color: 'blue' },
          { value: 'CONTACTED', label: 'Contacted', position: 1, color: 'yellow' },
          { value: 'CLOSED', label: 'Closed', position: 2, color: 'gray' },
        ],
        defaultValue: "'NEW'",
      })
      status: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.NOTES,
        type: FieldMetadataType.TEXT,
        label: 'Notes',
        description: 'Seller notes about inquiry',
        icon: 'IconNotes',
      })
      @IsOptional()
      notes?: string;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.CONVERTED_TO_DEAL,
        type: FieldMetadataType.UUID,
        label: 'Converted to Deal',
        description: 'Deal ID if converted to lead',
        icon: 'IconArrowRight',
      })
      @IsOptional()
      convertedToDeal?: string;

      // Relations
      @WorkspaceRelation({
        standardId: INQUIRY_STANDARD_FIELD_IDS.LISTING,
        type: RelationMetadataType.MANY_TO_ONE,
        label: 'Listing',
        description: 'Listing being inquired about',
        icon: 'IconHome',
        inverseSideTarget: () => PublicListingWorkspaceEntity,
        inverseSideFieldKey: 'inquiries',
      })
      listing: Relation<PublicListingWorkspaceEntity>;

      @WorkspaceRelation({
        standardId: INQUIRY_STANDARD_FIELD_IDS.INQUIRER,
        type: RelationMetadataType.MANY_TO_ONE,
        label: 'Inquirer',
        description: 'User who submitted inquiry (null for anonymous)',
        icon: 'IconUser',
        inverseSideTarget: () => PublicUserWorkspaceEntity,
        inverseSideFieldKey: 'inquiries',
      })
      @IsOptional()
      inquirer?: Relation<PublicUserWorkspaceEntity>;

      // Timestamps
      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.RESPONDED_AT,
        type: FieldMetadataType.DATE_TIME,
        label: 'Responded At',
        description: 'When seller first responded',
        icon: 'IconClock',
      })
      @IsOptional()
      respondedAt?: Date;

      @WorkspaceField({
        standardId: INQUIRY_STANDARD_FIELD_IDS.CLOSED_AT,
        type: FieldMetadataType.DATE_TIME,
        label: 'Closed At',
        description: 'When inquiry was closed',
        icon: 'IconCheck',
      })
      @IsOptional()
      closedAt?: Date;
    }
    ```

- [ ] **Task 2: Update PublicListing Entity** (AC: #2)
  - [ ] Add inverse relation:
    ```typescript
    @WorkspaceRelation({
      standardId: PUBLIC_LISTING_STANDARD_FIELD_IDS.INQUIRIES,
      type: RelationMetadataType.ONE_TO_MANY,
      label: 'Inquiries',
      description: 'Inquiries about this listing',
      icon: 'IconMessageCircle',
      inverseSideTarget: () => InquiryWorkspaceEntity,
      inverseSideFieldKey: 'listing',
    })
    inquiries: Relation<InquiryWorkspaceEntity[]>;
    ```

- [ ] **Task 3: Create Database Migration** (AC: #7)
  - [ ] Generate migration:
    ```typescript
    export class CreateInquiryTable1234567890 implements MigrationInterface {
      public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
          new Table({
            name: 'inquiry',
            columns: [
              {
                name: 'id',
                type: 'uuid',
                isPrimary: true,
                default: 'uuid_generate_v4()',
              },
              {
                name: 'message',
                type: 'text',
                isNullable: false,
              },
              {
                name: 'contactPhone',
                type: 'varchar',
                length: '20',
                isNullable: false,
              },
              {
                name: 'contactEmail',
                type: 'varchar',
                length: '255',
                isNullable: true,
              },
              {
                name: 'preferredContact',
                type: 'enum',
                enum: ['PHONE', 'EMAIL', 'BOTH'],
                default: "'PHONE'",
              },
              {
                name: 'status',
                type: 'enum',
                enum: ['NEW', 'CONTACTED', 'CLOSED'],
                default: "'NEW'",
              },
              {
                name: 'notes',
                type: 'text',
                isNullable: true,
              },
              {
                name: 'convertedToDeal',
                type: 'uuid',
                isNullable: true,
              },
              {
                name: 'listingId',
                type: 'uuid',
                isNullable: false,
              },
              {
                name: 'inquirerId',
                type: 'uuid',
                isNullable: true,
              },
              {
                name: 'createdAt',
                type: 'timestamp',
                default: 'now()',
              },
              {
                name: 'respondedAt',
                type: 'timestamp',
                isNullable: true,
              },
              {
                name: 'closedAt',
                type: 'timestamp',
                isNullable: true,
              },
              {
                name: 'updatedAt',
                type: 'timestamp',
                default: 'now()',
              },
              {
                name: 'deletedAt',
                type: 'timestamp',
                isNullable: true,
              },
            ],
          }),
          true,
        );

        // Add foreign keys
        await queryRunner.createForeignKey(
          'inquiry',
          new ForeignKey({
            columnNames: ['listingId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'publicListing',
            onDelete: 'CASCADE',
          }),
        );

        await queryRunner.createForeignKey(
          'inquiry',
          new ForeignKey({
            columnNames: ['inquirerId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'publicUser',
            onDelete: 'SET NULL',
          }),
        );

        // Add indexes
        await queryRunner.createIndex(
          'inquiry',
          new TableIndex({
            name: 'IDX_INQUIRY_LISTING',
            columnNames: ['listingId'],
          }),
        );

        await queryRunner.createIndex(
          'inquiry',
          new TableIndex({
            name: 'IDX_INQUIRY_INQUIRER',
            columnNames: ['inquirerId'],
          }),
        );

        await queryRunner.createIndex(
          'inquiry',
          new TableIndex({
            name: 'IDX_INQUIRY_STATUS',
            columnNames: ['status'],
          }),
        );
      }

      public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('inquiry');
      }
    }
    ```

- [ ] **Task 4: Create GraphQL Resolver** (AC: #6)
  - [ ] Create resolver:
    ```typescript
    @Resolver(() => Inquiry)
    export class InquiryResolver {
      constructor(
        private readonly inquiryService: InquiryService,
      ) {}

      @Query(() => Inquiry)
      async inquiry(@Args('id') id: string): Promise<Inquiry> {
        return this.inquiryService.findOne(id);
      }

      @Query(() => [Inquiry])
      async inquiries(
        @Args('filters', { nullable: true }) filters?: InquiryFilters,
      ): Promise<Inquiry[]> {
        return this.inquiryService.findAll(filters);
      }

      @Mutation(() => Inquiry)
      async createInquiry(
        @Args('data') data: CreateInquiryInput,
      ): Promise<Inquiry> {
        return this.inquiryService.create(data);
      }

      @Mutation(() => Inquiry)
      async updateInquiry(
        @Args('id') id: string,
        @Args('data') data: UpdateInquiryInput,
      ): Promise<Inquiry> {
        return this.inquiryService.update(id, data);
      }

      @Mutation(() => Boolean)
      async deleteInquiry(@Args('id') id: string): Promise<boolean> {
        await this.inquiryService.delete(id);
        return true;
      }
    }
    ```

- [ ] **Task 5: Create Inquiry Service** (AC: #8)
  - [ ] Implement service:
    ```typescript
    @Injectable()
    export class InquiryService {
      constructor(
        @InjectRepository(Inquiry)
        private readonly inquiryRepository: Repository<Inquiry>,
      ) {}

      async create(data: CreateInquiryInput): Promise<Inquiry> {
        const inquiry = this.inquiryRepository.create({
          ...data,
          status: 'NEW',
        });

        return this.inquiryRepository.save(inquiry);
      }

      async findOne(id: string): Promise<Inquiry> {
        return this.inquiryRepository.findOne({
          where: { id },
          relations: ['listing', 'inquirer'],
        });
      }

      async findAll(filters?: InquiryFilters): Promise<Inquiry[]> {
        const query = this.inquiryRepository.createQueryBuilder('inquiry')
          .leftJoinAndSelect('inquiry.listing', 'listing')
          .leftJoinAndSelect('inquiry.inquirer', 'inquirer');

        if (filters?.status) {
          query.andWhere('inquiry.status = :status', { status: filters.status });
        }

        if (filters?.listingId) {
          query.andWhere('inquiry.listingId = :listingId', { listingId: filters.listingId });
        }

        if (filters?.inquirerId) {
          query.andWhere('inquiry.inquirerId = :inquirerId', { inquirerId: filters.inquirerId });
        }

        return query.getMany();
      }

      async update(id: string, data: UpdateInquiryInput): Promise<Inquiry> {
        await this.inquiryRepository.update(id, data);
        return this.findOne(id);
      }

      async delete(id: string): Promise<void> {
        await this.inquiryRepository.softDelete(id);
      }
    }
    ```

- [ ] **Task 6: Add Validation** (AC: #4)
  - [ ] Create validation DTOs:
    ```typescript
    export class CreateInquiryInput {
      @IsNotEmpty()
      @Length(10, 500)
      message: string;

      @IsNotEmpty()
      @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
        message: 'Invalid Vietnamese phone number',
      })
      contactPhone: string;

      @IsOptional()
      @IsEmail()
      contactEmail?: string;

      @IsEnum(['PHONE', 'EMAIL', 'BOTH'])
      preferredContact: string;

      @IsUUID()
      listingId: string;

      @IsOptional()
      @IsUUID()
      inquirerId?: string;
    }
    ```

- [ ] **Task 7: Create Unit Tests**
  - [ ] Test entity creation
  - [ ] Test validation rules
  - [ ] Test relations
  - [ ] Test anonymous inquiries
  - [ ] Achieve >80% coverage

- [ ] **Task 8: Integration Testing**
  - [ ] Test CRUD operations
  - [ ] Test with/without inquirer
  - [ ] Test cascade delete
  - [ ] Test GraphQL queries/mutations

- [ ] **Task 9: Manual Testing**
  - [ ] Create inquiry via GraphQL
  - [ ] Query inquiries with filters
  - [ ] Update inquiry status
  - [ ] Test anonymous inquiry
  - [ ] Verify database constraints

## Dev Notes

### Architecture Context

**Inquiry Entity**: Buyer inquiries about listings
- Workspace entity following Twenty pattern
- Supports anonymous inquiries (inquirer nullable)
- Relations to PublicListing and PublicUser
- Status workflow: NEW → CONTACTED → CLOSED
- Timestamps for lifecycle tracking
- Lead conversion support (convertedToDeal field)

**Key Design Decisions**:
- Anonymous inquiry support (inquirer nullable)
- Vietnamese phone validation
- Message length limits (10-500 chars)
- Status enum for workflow
- Soft delete for audit trail

### Implementation Details

**Entity Fields**:
- message: TEXT (10-500 chars)
- contactPhone: VARCHAR (Vietnamese format)
- contactEmail: VARCHAR (optional)
- preferredContact: ENUM (PHONE, EMAIL, BOTH)
- status: ENUM (NEW, CONTACTED, CLOSED)
- notes: TEXT (seller notes)
- convertedToDeal: UUID (for lead conversion)

**Relations**:
- listing → PublicListing (many-to-one, required)
- inquirer → PublicUser (many-to-one, nullable)

**Timestamps**:
- createdAt: Inquiry submitted
- respondedAt: Seller first response
- closedAt: Inquiry closed

### Testing Strategy

**Unit Tests**: Entity creation, validation, relations
**Integration Tests**: CRUD operations, GraphQL
**Manual Tests**: Anonymous inquiries, cascade delete

### References

- [Epic 8.6](../real-estate-platform/epics.md#story-861-inquiry-entity--crud)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.8

### Success Criteria

**Definition of Done**:
- ✅ Inquiry entity created
- ✅ All fields defined with validation
- ✅ Relations to PublicListing and PublicUser
- ✅ Status enum implemented
- ✅ GraphQL CRUD operations working
- ✅ Database migration created
- ✅ Anonymous inquiry support working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 4 hours

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
