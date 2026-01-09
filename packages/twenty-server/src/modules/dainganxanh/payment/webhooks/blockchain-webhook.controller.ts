import { Controller, Post, Get, Body, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsdtService } from '../services/usdt.service';
import { OrderService } from '../../order-management/services/order.service';

import { ContractService } from '../../payment/services/contract.service';
import { WebhookSignatureGuard } from '../guards/webhook-signature.guard';

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

    constructor(
        private readonly usdtService: UsdtService,
        private readonly orderService: OrderService,
        private readonly contractService: ContractService,
    ) { }

    /**
     * Handle incoming blockchain transaction notification
     * POST /webhooks/blockchain
     * 
     * Rate limit: 60 requests/minute per IP
     * Requires valid HMAC signature from webhook provider
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
    @UseGuards(WebhookSignatureGuard)
    async handleBlockchainWebhook(
        @Body() payload: BlockchainWebhookDto,
    ): Promise<{ success: boolean; message: string }> {
        this.logger.log(`Received blockchain webhook: ${payload.txHash}`);

        try {
            // Get workspace ID from environment
            const workspaceId = process.env.DEFAULT_WORKSPACE_ID || '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

            // 0. Idempotency Check
            const isProcessed = await this.orderService.isTransactionProcessed(
                workspaceId,
                payload.txHash,
            );
            if (isProcessed) {
                this.logger.log(`Transaction ${payload.txHash} already processed.`);
                return { success: true, message: 'Already processed' };
            }

            // 1. Validate this is a supported USDT transaction (BSC or Polygon)
            const supportedNetworks = ['bsc', 'binance', 'polygon', 'matic'];
            if (!supportedNetworks.includes(payload.network.toLowerCase())) {
                this.logger.warn(`Ignoring unsupported network: ${payload.network}`);
                return { success: false, message: 'Unsupported network' };
            }

            // USDT contract addresses by network
            const usdtContracts: Record<string, string> = {
                bsc: '0x55d398326f99059ff775485246999027b3197955',
                binance: '0x55d398326f99059ff775485246999027b3197955',
                polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT on Polygon
                matic: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
            };
            const expectedUsdtAddress = usdtContracts[payload.network.toLowerCase()];
            if (payload.tokenAddress.toLowerCase() !== expectedUsdtAddress) {
                this.logger.warn(`Ignoring non-USDT token: ${payload.tokenAddress}`);
                return { success: false, message: 'Unsupported token' };
            }

            // USDT decimals: 18 on BSC, 6 on Polygon
            const decimals = payload.network.toLowerCase().includes('polygon') || payload.network.toLowerCase() === 'matic' ? 6 : 18;
            const usdtAmount = parseFloat(payload.amount) / Math.pow(10, decimals);
            this.logger.log(`USDT payment received: ${usdtAmount} USDT from ${payload.fromAddress}`);

            // 3. Find pending order
            // Try match by amount logic
            const order = await this.orderService.findPendingByUsdtAmount(
                workspaceId,
                usdtAmount,
            );

            if (!order) {
                this.logger.warn(`No pending order found for ${usdtAmount} USDT`);
                return { success: false, message: 'No matching order' };
            }

            // 4. Verify transaction on-chain
            const verification = await this.usdtService.verifyTransaction(
                payload.txHash,
                usdtAmount,
            );

            if (!verification.verified) {
                this.logger.warn(`Transaction verification failed: ${verification.error}`);
                return { success: false, message: verification.error || 'Verification failed' };
            }

            this.logger.log(`Transaction verified: ${payload.txHash} for Order ${order.orderCode}`);

            // 5. Update order status
            await this.orderService.markOrderAsPaid(
                workspaceId,
                order.orderCode,
                {
                    transactionHash: payload.txHash,
                    paymentStatus: 'VERIFIED',
                    paidAt: new Date(payload.timestamp * 1000),
                    amount: usdtAmount,
                },
            );

            this.logger.log(`Order ${order.orderCode} updated to PAID`);

            // 6. Generate and Send Contract using orchestration method
            try {
                this.logger.log(`Generating contract for Order ${order.orderCode}`);

                const fullOrder = await this.orderService.getOrderDetailsForContract(workspaceId, order.id);

                if (fullOrder && fullOrder.buyer) {
                    const contractData = {
                        orderCode: fullOrder.orderCode,
                        customerName: fullOrder.buyer.name?.first ? `${fullOrder.buyer.name.first} ${fullOrder.buyer.name.last}` : 'Khách hàng',
                        customerId: fullOrder.buyer.id,
                        customerEmail: fullOrder.buyer.email,
                        treeCount: fullOrder.trees?.length || fullOrder.quantity,
                        totalAmount: fullOrder.totalAmount,
                        treeCodes: fullOrder.trees?.map((t: any) => t.code) || [],
                        lotName: fullOrder.trees?.[0]?.lotName || 'Khu A',
                        paymentMethod: 'USDT' as const,
                        paymentDate: new Date(payload.timestamp * 1000),
                        contractDate: new Date(),
                    };

                    // Use orchestration method for cleaner code
                    const result = await this.contractService.generateAndSendContract(contractData);

                    if (result.success && result.s3Url) {
                        await this.orderService.updateContractUrl(workspaceId, fullOrder.orderCode, result.s3Url);
                        this.logger.log(`Contract generated for Order ${order.orderCode}: ${result.s3Url}, email: ${result.emailDelivery?.messageId || 'skipped'}`);
                    } else {
                        this.logger.warn(`Contract generation incomplete for Order ${order.orderCode}: ${result.errors?.join(', ')}`);
                    }
                } else {
                    this.logger.warn(`Could not fetch full details for Order ${order.orderCode} to generate contract`);
                }

            } catch (contractError) {
                // Non-blocking error
                this.logger.error(`Failed to generate/send contract: ${contractError.message}`, contractError.stack);
            }

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
    @Get('health')
    async healthCheck(): Promise<{ status: string; service: string }> {
        return { status: 'ok', service: 'blockchain-webhook' };
    }
}
