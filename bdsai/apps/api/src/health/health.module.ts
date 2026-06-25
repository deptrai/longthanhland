import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * HealthModule (AC3, AC7) — Story 1.2.
 *
 * Inject DRIZZLE (DatabaseModule @Global) + SupabaseService (SupabaseModule @Global).
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
