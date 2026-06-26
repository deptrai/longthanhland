import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { InquiryNotificationProcessor } from './inquiry.processor';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'inquiry-notification' }),
    NotificationModule,
  ],
  controllers: [InquiryController],
  providers: [InquiryService, InquiryNotificationProcessor],
  exports: [InquiryService],
})
export class InquiryModule {}
