# Story 8.2.3: Public User Authentication

Status: drafted

## Story

As a public user,
I want to log in with my email and password,
so that I can access my account and marketplace features.

## Acceptance Criteria

1. **Login with Valid Credentials**
   - Given verified public user account exists
   - When I submit email and password to login mutation
   - Then system validates credentials using bcrypt
   - And generates JWT access token (7-day expiry)
   - And generates refresh token (30-day expiry)
   - And stores refresh token in Redis
   - And returns tokens and user profile
   - And updates `lastLoginAt` timestamp

2. **JWT Token Structure & Claims**
   - Given successful login
   - When JWT token generated
   - Then token includes claims:
     - `userId` (string, UUID)
     - `email` (string)
     - `userType` (enum: BUYER, SELLER, BROKER)
     - `subscriptionTier` (enum: FREE, BASIC, PRO, ENTERPRISE)
     - `verified` (boolean)
     - `iat` (issued at timestamp)
     - `exp` (expiry timestamp, 7 days from iat)
   - And token signed with JWT_SECRET from environment
   - And token follows JWT standard (header.payload.signature)

3. **Invalid Credentials Handling**
   - Given user attempts login with wrong password
   - When login mutation called
   - Then system compares password with bcrypt
   - And returns 401 Unauthorized error
   - And error message: "Invalid email or password"
   - And does not reveal which field is incorrect (security)
   - And logs failed login attempt
   - And increments failed attempt counter

4. **Unverified Account Restriction**
   - Given user account exists but `verified = false`
   - When login attempted
   - Then system checks verification status
   - And returns 403 Forbidden error
   - And error message: "Please verify your email and phone before logging in"
   - And includes verification status: `{ emailVerified, phoneVerified }`
   - And provides option to resend verification codes

5. **Refresh Token Mechanism**
   - Given access token expired
   - When refresh token provided to refresh mutation
   - Then system validates refresh token from Redis
   - And checks token not expired (30-day TTL)
   - And generates new access token (7-day expiry)
   - And optionally rotates refresh token (security best practice)
   - And returns new tokens
   - And old refresh token invalidated if rotation enabled

6. **Rate Limiting & Security**
   - Given multiple login attempts from same IP
   - When attempts exceed limit
   - Then max 5 login attempts per IP per 15 minutes enforced
   - And returns 429 Too Many Requests error
   - And logs suspicious activity
   - And implements exponential backoff for repeated failures

## Tasks / Subtasks

- [ ] **Task 1: Extend Twenty Auth System for Public Users** (AC: #1)
  - [ ] Review Twenty's existing auth system (`packages/twenty-server/src/engine/core-modules/auth/`)
  - [ ] Identify reusable components: JWT service, token generation, guards
  - [ ] Create `PublicUserAuthService` extending base auth patterns
  - [ ] Configure separate JWT secret for public users (optional, or reuse)
  - [ ] Ensure public user auth doesn't interfere with internal user auth
  - [ ] Add public user context to GraphQL context
  - [ ] Create `@PublicUserAuth()` decorator for protected resolvers

- [ ] **Task 2: Create Login Resolver** (AC: #1, #2)
  - [ ] Create `loginPublicUser` mutation in `PublicUserResolver`:
    ```typescript
    @Mutation(() => LoginPublicUserOutput)
    async loginPublicUser(
      @Args('email') email: string,
      @Args('password') password: string,
      @Context() context: any,
    ): Promise<LoginPublicUserOutput>
    ```
  - [ ] Create input DTO: `LoginPublicUserInput` with:
    - email (string, required, email format)
    - password (string, required)
  - [ ] Create output DTO: `LoginPublicUserOutput` with:
    - accessToken (string)
    - refreshToken (string)
    - expiresIn (number, seconds)
    - user (PublicUserProfile object)
  - [ ] Validate email format
  - [ ] Find user by email
  - [ ] Check user exists (return 401 if not)
  - [ ] Check user verified (return 403 if not)
  - [ ] Verify password with bcrypt
  - [ ] Generate access token (7-day expiry)
  - [ ] Generate refresh token (30-day expiry)
  - [ ] Store refresh token in Redis
  - [ ] Update `lastLoginAt` timestamp
  - [ ] Return tokens and user profile

- [ ] **Task 3: Password Verification with bcrypt** (AC: #3)
  - [ ] Use bcrypt.compare() to verify password:
    ```typescript
    const isPasswordValid = await bcrypt.compare(
      plainPassword,
      user.password
    );
    ```
  - [ ] Implement constant-time comparison (bcrypt handles this)
  - [ ] Handle password verification errors
  - [ ] Return generic error message (don't reveal if email or password wrong)
  - [ ] Log failed attempts with IP address
  - [ ] Implement account lockout after N failed attempts (optional):
    - Track failed attempts in Redis: `login_fail:{userId}`
    - Lock account for 15 minutes after 5 failures
    - Reset counter on successful login

- [ ] **Task 4: JWT Token Generation** (AC: #2)
  - [ ] Install JWT library: `npm install @nestjs/jwt jsonwebtoken`
  - [ ] Configure JwtModule in `PublicMarketplaceModule`:
    ```typescript
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    })
    ```
  - [ ] Create `generateAccessToken(user)` method:
    ```typescript
    const payload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      subscriptionTier: user.subscriptionTier,
      verified: user.verified,
    };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
    ```
  - [ ] Create `generateRefreshToken(user)` method:
    ```typescript
    const refreshToken = uuidv4();
    await this.redis.setex(
      `refresh_token:${refreshToken}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify({ userId: user.id, createdAt: new Date() })
    );
    return refreshToken;
    ```
  - [ ] Add JWT_SECRET to environment variables:
    ```bash
    JWT_SECRET=your-super-secret-key-min-32-chars
    JWT_ACCESS_TOKEN_EXPIRY=7d
    JWT_REFRESH_TOKEN_EXPIRY=30d
    ```
  - [ ] Implement token signing with HS256 algorithm
  - [ ] Add token metadata: iat, exp, iss (issuer)

- [ ] **Task 5: Refresh Token Mechanism** (AC: #5)
  - [ ] Create `refreshAccessToken` mutation:
    ```typescript
    @Mutation(() => RefreshTokenOutput)
    async refreshAccessToken(
      @Args('refreshToken') refreshToken: string,
    ): Promise<RefreshTokenOutput>
    ```
  - [ ] Validate refresh token:
    - Check token exists in Redis: `refresh_token:{token}`
    - Check not expired (TTL > 0)
    - Get userId from Redis
  - [ ] Generate new access token with same claims
  - [ ] Optionally rotate refresh token (security best practice):
    - Delete old refresh token from Redis
    - Generate new refresh token
    - Return both new access and refresh tokens
  - [ ] Handle errors:
    - Token not found → 401 Unauthorized
    - Token expired → 401 Unauthorized
    - User not found → 401 Unauthorized
  - [ ] Implement token family tracking (optional, for detecting token theft):
    - Store token family ID in Redis
    - Invalidate entire family if suspicious activity detected

- [ ] **Task 6: Implement Authentication Guards** (AC: #1)
  - [ ] Create `PublicUserAuthGuard` extending `AuthGuard('jwt')`:
    ```typescript
    @Injectable()
    export class PublicUserAuthGuard extends AuthGuard('jwt') {
      canActivate(context: ExecutionContext) {
        // Extract JWT from Authorization header
        // Validate token
        // Attach user to request context
        return super.canActivate(context);
      }
    }
    ```
  - [ ] Configure JWT strategy for public users:
    ```typescript
    @Injectable()
    export class PublicUserJwtStrategy extends PassportStrategy(Strategy, 'public-user-jwt') {
      constructor(private readonly publicUserService: PublicUserService) {
        super({
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: process.env.JWT_SECRET,
        });
      }

      async validate(payload: any) {
        const user = await this.publicUserService.findOne(payload.userId);
        if (!user || !user.verified) {
          throw new UnauthorizedException();
        }
        return user;
      }
    }
    ```
  - [ ] Create `@PublicUserAuth()` decorator:
    ```typescript
    export const PublicUserAuth = () => UseGuards(PublicUserAuthGuard);
    ```
  - [ ] Apply guard to protected resolvers:
    ```typescript
    @PublicUserAuth()
    @Query(() => PublicUserProfile)
    async me(@CurrentUser() user: PublicUser) {
      return user;
    }
    ```

- [ ] **Task 7: Rate Limiting for Login** (AC: #6)
  - [ ] Apply throttler to login mutation:
    ```typescript
    @Throttle(5, 900) // 5 attempts per 15 minutes
    @Mutation(() => LoginPublicUserOutput)
    async loginPublicUser(...)
    ```
  - [ ] Create custom rate limiter for failed login attempts:
    - Key: `login_fail:{ip}:{email}`
    - Increment on failed attempt
    - Reset on successful login
    - Block after 5 failures for 15 minutes
  - [ ] Implement exponential backoff:
    - 1st failure: no delay
    - 2nd failure: 2 seconds delay
    - 3rd failure: 4 seconds delay
    - 4th failure: 8 seconds delay
    - 5th failure: 15 minutes lockout
  - [ ] Log rate limit violations:
    ```typescript
    logger.warn('Login rate limit exceeded', {
      ip,
      email,
      attempts: failedAttempts,
    });
    ```
  - [ ] Return appropriate error with retry info:
    ```json
    {
      "error": "Too many login attempts. Please try again in 15 minutes.",
      "retryAfter": 900,
      "attemptsRemaining": 0
    }
    ```

- [ ] **Task 8: Frontend Login Form Component**
  - [ ] Create `packages/twenty-front/src/modules/public-marketplace/components/LoginForm.tsx`
  - [ ] Implement login form with React Hook Form:
    ```typescript
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
    const [login, { loading, error }] = useMutation(LOGIN_PUBLIC_USER);
    ```
  - [ ] Form fields:
    - Email input (required, email format)
    - Password input (required, password type)
    - "Remember me" checkbox (optional)
    - "Forgot password?" link
    - Submit button
  - [ ] Implement form validation:
    - Email: RFC 5322 format
    - Password: Required (no min length check on login)
    - Real-time validation feedback
  - [ ] Handle login success:
    - Store access token in localStorage or httpOnly cookie
    - Store refresh token in httpOnly cookie (more secure)
    - Redirect to dashboard or intended page
    - Update global auth state (React Context or Redux)
  - [ ] Handle login errors:
    - 401: Show "Invalid email or password"
    - 403: Show "Please verify your account" with resend link
    - 429: Show "Too many attempts, try again in X minutes"
    - Network error: Show "Connection error, please try again"
  - [ ] Add loading state and disable form during submission
  - [ ] Implement "Remember me" functionality:
    - If checked, store refresh token for 30 days
    - If unchecked, store for session only
  - [ ] Add "Forgot password?" link to password reset flow
  - [ ] Make responsive for mobile devices

- [ ] **Task 9: Implement Logout Functionality**
  - [ ] Create `logoutPublicUser` mutation:
    ```typescript
    @PublicUserAuth()
    @Mutation(() => LogoutOutput)
    async logoutPublicUser(
      @Args('refreshToken') refreshToken: string,
      @CurrentUser() user: PublicUser,
    ): Promise<LogoutOutput>
    ```
  - [ ] Invalidate refresh token:
    - Delete from Redis: `refresh_token:{token}`
    - Optionally blacklist access token until expiry
  - [ ] Clear client-side tokens:
    - Remove from localStorage
    - Clear httpOnly cookies
  - [ ] Return success response
  - [ ] Frontend logout button:
    - Call logout mutation
    - Clear local storage
    - Clear auth state
    - Redirect to login page

- [ ] **Task 10: Create Unit Tests**
  - [ ] Create `packages/twenty-server/src/modules/public-marketplace/services/__tests__/public-user-auth.service.spec.ts`
  - [ ] Test login with valid credentials:
    ```typescript
    describe('loginPublicUser', () => {
      it('should login with valid credentials', async () => {
        const result = await service.loginPublicUser(email, password);
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.user.email).toBe(email);
      });

      it('should update lastLoginAt timestamp', async () => {
        await service.loginPublicUser(email, password);
        const user = await publicUserService.findByEmail(email);
        expect(user.lastLoginAt).toBeDefined();
      });
    });
    ```
  - [ ] Test invalid credentials:
    ```typescript
    it('should reject invalid password', async () => {
      await expect(service.loginPublicUser(email, 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject non-existent email', async () => {
      await expect(service.loginPublicUser('nonexistent@example.com', password))
        .rejects.toThrow('Invalid email or password');
    });
    ```
  - [ ] Test unverified account:
    ```typescript
    it('should reject unverified account', async () => {
      user.verified = false;
      await expect(service.loginPublicUser(email, password))
        .rejects.toThrow('Please verify your account');
    });
    ```
  - [ ] Test JWT token generation:
    ```typescript
    describe('JWT Token', () => {
      it('should generate valid JWT token', async () => {
        const result = await service.loginPublicUser(email, password);
        const decoded = jwtService.verify(result.accessToken);
        expect(decoded.userId).toBe(user.id);
        expect(decoded.email).toBe(user.email);
      });

      it('should set 7-day expiry on access token', async () => {
        const result = await service.loginPublicUser(email, password);
        const decoded = jwtService.verify(result.accessToken);
        const expiryDays = (decoded.exp - decoded.iat) / (24 * 60 * 60);
        expect(expiryDays).toBeCloseTo(7, 0);
      });
    });
    ```
  - [ ] Test refresh token:
    ```typescript
    describe('Refresh Token', () => {
      it('should generate and store refresh token', async () => {
        const result = await service.loginPublicUser(email, password);
        const tokenData = await redis.get(`refresh_token:${result.refreshToken}`);
        expect(tokenData).toBeDefined();
      });

      it('should refresh access token with valid refresh token', async () => {
        const loginResult = await service.loginPublicUser(email, password);
        const refreshResult = await service.refreshAccessToken(loginResult.refreshToken);
        expect(refreshResult.accessToken).toBeDefined();
        expect(refreshResult.accessToken).not.toBe(loginResult.accessToken);
      });

      it('should reject expired refresh token', async () => {
        const expiredToken = 'expired-token';
        await expect(service.refreshAccessToken(expiredToken))
          .rejects.toThrow('Invalid or expired refresh token');
      });
    });
    ```
  - [ ] Test rate limiting:
    ```typescript
    describe('Rate Limiting', () => {
      it('should allow 5 login attempts', async () => {
        for (let i = 0; i < 5; i++) {
          await service.loginPublicUser(email, 'wrongpassword').catch(() => {});
        }
        // Should not throw rate limit error yet
      });

      it('should block 6th login attempt', async () => {
        for (let i = 0; i < 5; i++) {
          await service.loginPublicUser(email, 'wrongpassword').catch(() => {});
        }
        await expect(service.loginPublicUser(email, password))
          .rejects.toThrow('Too many login attempts');
      });
    });
    ```
  - [ ] Mock dependencies: PublicUserService, JwtService, Redis
  - [ ] Achieve >80% code coverage

- [ ] **Task 11: Integration Testing**
  - [ ] Create end-to-end test: `authentication-flow.e2e-spec.ts`
  - [ ] Test complete authentication flow:
    ```typescript
    it('should complete full authentication flow', async () => {
      // Step 1: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: LOGIN_MUTATION,
          variables: { email, password }
        });
      expect(loginResponse.body.data.loginPublicUser.accessToken).toBeDefined();
      const { accessToken, refreshToken } = loginResponse.body.data.loginPublicUser;

      // Step 2: Access protected resource
      const meResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: ME_QUERY
        });
      expect(meResponse.body.data.me.email).toBe(email);

      // Step 3: Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: REFRESH_TOKEN_MUTATION,
          variables: { refreshToken }
        });
      expect(refreshResponse.body.data.refreshAccessToken.accessToken).toBeDefined();

      // Step 4: Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: LOGOUT_MUTATION,
          variables: { refreshToken }
        });
      expect(logoutResponse.body.data.logoutPublicUser.success).toBe(true);

      // Step 5: Verify token invalidated
      const meAfterLogout = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          query: ME_QUERY
        });
      // Should still work until token expires (or implement token blacklist)
    });
    ```
  - [ ] Test error scenarios:
    - Invalid credentials
    - Unverified account
    - Expired access token
    - Invalid refresh token
    - Rate limit exceeded
  - [ ] Use test database and Redis instance
  - [ ] Clean up test data after each test

- [ ] **Task 12: Manual Testing & Verification**
  - [ ] Start development server: `yarn workspace twenty-server start:dev`
  - [ ] Test login in GraphQL Playground:
    ```graphql
    mutation Login {
      loginPublicUser(
        email: "test@example.com"
        password: "SecurePass123"
      ) {
        accessToken
        refreshToken
        expiresIn
        user {
          id
          email
          fullName
          userType
          subscriptionTier
          verified
        }
      }
    }
    ```
  - [ ] Test accessing protected resource:
    ```graphql
    query Me {
      me {
        id
        email
        fullName
        userType
        subscriptionTier
        totalListings
        activeListings
      }
    }
    # Add Authorization header: Bearer <accessToken>
    ```
  - [ ] Test refresh token:
    ```graphql
    mutation RefreshToken {
      refreshAccessToken(refreshToken: "refresh-token-here") {
        accessToken
        refreshToken
        expiresIn
      }
    }
    ```
  - [ ] Test logout:
    ```graphql
    mutation Logout {
      logoutPublicUser(refreshToken: "refresh-token-here") {
        success
        message
      }
    }
    ```
  - [ ] Verify tokens in Redis:
    ```bash
    redis-cli KEYS "refresh_token:*"
    redis-cli GET "refresh_token:some-uuid"
    redis-cli TTL "refresh_token:some-uuid"
    ```
  - [ ] Test rate limiting:
    - Try logging in with wrong password 6 times
    - Verify 6th attempt is blocked
  - [ ] Test frontend login form:
    - Navigate to `/login`
    - Enter credentials and submit
    - Verify redirect to dashboard
    - Check tokens stored in localStorage/cookies
  - [ ] Test error handling:
    - Login with wrong password
    - Login with unverified account
    - Try to access protected route without token
    - Try to use expired token

## Dev Notes

### Architecture Context

**Authentication Flow Pattern**: JWT-based stateless authentication
- User submits credentials (email + password)
- Server validates credentials and verification status
- Server generates JWT access token (short-lived, 7 days)
- Server generates refresh token (long-lived, 30 days)
- Client stores tokens (access in memory/localStorage, refresh in httpOnly cookie)
- Client includes access token in Authorization header for API requests
- Client uses refresh token to get new access token when expired

**Key Design Decisions**:
- Separate auth system for public users (isolated from internal CRM users)
- JWT for stateless authentication (no session storage needed)
- Refresh token rotation for enhanced security
- Rate limiting to prevent brute force attacks
- Generic error messages to prevent user enumeration
- Verification required before login (emailVerified && phoneVerified)

**Technology Stack**:
- NestJS 10.x with Passport.js
- @nestjs/jwt for JWT generation/verification
- bcrypt for password comparison
- Redis for refresh token storage
- React Hook Form for frontend validation

### Project Structure Notes

**Backend Structure**:
```
packages/twenty-server/src/modules/public-marketplace/
├── auth/
│   ├── guards/
│   │   └── public-user-auth.guard.ts
│   ├── strategies/
│   │   └── public-user-jwt.strategy.ts
│   ├── decorators/
│   │   ├── public-user-auth.decorator.ts
│   │   └── current-user.decorator.ts
│   └── services/
│       ├── public-user-auth.service.ts
│       └── __tests__/
│           └── public-user-auth.service.spec.ts
├── resolvers/
│   └── public-user-auth.resolver.ts
└── dto/
    ├── login-public-user.input.ts
    ├── login-public-user.output.ts
    ├── refresh-token.output.ts
    └── logout.output.ts
```

**Frontend Structure**:
```
packages/twenty-front/src/modules/public-marketplace/
├── components/
│   ├── LoginForm.tsx
│   └── LogoutButton.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useLogin.ts
├── context/
│   └── AuthContext.tsx
└── graphql/
    ├── mutations/
    │   ├── loginPublicUser.ts
    │   ├── refreshAccessToken.ts
    │   └── logoutPublicUser.ts
    └── queries/
        └── me.ts
```

### Implementation Details

**Login Resolver Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/resolvers/public-user-auth.resolver.ts
import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Throttle } from '@nestjs/throttler';
import { PublicUserAuthService } from '../auth/services/public-user-auth.service';
import { PublicUserAuth } from '../auth/decorators/public-user-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LoginPublicUserInput } from '../dto/login-public-user.input';
import { LoginPublicUserOutput } from '../dto/login-public-user.output';

@Resolver()
export class PublicUserAuthResolver {
  constructor(
    private readonly authService: PublicUserAuthService,
  ) {}

  @Throttle(5, 900) // 5 attempts per 15 minutes
  @Mutation(() => LoginPublicUserOutput)
  async loginPublicUser(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<LoginPublicUserOutput> {
    return this.authService.login(email, password);
  }

  @Mutation(() => RefreshTokenOutput)
  async refreshAccessToken(
    @Args('refreshToken') refreshToken: string,
  ): Promise<RefreshTokenOutput> {
    return this.authService.refreshToken(refreshToken);
  }

  @PublicUserAuth()
  @Mutation(() => LogoutOutput)
  async logoutPublicUser(
    @Args('refreshToken') refreshToken: string,
    @CurrentUser() user: PublicUser,
  ): Promise<LogoutOutput> {
    return this.authService.logout(refreshToken, user.id);
  }

  @PublicUserAuth()
  @Query(() => PublicUserProfile)
  async me(@CurrentUser() user: PublicUser): Promise<PublicUserProfile> {
    return user;
  }
}
```

**Auth Service Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/auth/services/public-user-auth.service.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PublicUserService } from '../../services/public-user.service';

@Injectable()
export class PublicUserAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
    private readonly publicUserService: PublicUserService,
  ) {}

  async login(email: string, password: string): Promise<LoginPublicUserOutput> {
    // Find user by email
    const user = await this.publicUserService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check verification status
    if (!user.verified) {
      throw new ForbiddenException({
        message: 'Please verify your email and phone before logging in',
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Update last login timestamp
    await this.publicUserService.update(user.id, {
      lastLoginAt: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        subscriptionTier: user.subscriptionTier,
        verified: user.verified,
      },
    };
  }

  generateAccessToken(user: PublicUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
      subscriptionTier: user.subscriptionTier,
      verified: user.verified,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }

  async generateRefreshToken(user: PublicUser): Promise<string> {
    const refreshToken = uuidv4();

    await this.redis.setex(
      `refresh_token:${refreshToken}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify({
        userId: user.id,
        createdAt: new Date(),
      })
    );

    return refreshToken;
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenOutput> {
    // Validate refresh token
    const data = await this.redis.get(`refresh_token:${refreshToken}`);
    if (!data) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const { userId } = JSON.parse(data);

    // Get user
    const user = await this.publicUserService.findOne(userId);
    if (!user || !user.verified) {
      throw new UnauthorizedException('User not found or not verified');
    }

    // Generate new access token
    const newAccessToken = this.generateAccessToken(user);

    // Optional: Rotate refresh token
    const newRefreshToken = await this.generateRefreshToken(user);
    await this.redis.del(`refresh_token:${refreshToken}`); // Invalidate old token

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60,
    };
  }

  async logout(refreshToken: string, userId: string): Promise<LogoutOutput> {
    // Invalidate refresh token
    await this.redis.del(`refresh_token:${refreshToken}`);

    // Optional: Blacklist access token (requires additional infrastructure)
    // await this.redis.setex(`blacklist:${accessToken}`, ttl, '1');

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
```

**JWT Strategy Example**:
```typescript
// packages/twenty-server/src/modules/public-marketplace/auth/strategies/public-user-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PublicUserService } from '../../services/public-user.service';

@Injectable()
export class PublicUserJwtStrategy extends PassportStrategy(Strategy, 'public-user-jwt') {
  constructor(private readonly publicUserService: PublicUserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.publicUserService.findOne(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.verified) {
      throw new UnauthorizedException('User not verified');
    }

    return user;
  }
}
```

**Frontend Login Form Example**:
```typescript
// packages/twenty-front/src/modules/public-marketplace/components/LoginForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { LOGIN_PUBLIC_USER } from '../graphql/mutations/loginPublicUser';
import { useAuth } from '../hooks/useAuth';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  const [login, { loading, error }] = useMutation(LOGIN_PUBLIC_USER);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login({
        variables: {
          email: data.email,
          password: data.password,
        },
      });

      const { accessToken, refreshToken, user } = result.data.loginPublicUser;

      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      if (data.rememberMe) {
        localStorage.setItem('refreshToken', refreshToken);
      } else {
        sessionStorage.setItem('refreshToken', refreshToken);
      }

      // Update auth context
      setAuth({ user, accessToken });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);

      // Handle specific errors
      if (err.message.includes('verify')) {
        // Show verification prompt
        navigate('/verify-account');
      }
    }
  };

  return (
    <div className="login-container">
      <h2>Login to Marketplace</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
            placeholder="your@email.com"
          />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            {...register('password', {
              required: 'Password is required',
            })}
            placeholder="Enter your password"
          />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              {...register('rememberMe')}
            />
            Remember me
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && (
          <div className="error-message">
            {error.message}
          </div>
        )}

        <div className="form-footer">
          <a href="/forgot-password">Forgot password?</a>
          <a href="/register">Don't have an account? Register</a>
        </div>
      </form>
    </div>
  );
};
```

### Security Considerations

**JWT Security**:
- Use strong secret key (min 32 characters, random)
- Set appropriate expiry times (7 days for access, 30 days for refresh)
- Sign with HS256 or RS256 algorithm
- Never expose JWT secret in client-side code
- Validate token on every protected request

**Password Security**:
- Use bcrypt for password hashing (10 salt rounds)
- Use constant-time comparison (bcrypt.compare)
- Never log passwords or password hashes
- Return generic error messages (don't reveal if email or password is wrong)

**Token Storage**:
- Access token: localStorage or memory (less secure but convenient)
- Refresh token: httpOnly secure cookie (more secure)
- Never store tokens in plain text on server
- Use Redis for refresh token storage (fast, TTL support)

**Rate Limiting**:
- 5 login attempts per IP per 15 minutes
- Exponential backoff for repeated failures
- Account lockout after N failed attempts (optional)
- Log suspicious activity

**CSRF Protection**:
- Use httpOnly secure cookies for refresh tokens
- Implement CSRF tokens for state-changing operations
- Validate Origin/Referer headers

### Testing Strategy

**Unit Tests** (Target: >80% coverage):
```typescript
// Test login success
it('should login with valid credentials', async () => {
  const result = await service.
