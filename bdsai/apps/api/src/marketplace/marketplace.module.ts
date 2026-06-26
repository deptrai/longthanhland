import { Module } from '@nestjs/common';
import { MarketplaceController, MarketplacePublicController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { ModerationService } from './moderation.service';

/**
 * MarketplaceModule (AD-1 Module Isolation) — Story 3.1 + 3.3 + 3.5.
 */
@Module({
  controllers: [MarketplaceController, MarketplacePublicController],
  providers: [MarketplaceService, ModerationService],
  exports: [MarketplaceService, ModerationService],
})
export class MarketplaceModule {}
