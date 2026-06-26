import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

/**
 * MarketplaceModule (AD-1 Module Isolation) — Story 3.1.
 *
 * Module nghiệp vụ listing CRUD + status workflow.
 * Inject hạ tầng qua @Global module:
 *   - DrizzleDB (DatabaseModule — public_listings read/write).
 *   - JwtAuthGuard (AuthModule — verify JWT).
 */
@Module({
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
