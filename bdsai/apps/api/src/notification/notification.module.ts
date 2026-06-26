import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * NotificationModule — Story 6.2.
 * EmailService dùng Resend API (production) hoặc log-only (dev).
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationModule {}
