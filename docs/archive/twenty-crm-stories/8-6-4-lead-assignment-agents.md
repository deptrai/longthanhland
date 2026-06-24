# Story 8.6.4: Lead Assignment to Agents

Status: drafted

## Story
As a developer, I want to assign converted leads to sales agents automatically, so that leads are distributed fairly.

## Acceptance Criteria

1. **Use Existing Assignment Algorithm**
   - Given lead created from inquiry (Story 8.6.3)
   - When assignment runs
   - Then uses existing LeadAssignmentService from Module 5
   - And considers:
     - Property location (agent territory)
     - Agent availability (not on leave)
     - Agent workload (active deals count)
     - Round-robin within eligible agents
   - And supports PUBLIC_MARKETPLACE source

2. **Agent Notification**
   - Given agent assigned
   - When notification sent
   - Then receives email + in-app notification with:
     - Lead details (contact name, phone, email)
     - Property details (title, location, price)
     - Inquiry message
     - Trust score of listing
     - Lead score
     - Inquiry timestamp
     - Link to deal in CRM
   - And notification includes action buttons (Call, Email, View Deal)

3. **No Eligible Agents Handling**
   - Given no eligible agents found
   - When assignment attempted
   - Then assigns to default admin user
   - And sends alert to management
   - And logs warning for monitoring
   - And tracks as fallback assignment

4. **Assignment Time SLA**
   - Given assignment triggered
   - When processing
   - Then completes within 1 minute
   - And tracks assignment duration
   - And alerts if exceeds SLA

5. **SLA Tracking**
   - Given inquiry submitted
   - When tracking SLA
   - Then measures:
     - Time from inquiry to assignment
     - Time from assignment to first agent response
     - Time from inquiry to first agent response (total)
   - And stores SLA metrics
   - And generates SLA reports

6. **Assignment Metrics**
   - Given assignments happening
   - When tracking metrics
   - Then records:
     - Assignment success rate
     - Average assignment time
     - Agent response time
     - Fallback assignment rate
     - Lead conversion rate by agent
   - And provides analytics dashboard

## Tasks / Subtasks

- [ ] **Task 1: Extend LeadAssignmentService** (AC: #1)
  - [ ] Add PUBLIC_MARKETPLACE support:
    ```typescript
    @Injectable()
    export class LeadAssignmentService {
      async assignLead(
        deal: Deal,
        options?: { source?: string; priority?: string }
      ): Promise<User> {
        const { source = 'INTERNAL', priority = 'NORMAL' } = options || {};

        // Get eligible agents
        const eligibleAgents = await this.getEligibleAgents(deal.property, source);

        if (eligibleAgents.length === 0) {
          return await this.handleNoEligibleAgents(deal, source);
        }

        // Select agent using round-robin
        const agent = await this.selectAgent(eligibleAgents, priority);

        // Assign deal to agent
        await this.dealService.update(deal.id, {
          assignedTo: agent.id,
          assignedAt: new Date(),
          source,
          priority,
        });

        // Track assignment
        await this.trackAssignment(deal, agent, source);

        return agent;
      }

      private async getEligibleAgents(
        property: Property,
        source: string
      ): Promise<User[]> {
        // Get agents by territory
        const agents = await this.userRepository.find({
          where: {
            role: 'SALES_AGENT',
            territory: property.district,
            isActive: true,
            onLeave: false,
          },
        });

        // Filter by workload
        const agentsWithWorkload = await Promise.all(
          agents.map(async (agent) => {
            const activeDeals = await this.dealService.countActiveDeals(agent.id);
            return { agent, activeDeals };
          })
        );

        // Filter agents with capacity (< 20 active deals)
        const eligibleAgents = agentsWithWorkload
          .filter(({ activeDeals }) => activeDeals < 20)
          .map(({ agent }) => agent);

        return eligibleAgents;
      }

      private async selectAgent(
        agents: User[],
        priority: string
      ): Promise<User> {
        // For high priority, select agent with lowest workload
        if (priority === 'HIGH') {
          const agentsWithWorkload = await Promise.all(
            agents.map(async (agent) => {
              const activeDeals = await this.dealService.countActiveDeals(agent.id);
              return { agent, activeDeals };
            })
          );

          agentsWithWorkload.sort((a, b) => a.activeDeals - b.activeDeals);
          return agentsWithWorkload[0].agent;
        }

        // For normal priority, use round-robin
        const lastAssignedAgent = await this.getLastAssignedAgent(agents);
        const currentIndex = agents.findIndex(a => a.id === lastAssignedAgent?.id);
        const nextIndex = (currentIndex + 1) % agents.length;

        return agents[nextIndex];
      }

      private async handleNoEligibleAgents(
        deal: Deal,
        source: string
      ): Promise<User> {
        // Get default admin
        const admin = await this.userRepository.findOne({
          where: { role: 'ADMIN', isDefault: true },
        });

        // Assign to admin
        await this.dealService.update(deal.id, {
          assignedTo: admin.id,
          assignedAt: new Date(),
          source,
          isFallbackAssignment: true,
        });

        // Alert management
        await this.notificationService.sendAlert({
          type: 'NO_ELIGIBLE_AGENTS',
          message: `No eligible agents for deal ${deal.id} from ${source}. Assigned to default admin.`,
          severity: 'high',
          dealId: deal.id,
        });

        // Log warning
        console.warn(`No eligible agents for deal ${deal.id}. Assigned to default admin.`);

        return admin;
      }
    }
    ```

- [ ] **Task 2: Send Agent Notification** (AC: #2)
  - [ ] Implement notification (already covered in Story 8.6.3):
    ```typescript
    // This is already implemented in Story 8.6.3
    // Just ensure it's called after assignment
    await this.notificationService.sendLeadAssignmentNotification(agent, deal, inquiry);
    ```

- [ ] **Task 3: Track Assignment Metrics** (AC: #4, #6)
  - [ ] Record assignment:
    ```typescript
    private async trackAssignment(
      deal: Deal,
      agent: User,
      source: string
    ): Promise<void> {
      const assignmentDuration = Date.now() - deal.createdAt.getTime();

      await this.metricsService.record({
        metric: 'lead_assigned',
        value: 1,
        tags: {
          source,
          agentId: agent.id,
          territory: agent.territory,
          priority: deal.priority,
          isFallback: deal.isFallbackAssignment || false,
        },
      });

      await this.metricsService.record({
        metric: 'assignment_duration_ms',
        value: assignmentDuration,
        tags: {
          source,
          agentId: agent.id,
        },
      });

      // Check SLA (1 minute = 60000ms)
      if (assignmentDuration > 60000) {
        await this.notificationService.sendAlert({
          type: 'ASSIGNMENT_SLA_BREACH',
          message: `Assignment took ${assignmentDuration}ms for deal ${deal.id}`,
          severity: 'medium',
          dealId: deal.id,
        });
      }
    }
    ```

- [ ] **Task 4: Implement SLA Tracking** (AC: #5)
  - [ ] Track SLA metrics:
    ```typescript
    @Injectable()
    export class SLATrackingService {
      async trackInquirySLA(inquiry: Inquiry, deal: Deal, agent: User): Promise<void> {
        const inquiryToAssignment = deal.assignedAt.getTime() - inquiry.createdAt.getTime();

        await this.metricsService.record({
          metric: 'inquiry_to_assignment_ms',
          value: inquiryToAssignment,
          tags: {
            source: 'PUBLIC_MARKETPLACE',
            agentId: agent.id,
            leadScore: deal.leadScore,
          },
        });

        // Create SLA record
        await this.slaRecordRepository.save({
          inquiryId: inquiry.id,
          dealId: deal.id,
          agentId: agent.id,
          inquiryCreatedAt: inquiry.createdAt,
          assignedAt: deal.assignedAt,
          inquiryToAssignmentMs: inquiryToAssignment,
        });
      }

      async trackAgentResponse(deal: Deal, responseAt: Date): Promise<void> {
        const assignmentToResponse = responseAt.getTime() - deal.assignedAt.getTime();
        const inquiryToResponse = responseAt.getTime() - deal.createdAt.getTime();

        await this.metricsService.record({
          metric: 'assignment_to_response_ms',
          value: assignmentToResponse,
          tags: {
            agentId: deal.assignedTo,
            leadScore: deal.leadScore,
          },
        });

        await this.metricsService.record({
          metric: 'inquiry_to_response_ms',
          value: inquiryToResponse,
          tags: {
            agentId: deal.assignedTo,
            leadScore: deal.leadScore,
          },
        });

        // Update SLA record
        await this.slaRecordRepository.update(
          { dealId: deal.id },
          {
            firstResponseAt: responseAt,
            assignmentToResponseMs: assignmentToResponse,
            inquiryToResponseMs: inquiryToResponse,
          }
        );
      }
    }
    ```

- [ ] **Task 5: Create SLA Record Entity** (AC: #5)
  - [ ] Define entity:
    ```typescript
    @Entity()
    export class SLARecord {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column('uuid')
      inquiryId: string;

      @Column('uuid')
      dealId: string;

      @Column('uuid')
      agentId: string;

      @Column('timestamp')
      inquiryCreatedAt: Date;

      @Column('timestamp')
      assignedAt: Date;

      @Column('timestamp', { nullable: true })
      firstResponseAt?: Date;

      @Column('int')
      inquiryToAssignmentMs: number;

      @Column('int', { nullable: true })
      assignmentToResponseMs?: number;

      @Column('int', { nullable: true })
      inquiryToResponseMs?: number;

      @CreateDateColumn()
      createdAt: Date;
    }
    ```

- [ ] **Task 6: Add Assignment Analytics** (AC: #6)
  - [ ] Create analytics queries:
    ```typescript
    @Injectable()
    export class AssignmentAnalyticsService {
      async getAssignmentMetrics(
        startDate: Date,
        endDate: Date
      ): Promise<AssignmentMetrics> {
        const records = await this.slaRecordRepository.find({
          where: {
            createdAt: Between(startDate, endDate),
          },
        });

        const totalAssignments = records.length;
        const successfulAssignments = records.filter(r => r.firstResponseAt).length;
        const successRate = (successfulAssignments / totalAssignments) * 100;

        const avgAssignmentTime = records.reduce(
          (sum, r) => sum + r.inquiryToAssignmentMs,
          0
        ) / totalAssignments;

        const respondedRecords = records.filter(r => r.assignmentToResponseMs);
        const avgResponseTime = respondedRecords.reduce(
          (sum, r) => sum + r.assignmentToResponseMs,
          0
        ) / respondedRecords.length;

        return {
          totalAssignments,
          successRate,
          avgAssignmentTime,
          avgResponseTime,
          slaBreaches: records.filter(r => r.inquiryToAssignmentMs > 60000).length,
        };
      }

      async getAgentPerformance(agentId: string): Promise<AgentPerformance> {
        const records = await this.slaRecordRepository.find({
          where: { agentId },
        });

        const totalLeads = records.length;
        const respondedLeads = records.filter(r => r.firstResponseAt).length;
        const responseRate = (respondedLeads / totalLeads) * 100;

        const avgResponseTime = records
          .filter(r => r.assignmentToResponseMs)
          .reduce((sum, r) => sum + r.assignmentToResponseMs, 0) / respondedLeads;

        return {
          agentId,
          totalLeads,
          responseRate,
          avgResponseTime,
        };
      }
    }
    ```

- [ ] **Task 7: Create Unit Tests**
  - [ ] Test assignment algorithm
  - [ ] Test no eligible agents handling
  - [ ] Test SLA tracking
  - [ ] Test metrics recording
  - [ ] Achieve >80% coverage

- [ ] **Task 8: Integration Testing**
  - [ ] Test complete assignment flow
  - [ ] Test with various agent scenarios
  - [ ] Test fallback assignment
  - [ ] Test SLA tracking

- [ ] **Task 9: Manual Testing**
  - [ ] Create inquiry for internal property
  - [ ] Verify agent assignment
  - [ ] Verify notifications
  - [ ] Check SLA metrics
  - [ ] Test fallback scenario

## Dev Notes

### Architecture Context

**Lead Assignment**: Automatic agent assignment
- Reuses existing LeadAssignmentService from Module 5
- Extended to support PUBLIC_MARKETPLACE source
- Territory-based assignment
- Workload balancing (< 20 active deals)
- Round-robin for normal priority
- Lowest workload for high priority
- Fallback to default admin
- SLA tracking and metrics

**Key Design Decisions**:
- Reuse existing Module 5 logic (no duplication)
- Support for PUBLIC_MARKETPLACE source
- Workload capacity limit (20 active deals)
- Priority-based selection (HIGH vs NORMAL)
- Fallback assignment with alerts
- Comprehensive SLA tracking
- Real-time metrics

### Implementation Details

**Assignment Algorithm**:
1. Get eligible agents by territory
2. Filter by availability (not on leave)
3. Filter by workload (< 20 active deals)
4. Select agent:
   - HIGH priority: Lowest workload
   - NORMAL priority: Round-robin
5. If no eligible agents: Assign to default admin + alert

**SLA Metrics**:
- Inquiry to assignment: Target < 1 minute
- Assignment to response: Tracked per agent
- Inquiry to response: Total time tracked

**Fallback Handling**:
- Assigns to default admin user
- Sends high-priority alert to management
- Logs warning for monitoring
- Tracks as fallback assignment

### Testing Strategy

**Unit Tests**: Assignment algorithm, fallback handling, SLA tracking
**Integration Tests**: Complete flow, various scenarios
**Manual Tests**: End-to-end verification, metrics validation

### References

- [Epic 8.6](../real-estate-platform/epics.md#story-864-lead-assignment-to-agents)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.5 (Module 5)
- [Story 8.6.3](./8-6-3-lead-conversion-workflow.md) - Lead Conversion

### Success Criteria

**Definition of Done**:
- ✅ LeadAssignmentService extended for PUBLIC_MARKETPLACE
- ✅ Assignment algorithm working (territory, availability, workload)
- ✅ Agent notifications working (already in 8.6.3)
- ✅ No eligible agents handling working
- ✅ Assignment time SLA working (< 1 minute)
- ✅ SLA tracking implemented
- ✅ Assignment metrics working
- ✅ Analytics dashboard queries working
- ✅ Fallback assignment working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
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
