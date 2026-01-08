import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { UsdtService } from '../services/usdt.service';

export interface BlockchainWebhookDto {
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    tokenAddress: string;
    network: string;
    blockNumber: number;
    timestamp: number;
}

/**
 * BlockchainWebhookController handles USDT payment confirmations
 * from blockchain monitoring services (e.g., Alchemy, Moralis).
 */
@Controller('webhooks/blockchain')
export class BlockchainWebhookController {
    private readonly logger = new Logger(BlockchainWebhookController.name);

    constructor(private readonly usdtService: UsdtService) { }

    /**
     * Handle incoming blockchain transaction notification
     * POST /webhooks/blockchain
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleBlockchainWebhook(
        @Body() payload: BlockchainWebhookDto,
    ): Promise<{ success: boolean; message: string }> {
        this.logger.log(`Received blockchain webhook: ${payload.txHash}`);

        try {
            // 1. Validate this is a Polygon USDT transaction
            if (payload.network !== 'polygon' && payload.network !== 'matic') {
                this.logger.warn(`Ignoring non-Polygon transaction: ${payload.network}`);
                return { success: false, message: 'Unsupported network' };
            }

            const usdtContractAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'.toLowerCase();
            if (payload.tokenAddress.toLowerCase() !== usdtContractAddress) {
                this.logger.warn(`Ignoring non-USDT token: ${payload.tokenAddress}`);
                return { success: false, message: 'Unsupported token' };
            }

            // 2. Parse amount (USDT has 6 decimals)
            const usdtAmount = parseFloat(payload.amount) / 1e6;
            this.logger.log(`USDT payment received: ${usdtAmount} USDT from ${payload.fromAddress}`);

            // 3. TODO: Find pending order by sender wallet address or amount
            // const pendingOrder = await this.orderService.findPendingByWallet(payload.fromAddress);
            // if (!pendingOrder) {
            //   // Try to match by exact amount
            //   const orderByAmount = await this.orderService.findPendingByUsdtAmount(usdtAmount);
            //   if (!orderByAmount) {
            //     this.logger.warn(`No matching order found for ${usdtAmount} USDT`);
            //     return { success: false, message: 'No matching order' };
            //   }
            // }

            // 4. Verify transaction on-chain
            const verification = await this.usdtService.verifyTransaction(
                payload.txHash,
                usdtAmount,
            );

            if (!verification.verified) {
                this.logger.warn(`Transaction verification failed: ${verification.error}`);
                return { success: false, message: verification.error || 'Verification failed' };
            }

            this.logger.log(`Transaction verified: ${payload.txHash}`);

            // 5. TODO: Update order status
            // await this.orderService.markAsPaid(order.code, {
            //   transactionId: payload.txHash,
            //   amount: usdtAmount,
            //   paymentMethod: 'USDT',
            //   walletAddress: payload.fromAddress,
            //   paidAt: new Date(payload.timestamp * 1000),
            // });

            // 6. TODO: Trigger post-payment workflow
            // - Generate trees
            // - Send confirmation email
            // - Generate contract PDF

            return { success: true, message: 'Payment processed' };
        } catch (error) {
            this.logger.error(`Error processing webhook: ${error.message}`, error.stack);
            return { success: false, message: 'Internal error' };
        }
    }

    /**
     * Health check endpoint for blockchain monitoring service
     * GET /webhooks/blockchain/health
     */
    async healthCheck(): Promise<{ status: string }> {
        return { status: 'ok' };
    }
}
