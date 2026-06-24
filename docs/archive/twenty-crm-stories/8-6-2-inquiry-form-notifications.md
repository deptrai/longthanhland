# Story 8.6.2: Inquiry Form & Notifications

Status: drafted

## Story
As a buyer, I want to send an inquiry about a listing, so that I can get more information.

## Acceptance Criteria

1. **Submit Inquiry Successfully**
   - Given listing detail page (Epic 8.3)
   - When I submit inquiry form
   - Then creates Inquiry with NEW status
   - And increments `listing.contactCount`
   - And sends email notification to seller
   - And sends SMS notification to seller (if enabled)
   - And sends confirmation email to buyer
   - And returns success message
   - And form resets

2. **Inquiry Form Fields**
   - Given inquiry form displayed
   - When rendered
   - Then includes:
     - Message textarea (required, 10-500 chars, placeholder text)
     - Contact phone (required, Vietnamese format)
     - Contact email (optional, email validation)
     - Preferred contact method (radio: PHONE/EMAIL/BOTH)
     - Agreement checkbox (required, "I agree to be contacted")
   - And all fields properly validated
   - And error messages displayed inline

3. **Rate Limiting**
   - Given rate limiting enforced
   - When checking submission
   - Then max 3 inquiries per IP per hour
   - And rate limit tracked in Redis
   - And clear error message if exceeded
   - And shows remaining time until reset

4. **Pre-fill for Logged-in Users**
   - Given logged-in user
   - When form shown
   - Then contact info pre-filled from user profile:
     - Phone from `publicUser.phone`
     - Email from `publicUser.email`
   - And user can edit pre-filled values
   - And inquirer field set to user ID

5. **Email Notification to Seller**
   - Given inquiry submitted
   - When notification sent
   - Then professional email template with:
     - Listing title and link
     - Inquiry message
     - Buyer contact info
     - Preferred contact method
     - "Reply" button/link
   - And sent to `listing.owner.email`

6. **SMS Notification to Seller**
   - Given seller has SMS enabled
   - When inquiry submitted
   - Then short SMS sent with:
     - "New inquiry for [listing title]"
     - Buyer phone
     - Link to view inquiry
   - And sent to `listing.owner.phone`
   - And respects SMS preferences

7. **Confirmation to Buyer**
   - Given inquiry submitted
   - When confirmation sent
   - Then email to buyer with:
     - "Inquiry sent successfully"
     - Listing details
     - Expected response time
     - Seller contact info (if public)
   - And sent to buyer's email

## Tasks / Subtasks

- [ ] **Task 1: Create createInquiry Mutation** (AC: #1)
  - [ ] Implement mutation:
    ```typescript
    @Mutation(() => InquiryResponse)
    async createInquiry(
      @Args('data') data: CreateInquiryInput,
      @Context() context: any,
    ): Promise<InquiryResponse> {
      // Check rate limit
      const ip = context.req.ip;
      await this.rateLimitService.checkInquiryRateLimit(ip);

      // Create inquiry
      const inquiry = await this.inquiryService.create(data);

      // Increment contact count
      await this.publicListingService.incrementContactCount(data.listingId);

      // Send notifications (async)
      await this.notificationService.sendInquiryNotifications(inquiry);

      // Track metrics
      await this.metricsService.trackInquirySubmitted(inquiry);

      return {
        success: true,
        message: 'Inquiry sent successfully. The seller will contact you soon.',
        inquiry,
      };
    }
    ```

- [ ] **Task 2: Implement Rate Limiting** (AC: #3)
  - [ ] Create rate limiter:
    ```typescript
    @Injectable()
    export class RateLimitService {
      constructor(private readonly redis: Redis) {}

      async checkInquiryRateLimit(ip: string): Promise<void> {
        const key = `ratelimit:inquiry:${ip}`;
        const limit = 3;
        const window = 3600; // 1 hour

        const current = await this.redis.incr(key);

        if (current === 1) {
          await this.redis.expire(key, window);
        }

        if (current > limit) {
          const ttl = await this.redis.ttl(key);
          throw new RateLimitException(
            `You have reached the inquiry limit. Please try again in ${Math.ceil(ttl / 60)} minutes.`
          );
        }
      }
    }
    ```

- [ ] **Task 3: Create Inquiry Form Component** (AC: #2, #4)
  - [ ] Create form component:
    ```typescript
    const InquiryForm = ({ listing, currentUser }: InquiryFormProps) => {
      const [formData, setFormData] = useState({
        message: '',
        contactPhone: currentUser?.phone || '',
        contactEmail: currentUser?.email || '',
        preferredContact: 'PHONE',
        agreement: false,
      });

      const [errors, setErrors] = useState({});
      const [submitting, setSubmitting] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        const validationErrors = validateForm(formData);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }

        setSubmitting(true);

        try {
          await createInquiry({
            variables: {
              data: {
                ...formData,
                listingId: listing.id,
                inquirerId: currentUser?.id,
              },
            },
          });

          toast.success('Inquiry sent successfully!');
          setFormData({ ...formData, message: '', agreement: false });
        } catch (error) {
          if (error.message.includes('rate limit')) {
            toast.error(error.message);
          } else {
            toast.error('Failed to send inquiry. Please try again.');
          }
        } finally {
          setSubmitting(false);
        }
      };

      return (
        <form onSubmit={handleSubmit} className="inquiry-form space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="I'm interested in this property. Please contact me with more details."
              rows={4}
              maxLength={500}
              className="w-full border rounded-lg p-3"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.message.length}/500 characters
            </div>
            {errors.message && (
              <div className="text-red-500 text-sm mt-1">{errors.message}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="0912345678"
              className="w-full border rounded-lg p-3"
            />
            {errors.contactPhone && (
              <div className="text-red-500 text-sm mt-1">{errors.contactPhone}</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Email (Optional)
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="your@email.com"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Preferred Contact Method
            </label>
            <div className="space-y-2">
              {['PHONE', 'EMAIL', 'BOTH'].map((method) => (
                <label key={method} className="flex items-center">
                  <input
                    type="radio"
                    value={method}
                    checked={formData.preferredContact === method}
                    onChange={(e) => setFormData({ ...formData, preferredContact: e.target.value })}
                    className="mr-2"
                  />
                  {method === 'PHONE' && 'Phone'}
                  {method === 'EMAIL' && 'Email'}
                  {method === 'BOTH' && 'Both'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.agreement}
                onChange={(e) => setFormData({ ...formData, agreement: e.target.checked })}
                className="mt-1 mr-2"
              />
              <span className="text-sm">
                I agree to be contacted by the seller regarding this property
              </span>
            </label>
            {errors.agreement && (
              <div className="text-red-500 text-sm mt-1">{errors.agreement}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </form>
      );
    };
    ```

- [ ] **Task 4: Create Email Notification Service** (AC: #5, #7)
  - [ ] Implement email notifications:
    ```typescript
    @Injectable()
    export class InquiryNotificationService {
      constructor(
        private readonly emailService: EmailService,
        private readonly smsService: SmsService,
      ) {}

      async sendInquiryNotifications(inquiry: Inquiry): Promise<void> {
        // Send email to seller
        await this.sendSellerEmail(inquiry);

        // Send SMS to seller (if enabled)
        if (inquiry.listing.owner.smsNotificationsEnabled) {
          await this.sendSellerSMS(inquiry);
        }

        // Send confirmation to buyer
        await this.sendBuyerConfirmation(inquiry);
      }

      private async sendSellerEmail(inquiry: Inquiry): Promise<void> {
        const template = `
          <h2>New Inquiry for Your Listing</h2>
          <p>You have received a new inquiry for: <strong>${inquiry.listing.title}</strong></p>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <p><strong>Message:</strong></p>
            <p>${inquiry.message}</p>
          </div>

          <p><strong>Contact Information:</strong></p>
          <ul>
            <li>Phone: ${inquiry.contactPhone}</li>
            ${inquiry.contactEmail ? `<li>Email: ${inquiry.contactEmail}</li>` : ''}
            <li>Preferred Contact: ${inquiry.preferredContact}</li>
          </ul>

          <a href="${process.env.APP_URL}/inquiries/${inquiry.id}"
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View & Respond
          </a>
        `;

        await this.emailService.send({
          to: inquiry.listing.owner.email,
          subject: `New Inquiry: ${inquiry.listing.title}`,
          html: template,
        });
      }

      private async sendSellerSMS(inquiry: Inquiry): Promise<void> {
        const message = `New inquiry for ${inquiry.listing.title}. Contact: ${inquiry.contactPhone}. View: ${process.env.APP_URL}/inquiries/${inquiry.id}`;

        await this.smsService.send({
          to: inquiry.listing.owner.phone,
          message,
        });
      }

      private async sendBuyerConfirmation(inquiry: Inquiry): Promise<void> {
        if (!inquiry.contactEmail) return;

        const template = `
          <h2>Inquiry Sent Successfully</h2>
          <p>Your inquiry has been sent to the seller of: <strong>${inquiry.listing.title}</strong></p>

          <p>The seller will contact you soon at:</p>
          <ul>
            <li>Phone: ${inquiry.contactPhone}</li>
            ${inquiry.contactEmail ? `<li>Email: ${inquiry.contactEmail}</li>` : ''}
          </ul>

          <p><strong>Expected Response Time:</strong> Within 24-48 hours</p>

          <p>If you don't hear back, you can view the listing again at:</p>
          <a href="${process.env.APP_URL}/listings/${inquiry.listing.id}">
            ${inquiry.listing.title}
          </a>
        `;

        await this.emailService.send({
          to: inquiry.contactEmail,
          subject: `Inquiry Confirmation: ${inquiry.listing.title}`,
          html: template,
        });
      }
    }
    ```

- [ ] **Task 5: Increment Contact Count** (AC: #1)
  - [ ] Update listing service:
    ```typescript
    async incrementContactCount(listingId: string): Promise<void> {
      await this.publicListingRepository.increment(
        { id: listingId },
        'contactCount',
        1
      );
    }
    ```

- [ ] **Task 6: Add Form Validation** (AC: #2)
  - [ ] Client-side validation:
    ```typescript
    const validateForm = (data: InquiryFormData): ValidationErrors => {
      const errors: ValidationErrors = {};

      // Message validation
      if (!data.message || data.message.trim().length < 10) {
        errors.message = 'Message must be at least 10 characters';
      }
      if (data.message.length > 500) {
        errors.message = 'Message must not exceed 500 characters';
      }

      // Phone validation
      const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
      if (!data.contactPhone || !phoneRegex.test(data.contactPhone)) {
        errors.contactPhone = 'Please enter a valid Vietnamese phone number';
      }

      // Email validation (if provided)
      if (data.contactEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.contactEmail)) {
          errors.contactEmail = 'Please enter a valid email address';
        }
      }

      // Agreement validation
      if (!data.agreement) {
        errors.agreement = 'You must agree to be contacted';
      }

      return errors;
    };
    ```

- [ ] **Task 7: Track Metrics** (AC: #1)
  - [ ] Add analytics:
    ```typescript
    async trackInquirySubmitted(inquiry: Inquiry): Promise<void> {
      await this.metricsService.record({
        metric: 'inquiry_submitted',
        listingId: inquiry.listingId,
        inquirerId: inquiry.inquirerId,
        hasEmail: !!inquiry.contactEmail,
        preferredContact: inquiry.preferredContact,
      });
    }
    ```

- [ ] **Task 8: Create Unit Tests**
  - [ ] Test mutation
  - [ ] Test rate limiting
  - [ ] Test form validation
  - [ ] Test notifications
  - [ ] Achieve >80% coverage

- [ ] **Task 9: Integration Testing**
  - [ ] Test complete inquiry flow
  - [ ] Test with/without logged-in user
  - [ ] Test rate limit enforcement
  - [ ] Test email/SMS delivery

- [ ] **Task 10: Manual Testing**
  - [ ] Submit inquiry as anonymous user
  - [ ] Submit inquiry as logged-in user
  - [ ] Test rate limiting (4th inquiry)
  - [ ] Verify email notifications
  - [ ] Verify SMS notifications
  - [ ] Check contact count increment

## Dev Notes

### Architecture Context

**Inquiry Submission**: Buyer-to-seller communication
- Form with validation (message, phone, email, contact method)
- Rate limiting (3 per IP per hour)
- Multi-channel notifications (email, SMS)
- Pre-fill for logged-in users
- Contact count tracking
- Metrics and analytics

**Key Design Decisions**:
- Rate limiting by IP (prevent spam)
- Professional email templates
- SMS notifications optional (seller preference)
- Confirmation email to buyer
- Async notification processing
- Contact count increment for analytics

### Implementation Details

**Rate Limiting**:
- Redis-based sliding window
- 3 inquiries per IP per hour
- Clear error message with retry time

**Notifications**:
- Seller email: Professional template with inquiry details
- Seller SMS: Short message with link (if enabled)
- Buyer confirmation: Email with expected response time

**Form Validation**:
- Message: 10-500 chars
- Phone: Vietnamese format
- Email: Optional, valid format
- Agreement: Required checkbox

**Pre-fill Logic**:
- Logged-in users: Phone and email from profile
- Anonymous users: Empty form
- All users can edit pre-filled values

### Testing Strategy

**Unit Tests**: Mutation, rate limiting, validation, notifications
**Integration Tests**: Complete flow, email/SMS delivery
**Manual Tests**: UI/UX verification, notification receipt

### References

- [Epic 8.6](../real-estate-platform/epics.md#story-862-inquiry-form--notifications)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.8
- [Story 8.6.1](./8-6-1-inquiry-entity-crud.md) - Inquiry Entity

### Success Criteria

**Definition of Done**:
- ✅ Inquiry form component created
- ✅ Form validation working
- ✅ createInquiry mutation implemented
- ✅ Rate limiting working (3 per IP per hour)
- ✅ Email notifications to seller working
- ✅ SMS notifications to seller working (if enabled)
- ✅ Confirmation email to buyer working
- ✅ Pre-fill for logged-in users working
- ✅ Contact count increment working
- ✅ Metrics tracking working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful

**Estimate**: 8 hours

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
