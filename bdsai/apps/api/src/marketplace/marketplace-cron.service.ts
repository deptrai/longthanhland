import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketplaceService } from './marketplace.service';

/**
 * MarketplaceCronService — Story 3.6.
 * Cron job tự động expire listings PUBLISHED quá hạn.
 * Chạy mỗi giờ (0 * * * *) — balance giữa responsiveness và DB load.
 */
@Injectable()
export class MarketplaceCronService {
  private readonly logger = new Logger(MarketplaceCronService.name);

  constructor(private readonly marketplaceService: MarketplaceService) {}

  // Story 3.6 AC: "đến hạn (cron job) → tin chuyển EXPIRED".
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpireListings(): Promise<void> {
    try {
      const result = await this.marketplaceService.expireListings();
      if (result.expired > 0) {
        this.logger.log(`Expired ${result.expired} listings`);
      }
    } catch (e) {
      this.logger.error('Cron expireListings failed', e);
    }
  }
}
