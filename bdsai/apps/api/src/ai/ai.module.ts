import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiSummaryProcessor } from './ai.processor';
import { AiController } from './ai.controller';

// Story 4.1 — AI module (summary + trust score).
// BullMQ queue 'ai-summary' for background AI generation (AD-6).

@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-summary' }),
  ],
  controllers: [AiController],
  providers: [AiService, AiSummaryProcessor],
  exports: [AiService],
})
export class AiModule {}
