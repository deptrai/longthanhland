import { Module } from '@nestjs/common';

import { OrderManagementModule } from '../order-management/order-management.module';
import { TreeTrackingModule } from '../tree-tracking/tree-tracking.module';

import { BankingService } from './services/banking.service';
import { UsdtService } from './services/usdt.service';
import { WalletService } from './services/wallet.service';
import { ContractService } from './services/contract.service';
import { TreeGenerationRetryService } from './services/tree-generation-retry.service';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';
import { BankingWebhookController } from './webhooks/banking-webhook.controller';
import { BlockchainWebhookController } from './webhooks/blockchain-webhook.controller';

@Module({
    imports: [OrderManagementModule, TreeTrackingModule],
    controllers: [BankingWebhookController, BlockchainWebhookController],
    providers: [
        BankingService,
        UsdtService,
        WalletService,
        ContractService,
        TreeGenerationRetryService,
        IpWhitelistGuard,
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
