import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * AuthModule (AD-1 Module Isolation) — Story 2.1 + 2.2.
 *
 * Module nghiệp vụ auth: register (2.1) + login/logout/refresh/me (2.2).
 * Inject hạ tầng qua @Global module:
 *   - SupabaseService (SupabaseModule — auth.signInWithPassword/signOut/refresh).
 *   - DrizzleDB (DatabaseModule — public_users read).
 *   - QueueService (QueueModule — email verification job).
 *
 * Story 2.2:
 *   - ThrottlerModule: rate limit 5 login / 15 phút / IP (E9).
 *     ThrottlerGuard scoped AuthModule (APP_GUARD trong module — KHÔNG global).
 *     @Throttle trên /auth/login override default; other endpoints dùng default
 *     (limit 1000/60s — effectively unlimited).
 *   - JwtAuthGuard: verify Supabase JWT local (AC6).
 */
@Module({
  imports: [
    // E9: rate limit. Default high (1000/60s) — login override @Throttle(5, 900s).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 1000,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    // ThrottlerGuard scoped AuthModule — apply cho AuthController endpoints.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
