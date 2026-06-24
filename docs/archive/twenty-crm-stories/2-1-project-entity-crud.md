# Story 2.1: Project Entity CRUD

Status: drafted

## Story

As an **Admin**,
I want to create and manage real estate projects,
so that I can organize properties by project.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-2.1.1 | Admin role | Create project with all fields | Project saved successfully | GraphQL mutation returns project ID |
| AC-2.1.2 | Project created | View project list | Project appears with correct data | Query returns project in list |
| AC-2.1.3 | Project | Upload master plan image (<20MB) | Image stored and displayed | Image URL accessible |
| AC-2.1.4 | Project with properties | Property status changes | availablePlots updates | Computed field reflects change |

---

## Backend Tasks

### BE-1: Create Project Entity (AC: 1, 2)

> **IMPORTANT**: This follows Twenty's actual entity pattern with correct imports and i18n labels.

**File**: `packages/twenty-server/src/modules/real-estate/standard-objects/project.workspace-entity.ts`

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
import { WorkspaceRelation } from 'src/engine/twenty-orm/decorators/workspace-relation.decorator';

import { REAL_ESTATE_OBJECT_IDS } from '../constants/real-estate-object-ids';
import { PROJECT_FIELD_IDS } from '../constants/real-estate-field-ids';
import { PropertyWorkspaceEntity } from './property.workspace-entity';

@WorkspaceEntity({
  standardId: REAL_ESTATE_OBJECT_IDS.project,
  namePlural: 'realEstateProjects',
  labelSingular: msg`Real Estate Project`,
  labelPlural: msg`Real Estate Projects`,
  description: msg`A real estate development project containing multiple properties`,
  icon: 'IconBuilding',
  labelIdentifierStandardId: PROJECT_FIELD_IDS.name,
})
export class ProjectWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,
    description: msg`Project name`,
    icon: 'IconBuilding',
  })
  name: string;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.developer,
    type: FieldMetadataType.TEXT,
    label: msg`Developer`,
    description: msg`Developer company name`,
    icon: 'IconBuildingSkyscraper',
  })
  @WorkspaceIsNullable()
  developer: string | null;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.location,
    type: FieldMetadataType.TEXT,
    label: msg`Location`,
    description: msg`Project location/address`,
    icon: 'IconMapPin',
  })
  @WorkspaceIsNullable()
  location: string | null;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Project status`,
    icon: 'IconProgressCheck',
    options: [
      { value: 'PLANNING', label: 'Planning', position: 0, color: 'gray' },
      { value: 'ACTIVE', label: 'Active', position: 1, color: 'green' },
      { value: 'SOLD_OUT', label: 'Sold Out', position: 2, color: 'blue' },
      { value: 'SUSPENDED', label: 'Suspended', position: 3, color: 'red' },
    ],
    defaultValue: "'PLANNING'",
  })
  @WorkspaceFieldIndex()
  status: string;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.totalPlots,
    type: FieldMetadataType.NUMBER,
    label: msg`Total Plots`,
    description: msg`Total number of plots in project`,
    icon: 'IconGridDots',
    defaultValue: 0,
  })
  totalPlots: number;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.availablePlots,
    type: FieldMetadataType.NUMBER,
    label: msg`Available Plots`,
    description: msg`Number of available plots (computed)`,
    icon: 'IconGridDots',
    defaultValue: 0,
  })
  availablePlots: number;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.commissionRate,
    type: FieldMetadataType.NUMBER,
    label: msg`Commission Rate`,
    description: msg`Default commission rate (%)`,
    icon: 'IconPercentage',
  })
  @WorkspaceIsNullable()
  commissionRate: number | null;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.priceMin,
    type: FieldMetadataType.NUMBER,
    label: msg`Min Price`,
    description: msg`Minimum property price (VNĐ)`,
    icon: 'IconCurrencyDong',
  })
  @WorkspaceIsNullable()
  priceMin: number | null;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.priceMax,
    type: FieldMetadataType.NUMBER,
    label: msg`Max Price`,
    description: msg`Maximum property price (VNĐ)`,
    icon: 'IconCurrencyDong',
  })
  @WorkspaceIsNullable()
  priceMax: number | null;

  @WorkspaceRelation({
    standardId: PROJECT_FIELD_IDS.properties,
    type: RelationType.ONE_TO_MANY,
    label: msg`Properties`,
    description: msg`Properties in this project`,
    icon: 'IconHome',
    inverseSideTarget: () => PropertyWorkspaceEntity,
    onDelete: RelationOnDeleteAction.CASCADE,
  })
  @WorkspaceIsNullable()
  properties: Relation<PropertyWorkspaceEntity[]>;
}
```

> **Key Differences from initial version**:
> - Uses `msg` from `@lingui/core/macro` for i18n labels
> - Imports from actual Twenty paths (`src/engine/...`)
> - Uses `@WorkspaceIsNullable()` decorator for nullable fields
> - Uses `@WorkspaceFieldIndex()` for indexed fields
> - Adds `position` to SELECT options
> - Uses `defaultValue` with quoted strings for SELECT

**Subtasks**:
- [ ] Create file with entity definition
- [ ] Add all fields from PRD 4.1.2
- [ ] Add @WorkspaceEntity decorator with correct standardId
- [ ] Add @WorkspaceField for each field
- [ ] Add @WorkspaceRelation for properties

### BE-2: Register Entity in standardObjectMetadataDefinitions (CRITICAL)

> **⚠️ CRITICAL**: Entities are NOT registered via NestJS modules. They must be added to the central metadata file.

**File**: `packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts` (MODIFY)

```typescript
// Add import at the top
import { RealEstateProjectWorkspaceEntity } from 'src/modules/real-estate/standard-objects/project.workspace-entity';

// Add to standardObjectMetadataDefinitions array
export const standardObjectMetadataDefinitions = [
  // ... existing entities
  TaskWorkspaceEntity,
  TaskTargetWorkspaceEntity,
  RealEstateProjectWorkspaceEntity, // ADD THIS
];
```

**Why?**
- Twenty's workspace sync reads this array to create/update object metadata
- Without this registration, the entity won't appear in the UI
- This is different from NestJS module registration

**Subtasks**:
- [ ] Open `src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts`
- [ ] Add import for RealEstateProjectWorkspaceEntity
- [ ] Add entity to standardObjectMetadataDefinitions array
- [ ] Save file

### BE-3: Create Project Service (AC: 1, 4)

> **⚠️ CRITICAL**: Do NOT use `@InjectRepository` for workspace entities. Use `TwentyORMGlobalManager`.

**File**: `packages/twenty-server/src/modules/real-estate/services/project.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { type RealEstateProjectWorkspaceEntity } from '../standard-objects/project.workspace-entity';
import { type RealEstatePropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

@Injectable()
export class ProjectService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async updateAvailablePlots(
    workspaceId: string,
    projectId: string,
  ): Promise<void> {
    // Get repository for this workspace
    const propertyRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace<RealEstatePropertyWorkspaceEntity>(
        workspaceId,
        'realEstateProperty',
      );

    const projectRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace<RealEstateProjectWorkspaceEntity>(
        workspaceId,
        'realEstateProject',
      );

    // Count available properties for this project
    const count = await propertyRepository.count({
      where: {
        projectId,
        status: 'AVAILABLE',
      },
    });

    // Update project's availablePlots
    await projectRepository.update(projectId, {
      availablePlots: count,
    });
  }
}
```

**Key Points**:
- Use `TwentyORMGlobalManager` instead of `@InjectRepository`
- Always pass `workspaceId` to get correct repository
- Entity name is singular camelCase (e.g., `realEstateProject`)

**Subtasks**:
- [ ] Create service file
- [ ] Inject TwentyORMGlobalManager
- [ ] Implement updateAvailablePlots method
- [ ] Add to module providers

### BE-4: Register in Module (AC: 1)

> **Note**: Do NOT use `TypeOrmModule.forFeature` for workspace entities.

**File**: `packages/twenty-server/src/modules/real-estate/real-estate.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ProjectService } from './services/project.service';
// TwentyORMGlobalManager is globally available, no need to import

@Module({
  imports: [],  // No TypeOrmModule.forFeature needed!
  providers: [ProjectService],
  exports: [ProjectService],
})
export class RealEstateModule {}
```

**Subtasks**:
- [ ] Import entity in TypeOrmModule.forFeature
- [ ] Add service to providers
- [ ] Export service

---

## Database Tasks

### DB-1: Run Migration (AC: 1)

```bash
# Generate migration (if needed)
npx nx database:generate twenty-server

# Run migration
npx nx database:migrate twenty-server
```

**Expected Schema**:
```sql
CREATE TABLE project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  developer VARCHAR(255),
  location TEXT,
  status VARCHAR(50) DEFAULT 'PLANNING',
  total_plots INTEGER DEFAULT 0,
  available_plots INTEGER DEFAULT 0,
  commission_rate NUMERIC(5,2),
  price_min NUMERIC(15,2),
  price_max NUMERIC(15,2),
  master_plan_image VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  workspace_id UUID NOT NULL
);
```

**Subtasks**:
- [ ] Run migration command
- [ ] Verify table created in database
- [ ] Check all columns exist with correct types

### DB-2: Add Indexes (AC: 2)

```sql
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_project_workspace ON project(workspace_id);
CREATE INDEX idx_project_name ON project(name);
```

**Subtasks**:
- [ ] Add indexes for common queries
- [ ] Verify indexes created

---

## API Tasks

### API-1: Verify Auto-Generated CRUD (AC: 1, 2)

Twenty auto-generates GraphQL CRUD from @WorkspaceEntity. Verify these work:

**Create Project**:
```graphql
mutation CreateProject {
  createProject(data: {
    name: "Sunrise Valley"
    developer: "ABC Corp"
    location: "District 9, HCMC"
    status: ACTIVE
    totalPlots: 100
    commissionRate: 3.5
    priceMin: 500000000
    priceMax: 2000000000
  }) {
    id
    name
    status
  }
}
```

**List Projects**:
```graphql
query ListProjects {
  projects(filter: { status: { eq: ACTIVE } }) {
    edges {
      node {
        id
        name
        developer
        totalPlots
        availablePlots
      }
    }
  }
}
```

**Update Project**:
```graphql
mutation UpdateProject {
  updateProject(id: "xxx", data: {
    status: SOLD_OUT
  }) {
    id
    status
  }
}
```

**Delete Project**:
```graphql
mutation DeleteProject {
  deleteProject(id: "xxx") {
    id
  }
}
```

**Subtasks**:
- [ ] Test createProject mutation
- [ ] Test projects query with filters
- [ ] Test updateProject mutation
- [ ] Test deleteProject mutation
- [ ] Verify all fields returned correctly

### API-2: File Upload (AC: 3)

```graphql
mutation UploadMasterPlan {
  uploadFile(file: $file) {
    id
    url
  }
}

mutation UpdateProjectImage {
  updateProject(id: "xxx", data: {
    masterPlanImage: "file-id"
  }) {
    id
    masterPlanImage
  }
}
```

**Subtasks**:
- [ ] Test file upload endpoint
- [ ] Verify file size limit (20MB)
- [ ] Test image display in UI

---

## Frontend Tasks

### FE-1: Verify Twenty's Auto-Generated UI (AC: 2)

Twenty auto-generates list/detail views. Verify:

**Subtasks**:
- [ ] Project appears in sidebar navigation
- [ ] List view shows all projects
- [ ] Detail view shows all fields
- [ ] Create form works
- [ ] Edit form works
- [ ] Delete action works

### FE-2: Custom Project Card (Optional Enhancement)

**File**: `packages/twenty-front/src/modules/real-estate/components/ProjectCard.tsx`

```tsx
import { Card, Badge, Text } from '@/ui';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    developer: string;
    status: string;
    totalPlots: number;
    availablePlots: number;
  };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const availabilityPercent = (project.availablePlots / project.totalPlots) * 100;

  return (
    <Card>
      <Text variant="h3">{project.name}</Text>
      <Text variant="body2">{project.developer}</Text>
      <Badge variant={getStatusVariant(project.status)}>
        {project.status}
      </Badge>
      <Text>
        {project.availablePlots} / {project.totalPlots} available
        ({availabilityPercent.toFixed(0)}%)
      </Text>
    </Card>
  );
};
```

**Subtasks**:
- [ ] Create ProjectCard component (optional)
- [ ] Add availability percentage display
- [ ] Add status badge with colors

---

## Testing Tasks

### TEST-1: Unit Tests (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/services/__tests__/project.service.spec.ts`

```typescript
describe('ProjectService', () => {
  describe('updateAvailablePlots', () => {
    it('should count AVAILABLE properties', async () => {
      // Arrange
      const project = await createProject({ totalPlots: 10 });
      await createProperty({ projectId: project.id, status: 'AVAILABLE' });
      await createProperty({ projectId: project.id, status: 'SOLD' });

      // Act
      await projectService.updateAvailablePlots(project.id);

      // Assert
      const updated = await projectRepository.findOne(project.id);
      expect(updated.availablePlots).toBe(1);
    });
  });
});
```

**Subtasks**:
- [ ] Write unit test for updateAvailablePlots
- [ ] Test with various property statuses
- [ ] Run tests: `npx nx test twenty-server`

### TEST-2: Integration Tests (AC: 1, 2)

**File**: `packages/twenty-server/src/modules/real-estate/__tests__/project.integration.spec.ts`

```typescript
describe('Project CRUD Integration', () => {
  it('should create project via GraphQL', async () => {
    const result = await graphqlRequest(`
      mutation {
        createProject(data: { name: "Test Project" }) {
          id
          name
        }
      }
    `);
    expect(result.data.createProject.name).toBe('Test Project');
  });

  it('should list projects with filter', async () => {
    // Create test data
    await createProject({ status: 'ACTIVE' });
    await createProject({ status: 'PLANNING' });

    // Query
    const result = await graphqlRequest(`
      query {
        projects(filter: { status: { eq: ACTIVE } }) {
          edges { node { id status } }
        }
      }
    `);

    expect(result.data.projects.edges).toHaveLength(1);
    expect(result.data.projects.edges[0].node.status).toBe('ACTIVE');
  });
});
```

**Subtasks**:
- [ ] Write integration test for create
- [ ] Write integration test for list with filter
- [ ] Write integration test for update
- [ ] Write integration test for delete
- [ ] Run tests: `npx nx test:integration twenty-server`

---

## Definition of Done

- [ ] All acceptance criteria verified
- [ ] Entity created with all fields
- [ ] Service created with updateAvailablePlots
- [ ] Module updated with imports
- [ ] Migration run successfully
- [ ] Indexes created
- [ ] GraphQL CRUD tested
- [ ] File upload tested
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Code reviewed

---

## Dev Notes

### Architecture Patterns
- **@WorkspaceEntity**: Twenty's decorator for custom entities
- **Metadata System**: Twenty auto-generates GraphQL from decorators
- **Computed Field**: availablePlots updated via service

### File Structure
```
packages/twenty-server/src/modules/real-estate/
├── standard-objects/
│   └── project.workspace-entity.ts  ← NEW
├── services/
│   └── project.service.ts           ← NEW
├── constants/
│   ├── real-estate-object-ids.ts
│   └── real-estate-field-ids.ts
└── real-estate.module.ts            ← UPDATED
```

### References
- [Source: architecture.md lines 268-285]
- [Source: tech-spec-epic-2.md#Entity-Project]
- [Source: PRD v1.3 Section 4.1.2]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- packages/twenty-server/src/modules/real-estate/standard-objects/project.workspace-entity.ts
- packages/twenty-server/src/modules/real-estate/services/project.service.ts
- packages/twenty-server/src/modules/real-estate/real-estate.module.ts
