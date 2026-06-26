import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './db/database.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { AiModule } from './ai/ai.module';
import { InquiryModule } from './inquiry/inquiry.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Root module — bdsai.vn API (Application layer, NestJS 11).
 *
 * AD-1 (Module Isolation): các module nghiệp vụ (marketplace, auth, ai,
 * xaction, admin) sẽ được import vào đây ở các story sau, mỗi module
 * chỉ expose service interface công khai.
 *
 * Story 1.2: hạ tầng nền tảng (ConfigModule, DatabaseModule, SupabaseModule, HealthModule).
 * Story 1.6: hạ tầng nền tiếp (LoggerModule, QueueModule, ScheduleModule, global filter).
 *   - LoggerModule (AC5): nestjs-pino structured JSON logger.
 *   - QueueModule (AC2, AD-6): BullMQ @Global — Redis + echo queue.
 *   - ScheduleModule (AC7, E10): @Cron cho monitoring hourly.
 *   - AllExceptionsFilter (AC6): global exception filter — error shape chuẩn.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // AC5: pino logger phải load trước module dùng Logger (DI order).
    LoggerModule,
    DatabaseModule,
    SupabaseModule,
    QueueModule,
    // AC7/E10: ScheduleModule cho @Cron (monitoring.service).
    ScheduleModule.forRoot(),
    HealthModule,
    // Story 2.1: AuthModule (register — AC4).
    AuthModule,
    // Story 2.3: UploadModule (avatar upload — AC5, AD-1 module riêng).
    UploadModule,
    // Story 2.4: AdminModule (admin user management — list/ban/unban).
    AdminModule,
    // Story 3.1: MarketplaceModule (listing CRUD + status workflow).
    MarketplaceModule,
    // Story 4.1: AiModule (AI summary + trust score via BullMQ).
    AiModule,
    // Story 6.1 + 6.2: InquiryModule (buyer inquiry + email notification).
    InquiryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // AC6: global exception filter qua DI (inject pino Logger + HttpAdapterHost).
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
