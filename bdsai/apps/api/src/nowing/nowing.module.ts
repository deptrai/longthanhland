import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NowingClient } from './nowing.client';
import { NowingService } from './nowing.service';

@Module({
  imports: [ConfigModule],
  providers: [NowingClient, NowingService],
  exports: [NowingClient, NowingService],
})
export class NowingModule {}
