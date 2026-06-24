# Story 2.2: Property Entity CRUD

Status: drafted

## Story

As an **Admin**,
I want to create and manage properties within projects,
so that I can track individual land plots.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.2.1 | Admin role | Create property under project | Property saved with project relation | GraphQL returns property with projectId |
| AC-2.2.2 | Property created | View project detail | Property appears in properties list | Query returns property in project.properties |
| AC-2.2.3 | Property | Update status | Status changes correctly | Status field updated |

---

## Backend Tasks

### BE-1: Create Property Entity (AC: 1, 2)

> **IMPORTANT**: This follows Twenty's actual entity pattern with correct imports and i18n labels.

**File**: `packages/twenty-server/src/modules/real-estate/standard-objects/property.workspace-entity.ts`

```typescript
import { msg } from '@lingui/core/macro';
import { FieldMetadataType, RelationOnDeleteAction } from 'twenty-shared/types';

import { RelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';
import { Relation } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/relation.interface';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { WorkspaceEntity } from 'src/engine/twenty-orm/decorators/workspace-entity.decorator';
import { WorkspaceField } from 'src/engine/twenty-orm/decorators/workspace-field.decorator';
import { WorkspaceFieldIndex } from 'src/engine/twenty-orm/decorators/workspace-field-index.decorator';
import { WorkspaceIsNullable } from 'src/engine/twenty-orm/decorators/workspace-is-nullable.decorator';
import { WorkspaceJoinColumn } from 'src/engine/twenty-orm/decorators/workspace-join-column.decorator';
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';

import { REAL_ESTATE_OBJECT_IDS } from '../constants/real-estate-object-ids';
import { PROPERTY_FIELD_IDS } from '../constants/real-estate-field-ids';
import { ProjectWorkspaceEntity } from './project.workspace-entity';

@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.property,
  namePlural: 'realEstateProperties',
  labelSingular: msg`Property`,
  labelPlural: msg`Properties`,
  description: msg`Individual land plot or property unit`,
  icon: 'IconHome',
  labelIdentifierStandardId: PROPERTY_FIELD_IDS.plotNumber,
})
export class PropertyWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.plotNumber,
    type: FieldMetadataType.TEXT,
    label: 'Plot Number',
    isNullable: false,
  })
  plotNumber: string;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.blockZone,
    type: FieldMetadataType.TEXT,
    label: 'Block/Zone',
  })
  blockZone: string;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.area,
    type: FieldMetadataType.NUMBER,
    label: 'Area (m²)',
  })
  area: number;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.price,
    type: FieldMetadataType.CURRENCY,
    label: 'Price (VNĐ)',
  })
  price: number;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: 'Status',
    options: [
      { value: 'AVAILABLE', label: 'Available', color: 'green' },
      { value: 'RESERVED', label: 'Reserved', color: 'yellow' },
      { value: 'DEPOSIT_PAID', label: 'Deposit Paid', color: 'orange' },
      { value: 'CONTRACTED', label: 'Contracted', color: 'blue' },
      { value: 'SOLD', label: 'Sold', color: 'gray' },
    ],
    defaultValue: 'AVAILABLE',
  })
  status: PropertyStatus;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.direction,
    type: FieldMetadataType.SELECT,
    label: 'Direction',
    options: [
      { value: 'NORTH', label: 'North' },
      { value: 'SOUTH', label: 'South' },
      { value: 'EAST', label: 'East' },
      { value: 'WEST', label: 'West' },
      { value: 'NORTHEAST', label: 'Northeast' },
      { value: 'NORTHWEST', label: 'Northwest' },
      { value: 'SOUTHEAST', label: 'Southeast' },
      { value: 'SOUTHWEST', label: 'Southwest' },
    ],
  })
  direction: string;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.reservedById,
    type: FieldMetadataType.UUID,
    label: 'Reserved By',
    description: 'User ID who reserved this property',
  })
  reservedById: string | null;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.reservedUntil,
    type: FieldMetadataType.DATE_TIME,
    label: 'Reserved Until',
    description: 'Reservation expiry timestamp',
  })
  reservedUntil: Date | null;

  @WorkspaceField({
    standardId: PROPERTY_FIELD_IDS.plotCoordinates,
    type: FieldMetadataType.TEXT,
    label: 'Plot Coordinates',
    description: 'SVG path or coordinates for interactive map',
  })
  plotCoordinates: string;

  @WorkspaceRelation({
    standardId: PROPERTY_FIELD_IDS.projectId,
    type: RelationType.MANY_TO_ONE,
    label: 'Project',
    inverseSideTarget: () => ProjectWorkspaceEntity,
    inverseSideFieldKey: 'properties',
  })
  project: Relation<ProjectWorkspaceEntity>;
  projectId: string;
}
```

**Subtasks**:
- [ ] Create property.workspace-entity.ts
- [ ] Add all fields from PRD
- [ ] Add PropertyStatus enum
- [ ] Add relation to Project
- [ ] Add reservation fields

### BE-2: Register Entity in standardObjectMetadataDefinitions (CRITICAL)

> **⚠️ CRITICAL**: Must add entity to central metadata file for Twenty to sync it.

**File**: `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts` (MODIFY)

```typescript
// Add import
import { RealEstatePropertyWorkspaceEntity } from 'src/modules/real-estate/standard-objects/property.workspace-entity';

// Add to array
export const standardObjectMetadataDefinitions = [
  // ... existing entities
  RealEstateProjectWorkspaceEntity,
  RealEstatePropertyWorkspaceEntity, // ADD THIS
];
```

**Subtasks**:
- [ ] Add import for RealEstatePropertyWorkspaceEntity
- [ ] Add to standardObjectMetadataDefinitions array

### BE-3: Create Property Listener (AC: 3)

> **⚠️ CRITICAL**: Use Twenty's `@OnDatabaseBatchEvent` decorator, NOT TypeORM's `@EventSubscriber`.

**File**: `packages/twenty-server/src/modules/real-estate/listeners/property.listener.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordCreateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-create.event';
import { ObjectRecordUpdateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-update.event';
import { ObjectRecordDeleteEvent } from 'src/engine/core-modules/event-emitter/types/object-record-delete.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { ProjectService } from '../services/project.service';

@Injectable()
export class PropertyListener {
  constructor(private readonly projectService: ProjectService) {}

  @OnDatabaseBatchEvent('realEstateProperty', DatabaseEventAction.CREATED)
  async handlePropertyCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent>,
  ): Promise<void> {
    const projectIds = new Set<string>();

    for (const event of payload.events) {
      const projectId = event.properties.after?.projectId;
      if (projectId) {
        projectIds.add(projectId);
      }
    }

    for (const projectId of projectIds) {
      await this.projectService.updateAvailablePlots(
        payload.workspaceId,
        projectId,
      );
    }
  }

  @OnDatabaseBatchEvent('realEstateProperty', DatabaseEventAction.UPDATED)
  async handlePropertyUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent>,
  ): Promise<void> {
    const projectIds = new Set<string>();

    for (const event of payload.events) {
      // Check if status changed
      const beforeStatus = event.properties.before?.status;
      const afterStatus = event.properties.after?.status;

      if (beforeStatus !== afterStatus) {
        const projectId = event.properties.after?.projectId;
        if (projectId) {
          projectIds.add(projectId);
        }
      }
    }

    for (const projectId of projectIds) {
      await this.projectService.updateAvailablePlots(
        payload.workspaceId,
        projectId,
      );
    }
  }

  @OnDatabaseBatchEvent('realEstateProperty', DatabaseEventAction.DELETED)
  async handlePropertyDeleted(
    payload: WorkspaceEventBatch<ObjectRecordDeleteEvent>,
  ): Promise<void> {
    const projectIds = new Set<string>();

    for (const event of payload.events) {
      const projectId = event.properties.before?.projectId;
      if (projectId) {
        projectIds.add(projectId);
      }
    }

    for (const projectId of projectIds) {
      await this.projectService.updateAvailablePlots(
        payload.workspaceId,
        projectId,
      );
    }
  }
}
```

**Key Points**:
- Use `@OnDatabaseBatchEvent('entityName', DatabaseEventAction.XXX)`
- Event payload includes `workspaceId` for multi-tenant support
- Access before/after values via `event.properties`
- Entity name is camelCase singular (e.g., `realEstateProperty`)

**Subtasks**:
- [ ] Create listener file
- [ ] Use @OnDatabaseBatchEvent decorator
- [ ] Handle CREATED, UPDATED, DELETED events
- [ ] Update availablePlots on status change

### BE-4: Update Module (AC: 1)

```typescript
// Add to real-estate.module.ts
import { PropertyListener } from './listeners/property.listener';

@Module({
  imports: [],  // No TypeOrmModule.forFeature needed!
  providers: [
    ProjectService,
    PropertyListener,
  ],
})
export class RealEstateModule {}
```

**Subtasks**:
- [ ] Add PropertyListener to providers
- [ ] No TypeOrmModule.forFeature needed

---

## Database Tasks

### DB-1: Run Migration (AC: 1)

```bash
npx nx database:migrate twenty-server
```

**Expected Schema**:
```sql
CREATE TABLE property (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_number VARCHAR(50) NOT NULL,
  block_zone VARCHAR(50),
  area NUMERIC(10,2),
  price NUMERIC(15,2),
  status VARCHAR(20) DEFAULT 'AVAILABLE',
  direction VARCHAR(20),
  reserved_by_id UUID REFERENCES "user"(id),
  reserved_until TIMESTAMPTZ,
  plot_coordinates TEXT,
  project_id UUID NOT NULL REFERENCES project(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  workspace_id UUID NOT NULL
);

CREATE INDEX idx_property_project ON property(project_id);
CREATE INDEX idx_property_status ON property(status);
CREATE INDEX idx_property_reserved ON property(reserved_until) WHERE status = 'RESERVED';
```

**Subtasks**:
- [ ] Run migration
- [ ] Verify table created
- [ ] Verify indexes created

---

## API Tasks

### API-1: Create Property (AC: 1)

```graphql
mutation CreateProperty {
  createProperty(data: {
    plotNumber: "A-101"
    blockZone: "Block A"
    area: 120.5
    price: 1500000000
    status: AVAILABLE
    direction: EAST
    projectId: "project-uuid"
  }) {
    id
    plotNumber
    status
    project { id name }
  }
}
```

### API-2: List Properties by Project (AC: 2)

```graphql
query GetProjectWithProperties {
  project(id: "project-uuid") {
    id
    name
    totalPlots
    availablePlots
    properties {
      edges {
        node {
          id
          plotNumber
          status
          price
        }
      }
    }
  }
}
```

### API-3: Update Property Status (AC: 3)

```graphql
mutation UpdatePropertyStatus {
  updateProperty(id: "property-uuid", data: {
    status: DEPOSIT_PAID
  }) {
    id
    status
  }
}
```

**Subtasks**:
- [ ] Test create property
- [ ] Test list by project
- [ ] Test status update
- [ ] Verify availablePlots updates

---

## Testing Tasks

### TEST-1: Unit Tests

```typescript
describe('PropertySubscriber', () => {
  it('should update availablePlots when property status changes', async () => {
    const project = await createProject({ totalPlots: 10 });
    const property = await createProperty({ projectId: project.id, status: 'AVAILABLE' });

    // Update status
    await updateProperty(property.id, { status: 'SOLD' });

    // Check project
    const updatedProject = await getProject(project.id);
    expect(updatedProject.availablePlots).toBe(9);
  });
});
```

**Subtasks**:
- [ ] Write subscriber tests
- [ ] Test status change triggers
- [ ] Run tests

---

## Definition of Done

- [ ] Property entity created
- [ ] PropertySubscriber created
- [ ] Module updated
- [ ] Migration run
- [ ] CRUD operations work
- [ ] Status changes update project.availablePlots
- [ ] Tests passing

---

## Dev Notes

### Status Flow
```
AVAILABLE → RESERVED → DEPOSIT_PAID → CONTRACTED → SOLD
     ↑          ↓
     └──────────┘ (auto-release after 24h)
```

### References
- [Source: architecture.md lines 286-330]
- [Source: tech-spec-epic-2.md#Entity-Property]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/standard-objects/property.workspace-entity.ts
- packages/twenty-server/src/modules/real-estate/subscribers/property.subscriber.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts (modified)
