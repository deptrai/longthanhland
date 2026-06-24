# Story 8.2.2: User Registration & Verification

Status: drafted

## Story

As a public user,
I want to register an account with email and phone verification,
so that I can access the marketplace as a verified user.

## Acceptance Criteria

1. **Registration Form Submission**
   - Given public marketplace registration page
   - When I submit form with email, phone, password, fullName, userType
   - Then system validates all fields
   - And creates PublicUser with `verified = false`, `emailVerified = false`, `phoneVerified = false`
   - And password hashed with bcrypt (10 salt rounds)
   - And verification email sent to provided email
   - And verification SMS sent to provided phone
   - And returns user ID and success message

2. **Email Verification Flow**
   - Given verification email sent with unique token
   - When I click verification link in email
   - Then system validates token (not expired, not used)
   - And sets `emailVerified = true` for the user
   - And redirects to verification success page
   - And token expires after 24 hours
   - And token can only be used once

3. **Phone Verification Flow**
   - Given verification SMS sent with 6-digit code
   - When I enter code in verification form
   - Then system validates code (correct, not expired)
   - And sets `phoneVerified = true` for the user
   - And code expires after 10 minutes
   - And max 3 attempts allowed per phone number
   - And new code can be requested after 1 minute

4. **Complete Verification Status**
   - Given user has `emailVerified = true` and `phoneVerified = true`
   - When system checks verification status
   - Then sets `verified = true` and `verifiedAt = current timestamp`
   - And sends welcome email with marketplace guide
   - And logs verification completion event
   - And user can now access all registered user features

5. **Rate Limiting & Security**
   - Given registration attempts from same IP
   - When attempts exceed limit
   - Then max 3 registration attempts per IP per hour enforced
   - And returns 429 Too Many Requests error
   - And logs suspicious activity
   - And verification code resend limited to 5 times per hour per phone

## Tasks / Subtasks

- [ ] **Task 1: Create Registration Resolver** (AC: #1) **Estimate**: 8 hours
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/resolvers/public-user.resolver.ts`
  - [ ] Add `@Resolver(() => PublicUser)` decorator
  - [ ] Implement `registerPublicUser` mutation:
    ```typescript
    @Mutation(() => RegisterPublicUserOutput)
    async registerPublicUser(
      @Args('data') data: RegisterPublicUserInput,
      @Context() context: any,
    ): Promise<RegisterPublicUserOutput>
    ```
  - [ ] Create input DTO: `RegisterPublicUserInput` with fields:
    - email (string, required, email format)
    - phone (string, required, Vietnamese format)
    - password (string, required, min 8 chars)
    - fullName (string, required, max 100 chars)
    - userType (enum: BUYER, SELLER, BROKER)
  - [ ] Create output DTO: `RegisterPublicUserOutput` with:
    - userId (string)
    - message (string)
    - requiresVerification (boolean)
  - [ ] Validate email uniqueness (check existing users)
  - [ ] Validate phone uniqueness (check existing users)
  - [ ] Validate password strength (min 8 chars, uppercase, lowercase, number)
  - [ ] Hash password with bcrypt: `bcrypt.hash(password, 10)`
  - [ ] Call `PublicUserService.create()` to create user
  - [ ] Trigger email verification flow
  - [ ] Trigger SMS verification flow
  - [ ] Return success response

- [ ] **Task 2: Email Verification System** (AC: #2)
  - [ ] Create `VerificationService` in `services/verification.service.ts`
  - [ ] Implement `sendEmailVerification(userId, email)` method:
    - Generate UUID v4 token
    - Store in Redis: `email_verify:{token}` → `{userId, email, createdAt}`
    - Set TTL: 24 hours (86400 seconds)
    - Build verification URL: `${EMAIL_VERIFY_URL}?token={token}`
    - Send email using Twenty's email service
  - [ ] Create email template: `email-verification.hbs`
    - Subject: "Xác thực email của bạn - Real Estate Platform"
    - Body: Welcome message, verification link, expiry notice
    - Include company branding
  - [ ] Implement `verifyEmail` mutation in resolver:
    ```typescript
    @Mutation(() => VerifyEmailOutput)
    async verifyEmail(
      @Args('token') token: string,
    ): Promise<VerifyEmailOutput>
    ```
  - [ ] Validate token:
    - Check token exists in Redis
    - Check not expired (TTL > 0)
    - Get userId from Redis
  - [ ] Update user: `emailVerified = true`
  - [ ] Delete token from Redis (one-time use)
  - [ ] Check if both email and phone verified → trigger complete verification
  - [ ] Return success response
  - [ ] Handle errors: token not found, expired, already used

- [ ] **Task 3: SMS Verification System** (AC: #3)
  - [ ] Integrate SMS provider (VIETGUYS recommended for Vietnam)
  - [ ] Install SMS SDK: `npm install @vietguys/sms-sdk` or use HTTP API
  - [ ] Configure SMS credentials in environment:
    ```bash
    SMS_PROVIDER=vietguys
    SMS_API_KEY=your_api_key
    SMS_API_SECRET=your_api_secret
    SMS_SENDER_NAME=RealEstate
    ```
  - [ ] Implement `sendSMSVerification(userId, phone)` method:
    - Generate 6-digit code: `Math.floor(100000 + Math.random() * 900000)`
    - Store in Redis: `sms_verify:{phone}` → `{code, userId, attempts: 0, createdAt}`
    - Set TTL: 10 minutes (600 seconds)
    - Send SMS with message: "Mã xác thực của bạn là: {code}. Có hiệu lực trong 10 phút."
    - Log SMS sent event
  - [ ] Implement `verifySMS` mutation in resolver:
    ```typescript
    @Mutation(() => VerifySMSOutput)
    async verifySMS(
      @Args('phone') phone: string,
      @Args('code') code: string,
    ): Promise<VerifySMSOutput>
    ```
  - [ ] Validate SMS code:
    - Get data from Redis: `sms_verify:{phone}`
    - Check code matches
    - Check not expired (TTL > 0)
    - Increment attempts counter
    - Max 3 attempts, then invalidate code
  - [ ] Update user: `phoneVerified = true`
  - [ ] Delete code from Redis (one-time use)
  - [ ] Check if both email and phone verified → trigger complete verification
  - [ ] Return success response
  - [ ] Handle errors: code not found, incorrect, expired, max attempts exceeded
  - [ ] Implement `resendSMSCode` mutation:
    - Check last send time (min 1 minute between resends)
    - Check resend limit (max 5 per hour per phone)
    - Generate new code and send

- [ ] **Task 4: Complete Verification Logic** (AC: #4)
  - [ ] Create `completeVerification(userId)` method in `VerificationService`
  - [ ] Check both `emailVerified` and `phoneVerified` are true
  - [ ] Update user:
    ```typescript
    await publicUserService.update(userId, {
      verified: true,
      verifiedAt: new Date(),
    });
    ```
  - [ ] Send welcome email:
    - Template: `welcome-email.hbs`
    - Subject: "Chào mừng đến với Real Estate Marketplace!"
    - Content: Account activated, marketplace guide, next steps
  - [ ] Log verification event:
    ```typescript
    await auditLogService.log({
      userId,
      action: 'USER_VERIFIED',
      details: { verifiedAt: new Date() },
    });
    ```
  - [ ] Trigger post-verification actions:
    - Create default user preferences
    - Send notification to admin (new verified user)
    - Track conversion metric

- [ ] **Task 5: Rate Limiting Implementation** (AC: #5)
  - [ ] Install rate limiting package: `npm install @nestjs/throttler`
  - [ ] Configure ThrottlerModule in `PublicMarketplaceModule`:
    ```typescript
    ThrottlerModule.forRoot({
      ttl: 3600, // 1 hour
      limit: 3,  // 3 attempts
    })
    ```
  - [ ] Create custom rate limiter for registration:
    - Key: `reg_attempt:{ip_address}`
    - Store in Redis with 1 hour TTL
    - Increment on each attempt
    - Check before processing registration
  - [ ] Apply `@Throttle()` decorator to registration mutation:
    ```typescript
    @Throttle(3, 3600) // 3 attempts per hour
    @Mutation(() => RegisterPublicUserOutput)
    async registerPublicUser(...)
    ```
  - [ ] Implement custom throttler guard:
    - Extract IP from request: `req.ip` or `req.headers['x-forwarded-for']`
    - Check Redis counter
    - Return 429 if exceeded
  - [ ] Add rate limiting for verification code resend:
    - Key: `resend_sms:{phone}`
    - Limit: 5 resends per hour
  - [ ] Log rate limit violations:
    ```typescript
    logger.warn('Rate limit exceeded', { ip, endpoint: 'registerPublicUser' });
    ```
  - [ ] Return appropriate error message:
    ```json
    {
      "error": "Too many registration attempts. Please try again in 1 hour.",
      "retryAfter": 3600
    }
    ```

- [ ] **Task 6: Frontend Registration Form Component**
  - [ ] Create `packages/twenty-front/src/modules/public-marketplace/components/RegistrationForm.tsx`
  - [ ] Implement multi-step form with React Hook Form:
    ```typescript
    const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationFormData>();
    ```
  - [ ] Step 1: Basic Information
    - Email input with validation (email format, required)
    - Phone input with validation (Vietnamese format, required)
    - Password input with strength indicator
    - Confirm password input
    - Full name input
    - User type selector (BUYER, SELLER, BROKER)
    - Terms & conditions checkbox
    - Submit button
  - [ ] Step 2: Email Verification
    - Display: "We sent a verification email to {email}"
    - Option 1: "Click the link in your email"
    - Option 2: "Enter verification code manually"
    - Code input field (if manual entry)
    - Resend email button (with cooldown timer)
    - Auto-check verification status every 5 seconds
  - [ ] Step 3: SMS Verification
    - Display: "We sent a verification code to {phone}"
    - 6-digit code input (auto-focus, auto-submit when complete)
    - Resend code button (with 60s cooldown)
    - Attempts remaining indicator (3/3, 2/3, 1/3)
    - Error message for incorrect code
  - [ ] Step 4: Success
    - Congratulations message
    - "Your account is now verified!"
    - Redirect to login or marketplace (after 3 seconds)
  - [ ] Add progress indicator:
    - Show steps: 1. Register → 2. Email → 3. Phone → 4. Done
    - Highlight current step
    - Disable navigation to future steps
  - [ ] Implement form validation:
    - Email: RFC 5322 format
    - Phone: Vietnamese format `^(0|\+84)[3|5|7|8|9][0-9]{8}$`
    - Password: Min 8 chars, uppercase, lowercase, number
    - Real-time validation feedback
  - [ ] Add loading states and error handling
  - [ ] Make responsive for mobile devices

- [ ] **Task 7: Create Unit Tests**
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/services/__tests__/verification.service.spec.ts`
  - [ ] Test email verification:
    ```typescript
    describe('sendEmailVerification', () => {
      it('should generate token and send email', async () => {
        const result = await service.sendEmailVerification(userId, email);
        expect(result.token).toBeDefined();
        expect(emailService.send).toHaveBeenCalled();
      });

      it('should store token in Redis with 24h TTL', async () => {
        await service.sendEmailVerification(userId, email);
        const ttl = await redis.ttl(`email_verify:${token}`);
        expect(ttl).toBeCloseTo(86400, -2);
      });
    });

    describe('verifyEmail', () => {
      it('should verify email with valid token', async () => {
        const result = await service.verifyEmail(validToken);
        expect(result.success).toBe(true);
        expect(user.emailVerified).toBe(true);
      });

      it('should reject expired token', async () => {
        await expect(service.verifyEmail(expiredToken))
          .rejects.toThrow('Token expired');
      });

      it('should reject already used token', async () => {
        await service.verifyEmail(token);
        await expect(service.verifyEmail(token))
          .rejects.toThrow('Token not found');
      });
    });
    ```
  - [ ] Test SMS verification:
    ```typescript
    describe('sendSMSVerification', () => {
      it('should generate 6-digit code and send SMS', async () => {
        const result = await service.sendSMSVerification(userId, phone);
        expect(result.code).toMatch(/^\d{6}$/);
        expect(smsService.send).toHaveBeenCalled();
      });

      it('should store code in Redis with 10min TTL', async () => {
        await service.sendSMSVerification(userId, phone);
        const ttl = await redis.ttl(`sms_verify:${phone}`);
        expect(ttl).toBeCloseTo(600, -1);
      });
    });

    describe('verifySMS', () => {
      it('should verify SMS with correct code', async () => {
        const result = await service.verifySMS(phone, correctCode);
        expect(result.success).toBe(true);
        expect(user.phoneVerified).toBe(true);
      });

      it('should reject incorrect code', async () => {
        const result = await service.verifySMS(phone, wrongCode);
        expect(result.success).toBe(false);
        expect(result.attemptsRemaining).toBe(2);
      });

      it('should block after 3 failed attempts', async () => {
        await service.verifySMS(phone, wrongCode);
        await service.verifySMS(phone, wrongCode);
        await service.verifySMS(phone, wrongCode);
        await expect(service.verifySMS(phone, wrongCode))
          .rejects.toThrow('Max attempts exceeded');
      });
    });
    ```
  - [ ] Test complete verification:
    ```typescript
    describe('completeVerification', () => {
      it('should set verified=true when both email and phone verified', async () => {
        user.emailVerified = true;
        user.phoneVerified = true;
        await service.completeVerification(userId);
        expect(user.verified).toBe(true);
        expect(user.verifiedAt).toBeDefined();
      });

      it('should send welcome email', async () => {
        await service.completeVerification(userId);
        expect(emailService.send).toHaveBeenCalledWith(
          expect.objectContaining({ template: 'welcome-email' })
        );
      });
    });
    ```
  - [ ] Test rate limiting:
    ```typescript
    describe('Rate Limiting', () => {
      it('should allow 3 registration attempts per IP', async () => {
        await service.registerPublicUser(data1, ip);
        await service.registerPublicUser(data2, ip);
        await service.registerPublicUser(data3, ip);
        // Should succeed
      });

      it('should block 4th attempt from same IP', async () => {
        await service.registerPublicUser(data1, ip);
        await service.registerPublicUser(data2, ip);
        await service.registerPublicUser(data3, ip);
        await expect(service.registerPublicUser(data4, ip))
          .rejects.toThrow('Rate limit exceeded');
      });
    });
    ```
  - [ ] Mock dependencies: Redis, EmailService, SMSService, PublicUserService
  - [ ] Achieve >80% code coverage

- [ ] **Task 8: Integration Testing**
  - [ ] Create end-to-end test: `registration-flow.e2e-spec.ts`
  - [ ] Test complete registration flow:
    ```typescript
    it('should complete full registration and verification flow', async () => {
      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: REGISTER_MUTATION,
          variables: { data: registrationData }
        });
      expect(registerResponse.body.data.registerPublicUser.userId).toBeDefined();

      // Step 2: Verify email
      const token = await getEmailTokenFromRedis(email);
      const verifyEmailResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: VERIFY_EMAIL_MUTATION,
          variables: { token }
        });
      expect(verifyEmailResponse.body.data.verifyEmail.success).toBe(true);

      // Step 3: Verify SMS
      const code = await getSMSCodeFromRedis(phone);
      const verifySMSResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: VERIFY_SMS_MUTATION,
          variables: { phone, code }
        });
      expect(verifySMSResponse.body.data.verifySMS.success).toBe(true);

      // Step 4: Check user verified
      const user = await publicUserService.findByEmail(email);
      expect(user.verified).toBe(true);
      expect(user.verifiedAt).toBeDefined();
    });
    ```
  - [ ] Test error scenarios:
    - Duplicate email registration
    - Duplicate phone registration
    - Invalid email format
    - Invalid phone format
    - Weak password
    - Expired verification token
    - Incorrect SMS code
    - Rate limit exceeded
  - [ ] Use test database and Redis instance
  - [ ] Clean up test data after each test

- [ ] **Task 9: Manual Testing & Verification**
  - [ ] Start development server: `yarn workspace twenty-server start:dev`
  - [ ] Test registration flow in GraphQL Playground:
    ```graphql
    mutation RegisterUser {
      registerPublicUser(data: {
        email: "test@example.com"
        phone: "0901234567"
        password: "SecurePass123"
        fullName: "Test User"
        userType: BUYER
      }) {
        userId
        message
        requiresVerification
      }
    }
    ```
  - [ ] Check email inbox for verification email
  - [ ] Check phone for SMS verification code
  - [ ] Test email verification:
    ```graphql
    mutation VerifyEmail {
      verifyEmail(token: "uuid-token-here") {
        success
        message
      }
    }
    ```
  - [ ] Test SMS verification:
    ```graphql
    mutation VerifySMS {
      verifySMS(phone: "0901234567", code: "123456") {
        success
        message
        attemptsRemaining
      }
    }
    ```
  - [ ] Verify user in database:
    ```sql
    SELECT id, email, phone, verified, email_verified, phone_verified, verified_at
    FROM public_user
    WHERE email = 'test@example.com';
    ```
  - [ ] Test rate limiting:
    - Try registering 4 times from same IP
    - Verify 4th attempt is blocked
  - [ ] Test frontend registration form:
    - Navigate to `/register`
    - Fill form and submit
    - Complete email verification
    - Complete SMS verification
    - Verify success page shown
  - [ ] Test error handling:
    - Submit with duplicate email
    - Submit with invalid phone
    - Enter wrong SMS code 3 times
    - Try to use expired token

## Dev Notes

### Architecture Context

**Registration Flow Pattern**: Multi-step verification process
- Step 1: User submits registration form
- Step 2: System creates unverified user and sends verification messages
- Step 3: User verifies email (click link or enter code)
- Step 4: User verifies phone (enter SMS code)
- Step 5: System marks user as verified and grants access

**Key Design Decisions**:
- Separate email and phone verification (both required)
- Use Redis for temporary token/code storage (TTL-based expiry)
- Rate limiting at multiple levels (registration, resend)
- One-time use tokens/codes (deleted after verification)
- Async verification (user can verify in any order)

**Technology Stack**:
- NestJS 10.x with GraphQL
- Redis for token/code storage
- bcrypt for password hashing
- Twenty's email service (existing)
- VIETGUYS SMS API (Vietnamese provider)
- React Hook Form for frontend validation

### Project Structure Notes

**Backend Structure**:
```
packages/twenty-server/src/modules/public-marketplace/
├── resolvers/
│   └── public-user.resolver.ts (registration mutations)
├── services/
│   ├── verification.service.ts (email/SMS verification logic)
│   └── __tests__/
│       └── verification.service.spec.ts
├── dto/
│   ├── register-public-user.input.ts
│   ├── register-public-user.output.ts
│   ├── verify-email.output.ts
│   └── verify-sms.output.ts
└── templates/
    ├── email-verification.hbs
    └── welcome-email.hbs
```

**Frontend Structure**:
```
packages/twenty-front/src/modules/public-marketplace/
├── components/
│   ├── RegistrationForm.tsx (multi-step form)
│   ├── EmailVerificationStep.tsx
│   ├── SMSVerificationStep.tsx
│   └── VerificationSuccess.tsx
├── hooks/
│   ├── useRegistration.ts
│   └── useVerification.ts
└── graphql/
    ├── mutations/
    │   ├── registerPublicUser.ts
    │   ├── verifyEmail.ts
    │   └── verifySMS.ts
    └── queries/
        └── checkVerificationStatus.ts
```

### Implementation Details

**Registration Resolver Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/resolvers/public-user.resolver.ts
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { PublicUserService } from '../services/public-user.service';
import { VerificationService } from '../services/verification.service';
import { RegisterPublicUserInput } from '../dto/register-public-user.input';
import { RegisterPublicUserOutput } from '../dto/register-public-user.output';
import * as bcrypt from 'bcrypt';

@Resolver()
export class PublicUserResolver {
  constructor(
    private readonly publicUserService: PublicUserService,
    private readonly verificationService: VerificationService,
  ) {}

  @Throttle(3, 3600) // 3 attempts per hour
  @Mutation(() => RegisterPublicUserOutput)
  async registerPublicUser(
    @Args('data') data: RegisterPublicUserInput,
  ): Promise<RegisterPublicUserOutput> {
    // Validate email uniqueness
    const existingEmail = await this.publicUserService.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Validate phone uniqueness
    const existingPhone = await this.publicUserService.findByPhone(data.phone);
    if (existingPhone) {
      throw new Error('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.publicUserService.create({
      ...data,
      password: hashedPassword,
      verified: false,
      emailVerified: false,
      phoneVerified: false,
      subscriptionTier: 'FREE',
    });

    // Send verification email
    await this.verificationService.sendEmailVerification(user.id, user.email);

    // Send verification SMS
    await this.verificationService.sendSMSVerification(user.id, user.phone);

    return {
      userId: user.id,
      message: 'Registration successful. Please verify your email and phone.',
      requiresVerification: true,
    };
  }
}
```

**Verification Service Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/services/verification.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/engine/core-modules/email/email.service';
import { SMSService } from './sms.service';
import { PublicUserService } from './public-user.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly emailService: EmailService,
    private readonly smsService: SMSService,
    private readonly publicUserService: PublicUserService,
  ) {}

  async sendEmailVerification(userId: string, email: string): Promise<void> {
    // Generate unique token
    const token = uuidv4();

    // Store in Redis with 24h TTL
    await this.redis.setex(
      `email_verify:${token}`,
      86400, // 24 hours
      JSON.stringify({ userId, email, createdAt: new Date() })
    );

    // Build verification URL
    const verificationUrl = `${process.env.EMAIL_VERIFY_URL}?token=${token}`;

    // Send email
    await this.emailService.send({
      to: email,
      subject: 'Xác thực email của bạn - Real Estate Platform',
      template: 'email-verification',
      context: {
        verificationUrl,
        expiryHours: 24,
      },
    });
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    // Get token data from Redis
    const data = await this.redis.get(`email_verify:${token}`);
    if (!data) {
      throw new Error('Invalid or expired verification token');
    }

    const { userId } = JSON.parse(data);

    // Update user
    await this.publicUserService.update(userId, {
      emailVerified: true,
    });

    // Delete token (one-time use)
    await this.redis.del(`email_verify:${token}`);

    // Check if both email and phone verified
    const user = await this.publicUserService.findOne(userId);
    if (user.emailVerified && user.phoneVerified) {
      await this.completeVerification(userId);
    }

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async sendSMSVerification(userId: string, phone: string): Promise<void> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 10min TTL
    await this.redis.setex(
      `sms_verify:${phone}`,
      600, // 10 minutes
      JSON.stringify({ code, userId, attempts: 0, createdAt: new Date() })
    );

    // Send SMS
    await this.smsService.send({
      to: phone,
      message: `Mã xác thực của bạn là: ${code}. Có hiệu lực trong 10 phút.`,
    });
  }

  async verifySMS(phone: string, code: string): Promise<{
    success: boolean;
    message: string;
    attemptsRemaining?: number;
  }> {
    // Get code data from Redis
    const data = await this.redis.get(`sms_verify:${phone}`);
    if (!data) {
      throw new Error('Verification code expired or not found');
    }

    const verificationData = JSON.parse(data);

    // Check attempts
    if (verificationData.attempts >= 3) {
      await this.redis.del(`sms_verify:${phone}`);
      throw new Error('Maximum verification attempts exceeded');
    }

    // Verify code
    if (verificationData.code !== code) {
      // Increment attempts
      verificationData.attempts += 1;
      await this.redis.setex(
        `sms_verify:${phone}`,
        await this.redis.ttl(`sms_verify:${phone}`),
        JSON.stringify(verificationData)
      );

      return {
        success: false,
        message: 'Incorrect verification code',
        attemptsRemaining: 3 - verificationData.attempts,
      };
    }

    // Update user
    await this.publicUserService.update(verificationData.userId, {
      phoneVerified: true,
    });

    // Delete code (one-time use)
    await this.redis.del(`sms_verify:${phone}`);

    // Check if both email and phone verified
    const user = await this.publicUserService.findOne(verificationData.userId);
    if (user.emailVerified && user.phoneVerified) {
      await this.completeVerification(verificationData.userId);
    }

    return {
      success: true,
      message: 'Phone verified successfully',
    };
  }

  async completeVerification(userId: string): Promise<void> {
    // Update user
    await this.publicUserService.update(userId, {
      verified: true,
      verifiedAt: new Date(),
    });

    // Send welcome email
    const user = await this.publicUserService.findOne(userId);
    await this.emailService.send({
      to: user.email,
      subject: 'Chào mừng đến với Real Estate Marketplace!',
      template: 'welcome-email',
      context: {
        fullName: user.fullName,
      },
    });

    // Log event
    console.log(`User ${userId} verification completed`);
  }
}
```

**Frontend Registration Form Example**:
```typescript
// packages/twenty-front/src/modules/public-marketplace/components/RegistrationForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { REGISTER_PUBLIC_USER } from '../graphql/mutations/registerPublicUser';

interface RegistrationFormData {
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  userType: 'BUYER' | 'SELLER' | 'BROKER';
  agreeToTerms: boolean;
}

export const RegistrationForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationFormData>();
  const [registerUser, { loading, error }] = useMutation(REGISTER_PUBLIC_USER);

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const result = await registerUser({
        variables: { data },
      });
      setUserId(result.data.registerPublicUser.userId);
      setStep(2); // Move to email verification
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="registration-container">
      {/* Progress indicator */}
      <div className="progress-steps">
        <div className={step >= 1 ? 'step active' : 'step'}>1. Register</div>
        <div className={step >= 2 ? 'step active' : 'step'}>2. Email</div>
        <div className={step >= 3 ? 'step active' : 'step'}>3. Phone</div>
        <div className={step >= 4 ? 'step active' : 'step'}>4. Done</div>
      </div>

      {/* Step 1: Registration Form */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="Email"
          />
          {errors.email && <span className="error">{errors.email.message}</span>}

          <input
            {...register('phone', {
              required: 'Phone is required',
              pattern: {
                value: /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
                message: 'Invalid Vietnamese phone number',
              },
            })}
            placeholder="Phone (0901234567)"
          />
          {errors.phone && <span className="error">{errors.phone.message}</span>}

          <input
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
            })}
            placeholder="Password"
          />
          {errors.password && <span className="error">{errors.password.message}</span>}

          <input
            type="password"
            {...register('confirmPassword', {
              validate: (value) =>
                value === watch('password') || 'Passwords do not match',
            })}
            placeholder="Confirm Password"
          />
          {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}

          <input
            {...register('fullName', { required: 'Full name is required' })}
            placeholder="Full Name"
          />
          {errors.fullName && <span className="error">{errors.fullName.message}</span>}

          <select {...register('userType', { required: true })}>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="BROKER">Broker</option>
          </select>

          <label>
            <input
              type="checkbox"
              {...register('agreeToTerms', {
                required: 'You must agree to the terms',
              })}
            />
            I agree to the Terms & Conditions
          </label>
          {errors.agreeToTerms && <span className="error">{errors.agreeToTerms.message}</span>}

          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          {error && <div className="error">{error.message}</div>}
        </form>
      )}

      {/* Step 2: Email Verification */}
      {step === 2 && (
        <EmailVerificationStep
          email={watch('email')}
          onVerified={() => setStep(3)}
        />
      )}

      {/* Step 3: SMS Verification */}
      {step === 3 && (
        <SMSVerificationStep
          phone={watch('phone')}
          onVerified={() => setStep(4)}
        />
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <VerificationSuccess />
      )}
    </div>
  );
};
```

### Validation Rules

**Email Validation**:
- Format: RFC 5322 compliant (regex: `/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i`)
- Unique: Must not exist in database
- Case-insensitive comparison
- Max length: 255 characters

**Phone Validation**:
- Vietnamese format: `^(0|\+84)[3|5|7|8|9][0-9]{8}$`
- Examples valid: `0901234567`, `+84901234567`, `0912345678`
- Examples invalid: `0201234567` (wrong prefix), `090123456` (too short)
- Unique: Must not exist in database
- Normalized storage: Store with +84 prefix

**Password Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- Optional: 1 special character (!@#$%^&*)
- Hashed with bcrypt (10 salt rounds)
- Never stored in plain text

**Verification Token/Code**:
- Email token: UUID v4 format, 24-hour expiry, one-time use
- SMS code: 6 digits (100000-999999), 10-minute expiry, max 3 attempts
- Stored in Redis with TTL
- Deleted after successful verification

### Testing Strategy

**Unit Tests** (Target: >80% coverage):
```typescript
// Test registration validation
describe('Registration Validation', () => {
  it('should reject duplicate email', async () => {
    await service.create({ email: 'test@example.com', ... });
    await expect(service.create({ email: 'test@example.com', ... }))
      .rejects.toThrow('Email already registered');
  });

  it('should reject invalid phone format', async () => {
    await expect(service.create({ phone: '0201234567', ... }))
      .rejects.toThrow('Invalid phone number');
  });

  it('should reject weak password', async () => {
    await expect(service.create({ password: '12345', ... }))
      .rejects.toThrow('Password must be at least 8 characters');
  });
});

// Test email verification
describe('Email Verification', () => {
  it('should send verification email with valid token', async () => {
    await service.sendEmailVerification(userId, email);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        template: 'email-verification',
      })
    );
  });

  it('should verify email with valid token', async () => {
    const token = await service.sendEmailVerification(userId, email);
    const result = await service.verifyEmail(token);
    expect(result.success).toBe(true);
  });

  it('should reject expired token', async () => {
    const token = await service.sendEmailVerification(userId, email);
    await redis.del(`email_verify:${token}`); // Simulate expiry
    await expect(service.verifyEmail(token))
      .rejects.toThrow('Invalid or expired verification token');
  });
});

// Test SMS verification
describe('SMS Verification', () => {
  it('should send SMS with 6-digit code', async () => {
    await service.sendSMSVerification(userId, phone);
    expect(smsService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: phone,
        message: expect.stringContaining('Mã xác thực'),
      })
    );
  });

  it('should verify SMS with correct code', async () => {
    await service.sendSMSVerification(userId, phone);
    const code = await getCodeFromRedis(phone);
    const result = await service.verifySMS(phone, code);
    expect(result.success).toBe(true);
  });

  it('should track attempts and block after 3 failures', async () => {
    await service.sendSMSVerification(userId, phone);
    await service.verifySMS(phone, 'wrong1'); // Attempt 1
    await service.verifySMS(phone, 'wrong2'); // Attempt 2
    await service.verifySMS(phone, 'wrong3'); // Attempt 3
    await expect(service.verifySMS(phone, 'wrong4'))
      .rejects.toThrow('Maximum verification attempts exceeded');
  });
});

// Test complete verification
describe('Complete Verification', () => {
  it('should set verified=true when both email and phone verified', async () => {
    await service.update(userId, { emailVerified: true, phoneVerified: true });
    await service.completeVerification(userId);
    const user = await service.findOne(userId);
    expect(user.verified).toBe(true);
    expect(user.verifiedAt).toBeDefined();
  });

  it('should send welcome email on completion', async () => {
    await service.completeVerification(userId);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'welcome-email',
      })
    );
  });
});
```

**Integration Tests**:
- Full registration flow (register → verify email → verify SMS)
- Error scenarios (duplicate email, invalid phone, etc.)
- Rate limiting enforcement
- Token/code expiry handling

**Manual Tests**:
- Real email delivery (check inbox, spam folder)
- Real SMS delivery (check phone)
- Frontend form validation
- Multi-step navigation
- Error message display

### References

- [Architecture Document](../real-estate-platform/architecture.md) - Section 6 (Authentication)
- [PRD v1.4](../real-estate-platform/prd-v1.3.md) - Section 4.8.2 (PublicUser Object)
- [Epic 8.2](../real-estate-platform/epics.md#story-822-user-registration--verification) - Story details
- [Twenty Email Service](https://twenty.com/developers/section/backend/email) - Email integration guide
- [VIETGUYS SMS API](https://vietguys.biz/sms-api-docs) - Vietnamese SMS provider

### Success Criteria

**Definition of Done**:
- ✅ Registration resolver implemented with validation
- ✅ Email verification system working (send + verify)
- ✅ SMS verification system working (send + verify)
- ✅ Complete verification logic implemented
- ✅ Rate limiting enforced (registration + resend)
- ✅ Frontend multi-step form working
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Manual testing successful (real email + SMS)
- ✅ Error handling comprehensive
- ✅ Security measures in place (bcrypt, rate limiting, token expiry)

**Verification Commands**:
```bash
# Start server
yarn workspace twenty-server start:dev

# Run unit tests
yarn workspace twenty-server test verification.service

# Run integration tests
yarn workspace twenty-server test:e2e registration-flow

# Check Redis for tokens/codes
redis-cli KEYS "email_verify:*"
redis-cli KEYS "sms_verify:*"
redis-cli GET "email_verify:some-token-uuid"

# Check database
psql -d twenty -c "SELECT id, email, phone, verified, email_verified, phone_verified, verified_at FROM public_user WHERE email = 'test@example.com';"

# Test GraphQL mutations
curl http://localhost:3000/graphql -H "Content-Type: application/json" -d '{
  "query": "mutation { registerPublicUser(data: { email: \"test@example.com\", phone: \"0901234567\", password: \"SecurePass123\", fullName: \"Test User\", userType: BUYER }) { userId message requiresVerification } }"
}'

# Check rate limiting
for i in {1..4}; do
  curl http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query": "mutation { registerPublicUser(...) { userId } }"}';
done
# 4th request should return 429 Too Many Requests
```

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
