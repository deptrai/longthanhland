# Epic Technical Specification: Phân phối Lead & Tự động hóa

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Epic ID**: epic-6
**Status**: Approved
**Dependencies**: Epic 4 (Sales Tools)
**Phase**: Phase 2 (NOT MVP)

---

## Overview

Epic 6 xây dựng hệ thống phân phối lead tự động cho sales agents sử dụng thuật toán round-robin có xét capacity. Bao gồm SLA tracking, notifications, và admin override dashboard.

---

## Objectives and Scope

### In-Scope ✅

| Item | PRD Section |
|------|-------------|
| Lead extension (assignedSales, SLA fields) | 4.4 |
| Auto-assignment algorithm (round-robin + capacity) | 4.4.3 |
| SLA tracking (response time, follow-up) | 4.4.3 |
| Notification system (Email + Zalo) | 4.4.4 |
| Admin assignment dashboard | 4.4.4 |

### Out-of-Scope ❌

- AI-based lead scoring
- Predictive assignment

---

## System Architecture Alignment

| Component | Architecture Lines |
|-----------|-------------------|
| lead-extension.ts | 99 |
| lead-assignment.service.ts | 107 |
| lead-assignment.job.ts | 111 |

---

## Detailed Design

### Lead Extension Fields

```typescript
// standard-objects/lead-extension.ts
export const LEAD_EXTENSION_FIELDS = {
  assignedSalesId: {
    type: FieldMetadataType.RELATION,
    label: 'Assigned Sales',
  },
  assignedAt: {
    type: FieldMetadataType.DATE_TIME,
    label: 'Assigned At',
  },
  firstContactAt: {
    type: FieldMetadataType.DATE_TIME,
    label: 'First Contact At',
  },
  slaStatus: {
    type: FieldMetadataType.SELECT,
    label: 'SLA Status',
    options: [
      { value: 'ON_TRACK', label: 'On Track', color: 'green' },
      { value: 'AT_RISK', label: 'At Risk', color: 'yellow' },
      { value: 'BREACHED', label: 'Breached', color: 'red' },
    ],
  },
  responseTimeMinutes: {
    type: FieldMetadataType.NUMBER,
    label: 'Response Time (min)',
  },
  interestedProjectId: {
    type: FieldMetadataType.RELATION,
    label: 'Interested Project',
  },
};
```

### Lead Assignment Service

```typescript
// services/lead-assignment.service.ts
@Injectable()
export class LeadAssignmentService {
  // SLA thresholds (from PRD)
  private readonly SLA_RESPONSE_TIME_MINUTES = 30;
  private readonly SLA_FOLLOW_UP_HOURS = 24;

  async autoAssignLead(leadId: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });

    if (lead.assignedSalesId) {
      throw new BadRequestException('Lead already assigned');
    }

    // Get eligible sales agents (capacity > activeLeadCount)
    const eligibleAgents = await this.userRepository.find({
      where: {
        role: 'SALES',
        capacity: MoreThan(Raw(alias => `${alias}."activeLeadCount"`)),
      },
      order: { lastAssignedAt: 'ASC' }, // Round-robin: oldest assignment first
    });

    if (eligibleAgents.length === 0) {
      throw new BadRequestException('No eligible sales agents available');
    }

    // Assign to first eligible (round-robin)
    const selectedAgent = eligibleAgents[0];

    lead.assignedSalesId = selectedAgent.id;
    lead.assignedAt = new Date();
    lead.slaStatus = 'ON_TRACK';

    // Update agent's active lead count
    selectedAgent.activeLeadCount += 1;
    selectedAgent.lastAssignedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.save(lead);
      await manager.save(selectedAgent);
    });

    // Send notification
    await this.notificationService.sendLeadAssigned(selectedAgent, lead);

    return lead;
  }

  async manualAssignLead(leadId: string, salesAgentId: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    const agent = await this.userRepository.findOne({ where: { id: salesAgentId } });

    lead.assignedSalesId = salesAgentId;
    lead.assignedAt = new Date();
    lead.slaStatus = 'ON_TRACK';

    agent.activeLeadCount += 1;

    await this.dataSource.transaction(async (manager) => {
      await manager.save(lead);
      await manager.save(agent);
    });

    await this.notificationService.sendLeadAssigned(agent, lead);

    return lead;
  }
}
```

### Lead Assignment Job (Background)

```typescript
// jobs/lead-assignment.job.ts
@Processor('real-estate')
export class LeadAssignmentJob {
  // Check SLA status every 5 minutes
  @Cron('*/5 * * * *')
  async checkSlaStatus(): Promise<void> {
    const leads = await this.leadRepository.find({
      where: {
        assignedSalesId: Not(IsNull()),
        firstContactAt: IsNull(),
        slaStatus: Not('BREACHED'),
      },
    });

    for (const lead of leads) {
      const minutesSinceAssignment = differenceInMinutes(new Date(), lead.assignedAt);

      if (minutesSinceAssignment > this.SLA_RESPONSE_TIME_MINUTES) {
        lead.slaStatus = 'BREACHED';
        await this.notificationService.sendSlaBreached(lead);
      } else if (minutesSinceAssignment > this.SLA_RESPONSE_TIME_MINUTES * 0.8) {
        lead.slaStatus = 'AT_RISK';
        await this.notificationService.sendSlaAtRisk(lead);
      }

      await this.leadRepository.save(lead);
    }
  }

  // Auto-assign unassigned leads
  @Process('auto-assign')
  async handleAutoAssign(job: Job<{ leadId: string }>): Promise<void> {
    await this.leadAssignmentService.autoAssignLead(job.data.leadId);
  }
}
```

### Notification Service

```typescript
// services/notification.service.ts
@Injectable()
export class NotificationService {
  async sendLeadAssigned(agent: User, lead: Lead): Promise<void> {
    // Email notification
    await this.emailService.send({
      to: agent.email,
      subject: `New Lead Assigned: ${lead.name}`,
      template: 'lead-assigned',
      data: { agent, lead },
    });

    // Zalo notification (if configured)
    if (agent.zaloId) {
      await this.zaloService.sendMessage(agent.zaloId, {
        text: `Bạn có lead mới: ${lead.name}. Vui lòng liên hệ trong 30 phút.`,
      });
    }
  }

  async sendSlaAtRisk(lead: Lead): Promise<void> {
    // Notify sales agent
    await this.emailService.send({
      to: lead.assignedSales.email,
      subject: `⚠️ SLA At Risk: ${lead.name}`,
      template: 'sla-at-risk',
    });
  }

  async sendSlaBreached(lead: Lead): Promise<void> {
    // Notify sales agent and manager
    await this.emailService.send({
      to: [lead.assignedSales.email, lead.assignedSales.manager?.email],
      subject: `🚨 SLA Breached: ${lead.name}`,
      template: 'sla-breached',
    });
  }
}
```

### APIs and Interfaces

```graphql
type Mutation {
  autoAssignLead(leadId: ID!): Lead!
  assignLead(leadId: ID!, salesAgentId: ID!): Lead!
  recordFirstContact(leadId: ID!): Lead!
}

type Query {
  unassignedLeads: [Lead!]!
  myLeads(slaStatus: SlaStatus): [Lead!]!
  leadDistributionDashboard: LeadDistributionData!
}

type LeadDistributionData {
  totalUnassigned: Int!
  totalAssigned: Int!
  slaBreachedCount: Int!
  agentWorkload: [AgentWorkload!]!
}

type AgentWorkload {
  agentId: ID!
  agentName: String!
  capacity: Int!
  activeLeads: Int!
  availableSlots: Int!
}
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Auto-assign | <1s |
| SLA check | Every 5 min |
| Notification delivery | <30s |

---

## Acceptance Criteria

| AC ID | Criteria |
|-------|----------|
| AC-6.1.1 | Lead has assignedSalesId, assignedAt, slaStatus fields |
| AC-6.2.1 | Auto-assign selects agent with available capacity |
| AC-6.2.2 | Round-robin: oldest lastAssignedAt first |
| AC-6.2.3 | Agent's activeLeadCount incremented |
| AC-6.3.1 | SLA status = AT_RISK when >80% of 30 min |
| AC-6.3.2 | SLA status = BREACHED when >30 min without contact |
| AC-6.3.3 | SLA check runs every 5 minutes |
| AC-6.4.1 | Email sent on lead assignment |
| AC-6.4.2 | Zalo message sent if agent has zaloId |
| AC-6.4.3 | Notification on SLA breach |
| AC-6.5.1 | Admin can manually assign/reassign |
| AC-6.5.2 | Dashboard shows agent workload |

---

## Traceability

| AC | PRD | Architecture |
|----|-----|--------------|
| AC-6.1.x | 4.4.2 | lead-extension.ts |
| AC-6.2.x | 4.4.3 | LeadAssignmentService |
| AC-6.3.x | 4.4.3 | LeadAssignmentJob |
| AC-6.4.x | 4.4.4 | NotificationService |
| AC-6.5.x | 4.4.4 | Admin dashboard |

---

_Epic 6: Phân phối Lead & Tự động hóa - 6 stories (Phase 2)_
