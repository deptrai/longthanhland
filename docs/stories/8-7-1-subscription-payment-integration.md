# Story 8.7.1: Subscription Payment Integration

Status: drafted

## Story
As a seller, I want to upgrade my subscription tier with payment, so that I can access premium features.

## Acceptance Criteria

1. **Subscription Tier Selection**
   - Given logged in as public user (Epic 8.2)
   - When I select subscription tier (BASIC/PRO/ENTERPRISE)
   - Then system displays:
     - Tier details (features, limits)
     - Pricing (monthly/yearly)
     - Current tier comparison
     - Payment methods available
   - And shows upgrade button

2. **Payment Flow**
   - Given tier selected
   - When I initiate payment
   - Then redirects to VNPay gateway with:
     - Order details
     - Amount in VND
     - Return URL
     - Secure signature
   - And payment processed securely
   - And redirects back with result

3. **Payment Success**
   - Given payment successful
   - When callback received
   - Then updates:
     - `subscriptionTier` to new tier
     - `subscriptionExpiresAt` to +30 days (monthly) or +365 days (yearly)
     - `subscriptionUpdatedAt` to now
   - And creates payment transaction record
   - And sends confirmation email with receipt
   - And shows success page

4. **Payment Methods Support**
   - Given payment options
   - When available
   - Then supports:
     - VNPay (Vietnamese gateway) - primary
     - MoMo wallet - secondary
     - Bank transfer - manual verification
   - And each method has specific flow

5. **Auto-renewal**
   - Given subscription active
   - When auto-renew enabled (optional)
   - Then checks 3 days before expiry
   - And attempts automatic payment
   - And sends notification if fails
   - And allows manual renewal

6. **Payment History**
   - Given transactions exist
   - When viewing history
   - Then shows:
     - Transaction date
     - Amount
     - Tier purchased
     - Payment method
     - Status (SUCCESS/PENDING/FAILED)
     - Receipt download
   - And available for accounting

7. **Pricing Management**
   - Given subscription plans
   - When stored in database
   - Then `SubscriptionPlan` entity contains:
     - Tier name
     - Monthly price
     - Yearly price
     - Features list
     - Limits
   - And admin can update pricing

8. **Security**
   - Given payment processing
   - When handling
   - Then validates:
     - Payment signature from VNPay
     - Return URL authenticity
     - Amount matches order
     - Transaction not duplicate
   - And logs all payment attempts

## Tasks / Subtasks

- [ ] **Task 1: Create SubscriptionPlan Entity** (AC: #7)
  - [ ] Define entity:
    ```typescript
    @WorkspaceEntity({
      standardId: STANDARD_OBJECT_IDS.subscriptionPlan,
      namePlural: 'subscriptionPlans',
      labelSingular: 'Subscription Plan',
      labelPlural: 'Subscription Plans',
      description: 'Subscription tier pricing and features',
      icon: 'IconCreditCard',
    })
    export class SubscriptionPlanWorkspaceEntity extends BaseWorkspaceEntity {
      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.TIER,
        type: FieldMetadataType.SELECT,
        label: 'Tier',
        description: 'Subscription tier',
        icon: 'IconStar',
        options: [
          { value: 'FREE', label: 'Free', position: 0, color: 'gray' },
          { value: 'BASIC', label: 'Basic', position: 1, color: 'blue' },
          { value: 'PRO', label: 'Pro', position: 2, color: 'purple' },
          { value: 'ENTERPRISE', label: 'Enterprise', position: 3, color: 'gold' },
        ],
      })
      tier: string;

      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.MONTHLY_PRICE,
        type: FieldMetadataType.NUMBER,
        label: 'Monthly Price',
        description: 'Monthly price in VND',
        icon: 'IconCash',
      })
      monthlyPrice: number;

      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.YEARLY_PRICE,
        type: FieldMetadataType.NUMBER,
        label: 'Yearly Price',
        description: 'Yearly price in VND',
        icon: 'IconCash',
      })
      yearlyPrice: number;

      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.FEATURES,
        type: FieldMetadataType.TEXT,
        label: 'Features',
        description: 'JSON array of features',
        icon: 'IconList',
      })
      features: string; // JSON array

      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.LIMITS,
        type: FieldMetadataType.TEXT,
        label: 'Limits',
        description: 'JSON object of limits',
        icon: 'IconLock',
      })
      limits: string; // JSON object

      @WorkspaceField({
        standardId: SUBSCRIPTION_PLAN_STANDARD_FIELD_IDS.IS_ACTIVE,
        type: FieldMetadataType.BOOLEAN,
        label: 'Is Active',
        description: 'Whether plan is available',
        icon: 'IconCheck',
        defaultValue: true,
      })
      isActive: boolean;
    }
    ```

- [ ] **Task 2: Create PaymentTransaction Entity** (AC: #6)
  - [ ] Define entity:
    ```typescript
    @Entity()
    export class PaymentTransaction {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @Column('uuid')
      userId: string;

      @Column('varchar')
      tier: string;

      @Column('varchar')
      billingCycle: string; // MONTHLY, YEARLY

      @Column('decimal', { precision: 10, scale: 2 })
      amount: number;

      @Column('varchar')
      currency: string; // VND

      @Column('varchar')
      paymentMethod: string; // VNPAY, MOMO, BANK_TRANSFER

      @Column('varchar')
      status: string; // PENDING, SUCCESS, FAILED

      @Column('varchar', { nullable: true })
      transactionId: string; // From payment gateway

      @Column('text', { nullable: true })
      gatewayResponse: string; // JSON

      @Column('timestamp', { nullable: true })
      paidAt: Date;

      @CreateDateColumn()
      createdAt: Date;

      @UpdateDateColumn()
      updatedAt: Date;
    }
    ```

- [ ] **Task 3: Integrate VNPay SDK** (AC: #2, #8)
  - [ ] Install and configure:
    ```typescript
    @Injectable()
    export class VNPayService {
      private readonly tmnCode: string;
      private readonly hashSecret: string;
      private readonly url: string;
      private readonly returnUrl: string;

      constructor(private readonly configService: ConfigService) {
        this.tmnCode = configService.get('VNPAY_TMN_CODE');
        this.hashSecret = configService.get('VNPAY_HASH_SECRET');
        this.url = configService.get('VNPAY_URL');
        this.returnUrl = configService.get('VNPAY_RETURN_URL');
      }

      createPaymentUrl(params: {
        orderId: string;
        amount: number;
        orderInfo: string;
        ipAddr: string;
      }): string {
        const vnpParams: any = {
          vnp_Version: '2.1.0',
          vnp_Command: 'pay',
          vnp_TmnCode: this.tmnCode,
          vnp_Amount: params.amount * 100, // VNPay uses smallest unit
          vnp_CurrCode: 'VND',
          vnp_TxnRef: params.orderId,
          vnp_OrderInfo: params.orderInfo,
          vnp_OrderType: 'billpayment',
          vnp_Locale: 'vn',
          vnp_ReturnUrl: this.returnUrl,
          vnp_IpAddr: params.ipAddr,
          vnp_CreateDate: this.formatDate(new Date()),
        };

        // Sort params
        const sortedParams = this.sortObject(vnpParams);

        // Create signature
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto.createHmac('sha512', this.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        sortedParams.vnp_SecureHash = signed;

        return this.url + '?' + new URLSearchParams(sortedParams).toString();
      }

      verifyReturnUrl(params: any): boolean {
        const secureHash = params.vnp_SecureHash;
        delete params.vnp_SecureHash;
        delete params.vnp_SecureHashType;

        const sortedParams = this.sortObject(params);
        const signData = new URLSearchParams(sortedParams).toString();
        const hmac = crypto.createHmac('sha512', this.hashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        return secureHash === signed;
      }

      private sortObject(obj: any): any {
        const sorted: any = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
          sorted[key] = obj[key];
        });
        return sorted;
      }

      private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hour}${minute}${second}`;
      }
    }
    ```

- [ ] **Task 4: Create SubscriptionPaymentService** (AC: #1, #3)
  - [ ] Implement service:
    ```typescript
    @Injectable()
    export class SubscriptionPaymentService {
      constructor(
        private readonly vnpayService: VNPayService,
        private readonly publicUserService: PublicUserService,
        private readonly subscriptionPlanService: SubscriptionPlanService,
        private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
        private readonly emailService: EmailService,
      ) {}

      async createPayment(
        userId: string,
        tier: string,
        billingCycle: 'MONTHLY' | 'YEARLY',
        ipAddr: string,
      ): Promise<{ paymentUrl: string; transactionId: string }> {
        // Get plan pricing
        const plan = await this.subscriptionPlanService.findByTier(tier);
        const amount = billingCycle === 'MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice;

        // Create transaction record
        const transaction = await this.paymentTransactionRepository.save({
          userId,
          tier,
          billingCycle,
          amount,
          currency: 'VND',
          paymentMethod: 'VNPAY',
          status: 'PENDING',
        });

        // Generate payment URL
        const paymentUrl = this.vnpayService.createPaymentUrl({
          orderId: transaction.id,
          amount,
          orderInfo: `Subscription ${tier} - ${billingCycle}`,
          ipAddr,
        });

        return {
          paymentUrl,
          transactionId: transaction.id,
        };
      }

      async verifyPayment(params: any): Promise<void> {
        // Verify signature
        if (!this.vnpayService.verifyReturnUrl(params)) {
          throw new BadRequestException('Invalid payment signature');
        }

        const transactionId = params.vnp_TxnRef;
        const responseCode = params.vnp_ResponseCode;

        const transaction = await this.paymentTransactionRepository.findOne({
          where: { id: transactionId },
        });

        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        // Check if already processed
        if (transaction.status !== 'PENDING') {
          return;
        }

        if (responseCode === '00') {
          // Payment success
          await this.handlePaymentSuccess(transaction, params);
        } else {
          // Payment failed
          await this.handlePaymentFailure(transaction, params);
        }
      }

      private async handlePaymentSuccess(
        transaction: PaymentTransaction,
        gatewayResponse: any,
      ): Promise<void> {
        // Update transaction
        await this.paymentTransactionRepository.update(transaction.id, {
          status: 'SUCCESS',
          transactionId: gatewayResponse.vnp_TransactionNo,
          gatewayResponse: JSON.stringify(gatewayResponse),
          paidAt: new Date(),
        });

        // Update user subscription
        const expiryDate = new Date();
        if (transaction.billingCycle === 'MONTHLY') {
          expiryDate.setDate(expiryDate.getDate() + 30);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        await this.publicUserService.update(transaction.userId, {
          subscriptionTier: transaction.tier,
          subscriptionExpiresAt: expiryDate,
          subscriptionUpdatedAt: new Date(),
        });

        // Send confirmation email
        await this.sendConfirmationEmail(transaction);

        // Track metrics
        await this.trackPaymentSuccess(transaction);
      }

      private async handlePaymentFailure(
        transaction: PaymentTransaction,
        gatewayResponse: any,
      ): Promise<void> {
        await this.paymentTransactionRepository.update(transaction.id, {
          status: 'FAILED',
          gatewayResponse: JSON.stringify(gatewayResponse),
        });
      }

      private async sendConfirmationEmail(transaction: PaymentTransaction): Promise<void> {
        const user = await this.publicUserService.findOne(transaction.userId);

        const template = `
          <h2>Payment Successful</h2>
          <p>Thank you for upgrading to ${transaction.tier}!</p>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
            <h3>Receipt</h3>
            <p><strong>Transaction ID:</strong> ${transaction.transactionId}</p>
            <p><strong>Amount:</strong> ${transaction.amount.toLocaleString()} VND</p>
            <p><strong>Billing Cycle:</strong> ${transaction.billingCycle}</p>
            <p><strong>Date:</strong> ${transaction.paidAt.toLocaleDateString()}</p>
          </div>

          <p>Your subscription is now active and will expire on: ${user.subscriptionExpiresAt.toLocaleDateString()}</p>
        `;

        await this.emailService.send({
          to: user.email,
          subject: `Payment Confirmation - ${transaction.tier} Subscription`,
          html: template,
        });
      }
    }
    ```

- [ ] **Task 5: Create GraphQL Mutations** (AC: #2, #3)
  - [ ] Implement mutations:
    ```typescript
    @Resolver()
    export class SubscriptionPaymentResolver {
      constructor(
        private readonly subscriptionPaymentService: SubscriptionPaymentService,
      ) {}

      @Mutation(() => PaymentResponse)
      @UseGuards(AuthGuard)
      async createSubscriptionPayment(
        @CurrentUser() user: PublicUser,
        @Args('tier') tier: string,
        @Args('billingCycle') billingCycle: string,
        @Context() context: any,
      ): Promise<PaymentResponse> {
        const ipAddr = context.req.ip;

        const { paymentUrl, transactionId } = await this.subscriptionPaymentService.createPayment(
          user.id,
          tier,
          billingCycle as 'MONTHLY' | 'YEARLY',
          ipAddr,
        );

        return {
          paymentUrl,
          transactionId,
        };
      }

      @Query(() => [PaymentTransaction])
      @UseGuards(AuthGuard)
      async myPaymentHistory(
        @CurrentUser() user: PublicUser,
      ): Promise<PaymentTransaction[]> {
        return await this.paymentTransactionRepository.find({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
        });
      }
    }
    ```

- [ ] **Task 6: Setup Payment Webhook** (AC: #2, #8)
  - [ ] Create webhook endpoint:
    ```typescript
    @Controller('webhooks')
    export class WebhookController {
      constructor(
        private readonly subscriptionPaymentService: SubscriptionPaymentService,
      ) {}

      @Get('vnpay/return')
      async handleVNPayReturn(@Query() query: any, @Res() res: Response) {
        try {
          await this.subscriptionPaymentService.verifyPayment(query);
          res.redirect(`${process.env.FRONTEND_URL}/subscription/success?txn=${query.vnp_TxnRef}`);
        } catch (error) {
          res.redirect(`${process.env.FRONTEND_URL}/subscription/failed?error=${error.message}`);
        }
      }

      @Get('vnpay/ipn')
      async handleVNPayIPN(@Query() query: any) {
        try {
          await this.subscriptionPaymentService.verifyPayment(query);
          return { RspCode: '00', Message: 'success' };
        } catch (error) {
          return { RspCode: '99', Message: 'failed' };
        }
      }
    }
    ```

- [ ] **Task 7: Create Frontend Payment Flow** (AC: #1, #2)
  - [ ] Implement component:
    ```typescript
    const SubscriptionUpgrade = () => {
      const [selectedTier, setSelectedTier] = useState('PRO');
      const [billingCycle, setBillingCycle] = useState('MONTHLY');
      const [loading, setLoading] = useState(false);

      const { data: plans } = useQuery(GET_SUBSCRIPTION_PLANS);
      const [createPayment] = useMutation(CREATE_SUBSCRIPTION_PAYMENT);

      const handleUpgrade = async () => {
        setLoading(true);

        try {
          const { data } = await createPayment({
            variables: { tier: selectedTier, billingCycle },
          });

          // Redirect to payment gateway
          window.location.href = data.createSubscriptionPayment.paymentUrl;
        } catch (error) {
          toast.error('Failed to initiate payment');
          setLoading(false);
        }
      };

      return (
        <div className="subscription-upgrade">
          <h2>Upgrade Your Subscription</h2>

          <div className="plans-grid">
            {plans?.map(plan => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                selected={selectedTier === plan.tier}
                onSelect={() => setSelectedTier(plan.tier)}
                billingCycle={billingCycle}
              />
            ))}
          </div>

          <div className="billing-cycle">
            <label>
              <input
                type="radio"
                value="MONTHLY"
                checked={billingCycle === 'MONTHLY'}
                onChange={(e) => setBillingCycle(e.target.value)}
              />
              Monthly
            </label>
            <label>
              <input
                type="radio"
                value="YEARLY"
                checked={billingCycle === 'YEARLY'}
                onChange={(e) => setBillingCycle(e.target.value)}
              />
              Yearly (Save 20%)
            </label>
          </div>

          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="upgrade-button"
          >
            {loading ? 'Processing...' : 'Upgrade Now'}
          </button>
        </div>
      );
    };
    ```

- [ ] **Task 8: Implement Auto-renewal** (AC: #5)
  - [ ] Create cron job:
    ```typescript
    @Injectable()
    export class AutoRenewalJob {
      constructor(
        private readonly publicUserService: PublicUserService,
        private readonly subscriptionPaymentService: SubscriptionPaymentService,
      ) {}

      @Cron('0 0 * * *') // Daily at midnight
      async checkExpiringSubscriptions() {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiringUsers = await this.publicUserService.find({
          where: {
            subscriptionExpiresAt: LessThan(threeDaysFromNow),
            autoRenew: true,
          },
        });

        for (const user of expiringUsers) {
          try {
            // Attempt auto-renewal
            await this.subscriptionPaymentService.processAutoRenewal(user);
          } catch (error) {
            // Send notification if fails
            await this.sendRenewalFailedNotification(user, error);
          }
        }
      }
    }
    ```

- [ ] **Task 9: Create Unit Tests**
  - [ ] Test payment service
  - [ ] Test VNPay integration
  - [ ] Test signature validation
  - [ ] Test webhook handling
  - [ ] Achieve >80% coverage

- [ ] **Task 10: Integration Testing**
  - [ ] Test complete payment flow
  - [ ] Test payment success/failure
  - [ ] Test subscription update
  - [ ] Test auto-renewal

- [ ] **Task 11: Manual Testing**
  - [ ] Initiate payment
  - [ ] Complete payment on VNPay
  - [ ] Verify subscription updated
  - [ ] Check confirmation email
  - [ ] Test payment history

## Dev Notes

### Architecture Context

**Subscription Payment**: VNPay integration
- Secure payment gateway integration
- Multiple payment methods (VNPay, MoMo, Bank transfer)
- Transaction tracking and history
- Auto-renewal support
- Email confirmations with receipts
- Admin pricing management

**Key Design Decisions**:
- VNPay as primary gateway (Vietnamese market)
- Signature validation for security
- Transaction entity for audit trail
- Auto-renewal with 3-day advance check
- Webhook for async payment confirmation
- Pricing stored in database (admin configurable)

### Implementation Details

**VNPay Integration**:
- SDK: Custom implementation (no official Node.js SDK)
- Signature: HMAC SHA512
- Currency: VND only
- Return URL: Frontend success/failure pages
- IPN URL: Backend webhook for async confirmation

**Payment Flow**:
1. User selects tier and billing cycle
2. Backend creates transaction record (PENDING)
3. Backend generates VNPay payment URL with signature
4. User redirects to VNPay gateway
5. User completes payment
6. VNPay redirects back with result
7. Backend verifies signature and updates transaction
8. Backend updates user subscription
9. Backend sends confirmation email

**Security**:
- HMAC SHA512 signature validation
- Transaction ID uniqueness check
- Duplicate payment prevention
- Secure hash secret in environment variables

### Testing Strategy

**Unit Tests**: Payment service, VNPay service, signature validation
**Integration Tests**: Complete flow, webhook handling
**Manual Tests**: End-to-end payment, various scenarios

### References

- [Epic 8.7](../real-estate-platform/epics.md#story-871-subscription-payment-integration)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.2 (Subscription Tiers)
- [VNPay Documentation](https://sandbox.vnpayment.vn/apis/)

### Success Criteria

**Definition of Done**:
- ✅ SubscriptionPlan entity created
- ✅ PaymentTransaction entity created
- ✅ VNPay SDK integrated
- ✅ Payment flow working
- ✅ Webhook handling working
- ✅ Signature validation working
- ✅ Subscription update working
- ✅ Confirmation email working
- ✅ Payment history working
- ✅ Auto-renewal working
- ✅ Frontend payment component working
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
