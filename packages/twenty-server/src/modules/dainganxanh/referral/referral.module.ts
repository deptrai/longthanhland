import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralService } from './services/referral.service';
import { ReferralController } from './controllers/referral.controller';

@Module({
    imports: [TypeOrmModule.forFeature(['Referral'])],
    providers: [ReferralService],
    controllers: [ReferralController],
    exports: [ReferralService],
})
export class ReferralModule { }
