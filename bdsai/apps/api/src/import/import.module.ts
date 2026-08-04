import { Module } from '@nestjs/common';
import { DedupService } from './dedup.service';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';

/**
 * ImportModule — Story 5.7.
 *
 * Admin import + dedup engine. Depends on DbModule (Drizzle) + ConfigModule.
 */
@Module({
  controllers: [ImportController],
  providers: [DedupService, ImportService],
  exports: [DedupService, ImportService],
})
export class ImportModule {}
