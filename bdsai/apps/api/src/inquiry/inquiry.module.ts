import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { InquiryNotificationProcessor } from './inquiry.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'inquiry-notification' }),
  ],
  controllers: [InquiryController],
  providers: [InquiryService, InquiryNotificationProcessor],
  exports: [InquiryService],
})
export class InquiryModule {}
