import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

/**
 * UploadModule (AC5, AD-1) — Story 2.3.
 *
 * Module riêng cho file upload (avatar Story 2.3, listing image Story 3.2).
 * Inject SupabaseService (SupabaseModule @Global — storage upload).
 *
 * ThrottlerModule scoped UploadModule (APP_GUARD) — rate limit upload endpoint.
 * @Throttle trên /upload/avatar override default (10/15min — AC9).
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 1000,
      },
    ]),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    // ThrottlerGuard scoped UploadModule — apply cho UploadController endpoints.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [UploadService],
})
export class UploadModule {}
