# Story 1.3: Real Estate Module Structure

Status: drafted

## Story

As a **Developer**,
I want to create the real-estate module skeleton,
so that we have a structured place for all real estate features.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-1.3.1 | Module file created | Import in `app.module.ts` | No TypeScript errors | `npx nx build twenty-server` succeeds |
| AC-1.3.2 | Constants defined | Check UUIDs | Unique for each entity | Unit test validates uniqueness |
| AC-1.3.3 | Module registered | Server starts | No runtime errors | Server logs clean |
| AC-1.3.4 | Module structure | Compare to architecture | Matches exactly | Manual verification |

---

## Backend Tasks

### BE-1: Create Folder Structure (AC: 4)

```bash
# Create module directory structure
mkdir -p packages/twenty-server/src/modules/real-estate/{standard-objects,services,jobs,resolvers,subscribers,constants}

# Verify structure
tree packages/twenty-server/src/modules/real-estate/
# Expected:
# real-estate/
# ├── constants/
# ├── jobs/
# ├── resolvers/
# ├── services/
# ├── standard-objects/
# └── subscribers/
```

**Subtasks**:
- [ ] Create `packages/twenty-server/src/modules/real-estate/`
- [ ] Create `standard-objects/` subdirectory
- [ ] Create `services/` subdirectory
- [ ] Create `jobs/` subdirectory
- [ ] Create `resolvers/` subdirectory
- [ ] Create `subscribers/` subdirectory
- [ ] Create `constants/` subdirectory

### BE-2: Create Object ID Constants (AC: 2)

**File**: `packages/twenty-server/src/modules/real-estate/constants/real-estate-object-ids.ts`

```typescript
/**
 * Standard Object IDs for Real Estate module
 *
 * UUID Range: 20000000-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * This range is reserved for real-estate module to avoid conflicts with Twenty core.
 *
 * Format: 20000000-0000-0000-0000-00000000000X
 * Where X is the entity number (1=project, 2=property, etc.)
 */
export const REAL_ESTATE_OBJECT_IDS = {
  // Core Entities
  project: '20000000-0000-0000-0000-000000000001',
  property: '20000000-0000-0000-0000-000000000002',
  commission: '20000000-0000-0000-0000-000000000003',

  // Extended from Twenty core (use different range)
  // deal: Uses Twenty's Opportunity with extensions
  // contact: Uses Twenty's Person with extensions
  // lead: Uses Twenty's Person with lead fields
} as const;

export type RealEstateObjectId = typeof REAL_ESTATE_OBJECT_IDS[keyof typeof REAL_ESTATE_OBJECT_IDS];
```

**Subtasks**:
- [ ] Create file with object IDs
- [ ] Add project UUID
- [ ] Add property UUID
- [ ] Add commission UUID
- [ ] Add TypeScript type export
- [ ] Document UUID range convention

### BE-3: Create Field ID Constants (AC: 2)

**File**: `packages/twenty-server/src/modules/real-estate/constants/real-estate-field-ids.ts`

```typescript
/**
 * Field IDs for Real Estate entities
 *
 * UUID Format: 20000001-EEEE-0000-0000-FFFFFFFFFFFF
 * Where:
 *   - EEEE = Entity number (0001=project, 0002=property, etc.)
 *   - FFFFFFFFFFFF = Field number within entity
 */

// Project Entity Fields
export const PROJECT_FIELD_IDS = {
  name: '20000001-0001-0000-0000-000000000001',
  developer: '20000001-0001-0000-0000-000000000002',
  location: '20000001-0001-0000-0000-000000000003',
  status: '20000001-0001-0000-0000-000000000004',
  totalPlots: '20000001-0001-0000-0000-000000000005',
  availablePlots: '20000001-0001-0000-0000-000000000006',
  commissionRate: '20000001-0001-0000-0000-000000000007',
  priceMin: '20000001-0001-0000-0000-000000000008',
  priceMax: '20000001-0001-0000-0000-000000000009',
  masterPlanImage: '20000001-0001-0000-0000-000000000010',
  properties: '20000001-0001-0000-0000-000000000011',
} as const;

// Property Entity Fields
export const PROPERTY_FIELD_IDS = {
  plotNumber: '20000001-0002-0000-0000-000000000001',
  blockZone: '20000001-0002-0000-0000-000000000002',
  area: '20000001-0002-0000-0000-000000000003',
  price: '20000001-0002-0000-0000-000000000004',
  status: '20000001-0002-0000-0000-000000000005',
  reservedById: '20000001-0002-0000-0000-000000000006',
  reservedUntil: '20000001-0002-0000-0000-000000000007',
  projectId: '20000001-0002-0000-0000-000000000008',
  direction: '20000001-0002-0000-0000-000000000009',
  plotCoordinates: '20000001-0002-0000-0000-000000000010',
} as const;

// Commission Entity Fields
export const COMMISSION_FIELD_IDS = {
  dealId: '20000001-0003-0000-0000-000000000001',
  propertyId: '20000001-0003-0000-0000-000000000002',
  salesAgentId: '20000001-0003-0000-0000-000000000003',
  dealValue: '20000001-0003-0000-0000-000000000004',
  commissionRate: '20000001-0003-0000-0000-000000000005',
  commissionAmount: '20000001-0003-0000-0000-000000000006',
  status: '20000001-0003-0000-0000-000000000007',
  approvedById: '20000001-0003-0000-0000-000000000008',
  approvedAt: '20000001-0003-0000-0000-000000000009',
  paidAt: '20000001-0003-0000-0000-000000000010',
} as const;
```

**Subtasks**:
- [ ] Create file with field IDs
- [ ] Add PROJECT_FIELD_IDS
- [ ] Add PROPERTY_FIELD_IDS
- [ ] Add COMMISSION_FIELD_IDS
- [ ] Document UUID format convention

### BE-4: Create Constants Index (AC: 2)

**File**: `packages/twenty-server/src/modules/real-estate/constants/index.ts`

```typescript
export * from './real-estate-object-ids';
export * from './real-estate-field-ids';
```

**Subtasks**:
- [ ] Create index file
- [ ] Export all constants

### BE-5: Create Module File (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/real-estate.module.ts`

```typescript
import { Module } from '@nestjs/common';

/**
 * Real Estate Module
 *
 * This module extends Twenty CRM with real estate sales distribution features:
 * - Project management (land development projects)
 * - Property/Plot management (individual land plots)
 * - Reservation system (24h hold with auto-release)
 * - Commission tracking (auto-calculate on deal close)
 *
 * @see docs/real-estate-platform/architecture.md
 */
@Module({
  imports: [
    // TypeORM entities will be added in Epic 2
  ],
  providers: [
    // Services will be added in Epic 2+
  ],
  exports: [
    // Exported services will be added as needed
  ],
})
export class RealEstateModule {}
```

**Subtasks**:
- [ ] Create module file
- [ ] Add @Module decorator
- [ ] Add documentation comments
- [ ] Leave placeholders for future imports

### BE-6: Register Module in ModulesModule (AC: 1, 3)

> **IMPORTANT**: Twenty uses `modules.module.ts` to aggregate feature modules, NOT `app.module.ts` directly.

**File**: `packages/twenty-server/src/modules/modules.module.ts` (MODIFY)

```typescript
import { Module } from '@nestjs/common';

import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { ConnectedAccountModule } from 'src/modules/connected-account/connected-account.module';
import { FavoriteFolderModule } from 'src/modules/favorite-folder/favorite-folder.module';
import { FavoriteModule } from 'src/modules/favorite/favorite.module';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
import { WorkflowModule } from 'src/modules/workflow/workflow.module';
// ADD THIS IMPORT
import { RealEstateModule } from 'src/modules/real-estate/real-estate.module';

@Module({
  imports: [
    MessagingModule,
    CalendarModule,
    ConnectedAccountModule,
    WorkflowModule,
    FavoriteFolderModule,
    FavoriteModule,
    RealEstateModule, // ADD THIS LINE
  ],
  providers: [],
  exports: [],
})
export class ModulesModule {}
```

**Subtasks**:
- [ ] Open `modules.module.ts` (NOT app.module.ts)
- [ ] Add import statement for RealEstateModule
- [ ] Add RealEstateModule to imports array
- [ ] Save file

> **Note**: This follows Twenty's existing pattern where feature modules are registered in `ModulesModule`, which is then imported by `AppModule`.

### BE-7: Entity Registration Pattern (CRITICAL)

> **CRITICAL DISCOVERY**: Standard objects (entities) are NOT registered via NestJS modules. They are registered in a central metadata file.

**File**: `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts` (MODIFY)

```typescript
// Existing imports...
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

// ADD REAL ESTATE ENTITIES (in future stories)
import { RealEstateProjectWorkspaceEntity } from 'src/modules/real-estate/standard-objects/project.workspace-entity';
import { RealEstatePropertyWorkspaceEntity } from 'src/modules/real-estate/standard-objects/property.workspace-entity';
import { CommissionWorkspaceEntity } from 'src/modules/real-estate/standard-objects/commission.workspace-entity';

export const standardObjectMetadataDefinitions = [
  // Existing entities...
  OpportunityWorkspaceEntity,
  PersonWorkspaceEntity,
  // ADD REAL ESTATE ENTITIES
  RealEstateProjectWorkspaceEntity,
  RealEstatePropertyWorkspaceEntity,
  CommissionWorkspaceEntity,
];
```

**Important Notes**:
- This is how Twenty automatically syncs entity metadata to the database
- The `@WorkspaceEntity` decorator defines the entity metadata
- Twenty's workspace sync picks up entities from this array
- Entity files go in `src/modules/real-estate/standard-objects/`
- Module file (real-estate.module.ts) is for SERVICES, not entities

**Two Registration Points**:
1. **Entities** → `standardObjectMetadataDefinitions` in `index.ts`
2. **Services/Jobs** → `RealEstateModule` in `modules.module.ts`

---

## Verification Tasks

### VERIFY-1: TypeScript Compilation (AC: 1)

```bash
# Build the server to check for TypeScript errors
npx nx build twenty-server --skip-nx-cache

# Expected: Build successful with no errors
# Warnings are acceptable

# If errors, check:
# - Import paths are correct
# - All files have proper exports
# - No circular dependencies
```

**Subtasks**:
- [ ] Run build command
- [ ] Verify no TypeScript errors
- [ ] Note any warnings

### VERIFY-2: Runtime Check (AC: 3)

```bash
# Start the server
npx nx start twenty-server

# Expected output should include:
# [Nest] LOG [NestApplication] Nest application successfully started
# No errors related to RealEstateModule

# Check logs for module registration
# Should NOT see any errors about missing providers or imports
```

**Subtasks**:
- [ ] Start server
- [ ] Verify no runtime errors
- [ ] Verify module loads without issues

### VERIFY-3: UUID Uniqueness (AC: 2)

```bash
# Quick check for duplicate UUIDs
grep -r "20000000-" packages/twenty-server/src/modules/real-estate/constants/ | sort | uniq -d
# Expected: No output (no duplicates)

# Or create a simple test
```

**Test File**: `packages/twenty-server/src/modules/real-estate/constants/__tests__/uniqueness.spec.ts`

```typescript
import { REAL_ESTATE_OBJECT_IDS } from '../real-estate-object-ids';
import { PROJECT_FIELD_IDS, PROPERTY_FIELD_IDS, COMMISSION_FIELD_IDS } from '../real-estate-field-ids';

describe('Real Estate Constants', () => {
  it('should have unique object IDs', () => {
    const ids = Object.values(REAL_ESTATE_OBJECT_IDS);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have unique field IDs across all entities', () => {
    const allFieldIds = [
      ...Object.values(PROJECT_FIELD_IDS),
      ...Object.values(PROPERTY_FIELD_IDS),
      ...Object.values(COMMISSION_FIELD_IDS),
    ];
    const uniqueIds = new Set(allFieldIds);
    expect(uniqueIds.size).toBe(allFieldIds.length);
  });

  it('should use correct UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    Object.values(REAL_ESTATE_OBJECT_IDS).forEach(id => {
      expect(id).toMatch(uuidRegex);
    });
  });
});
```

**Subtasks**:
- [ ] Create test file
- [ ] Run tests: `npx nx test twenty-server --testPathPattern=uniqueness`
- [ ] Verify all tests pass

---

## Definition of Done

- [ ] Folder structure created matching architecture
- [ ] Object ID constants file created
- [ ] Field ID constants file created
- [ ] Constants index file created
- [ ] Module file created with @Module decorator
- [ ] Module registered in app.module.ts
- [ ] TypeScript compilation succeeds
- [ ] Server starts without errors
- [ ] UUID uniqueness test passes

---

## Dev Notes

### Architecture Patterns
- **NestJS Module Pattern**: Standard module registration
- **UUID Constants**: Prevents ID conflicts with Twenty core
- **Decorator Pattern**: Will use @WorkspaceEntity in Epic 2

### Source Tree (Final)
```
packages/twenty-server/src/modules/real-estate/
├── constants/
│   ├── index.ts
│   ├── real-estate-object-ids.ts
│   ├── real-estate-field-ids.ts
│   └── __tests__/
│       └── uniqueness.spec.ts
├── jobs/                    # Empty, for Epic 2
├── resolvers/               # Empty, for Epic 2
├── services/                # Empty, for Epic 2
├── standard-objects/        # Empty, for Epic 2
├── subscribers/             # Empty, for Epic 2
└── real-estate.module.ts
```

### UUID Range Convention
| Range | Purpose |
|-------|---------|
| `20000000-0000-*` | Object IDs |
| `20000001-0001-*` | Project field IDs |
| `20000001-0002-*` | Property field IDs |
| `20000001-0003-*` | Commission field IDs |

### References
- [Source: architecture.md#Project-Structure lines 92-121]
- [Source: tech-spec-epic-1.md#Story-1.3]
- [Source: tech-spec-epic-1.md#Constants-Object-IDs]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- packages/twenty-server/src/modules/real-estate/constants/real-estate-object-ids.ts
- packages/twenty-server/src/modules/real-estate/constants/real-estate-field-ids.ts
- packages/twenty-server/src/modules/real-estate/constants/index.ts
- packages/twenty-server/src/modules/real-estate/constants/__tests__/uniqueness.spec.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts
- packages/twenty-server/src/app.module.ts (modified)
