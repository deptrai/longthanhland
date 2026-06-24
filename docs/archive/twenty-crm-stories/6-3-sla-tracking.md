# Story 6.3: SLA Tracking

Status: drafted

## Story

As a **Manager**,
I want SLA tracking for lead response,
so that I can ensure timely customer contact.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-6.3.1 | Lead assigned | 4 hours pass no contact | SLA breached | slaBreached = true |
| AC-6.3.2 | Lead | First contact made | SLA met | firstContactAt saved |
| AC-6.3.3 | Dashboard | View SLA stats | Shows breach rate | Metrics display |

---

## Backend Tasks

### BE-1: Create SLA Check Job (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/jobs/sla-check.job.ts`

```typescript
import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Processor('real-estate')
export class SLACheckJob {
  constructor(
    @InjectRepository(PersonWorkspaceEntity)
    private personRepository: Repository<PersonWorkspaceEntity>,
  ) {}

  /**
   * Process individual SLA check (triggered by job queue)
   */
  @Process('sla-check')
  async handleSLACheck(job: Job<{ leadId: string; assignedAt: string }>): Promise<void> {
    const { leadId, assignedAt } = job.data;

    const lead = await this.personRepository.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      console.log(`Lead ${leadId} not found`);
      return;
    }

    // Check if first contact was made
    if ((lead as any).firstContactAt) {
      console.log(`Lead ${leadId} already contacted`);
      return;
    }

    // Check SLA based on priority
    const slaHours = this.getSLAHours((lead as any).priority);
    const assignedTime = new Date(assignedAt);
    const deadline = new Date(assignedTime.getTime() + slaHours * 60 * 60 * 1000);

    if (new Date() > deadline) {
      // SLA breached
      (lead as any).slaBreached = true;
      await this.personRepository.save(lead);
      console.log(`SLA breached for lead ${leadId}`);

      // TODO: Send notification to manager
    }
  }

  /**
   * Cron job to check all leads for SLA breaches
   * Runs every hour as a safety net
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkAllSLAs(): Promise<void> {
    console.log('Running SLA check cron...');

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // Find leads that are:
    // - Assigned more than 4 hours ago
    // - No first contact
    // - Not already marked as breached
    const leads = await this.personRepository.find({
      where: {
        // assignedAt: LessThan(fourHoursAgo),
        // firstContactAt: IsNull(),
        // slaBreached: false,
      },
    });

    for (const lead of leads) {
      if (!(lead as any).firstContactAt && !(lead as any).slaBreached) {
        const slaHours = this.getSLAHours((lead as any).priority);
        const assignedAt = (lead as any).assignedAt;

        if (assignedAt) {
          const deadline = new Date(new Date(assignedAt).getTime() + slaHours * 60 * 60 * 1000);

          if (new Date() > deadline) {
            (lead as any).slaBreached = true;
            await this.personRepository.save(lead);
            console.log(`SLA breached for lead ${lead.id}`);
          }
        }
      }
    }
  }

  private getSLAHours(priority: string): number {
    switch (priority) {
      case 'URGENT': return 1;
      case 'HIGH': return 4;
      case 'MEDIUM': return 24;
      case 'LOW': return 48;
      default: return 24;
    }
  }
}
```

### BE-2: Create SLA Stats Query (AC: 3)

**File**: `packages/twenty-server/src/modules/real-estate/services/sla.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

export interface SLAStats {
  totalLeads: number;
  breachedCount: number;
  breachRate: number;
  avgResponseTime: number; // in hours
  byPriority: {
    priority: string;
    total: number;
    breached: number;
    breachRate: number;
  }[];
}

@Injectable()
export class SLAService {
  constructor(
    @InjectRepository(PersonWorkspaceEntity)
    private personRepository: Repository<PersonWorkspaceEntity>,
  ) {}

  async getSLAStats(startDate: Date, endDate: Date): Promise<SLAStats> {
    // Get leads in date range
    const leads = await this.personRepository
      .createQueryBuilder('p')
      .where('p.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('p.leadSource IS NOT NULL') // Only leads
      .getMany();

    const totalLeads = leads.length;
    const breachedCount = leads.filter(l => (l as any).slaBreached).length;
    const breachRate = totalLeads > 0 ? (breachedCount / totalLeads) * 100 : 0;

    // Calculate avg response time
    const respondedLeads = leads.filter(l =>
      (l as any).firstContactAt && (l as any).assignedAt
    );

    const totalResponseTime = respondedLeads.reduce((sum, lead) => {
      const assigned = new Date((lead as any).assignedAt).getTime();
      const contacted = new Date((lead as any).firstContactAt).getTime();
      return sum + (contacted - assigned);
    }, 0);

    const avgResponseTime = respondedLeads.length > 0
      ? totalResponseTime / respondedLeads.length / (60 * 60 * 1000) // Convert to hours
      : 0;

    // Group by priority
    const priorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    const byPriority = priorities.map(priority => {
      const priorityLeads = leads.filter(l => (l as any).priority === priority);
      const priorityBreached = priorityLeads.filter(l => (l as any).slaBreached).length;

      return {
        priority,
        total: priorityLeads.length,
        breached: priorityBreached,
        breachRate: priorityLeads.length > 0
          ? (priorityBreached / priorityLeads.length) * 100
          : 0,
      };
    });

    return {
      totalLeads,
      breachedCount,
      breachRate,
      avgResponseTime,
      byPriority,
    };
  }
}
```

---

## API Tasks

### API-1: Query SLA Stats (AC: 3)

```graphql
query GetSLAStats($startDate: String!, $endDate: String!) {
  slaStats(startDate: $startDate, endDate: $endDate) {
    totalLeads
    breachedCount
    breachRate
    avgResponseTime
    byPriority {
      priority
      total
      breached
      breachRate
    }
  }
}
```

### API-2: Mark First Contact (AC: 2)

```graphql
mutation MarkFirstContact {
  updatePerson(id: "lead-uuid", data: {
    firstContactAt: "2025-01-15T10:30:00Z"
    leadStatus: CONTACTED
  }) {
    id
    firstContactAt
    leadStatus
    slaBreached
  }
}
```

---

## Testing Tasks

### TEST-1: SLA Tests

```typescript
describe('SLA Tracking', () => {
  it('should mark SLA breached after 4 hours without contact', async () => {
    const lead = await createLead({
      assignedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      priority: 'HIGH', // 4 hour SLA
      firstContactAt: null,
      slaBreached: false,
    });

    await slaCheckJob.checkAllSLAs();

    const updated = await getLead(lead.id);
    expect(updated.slaBreached).toBe(true);
  });

  it('should not breach if first contact made in time', async () => {
    const assignedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const firstContactAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

    const lead = await createLead({
      assignedAt,
      firstContactAt,
      priority: 'HIGH',
      slaBreached: false,
    });

    await slaCheckJob.checkAllSLAs();

    const updated = await getLead(lead.id);
    expect(updated.slaBreached).toBe(false);
  });
});
```

---

## Definition of Done

- [ ] SLA check job created
- [ ] Cron job for safety net
- [ ] SLA stats query works
- [ ] First contact tracking works
- [ ] Tests passing

---

## Dev Notes

### SLA Rules by Priority

| Priority | Response Time |
|----------|---------------|
| URGENT | 1 hour |
| HIGH | 4 hours |
| MEDIUM | 24 hours |
| LOW | 48 hours |

### References
- [Source: tech-spec-epic-6.md#SLA-Tracking]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/jobs/sla-check.job.ts
- packages/twenty-server/src/modules/real-estate/services/sla.service.ts
