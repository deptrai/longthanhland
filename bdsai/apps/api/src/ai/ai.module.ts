import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiSummaryProcessor } from './ai.processor';
import { AiController } from './ai.controller';
import { AppealService } from './appeal.service';
import { AppealController } from './appeal.controller';
import { AdminModule } from '../admin/admin.module';

// Story 4.1 + 4.4 — AI module (summary + trust score + appeals).
// BullMQ queue 'ai-summary' for background AI generation (AD-6).

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-summary' }),
    AdminModule,
  ],
  controllers: [AiController, AppealController],
  providers: [AiService, AiSummaryProcessor, AppealService],
  exports: [AiService],
})
export class AiModule {}
