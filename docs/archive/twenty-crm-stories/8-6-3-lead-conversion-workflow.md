# Story 8.6.3: Lead Conversion Workflow

Status: drafted

## Story
As a developer, I want to implement automatic lead conversion for internal properties, so that inquiries become leads for sales agents.

## Acceptance Criteria

1. **Check Property Link**
   - Given inquiry created (Story 8.6.2)
   - When processing conversion
   - Then checks if `listing.property` exists
   - And only proceeds if property linked
   - And skips conversion if no property link

2. **Find or Create Contact**
   - Given inquiry with contact info
   - When processing conversion
   - Then searches for existing Contact by:
     - Phone number (exact match)
     - Email (exact match)
   - And creates new Contact if not found
   - And updates existing Contact if found
   - And sets Contact fields from inquiry

3. **Create Deal**
   - Given Contact created/found
   - When creating Deal
   - Then creates Deal with:
     - property: `listing.property`
     - status: NEW_LEAD
     - source: PUBLIC_MARKETPLACE
     - notes: inquiry message
     - leadScore: calculated score
     - contact: Contact ID
   - And uses existing Deal entity from internal CRM
   - And Deal properly linked to property

4. **Calculate Lead Score**
   - Given inquiry data
   - When calculating score
   - Then scores based on:
     - Verified contact (+30): inquirer is verified PublicUser
     - Quality message (+20): message > 100 chars with details
     - High trust listing (+20): listing trustScore > 70
     - Budget indication (+15): message mentions price/budget
     - Timeline indication (+15): message mentions timeline/urgency
   - And score range 0-100
   - And stored in Deal.leadScore

5. **Assign to Sales Agent**
   - Given Deal created
   - When assigning agent
   - Then uses existing lead assignment algorithm (Module 5)
   - And assigns based on:
     - Property location (agent territory)
     - Agent availability (not on leave)
     - Agent workload (active deals)
     - Round-robin within eligible agents
   - And assigns to default admin if no eligible agents

6. **Notify Assigned Agent**
   - Given agent assigned
   - When notification sent
   - Then sends email + in-app notification with:
     - Lead details (contact, property, inquiry message)
     - Trust score of listing
     - Lead score
     - Inquiry timestamp
     - Link to deal in CRM
   - And notification includes action buttons

7. **Link Inquiry to Deal**
   - Given Deal created
   - When linking
   - Then sets `inquiry.convertedToDeal` to Deal ID
   - And creates audit log entry
   - And tracks conversion metrics

8. **Async Processing**
   - Given inquiry submitted
   - When conversion triggered
   - Then happens in background job (BullMQ)
   - And completes within 1 minute
   - And retries on failure (3 attempts)
   - And logs errors for monitoring

## Tasks / Subtasks

- [ ] **Task 1: Create ConvertInquiryToLeadJob** (AC: #8)
  - [ ] Create background job:
    ```typescript
    @Processor('inquiry-conversion')
    export class ConvertInquiryToLeadJob {
      constructor(
        private readonly inquiryService: InquiryService,
        private readonly contactService: ContactService,
        private readonly dealService: DealService,
        private readonly leadAssignmentService: LeadAssignmentService,
        private readonly notificationService: NotificationService,
      ) {}

      @Process('convert-to-lead')
      async handleConversion(job: Job<{ inquiryId: string }>) {
        const { inquiryId } = job.data;

        try {
          const inquiry = await this.inquiryService.findOne(inquiryId);

          // Check if listing has property link
          if (!inquiry.listing.property) {
            console.log(`Inquiry ${inquiryId} skipped: no property link`);
            return;
          }

          // Find or create contact
          const contact = await this.findOrCreateContact(inquiry);

          // Calculate lead score
          const leadScore = await this.calculateLeadScore(inquiry);

          // Create deal
          const deal = await this.dealService.create({
            propertyId: inquiry.listing.property.id,
            contactId: contact.id,
            status: 'NEW_LEAD',
            source: 'PUBLIC_MARKETPLACE',
            notes: inquiry.message,
            leadScore,
          });

          // Assign to agent
          const agent = await this.leadAssignmentService.assignLead(deal);

          // Notify agent
          await this.notificationService.sendLeadAssignmentNotification(agent, deal, inquiry);

          // Link inquiry to deal
          await this.inquiryService.update(inquiryId, {
            convertedToDeal: deal.id,
          });

          // Audit log
          await this.auditLogService.log({
            action: 'INQUIRY_CONVERTED_TO_LEAD',
            inquiryId,
            dealId: deal.id,
            contactId: contact.id,
            agentId: agent.id,
            leadScore,
          });

          console.log(`Inquiry ${inquiryId} converted to deal ${deal.id}`);
        } catch (error) {
          console.error(`Failed to convert inquiry ${inquiryId}:`, error);
          throw error; // Trigger retry
        }
      }
    }
    ```

- [ ] **Task 2: Implement findOrCreateContact** (AC: #2)
  - [ ] Contact matching logic:
    ```typescript
    private async findOrCreateContact(inquiry: Inquiry): Promise<Contact> {
      // Try to find by phone
      let contact = await this.contactService.findByPhone(inquiry.contactPhone);

      // Try to find by email if not found by phone
      if (!contact && inquiry.contactEmail) {
        contact = await this.contactService.findByEmail(inquiry.contactEmail);
      }

      // Create new contact if not found
      if (!contact) {
        contact = await this.contactService.create({
          fullName: inquiry.inquirer?.fullName || 'Unknown',
          phone: inquiry.contactPhone,
          email: inquiry.contactEmail,
          source: 'PUBLIC_MARKETPLACE',
          notes: `Created from inquiry for ${inquiry.listing.title}`,
        });
      } else {
        // Update existing contact
        await this.contactService.update(contact.id, {
          email: inquiry.contactEmail || contact.email,
          lastContactedAt: new Date(),
        });
      }

      return contact;
    }
    ```

- [ ] **Task 3: Implement Lead Score Algorithm** (AC: #4)
  - [ ] Calculate lead score:
    ```typescript
    private async calculateLeadScore(inquiry: Inquiry): Promise<number> {
      let score = 0;

      // Verified contact (+30)
      if (inquiry.inquirer && inquiry.inquirer.verified) {
        score += 30;
      }

      // Quality message (+20)
      if (inquiry.message.length > 100) {
        // Check for details (keywords)
        const detailKeywords = ['interested', 'visit', 'schedule', 'view', 'buy', 'purchase'];
        const hasDetails = detailKeywords.some(keyword =>
          inquiry.message.toLowerCase().includes(keyword)
        );
        if (hasDetails) {
          score += 20;
        }
      }

      // High trust listing (+20)
      if (inquiry.listing.trustScore && inquiry.listing.trustScore > 70) {
        score += 20;
      }

      // Budget indication (+15)
      const budgetKeywords = ['budget', 'price', 'afford', 'payment', 'financing', 'loan'];
      const hasBudget = budgetKeywords.some(keyword =>
        inquiry.message.toLowerCase().includes(keyword)
      );
      if (hasBudget) {
        score += 15;
      }

      // Timeline indication (+15)
      const timelineKeywords = ['urgent', 'soon', 'asap', 'immediately', 'this week', 'this month'];
      const hasTimeline = timelineKeywords.some(keyword =>
        inquiry.message.toLowerCase().includes(keyword)
      );
      if (hasTimeline) {
        score += 15;
      }

      return Math.min(score, 100);
    }
    ```

- [ ] **Task 4: Trigger Job on Inquiry Creation** (AC: #1, #8)
  - [ ] Add job trigger:
    ```typescript
    @Injectable()
    export class InquiryEventListener {
      constructor(
        @InjectQueue('inquiry-conversion')
        private readonly conversionQueue: Queue,
      ) {}

      @OnEvent('inquiry.created')
      async handleInquiryCreated(event: InquiryCreatedEvent) {
        // Queue conversion job
        await this.conversionQueue.add('convert-to-lead', {
          inquiryId: event.inquiryId,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        });
      }
    }
    ```

- [ ] **Task 5: Integrate with Lead Assignment Service** (AC: #5)
  - [ ] Use existing service:
    ```typescript
    // Reuse existing LeadAssignmentService from Module 5
    const agent = await this.leadAssignmentService.assignLead(deal, {
      source: 'PUBLIC_MARKETPLACE',
      priority: leadScore > 70 ? 'HIGH' : 'NORMAL',
    });
    ```

- [ ] **Task 6: Send Agent Notification** (AC: #6)
  - [ ] Implement notification:
    ```typescript
    async sendLeadAssignmentNotification(
      agent: User,
      deal: Deal,
      inquiry: Inquiry,
    ): Promise<void> {
      // Email notification
      const emailTemplate = `
        <h2>New Lead Assigned</h2>
        <p>You have been assigned a new lead from the Public Marketplace.</p>

        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Property Details</h3>
          <p><strong>${deal.property.title}</strong></p>
          <p>${deal.property.location}</p>
          <p>Price: ${formatPrice(deal.property.price)} VNĐ</p>
        </div>

        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Contact Information</h3>
          <p>Name: ${deal.contact.fullName}</p>
          <p>Phone: ${deal.contact.phone}</p>
          ${deal.contact.email ? `<p>Email: ${deal.contact.email}</p>` : ''}
        </div>

        <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h3>Inquiry Message</h3>
          <p>${inquiry.message}</p>
        </div>

        <div style="margin: 20px 0;">
          <p><strong>Lead Score:</strong> ${deal.leadScore}/100</p>
          <p><strong>Trust Score:</strong> ${inquiry.listing.trustScore}/100</p>
          <p><strong>Submitted:</strong> ${formatDate(inquiry.createdAt)}</p>
        </div>

        <a href="${process.env.APP_URL}/deals/${deal.id}"
           style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View Deal in CRM
        </a>
      `;

      await this.emailService.send({
        to: agent.email,
        subject: `New Lead: ${deal.property.title}`,
        html: emailTemplate,
      });

      // In-app notification
      await this.notificationService.create({
        userId: agent.id,
        type: 'LEAD_ASSIGNED',
        title: 'New Lead Assigned',
        message: `You have been assigned a new lead for ${deal.property.title}`,
        data: {
          dealId: deal.id,
          leadScore: deal.leadScore,
          trustScore: inquiry.listing.trustScore,
        },
        actionUrl: `/deals/${deal.id}`,
      });
    }
    ```

- [ ] **Task 7: Add Audit Logging** (AC: #7)
  - [ ] Log conversion:
    ```typescript
    await this.auditLogService.log({
      action: 'INQUIRY_CONVERTED_TO_LEAD',
      userId: inquiry.inquirerId,
      metadata: {
        inquiryId: inquiry.id,
        dealId: deal.id,
        contactId: contact.id,
        agentId: agent.id,
        leadScore: deal.leadScore,
        trustScore: inquiry.listing.trustScore,
        propertyId: deal.property.id,
        source: 'PUBLIC_MARKETPLACE',
      },
    });
    ```

- [ ] **Task 8: Add Metrics Tracking** (AC: #7)
  - [ ] Track conversion metrics:
    ```typescript
    await this.metricsService.record({
      metric: 'inquiry_converted_to_lead',
      value: 1,
      tags: {
        leadScore: deal.leadScore,
        trustScore: inquiry.listing.trustScore,
        hasVerifiedContact: !!inquiry.inquirer?.verified,
        agentId: agent.id,
      },
    });
    ```

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test conversion job
  - [ ] Test contact matching
  - [ ] Test lead score calculation
  - [ ] Test agent assignment
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete conversion flow
  - [ ] Test with/without property link
  - [ ] Test contact creation vs update
  - [ ] Test agent notification
  - [ ] Test retry logic

- [ ] **Task 11: Manual Testing**
  - [ ] Submit inquiry for internal property
  - [ ] Verify contact created/updated
  - [ ] Verify deal created
  - [ ] Verify agent assigned
  - [ ] Verify notifications sent
  - [ ] Check audit logs

## Dev Notes

### Architecture Context

**Lead Conversion Workflow**: Automatic inquiry-to-lead conversion
- Background job processing (BullMQ)
- Contact matching and creation
- Deal creation with lead score
- Agent assignment (reuses Module 5)
- Multi-channel notifications
- Audit logging and metrics

**Key Design Decisions**:
- Only converts if listing has property link
- Contact matching by phone/email
- Lead score algorithm with 5 factors
- Reuses existing lead assignment logic
- Async processing with retry
- Complete audit trail

### Implementation Details

**Lead Score Factors** (0-100):
1. Verified contact (+30): inquirer is verified PublicUser
2. Quality message (+20): >100 chars with detail keywords
3. High trust listing (+20): trustScore > 70
4. Budget indication (+15): mentions price/budget
5. Timeline indication (+15): mentions urgency/timeline

**Contact Matching**:
- First try: Match by phone (exact)
- Second try: Match by email (exact)
- If not found: Create new Contact
- If found: Update email and lastContactedAt

**Agent Assignment**:
- Reuses existing LeadAssignmentService from Module 5
- Considers: territory, availability, workload
- Round-robin within eligible agents
- Falls back to default admin

**Job Processing**:
- Queue: inquiry-conversion
- Retry: 3 attempts with exponential backoff (5s)
- Timeout: 1 minute
- Error logging for monitoring

### Testing Strategy

**Unit Tests**: Job logic, contact matching, lead score, agent assignment
**Integration Tests**: Complete flow, retry logic, notifications
**Manual Tests**: End-to-end verification, audit logs

### References

- [Epic 8.6](../real-estate-platform/epics.md#story-863-lead-conversion-workflow)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.9
- [Story 8.6.1](./8-6-1-inquiry-entity-crud.md) - Inquiry Entity
- [Story 8.6.2](./8-6-2-inquiry-form-notifications.md) - Inquiry Form

### Success Criteria

**Definition of Done**:
- ✅ ConvertInquiryToLeadJob created
- ✅ Property link check working
- ✅ Contact matching/creation working
- ✅ Lead score calculation working
- ✅ Deal creation working
- ✅ Agent assignment working (reuses Module 5)
- ✅ Agent notifications working (email + in-app)
- ✅ Inquiry-to-deal link working
- ✅ Audit logging working
- ✅ Metrics tracking working
- ✅ Async processing working (BullMQ)
- ✅ Retry logic working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 10 hours

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
