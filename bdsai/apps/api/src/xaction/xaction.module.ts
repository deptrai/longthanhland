import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { XactionController } from './xaction.controller';
import { PromotionService } from './promotion.service';
import { CrossPostProcessor } from './cross-post.processor';
import { ProviderRegistry } from './provider-registry';
import { StubProvider } from './providers/stub.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { ChoTotProvider } from './providers/cho-tot.provider';
import { ZaloProvider } from './providers/zalo.provider';
import { XactionsClient } from './xactions-client';
import { ListingFormatter } from './listing-formatter';
import { ChoTotListingFormatter } from './cho-tot-listing-formatter';
import { ZaloListingFormatter } from './zalo-listing-formatter';

/**
 * XactionModule (AC3, AD-1, AD-3) — Story 5.1 / 5.2 / 5.3 / 5.4.
 *
 * Module riêng sở hữu mọi cross-post communication (AD-1 Module Isolation).
 * - providers: PromotionService, CrossPostProcessor, ProviderRegistry,
 *   StubProvider (test fallback), FacebookProvider (facebook — Story 5.2),
 *   ChoTotProvider (cho_tot — Story 5.3 assisted), ZaloProvider (zalo — Story 5.4 assisted),
 *   XactionsClient, ListingFormatter, ChoTotListingFormatter, ZaloListingFormatter.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'cross-post' })],
  controllers: [XactionController],
  providers: [
    PromotionService,
    CrossPostProcessor,
    ProviderRegistry,
    StubProvider,
    FacebookProvider,
    ChoTotProvider,
    ZaloProvider,
    XactionsClient,
    ListingFormatter,
    ChoTotListingFormatter,
    ZaloListingFormatter,
  ],
  exports: [PromotionService],
})
export class XactionModule {}
