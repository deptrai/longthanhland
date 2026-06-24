# Story 6.2: Auto-Assignment Algorithm

Status: drafted

## Story

As a **System**,
I want to automatically assign leads to sales agents,
so that leads are distributed fairly.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-6.2.1 | New lead | Created | Auto-assigned to agent | Lead has assignedTo |
| AC-6.2.2 | Algorithm | Round-robin | Fair distribution | Even assignment |
| AC-6.2.3 | Agent inactive | Skip in assignment | Next active agent | Inactive skipped |

---

## Backend Tasks

### BE-1: Create Lead Assignment Service (AC: 1-3)

**File**: `packages/twenty-server/src/modules/real-estate/services/lead-assignment.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class LeadAssignmentService {
  private lastAssignedIndex = 0;

  constructor(
    @InjectRepository(WorkspaceMemberWorkspaceEntity)
    private memberRepository: Repository<WorkspaceMemberWorkspaceEntity>,
    @InjectRepository(PersonWorkspaceEntity)
    private personRepository: Repository<PersonWorkspaceEntity>,
    @InjectQueue('real-estate')
    private leadQueue: Queue,
  ) {}

  /**
   * Auto-assign a lead to the next available sales agent
   * Uses round-robin algorithm for fair distribution
   */
  async autoAssignLead(leadId: string): Promise<PersonWorkspaceEntity> {
    const lead = await this.personRepository.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get active sales agents
    const activeAgents = await this.getActiveSalesAgents();

    if (activeAgents.length === 0) {
      throw new Error('No active sales agents available');
    }

    // Round-robin selection
    const selectedAgent = this.selectNextAgent(activeAgents);

    // Assign lead
    // [ASSUMPTION: Person has assignedToId field via extension]
    (lead as any).assignedToId = selectedAgent.id;
    (lead as any).assignedAt = new Date();

    await this.personRepository.save(lead);

    // Schedule SLA tracking job
    await this.leadQueue.add('sla-check', {
      leadId: lead.id,
      assignedAt: new Date().toISOString(),
    }, {
      delay: 4 * 60 * 60 * 1000, // Check after 4 hours
    });

    return lead;
  }

  /**
   * Get all active sales agents
   */
  private async getActiveSalesAgents(): Promise<WorkspaceMemberWorkspaceEntity[]> {
    // [ASSUMPTION: WorkspaceMember has isActive and role fields via extension]
    return this.memberRepository.find({
      where: {
        // isActive: true,
        // role: 'SALES_AGENT',
      },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Round-robin agent selection
   */
  private selectNextAgent(agents: WorkspaceMemberWorkspaceEntity[]): WorkspaceMemberWorkspaceEntity {
    const agent = agents[this.lastAssignedIndex % agents.length];
    this.lastAssignedIndex++;
    return agent;
  }

  /**
   * Manual lead assignment
   */
  async assignLead(leadId: string, agentId: string): Promise<PersonWorkspaceEntity> {
    const lead = await this.personRepository.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    (lead as any).assignedToId = agentId;
    (lead as any).assignedAt = new Date();

    return this.personRepository.save(lead);
  }
}
```

**Subtasks**:
- [ ] Create lead assignment service
- [ ] Implement round-robin algorithm
- [ ] Filter inactive agents
- [ ] Schedule SLA tracking

### BE-2: Create Lead Subscriber (AC: 1)

**File**: `packages/twenty-server/src/modules/real-estate/subscribers/lead-auto-assign.subscriber.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, DataSource } from 'typeorm';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { LeadAssignmentService } from '../services/lead-assignment.service';

@Injectable()
@EventSubscriber()
export class LeadAutoAssignSubscriber implements EntitySubscriberInterface<PersonWorkspaceEntity> {
  constructor(
    private dataSource: DataSource,
    private leadAssignmentService: LeadAssignmentService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return PersonWorkspaceEntity;
  }

  async afterInsert(event: InsertEvent<PersonWorkspaceEntity>): Promise<void> {
    const person = event.entity;

    // Check if this is a lead (has leadSource field)
    // [ASSUMPTION: Person has leadSource field via extension]
    if ((person as any).leadSource) {
      try {
        await this.leadAssignmentService.autoAssignLead(person.id);
        console.log(`Auto-assigned lead ${person.id}`);
      } catch (error) {
        console.error(`Failed to auto-assign lead ${person.id}:`, error.message);
      }
    }
  }
}
```

---

## API Tasks

### API-1: Auto-Assign Lead (AC: 1)

```graphql
mutation AutoAssignLead {
  autoAssignLead(leadId: "lead-uuid") {
    id
    name { firstName lastName }
    assignedTo { id name { firstName lastName } }
    assignedAt
  }
}
```

### API-2: Manual Assign Lead (AC: 1)

```graphql
mutation AssignLead {
  assignLead(leadId: "lead-uuid", salesAgentId: "agent-uuid") {
    id
    assignedTo { id }
  }
}
```

---

## Testing Tasks

### TEST-1: Assignment Tests

```typescript
describe('Lead Auto-Assignment', () => {
  it('should auto-assign new lead (AC: 1)', async () => {
    const agents = await createAgents(3);
    const lead = await createLead({ leadSource: 'WEBSITE' });

    // Trigger auto-assignment
    const assigned = await leadAssignmentService.autoAssignLead(lead.id);

    expect(assigned.assignedToId).toBeDefined();
    expect(agents.map(a => a.id)).toContain(assigned.assignedToId);
  });

  it('should distribute leads fairly (AC: 2)', async () => {
    const agents = await createAgents(3);
    const leads = await Promise.all(
      Array(9).fill(null).map(() => createLead({ leadSource: 'WEBSITE' }))
    );

    // Assign all leads
    for (const lead of leads) {
      await leadAssignmentService.autoAssignLead(lead.id);
    }

    // Check distribution
    const assignments = await getLeadAssignments();
    const counts = agents.map(a =>
      assignments.filter(l => l.assignedToId === a.id).length
    );

    // Each agent should have 3 leads
    expect(counts).toEqual([3, 3, 3]);
  });

  it('should skip inactive agents (AC: 3)', async () => {
    const activeAgent = await createAgent({ isActive: true });
    const inactiveAgent = await createAgent({ isActive: false });
    const lead = await createLead({ leadSource: 'WEBSITE' });

    const assigned = await leadAssignmentService.autoAssignLead(lead.id);

    expect(assigned.assignedToId).toBe(activeAgent.id);
    expect(assigned.assignedToId).not.toBe(inactiveAgent.id);
  });
});
```

---

## Definition of Done

- [ ] LeadAssignmentService created
- [ ] Round-robin algorithm works
- [ ] Inactive agents skipped
- [ ] Auto-assign on lead creation
- [ ] SLA tracking scheduled
- [ ] Tests passing

---

## Dev Notes

### Round-Robin Algorithm

```
Agents: [A, B, C]
Lead 1 → A (index 0)
Lead 2 → B (index 1)
Lead 3 → C (index 2)
Lead 4 → A (index 0)
...
```

### Alternative Algorithms

| Algorithm | Use Case |
|-----------|----------|
| Round-robin | Fair distribution |
| Weighted | Based on capacity |
| Skill-based | Match specialization |
| Least-busy | Based on current load |

### References
- [Source: tech-spec-epic-6.md#Auto-Assignment]

---

## Dev Agent Record

### File List
- packages/twenty-server/src/modules/real-estate/services/lead-assignment.service.ts
- packages/twenty-server/src/modules/real-estate/subscribers/lead-auto-assign.subscriber.ts
