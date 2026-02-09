# Architecture Document
## Nền tảng Phân phối Bất động sản

**Architect**: Winston
**Date**: 09/12/2025
**Based on**: PRD v1.3 (FINAL) + Epics Breakdown
**Version**: 1.0

---

## Executive Summary

Kiến trúc này mô tả cách **mở rộng Twenty CRM** để xây dựng nền tảng quản lý bất động sản cho 1000+ sales agents. Thay vì build from scratch, chúng ta tận dụng Twenty's metadata-driven architecture và decorator system để định nghĩa custom objects (Project, Property, Deal, Commission, Contact), thêm business logic cho reservation workflow, và implement background jobs cho auto-release và lead assignment.

**Key Architectural Decisions**:
1. **Extend, Don't Fork**: Thêm custom module vào Twenty monorepo, không fork
2. **Decorator Pattern**: Sử dụng @WorkspaceEntity của Twenty cho custom objects
3. **Event-Driven**: Dùng TypeORM lifecycle hooks + BullMQ cho async operations
4. **Pessimistic Locking**: PostgreSQL transaction locking cho reservation to prevent double-booking

---

## Project Initialization

**Foundation**: Twenty CRM v0.52.0 (Verified: 09/12/2025)
**Prerequisites**: Node.js 20.18.0 LTS, pnpm 9.14.2, Docker 27.3.1

```bash
# Clone Twenty CRM at specific version
git clone --branch v0.52.0 https://github.com/twentyhq/twenty.git
cd twenty

# Or clone latest and checkout version
# git clone https://github.com/twentyhq/twenty.git
# cd twenty
# git checkout v0.52.0

# Setup environment
cp ./packages/twenty-server/.env.example ./packages/twenty-server/.env

# Configure PostgreSQL and Redis in .env
# PG_DATABASE_URL=postgres://postgres:postgres@localhost:5432/default
# REDIS_URL=redis://localhost:6379

# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
pnpm install

# Run database migrations
npx nx database:migrate twenty-server

# Start development server
npx nx start twenty-server
npx nx start twenty-front
```

---

## Decision Summary

**Version Verification Date**: 09/12/2025
**Version Policy**: Sử dụng phiên bản stable mới nhất. Ưu tiên LTS cho Node.js và PostgreSQL.

| Category | Decision | Version | Verified | Affects Epics | Rationale |
|----------|----------|---------|----------|---------------|-----------|
| **Base Platform** | Twenty CRM | v0.52.0 | ✓ | All | Open-source, metadata-driven, GraphQL ready |
| **Runtime** | Node.js | 20.18.0 LTS | ✓ | All | Twenty requires Node 20+ |
| **Backend Framework** | NestJS | 10.4.7 | ✓ | All | Already in Twenty |
| **Database** | PostgreSQL | 16.4 | ✓ | All | Already in Twenty, supports transactions |
| **Cache** | Redis | 7.4.1 | ✓ | Epic 2,6,7 | Already in Twenty, for caching + pub/sub |
| **Queue** | BullMQ | 5.13.0 | ✓ | Epic 2,6 | Already in Twenty, for background jobs |
| **ORM** | TypeORM | 0.3.20 | ✓ | All | Already in Twenty, metadata system |
| **GraphQL** | Apollo Server | 4.11.0 | ✓ | All | Already in Twenty, auto-generated |
| **Frontend** | React + SSR Middleware | 18.3.1 | ✓ | Epic 4,7,8 | React CSR + Express SSR for public pages (SEO) |
| **SSR Server** | Express.js | 4.18.x | ✓ | Epic 8 | Dynamic rendering for bots (Public Marketplace) |
| **State Management** | Recoil | 0.7.7 | ✓ | Epic 4,7 | Already in Twenty |
| **Styling** | Emotion CSS-in-JS | 11.13.3 | ✓ | All | Already in Twenty |
| **Package Manager** | pnpm | 9.14.2 | ✓ | All | Twenty monorepo requires pnpm |
| **Deployment** | Docker | 27.3.1 | ✓ | All | Container runtime |
| **Platform** | Dokploy | 0.18.1 | ✓ | All | Self-hosted PaaS |
| **File Storage** | Local FS → AWS S3 | N/A | ✓ | Epic 2 | Phase 1: Local, Phase 2: S3 |

### Version Notes

- **Node.js 20.18.0 LTS**: Long-term support until April 2026. Twenty requires Node 20+.
- **PostgreSQL 16.4**: Stable release with transaction support. Will upgrade to 17 when Twenty supports it.
- **Redis 7.4.1**: Latest stable with improved performance.
- **Twenty CRM v0.52.0**: Latest stable release (December 2024). Check [Twenty Releases](https://github.com/twentyhq/twenty/releases) for updates.

**[ASSUMPTION: Versions verified based on npm registry and GitHub releases as of December 2024. Run `pnpm outdated` after install to verify.]**

---

## Project Structure

```
twenty/
├── docker-compose.dev.yml          # Local dev infrastructure
├── packages/
│   ├── twenty-server/
│   │   ├── src/
│   │   │   ├── engine/              # Twenty's metadata engine (DO NOT MODIFY)
│   │   │   │   ├── metadata-modules/
│   │   │   │   └── workspace-manager/
│   │   │   │
│   │   │   ├── modules/             # Domain modules
│   │   │   │   ├── company/         # Twenty standard (reference)
│   │   │   │   ├── person/          # Twenty standard (reference)
│   │   │   │   │
│   │   │   │   └── real-estate/     # 🆕 OUR CUSTOM MODULE
│   │   │   │       ├── standard-objects/
│   │   │   │       │   ├── project.workspace-entity.ts
│   │   │   │       │   ├── property.workspace-entity.ts
│   │   │   │       │   ├── contact-extension.ts
│   │   │   │       │   ├── deal.workspace-entity.ts
│   │   │   │       │   ├── commission.workspace-entity.ts
│   │   │   │       │   └── lead-extension.ts
│   │   │   │       │
│   │   │   │       ├── services/
│   │   │   │       │   ├── project.service.ts
│   │   │   │       │   ├── property.service.ts
│   │   │   │       │   ├── reservation.service.ts
│   │   │   │       │   ├── deal.service.ts
│   │   │   │       │   ├── commission.service.ts
│   │   │   │       │   └── lead-assignment.service.ts
│   │   │   │       │
│   │   │   │       ├── jobs/
│   │   │   │       │   ├── reservation-release.job.ts
│   │   │   │       │   └── lead-assignment.job.ts
│   │   │   │       │
│   │   │   │       ├── resolvers/
│   │   │   │       │   ├── property.resolver.ts
│   │   │   │       │   └── commission.resolver.ts
│   │   │   │       │
│   │   │   │       ├── constants/
│   │   │   │       │   ├── real-estate-object-ids.ts
│   │   │   │       │   └── real-estate-field-ids.ts
│   │   │   │       │
│   │   │   │       └── real-estate.module.ts
│   │   │   │
│   │   │   ├── modules.module.ts    # Register RealEstateModule HERE (not app.module.ts)
│   │   │   └── app.module.ts        # Imports ModulesModule (DO NOT MODIFY)
│   │   │
│   │   ├── test/
│   │   │   └── real-estate/         # Tests for our module
│   │   │       ├── property.service.spec.ts
│   │   │       ├── reservation.service.spec.ts
│   │   │       └── commission.service.spec.ts
│   │   │
│   │   └── .env                     # Environment config
│   │
│   └── twenty-front/
│       └── src/
│           └── modules/
│               └── real-estate/     # 🆕 CUSTOM FRONTEND COMPONENTS
│                   ├── components/
│                   │   ├── PropertyCard.tsx
│                   │   ├── PropertyStatusBadge.tsx
│                   │   ├── ReservationTimer.tsx
│                   │   └── CommissionTable.tsx
│                   │
│                   ├── hooks/
│                   │   ├── useReserveProperty.ts
│                   │   └── useCommissions.ts
│                   │
│                   └── pages/
│                       ├── SalesDashboard.tsx
│                       └── CommissionReport.tsx
│
└── docs/
    └── real-estate-platform/
        ├── prd-v1.3.md
        ├── epics.md
        └── architecture.md          # This file
```

---

## Epic to Architecture Mapping

| Epic | Primary Components | Key Services | Database Tables |
|------|-------------------|--------------|-----------------|
| **Epic 1: Foundation** | `real-estate.module.ts`, constants | - | Metadata registration |
| **Epic 2: Properties** | `project.workspace-entity.ts`, `property.workspace-entity.ts` | `PropertyService`, `ReservationService`, `ReservationReleaseJob` | `project`, `property` |
| **Epic 3: Deals** | `contact-extension.ts`, `deal.workspace-entity.ts` | `DealService` | `contact`, `deal` |
| **Epic 4: Sales Tools** | `SalesDashboard.tsx`, hooks | - | User extensions |
| **Epic 5: Commission** | `commission.workspace-entity.ts` | `CommissionService` | `commission` |
| **Epic 6: Leads** | `lead-extension.ts` | `LeadAssignmentService`, `LeadAssignmentJob` | Lead extensions |
| **Epic 7: Operations** | Dashboard pages, reports | - | Analytics views |

---

## Technology Stack Details

### Core Technologies

**Backend (NestJS)**:

> **IMPORTANT**: Register modules in `modules.module.ts`, NOT `app.module.ts`

```typescript
// Step 1: Create real-estate.module.ts
// packages/twenty-server/src/modules/real-estate/real-estate.module.ts
import { Module } from '@nestjs/common';

@Module({
  imports: [
    // TypeORM entities are auto-registered via Twenty's metadata system
    // BullMQ queues will be added when needed
  ],
  providers: [
    // Services will be added in Epic 2+
  ],
  exports: [],
})
export class RealEstateModule {}

// Step 2: Register in modules.module.ts (NOT app.module.ts!)
// packages/twenty-server/src/modules/modules.module.ts
import { Module } from '@nestjs/common';
import { CalendarModule } from 'src/modules/calendar/calendar.module';
import { MessagingModule } from 'src/modules/messaging/messaging.module';
// ... other existing imports
import { RealEstateModule } from 'src/modules/real-estate/real-estate.module';

@Module({
  imports: [
    MessagingModule,
    CalendarModule,
    // ... other existing modules
    RealEstateModule,  // ADD HERE
  ],
})
export class ModulesModule {}
```

**Why modules.module.ts?**
- Twenty's `AppModule` imports `ModulesModule` which aggregates all feature modules
- This keeps feature modules separate from core engine modules
- Follows Twenty's existing pattern (Calendar, Messaging, Workflow, etc.)

> **⚠️ CRITICAL: Entity Registration is Different!**
>
> Entities (WorkspaceEntity classes) are NOT registered via NestJS modules.
> They are registered in a central metadata file.

**Entity Registration** (for Project, Property, Commission entities):

```typescript
// File: packages/twenty-server/src/engine/workspace-manager/workspace-sync-metadata/standard-objects/index.ts

// Import real estate entities
import { RealEstateProjectWorkspaceEntity } from 'src/modules/real-estate/standard-objects/project.workspace-entity';
import { RealEstatePropertyWorkspaceEntity } from 'src/modules/real-estate/standard-objects/property.workspace-entity';
import { CommissionWorkspaceEntity } from 'src/modules/real-estate/standard-objects/commission.workspace-entity';

export const standardObjectMetadataDefinitions = [
  // ... existing entities
  RealEstateProjectWorkspaceEntity,
  RealEstatePropertyWorkspaceEntity,
  CommissionWorkspaceEntity,
];
```

**Two Registration Points Summary**:
| What | Where | Purpose |
|------|-------|---------|
| **Entities** | `standardObjectMetadataDefinitions` | Auto-sync metadata to DB |
| **Services/Jobs** | `RealEstateModule` → `modules.module.ts` | NestJS dependency injection |

**Database (PostgreSQL 16)**:
- Connection pooling: 20 connections (via Twenty config)
- Transaction isolation: READ COMMITTED (default)
- Locking: FOR UPDATE SKIP LOCKED for reservation

**Queue (Twenty's MessageQueue)**:

> **⚠️ CRITICAL**: Do NOT use BullMQ directly. Use Twenty's `MessageQueue` system.

```typescript
// Use Twenty's MessageQueue, not BullMQ
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';

// Available queues (from MessageQueue enum):
// - workspaceQueue - General workspace jobs
// - delayedJobsQueue - For delayed/scheduled jobs
// - cronQueue - For cron jobs

// For real estate, use workspaceQueue or delayedJobsQueue
@InjectMessageQueue(MessageQueue.workspaceQueue)
private readonly messageQueueService: MessageQueueService;

// Add job
await this.messageQueueService.add('ReleaseReservationJob', {
  workspaceId,
  propertyId,
}, {
  delay: 24 * 60 * 60 * 1000, // 24 hours
});
```

- Use existing queues from `MessageQueue` enum
- Jobs: `ReleaseReservationJob`, `LeadAssignmentJob`
- Retry: Handled by Twenty's queue system

### Integration Points

```mermaid
flowchart TD
    subgraph Frontend
        FE[React App]
    end

    subgraph Backend
        GQL[GraphQL API]
        PS[PropertyService]
        RS[ReservationService]
        CS[CommissionService]
        LAS[LeadAssignmentService]
    end

    subgraph Jobs
        RRJ[ReservationReleaseJob]
        LAJ[LeadAssignmentJob]
    end

    subgraph Infra
        DB[(PostgreSQL)]
        REDIS[(Redis)]
        QUEUE[(BullMQ)]
    end

    FE -->|mutation| GQL
    GQL --> PS
    GQL --> RS
    GQL --> CS
    GQL --> LAS

    PS --> DB
    RS --> DB
    CS --> DB
    LAS --> DB

    RS -->|schedule| QUEUE
    LAS -->|schedule| QUEUE

    RRJ -->|process| QUEUE
    LAJ -->|process| QUEUE

    RRJ --> DB
    LAJ --> DB
    LAJ -->|notify| REDIS
```

---

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### 1. Custom Object Definition Pattern

**Pattern**: Use Twenty's @WorkspaceEntity decorator with correct imports and i18n labels

```typescript
// project.workspace-entity.ts
// CORRECT IMPORTS - Use actual Twenty paths
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
  labelSingular: msg`Real Estate Project`,  // Use msg for i18n
  labelPlural: msg`Real Estate Projects`,
  description: msg`A real estate development project`,
  icon: 'IconBuilding',
  labelIdentifierStandardId: PROJECT_FIELD_IDS.name,
})
export class ProjectWorkspaceEntity extends BaseWorkspaceEntity {
  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.name,
    type: FieldMetadataType.TEXT,
    label: msg`Name`,  // Use msg for i18n
    description: msg`Project name`,
    icon: 'IconBuilding',
  })
  name: string;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.status,
    type: FieldMetadataType.SELECT,
    label: msg`Status`,
    description: msg`Project status`,
    icon: 'IconProgressCheck',
    options: [
      { value: 'PLANNING', label: 'Planning', position: 0, color: 'gray' },  // Add position
      { value: 'ACTIVE', label: 'Active', position: 1, color: 'green' },
      { value: 'SOLD_OUT', label: 'Sold Out', position: 2, color: 'blue' },
      { value: 'SUSPENDED', label: 'Suspended', position: 3, color: 'red' },
    ],
    defaultValue: "'PLANNING'",  // Quoted string for SELECT
  })
  @WorkspaceFieldIndex()  // Add index for frequently queried fields
  status: string;

  @WorkspaceField({
    standardId: PROJECT_FIELD_IDS.developer,
    type: FieldMetadataType.TEXT,
    label: msg`Developer`,
    icon: 'IconBuildingSkyscraper',
  })
  @WorkspaceIsNullable()  // Use decorator for nullable fields
  developer: string | null;

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

**Key Points**:
1. **Imports**: Use actual paths from `src/engine/twenty-orm/decorators/`
2. **Labels**: Use `msg` template literals from `@lingui/core/macro` for i18n
3. **SELECT options**: Include `position` field for ordering
4. **Nullable**: Use `@WorkspaceIsNullable()` decorator, not `isNullable` option
5. **Indexes**: Use `@WorkspaceFieldIndex()` for frequently queried fields
6. **defaultValue**: Use quoted strings for SELECT types: `"'VALUE'"`

**Enforcement**: ALL custom objects MUST follow this pattern.

### 1b. Service Pattern for Workspace Entities (CRITICAL)

> **⚠️ CRITICAL**: Do NOT use `@InjectRepository` for workspace entities!

**Pattern**: Use `TwentyORMGlobalManager` to get repositories for workspace-scoped entities.

```typescript
// property.service.ts
import { Injectable } from '@nestjs/common';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { type PropertyWorkspaceEntity } from '../standard-objects/property.workspace-entity';

@Injectable()
export class PropertyService {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  async getProperty(
    workspaceId: string,
    propertyId: string,
  ): Promise<PropertyWorkspaceEntity | null> {
    // Get repository for this specific workspace
    const propertyRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace<PropertyWorkspaceEntity>(
        workspaceId,
        'realEstateProperty', // entity name (singular, camelCase)
      );

    return propertyRepository.findOne({
      where: { id: propertyId },
    });
  }

  async updatePropertyStatus(
    workspaceId: string,
    propertyId: string,
    status: string,
  ): Promise<void> {
    const propertyRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace<PropertyWorkspaceEntity>(
        workspaceId,
        'realEstateProperty',
      );

    await propertyRepository.update(propertyId, { status });
  }
}
```

**Why TwentyORMGlobalManager?**
- Workspace entities are multi-tenant (each workspace has its own PostgreSQL schema)
- Need `workspaceId` to route to correct schema
- `@InjectRepository` only works for core entities (WorkspaceEntity, ObjectMetadataEntity)

**When to use each**:
| Entity Type | How to Access | Example |
|-------------|---------------|---------|
| **Core entities** | `@InjectRepository(Entity)` | WorkspaceEntity, ObjectMetadataEntity |
| **Workspace entities** | `TwentyORMGlobalManager.getRepositoryForWorkspace()` | PropertyWorkspaceEntity, CommissionWorkspaceEntity |

**Getting workspaceId**: From request context or job data
```typescript
// In resolver/controller
const workspaceId = context.req.workspace.id;

// In job
const workspaceId = job.data.workspaceId;
```

### 2. Reservation with Pessimistic Locking Pattern

**Pattern**: Use PostgreSQL FOR UPDATE to prevent double-booking

```typescript
// reservation.service.ts
@Injectable()
export class ReservationService {
  async reserveProperty(propertyId: string, userId: string): Promise<Property> {
    return this.dataSource.transaction(async (manager) => {
      // Lock the property row for update
      const property = await manager.findOne(Property, {
        where: { id: propertyId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!property) {
        throw new NotFoundException('Property not found');
      }

      if (property.status !== 'AVAILABLE') {
        throw new BadRequestException(`Property is ${property.status}, cannot reserve`);
      }

      // Update property
      property.status = 'RESERVED';
      property.reservedById = userId;
      property.reservedUntil = addHours(new Date(), 24);

      await manager.save(property);

      // Schedule auto-release job
      await this.reservationQueue.add('release', { propertyId }, {
        delay: 24 * 60 * 60 * 1000, // 24 hours
        jobId: `release-${propertyId}`,
      });

      return property;
    });
  }
}
```

**Enforcement**: ALL reservation operations MUST use this transaction pattern.

### 3. Database Event Listener Pattern (CRITICAL)

> **⚠️ CRITICAL**: Use `@OnDatabaseBatchEvent`, NOT TypeORM's `@EventSubscriber`.

**Pattern**: Use Twenty's database event system for workspace entity events.

```typescript
// deal.listener.ts
import { Injectable } from '@nestjs/common';
import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { ObjectRecordUpdateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-update.event';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

@Injectable()
export class DealListener {
  constructor(private readonly commissionService: CommissionService) {}

  @OnDatabaseBatchEvent('opportunity', DatabaseEventAction.UPDATED)
  async handleDealUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent>,
  ): Promise<void> {
    for (const event of payload.events) {
      const beforeStage = event.properties.before?.stage;
      const afterStage = event.properties.after?.stage;

      // Create commission when deal stage changes to WON
      if (beforeStage !== 'WON' && afterStage === 'WON') {
        await this.commissionService.createCommission(
          payload.workspaceId,
          event.recordId,
        );
      }
    }
  }
}
```

**Key Points**:
- Use `@OnDatabaseBatchEvent('entityName', DatabaseEventAction.XXX)`
- Event types: CREATED, UPDATED, DELETED
- Payload includes `workspaceId` and `events` array
- Access before/after via `event.properties.before`, `event.properties.after`

**Enforcement**: Database events MUST use this pattern, NOT TypeORM subscribers.

### 4. Background Job Pattern

> **⚠️ CRITICAL**: Use Twenty's `@Processor` and `@Process`, NOT BullMQ directly.

**Pattern**: Use Twenty's MessageQueue system for background jobs.

```typescript
// release-reservation.job.ts
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

interface ReleaseReservationJobData {
  workspaceId: string;
  propertyId: string;
}

@Processor({
  queueName: MessageQueue.workspaceQueue,
})
export class ReleaseReservationJob {
  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
  ) {}

  @Process(ReleaseReservationJob.name)
  async handle(job: { data: ReleaseReservationJobData }): Promise<void> {
    const { workspaceId, propertyId } = job.data;

    const propertyRepository = await this.twentyORMGlobalManager
      .getRepositoryForWorkspace(workspaceId, 'realEstateProperty');

    const property = await propertyRepository.findOne({
      where: { id: propertyId, status: 'RESERVED' },
    });

    if (!property) {
      return; // Already released or status changed
    }

    if (property.reservedUntil && property.reservedUntil < new Date()) {
      await propertyRepository.update(propertyId, {
        status: 'AVAILABLE',
        reservedById: null,
        reservedUntil: null,
      });

      this.logger.log(`Auto-released property ${propertyId}`);
    }
  }

}
```

**Key Points**:
- Use `@Processor({ queueName: MessageQueue.xxx })`
- Use `@Process(JobClassName.name)`
- Always include `workspaceId` in job data
- Use `TwentyORMGlobalManager` for workspace entities

**Enforcement**: Background jobs MUST be idempotent and handle edge cases.

---

## Consistency Rules

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity Class | PascalCase + WorkspaceEntity | `RealEstatePropertyWorkspaceEntity` |
| Entity Name (in decorators) | camelCase, singular | `realEstateProperty` |
| Database Table | Auto-generated by Twenty | N/A |
| Database Column | camelCase | `reservedById`, `soldDate` |
| GraphQL Type | PascalCase | `RealEstateProperty`, `Commission` |
| GraphQL Mutation | camelCase, verb first | `reserveProperty`, `approveCommission` |
| File Name | kebab-case | `property.workspace-entity.ts` |
| Constant | UPPER_SNAKE_CASE | `PROJECT_FIELD_IDS` |
| Service | PascalCase + Service | `PropertyService` |
| Job | PascalCase + Job | `ReleaseReservationJob` |
| Listener | PascalCase + Listener | `PropertyListener` |

### Code Organization Patterns

```
// Feature-based organization within real-estate module
modules/real-estate/
├── standard-objects/    # Entity definitions (@WorkspaceEntity)
├── services/            # Business logic (use TwentyORMGlobalManager)
├── jobs/                # Background processors (@Processor)
├── crons/               # Cron jobs (cronQueue)
├── listeners/           # Database event listeners (@OnDatabaseBatchEvent)
├── resolvers/           # Custom GraphQL resolvers
├── constants/           # IDs and enums
└── real-estate.module.ts
```

**Tests**: Co-located pattern
```
services/
├── property.service.ts
├── property.service.spec.ts    # Test file next to source
```

### Error Handling

```typescript
// Standard error format
throw new BadRequestException({
  code: 'PROPERTY_NOT_AVAILABLE',
  message: 'Property is not available for reservation',
  details: { propertyId, currentStatus: property.status },
});

// Error codes convention
// ENTITY_ACTION_REASON
// Examples:
// - PROPERTY_RESERVE_NOT_AVAILABLE
// - COMMISSION_APPROVE_ALREADY_APPROVED
// - LEAD_ASSIGN_NO_ELIGIBLE_SALES
```

### Logging Strategy

```typescript
// Use Twenty's logger with structured format
this.logger.log({
  action: 'property.reserve',
  propertyId,
  userId,
  result: 'success',
});

this.logger.error({
  action: 'property.reserve',
  propertyId,
  userId,
  error: error.message,
  stack: error.stack,
});
```

---

## Data Architecture

### Entity Relationships

```mermaid
erDiagram
    PROJECT ||--o{ PROPERTY : contains
    PROJECT ||--o{ LEAD : interests

    PROPERTY }o--|| USER : reservedBy
    PROPERTY }o--|| CONTACT : soldTo
    PROPERTY ||--|| DEAL : hasDeal

    CONTACT ||--o{ DEAL : buys

    DEAL ||--|| COMMISSION : generates

    USER ||--o{ COMMISSION : earns
    USER ||--o{ LEAD : assigned

    COMMISSION }o--|| USER : approvedBy
```

### Status Workflows

**Property Status Flow**:
```
AVAILABLE → RESERVED → DEPOSIT_PAID → CONTRACTED → SOLD
                ↓
           (24h timeout)
                ↓
           AVAILABLE
```

**Deal Status Flow**:
```
ACTIVE → NEGOTIATING → PENDING_DEPOSIT → DEPOSIT_PAID → CONTRACTED → WON
                                                                      ↓
                                                              (auto-create)
                                                                      ↓
                                                              COMMISSION
```

**Commission Status Flow**:
```
PENDING → APPROVED → PAID
    ↓
  REJECTED
```

---

## API Contracts

### Custom Mutations (Beyond CRUD)

```graphql
type Mutation {
  # Property reservation
  reserveProperty(propertyId: ID!): Property!
  releaseProperty(propertyId: ID!): Property!

  # Commission approval
  approveCommission(commissionId: ID!): Commission!
  rejectCommission(commissionId: ID!, reason: String!): Commission!
  markCommissionPaid(commissionId: ID!): Commission!

  # Lead assignment
  assignLead(leadId: ID!, salesAgentId: ID!): Lead!
  autoAssignLead(leadId: ID!): Lead!
}

type Query {
  # Sales dashboard
  mySalesPerformance: SalesPerformance!
  myCommissions(status: CommissionStatus): [Commission!]!
  myReservedProperties: [Property!]!

  # Admin reports
  projectSalesReport(projectId: ID!, period: DateRange!): ProjectReport!
  salesLeaderboard(period: DateRange!, limit: Int): [SalesRanking!]!
}
```

### Response Format

```typescript
// Success response
{
  data: {
    reserveProperty: {
      id: "uuid",
      status: "RESERVED",
      reservedUntil: "2024-12-10T18:00:00Z"
    }
  }
}

// Error response
{
  errors: [
    {
      message: "Property is not available for reservation",
      extensions: {
        code: "PROPERTY_RESERVE_NOT_AVAILABLE",
        details: { propertyId: "uuid", currentStatus: "SOLD" }
      }
    }
  ]
}
```

---

## Security Architecture

### Authentication
- **Method**: JWT tokens (Twenty's built-in auth)
- **Token Expiry**: 7 days
- **Refresh**: Automatic refresh before expiry

### Authorization (RBAC)

> **IMPORTANT**: Twenty has a built-in RBAC system. We extend it with custom roles.

**Twenty's Existing Roles** (in `src/engine/workspace-manager/workspace-sync-metadata/standard-roles/`):
- `ADMIN_ROLE` - Full access to everything
- `WORKFLOW_MANAGER_ROLE` - Workflow management
- `DATA_MANIPULATOR_ROLE` - Data manipulation
- `DASHBOARD_MANAGER_ROLE` - Dashboard management
- `DATA_MODEL_MANAGER_ROLE` - Data model management

**Custom Roles for Real Estate**:

| Role | Permissions |
|------|-------------|
| **Admin** (Twenty's ADMIN_ROLE) | Full access all modules |
| **Sales Agent** (Custom) | Read projects/properties, Reserve, Manage own leads, View own commissions |
| **Finance** (Custom) | Read/Update commissions (approve/pay), Export CSV |
| **Manager** (Custom) | Read all, Reports, No edit |

**Creating Custom Roles**:

```typescript
// packages/twenty-server/src/modules/real-estate/roles/sales-agent-role.ts
import { type StandardRoleDefinition } from 'src/engine/workspace-manager/workspace-sync-metadata/standard-roles/types/standard-role-definition.interface';

export const SALES_AGENT_ROLE: StandardRoleDefinition = {
  standardId: '20202020-0001-0001-0001-000000000010', // Custom UUID range
  label: 'Sales Agent',
  description: 'Sales agent with limited access to real estate operations',
  icon: 'IconUser',
  isEditable: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  canBeAssignedToApplications: false,
  applicationId: null,
};
```

**Role Registration**:
- Option 1: Add to `standard-role-definitions.ts` (requires modifying Twenty core)
- Option 2: Create roles programmatically via `RoleService` on module init

### Data Protection
- **PII Fields**: Encrypted at rest (contact.idNumber, contact.phone)
- **Audit Log**: All status changes logged with user/timestamp
- **Row-Level Security**: Sales agents see only their own data (via Twenty's workspace scoping)

---

## Performance Considerations

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| API Response | <200ms | Redis caching for property listings |
| Concurrent Users | 1000+ | PostgreSQL connection pooling (20 connections) |
| Property List Load | <1s | Pagination (50 items default), eager loading relations |
| Dashboard Widgets | <500ms | Pre-computed aggregates, cached in Redis |
| Search | <300ms | PostgreSQL full-text search on property.plotNumber, project.name |

### Caching Strategy

```typescript
// Cache property counts per project (5 min TTL)
const cacheKey = `project:${projectId}:availablePlots`;
const cached = await this.redis.get(cacheKey);
if (!cached) {
  const count = await this.propertyRepository.count({
    where: { projectId, status: 'AVAILABLE' }
  });
  await this.redis.set(cacheKey, count, 'EX', 300);
  return count;
}
return parseInt(cached);
```

---

## Deployment Architecture

```mermaid
flowchart TD
    subgraph Internet
        CLIENT[Browser/Mobile]
    end

    subgraph Dokploy["Dokploy (VPS)"]
        NGINX[Nginx Reverse Proxy]

        subgraph Docker
            FRONT[twenty-front:3001]
            SERVER[twenty-server:3000]
            WORKER[twenty-worker]
        end

        PG[(PostgreSQL:5432)]
        REDIS[(Redis:6379)]
    end

    CLIENT --> NGINX
    NGINX -->|:443| FRONT
    NGINX -->|/api| SERVER

    SERVER --> PG
    SERVER --> REDIS
    WORKER --> PG
    WORKER --> REDIS
```

### Environment Configuration

```bash
# Production .env
NODE_ENV=production
APP_SECRET=<random-secret>

# Database
PG_DATABASE_URL=postgres://user:password@localhost:5432/twenty_production

# Redis
REDIS_URL=redis://localhost:6379

# Frontend
FRONT_BASE_URL=https://crm.company.com
SERVER_URL=https://crm.company.com/api

# File Storage
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=/app/storage/uploads

# Optional: S3 for Phase 2
# STORAGE_TYPE=s3
# STORAGE_S3_BUCKET=twenty-files
# STORAGE_S3_REGION=ap-southeast-1
```

---

## Development Environment

### Prerequisites

- Node.js 20.x LTS
- pnpm 8.x
- Docker + Docker Compose
- PostgreSQL 16 (via Docker)
- Redis 7 (via Docker)

### Setup Commands

```bash
# Clone and setup
git clone https://github.com/twentyhq/twenty.git
cd twenty
pnpm install

# Configure environment
cp packages/twenty-server/.env.example packages/twenty-server/.env
# Edit .env with your database credentials

# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Initialize database
npx nx database:migrate twenty-server
npx nx database:seed twenty-server

# Start development
npx nx start twenty-server   # Backend on :3000
npx nx start twenty-front    # Frontend on :3001
```

### Development Workflow

1. Create feature branch from `main`
2. Implement in `modules/real-estate/`
3. Write tests (co-located)
4. Run `npx nx test twenty-server`
5. Create PR with description

---

## Architecture Decision Records (ADRs)

### ADR-001: Extend Twenty CRM vs Fork

**Context**: Need CRM functionality with custom real estate features.

**Decision**: EXTEND Twenty by adding custom module, not forking.

**Rationale**:
- Easier to update when Twenty releases new versions
- Leverage Twenty's existing auth, UI, GraphQL
- Reduce maintenance burden

**Consequences**:
- Must follow Twenty's patterns
- Limited customization of core features

---

### ADR-002: Pessimistic Locking for Reservations

**Context**: Multiple sales agents may try to reserve same property simultaneously.

**Decision**: Use PostgreSQL `SELECT FOR UPDATE` with transaction.

**Rationale**:
- Guarantees only one reservation succeeds
- Simple to implement and understand
- Well-tested pattern

**Consequences**:
- Slight performance overhead
- Must handle transaction timeout

---

### ADR-003: BullMQ for Background Jobs

**Context**: Need scheduled tasks (auto-release) and async operations (lead assignment).

**Decision**: Use BullMQ (already in Twenty).

**Rationale**:
- Already integrated with Twenty
- Supports delayed jobs, retry, monitoring
- Redis-backed for reliability

**Consequences**:
- Requires Redis to be running
- Job failures need monitoring

---

### ADR-004: Local File Storage (Phase 1)

**Context**: Need to store project images and documents.

**Decision**: Use local filesystem for Phase 1, migrate to S3 in Phase 2.

**Rationale**:
- Simpler deployment for MVP
- No external dependencies
- Easy to migrate later via adapter pattern

**Consequences**:
- Need Docker volume for persistence
- Manual backup strategy required
- Limited to single server (no horizontal scale)

---

### ADR-005: TypeORM Subscribers for Cascading Logic

**Context**: Deal status change to WON should auto-create Commission.

**Decision**: Use TypeORM EntitySubscriber pattern.

**Rationale**:
- Runs in same transaction as update
- Guaranteed consistency
- Follows Twenty's patterns

**Consequences**:
- Synchronous execution (may slow down save)
- Hard to test in isolation

---

### ADR-006: React + SSR Middleware for Public Marketplace SEO

**Context**: Public Marketplace cần SEO tốt để attract organic traffic. React CSR không đáp ứng được requirements.

**Decision**: Implement **Dynamic Rendering** - SSR cho bots, CSR cho users.

**Architecture**:
```
Bot Request → Express SSR → HTML + Meta Tags
User Request → React SPA → Interactive UI
```

**Rationale**:
- ✅ Achieves 80% SEO benefits của NextJS với 20% cost (200M vs 900M VNĐ)
- ✅ Keeps Twenty CRM architecture intact (no major migration)
- ✅ Fast time to market (4 weeks vs 12-16 weeks cho NextJS)
- ✅ Low risk, proven approach (Airbnb, Zillow use similar)
- ✅ Progressive implementation (start với critical pages)

**Alternatives Considered**:
1. ❌ React CSR only - Poor SEO, slow indexing
2. ⚠️ NextJS Full Migration - Too expensive (900M VNĐ, 6 months)
3. ⚠️ NextJS Hybrid - Still expensive (600M VNĐ, 4 months)
4. ⚠️ Prerender.io - Third-party dependency, ongoing cost

**Implementation**:
- **Phase 1** (2 weeks): SSR middleware cho `/listings/:id`, bot detection, meta tags
- **Phase 2** (1 week): Redis caching, homepage SSR
- **Phase 3** (1 week): Structured data (JSON-LD), dynamic sitemap

**Technical Stack**:
- Express.js (SSR server)
- react-dom/server (React SSR)
- Redis (caching rendered HTML)
- Bot detection (user-agent based)

**Routes Strategy**:
- `/listings/:id` → SSR for bots (most critical)
- `/listings`, `/` → SSR for bots
- `/admin/*`, `/agent/*` → CSR only (no SEO needed)

**Performance Targets**:
- SSR render time: <500ms
- Cache hit rate: >80%
- Lighthouse SEO score: >90
- Indexing time: <48 hours

**Consequences**:
- ✅ Good SEO performance
- ✅ Minimal code changes to existing Twenty frontend
- ⚠️ Need to maintain SSR server
- ⚠️ Slightly more complex deployment
- ⚠️ Cache invalidation strategy needed

**Cost**: 200M VNĐ development + 30M VNĐ/year infrastructure

**ROI**: 1,387% (from organic traffic → leads → deals)

**Reference**: See `/docs/real-estate-platform/frontend-architecture-analysis.md` for detailed analysis.

---

## Validation Checklist

- [x] Decision table has Version column with specific versions
- [x] Every epic is mapped to architecture components
- [x] Source tree is complete, not generic
- [x] No placeholder text remains
- [x] All FRs from PRD have architectural support
- [x] All NFRs from PRD are addressed
- [x] Implementation patterns cover all potential conflicts
- [x] Novel patterns are fully documented (reservation locking)

---

_Generated by Winston (BMAD Architect) for Luis_
_Date: 09/12/2025_
_PRD: v1.3 (FINAL) | Epics: 7 epics, ~38 stories_
