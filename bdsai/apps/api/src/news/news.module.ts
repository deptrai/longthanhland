import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';

/**
 * NewsModule — Story 5.8.
 *
 * Admin-curated BĐS news feed. Depends on DbModule (Drizzle).
 */
@Module({
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
