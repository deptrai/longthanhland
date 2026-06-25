import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './db/database.module';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';

/**
 * Root module — bdsai.vn API (Application layer, NestJS 11).
 *
 * AD-1 (Module Isolation): các module nghiệp vụ (marketplace, auth, ai,
 * xaction, admin, queue) sẽ được import vào đây ở các story sau, mỗi module
 * chỉ expose service interface công khai. Story 1.1 chưa tạo module nghiệp vụ.
 *
 * Story 1.2 thêm hạ tầng nền tảng (không phải module nghiệp vụ):
 *   - ConfigModule (AC2): env qua @nestjs/config + validate fail-fast.
 *   - DatabaseModule (AC1/AC5): Drizzle + postgres.js (@Global, expose DI token).
 *   - SupabaseModule (AC3): Auth + Storage client server-side (@Global).
 *   - HealthModule (AC3): GET /health/supabase.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    SupabaseModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
