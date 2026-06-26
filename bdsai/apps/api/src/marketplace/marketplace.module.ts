import { Module } from '@nestjs/common';
import { MarketplaceController, MarketplacePublicController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

/**
 * MarketplaceModule (AD-1 Module Isolation) — Story 3.1 + 3.3.
 *
 * Module nghiệp vụ listing CRUD + status workflow + public search.
 * Inject hạ tầng qua @Global module:
 *   - DrizzleDB (DatabaseModule — public_listings read/write).
 *   - JwtAuthGuard (AuthModule — verify JWT).
 *   - AdminGuard (AdminModule — admin role check, Story 3.3).
 */
@Module({
  controllers: [MarketplaceController, MarketplacePublicController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
