import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { FileModule } from 'src/engine/core-modules/file/file.module';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';
import { OrderManagementModule } from '../order-management/order-management.module';
import { TreeTrackingModule } from '../tree-tracking/tree-tracking.module';

import { BankingService } from './services/banking.service';
import { UsdtService } from './services/usdt.service';
import { WalletService } from './services/wallet.service';
import { ContractService } from './services/contract.service';
import { TreeGenerationRetryService } from './services/tree-generation-retry.service';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { BankingWebhookController } from './webhooks/banking-webhook.controller';
import { BlockchainWebhookController } from './webhooks/blockchain-webhook.controller';

@Module({
    imports: [
        OrderManagementModule,
        TreeTrackingModule,
        FileModule,
        FileStorageModule,
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60000, // 60 seconds
                limit: 100, // 100 requests per minute
            },
        ]),
    ],
    controllers: [BankingWebhookController, BlockchainWebhookController],
    providers: [
        BankingService,
        UsdtService,
        WalletService,
        ContractService,
        TreeGenerationRetryService,
        IpWhitelistGuard,
        WebhookSignatureGuard,
    ],
    exports: [
        BankingService,
        UsdtService,
        WalletService,
        ContractService,
        TreeGenerationRetryService,
    ],
})
export class PaymentModule { }
