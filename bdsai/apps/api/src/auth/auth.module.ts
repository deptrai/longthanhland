import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AuthModule (AD-1 Module Isolation) — Story 2.1.
 *
 * Module nghiệp vụ auth: register (AC4). Inject hạ tầng qua @Global module:
 *   - SupabaseService (SupabaseModule — auth.admin.createUser).
 *   - DrizzleDB (DatabaseModule — public_users insert).
 *   - QueueService (QueueModule — email verification job).
 *
 * KHÔNG tạo connection/queue riêng (AD-1). Expose AuthService cho module sau
 * (login Story 2.2, profile Story 2.3).
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
