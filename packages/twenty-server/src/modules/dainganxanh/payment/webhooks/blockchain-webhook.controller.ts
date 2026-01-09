import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { UsdtService } from '../services/usdt.service';
import { OrderService } from '../../order-management/services/order.service';

import { ContractService } from '../../payment/services/contract.service';

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
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleBlockchainWebhook(
        @Body() payload: BlockchainWebhookDto,
    ): Promise<{ success: boolean; message: string }> {
        this.logger.log(`Received blockchain webhook: ${payload.txHash}`);

        try {
            // 0. Idempotency Check
            const isProcessed = await this.orderService.isTransactionProcessed(
                'default', // TODO: Resolve workspaceId dynamically if multi-tenant
                payload.txHash,
            );
            if (isProcessed) {
                this.logger.log(`Transaction ${payload.txHash} already processed.`);
                return { success: true, message: 'Already processed' };
            }

            // 1. Validate this is a BSC USDT transaction
            if (payload.network !== 'bsc' && payload.network !== 'binance') {
                this.logger.warn(`Ignoring non-BSC transaction: ${payload.network}`);
                return { success: false, message: 'Unsupported network' };
            }

            const usdtContractAddress = '0x55d398326f99059fF775485246999027B3197955'.toLowerCase();
            if (payload.tokenAddress.toLowerCase() !== usdtContractAddress) {
                this.logger.warn(`Ignoring non-USDT token: ${payload.tokenAddress}`);
                return { success: false, message: 'Unsupported token' };
            }

            // 2. Parse amount (USDT on BSC has 18 decimals)
            const usdtAmount = parseFloat(payload.amount) / 1e18;
            this.logger.log(`USDT payment received: ${usdtAmount} USDT from ${payload.fromAddress}`);

            // 3. Find pending order
            // Try match by amount logic
            const order = await this.orderService.findPendingByUsdtAmount(
                'default',
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
                'default',
                order.orderCode,
                {
                    transactionHash: payload.txHash,
                    processStatus: 'COMPLETED',
                    paymentStatus: 'VERIFIED',
                    paidAt: new Date(payload.timestamp * 1000),
                    amount: usdtAmount,
                } as any, // Cast to any or verify UpdateOrderPaymentDto
            );

            this.logger.log(`Order ${order.orderCode} updated to PAID`);

            // 6. Generate and Send Contract
            try {
                this.logger.log(`Generating contract for Order ${order.orderCode}`);

                const fullOrder = await this.orderService.getOrderDetailsForContract('default', order.id);

                if (fullOrder && fullOrder.buyer) {
                    const contractData = {
                        orderCode: fullOrder.orderCode,
                        customerName: fullOrder.buyer.name?.first ? `${fullOrder.buyer.name.first} ${fullOrder.buyer.name.last}` : 'Khách hàng',
                        customerId: fullOrder.buyer.id,
                        customerEmail: fullOrder.buyer.email,
                        treeCount: fullOrder.trees?.length || fullOrder.quantity,
                        totalAmount: fullOrder.totalAmount,
                        treeCodes: fullOrder.trees?.map(t => t.code) || [],
                        lotName: fullOrder.trees?.[0]?.lotName || 'Khu A', // Placeholder if not in tree obj
                        paymentMethod: 'USDT' as const,
                        paymentDate: new Date(payload.timestamp * 1000),
                        contractDate: new Date(),
                    };

                    // Generate HTML -> PDF
                    const html = this.contractService.generateContractHtml(contractData);
                    const pdfBuffer = await this.contractService.generatePdf(html);
                    const filename = this.contractService.generateFilename(fullOrder.orderCode);

                    // Upload S3
                    const pdfUrl = await this.contractService.uploadToS3(filename, pdfBuffer);

                    // Update Order
                    await this.orderService.updateContractUrl('default', fullOrder.orderCode, pdfUrl);

                    // Send Email
                    await this.contractService.sendContractEmail(
                        fullOrder.buyer.email,
                        contractData.customerName,
                        pdfBuffer,
                        filename
                    );

                    this.logger.log(`Contract generated and sent for Order ${order.orderCode}`);
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
    async healthCheck(): Promise<{ status: string }> {
        return { status: 'ok' };
    }
}
