import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MarketplaceController, MarketplacePublicController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { ModerationService } from './moderation.service';
import { MarketplaceCronService } from './marketplace-cron.service';
import { SpamConfigService } from './spam-config.service';
import { SpamConfigController } from './spam-config.controller';
import { NotificationModule } from '../notification/notification.module';
import { AiModule } from '../ai/ai.module';
import { AdminModule } from '../admin/admin.module';
import { XactionModule } from '../xaction/xaction.module';

/**
 * MarketplaceModule (AD-1 Module Isolation) — Story 3.1 + 3.3 + 3.5 + 4.1 + 3.6 + 4.3.
 * Story 5.1: import XactionModule để inject PromotionService (AD-9 lifecycle removal).
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'ai-summary' }),
    NotificationModule,
    AiModule,
    AdminModule,
    XactionModule,
  ],
  controllers: [MarketplaceController, MarketplacePublicController, SpamConfigController],
  providers: [MarketplaceService, ModerationService, MarketplaceCronService, SpamConfigService],
  exports: [MarketplaceService, ModerationService],
})
export class MarketplaceModule {}
