import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MarketplaceController, MarketplacePublicController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { ModerationService } from './moderation.service';

/**
 * MarketplaceModule (AD-1 Module Isolation) — Story 3.1 + 3.3 + 3.5 + 4.1.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-summary' }),
  ],
  controllers: [MarketplaceController, MarketplacePublicController],
  providers: [MarketplaceService, ModerationService],
  exports: [MarketplaceService, ModerationService],
})
export class MarketplaceModule {}
