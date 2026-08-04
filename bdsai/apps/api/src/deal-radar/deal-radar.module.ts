import { Module } from '@nestjs/common';
import { DealRadarService } from './deal-radar.service';
import { DealRadarController } from './deal-radar.controller';

@Module({
  controllers: [DealRadarController],
  providers: [DealRadarService],
  exports: [DealRadarService],
})
export class DealRadarModule {}
