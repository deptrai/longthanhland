import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MonitoringService } from './monitoring.service';

/**
 * HealthModule (AC3, AC7, AC1) — Story 1.2 + 1.6.
 *
 * Inject DRIZZLE (DatabaseModule @Global) + SupabaseService (SupabaseModule @Global)
 * + REDIS_CONNECTION (QueueModule @Global — Story 1.6) + QueueService (QueueModule @Global).
 *
 * MonitoringService (AC7) dùng @Cron — cần ScheduleModule.forRoot() (app.module).
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService, MonitoringService],
})
export class HealthModule {}
