import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';

import { BankingService } from '../services/banking.service';
import { OrderService } from '../../order-management/services/order.service';
import { TreeService } from '../../tree-tracking/services/tree.service';
import { TreeGenerationRetryService } from '../services/tree-generation-retry.service';
import { IpWhitelistGuard } from '../guards/ip-whitelist.guard';
import { ContractService } from '../../payment/services/contract.service';

export interface BankingWebhookDto {
    transactionId: string;
    amount: number;
    content: string;
    bankCode: string;
    accountNumber: string;
    timestamp: string;
    signature: string;
}

/**
 * BankingWebhookController handles incoming payment notifications
 * from banking partners.
 * 
 * Story E3.1: Banking Webhook Integration
 * 
 * Security:
 * - HMAC SHA256 signature verification
 * - IP whitelist validation (configurable via ENABLE_IP_WHITELIST)
 * - Idempotency check by transactionId
 * - Audit logging with correlation ID
 * 
 * Flow:
 * 1. Verify signature
 * 2. Check idempotency (duplicate webhook)
 * 3. Extract order code from content
 * 4. Validate order exists and amount matches
 * 5. Update order payment status
 * 6. Trigger post-payment workflow (tree generation with retry)
 */
@UseGuards(IpWhitelistGuard)
@Controller('webhooks/banking')
export class BankingWebhookController {
    private readonly logger = new Logger(BankingWebhookController.name);

    constructor(
        private readonly bankingService: BankingService,
        private readonly orderService: OrderService,
        private readonly treeService: TreeService,
        private readonly retryService: TreeGenerationRetryService,
        private readonly contractService: ContractService,
    ) { }

    /**
     * Handle incoming bank transfer notification
     * POST /webhooks/banking
     * 
     * AC #1: Endpoint returns 200 OK
     * AC #2: Verify HMAC signature
     * AC #3: Extract orderCode from content
     * AC #4: Validate amount matches order
     * AC #5: Update order status
     * AC #6: Trigger post-payment workflow
     * AC #7: Idempotency check
     * AC #8: Audit logging
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleBankingWebhook(
        @Body() payload: BankingWebhookDto,
        @Headers('x-webhook-signature') signature: string,
        @Headers('x-request-id') requestId?: string,
    ): Promise<{ success: boolean; message: string }> {
        // Generate correlation ID for request tracking
        const correlationId = requestId || `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // AC #8: Audit logging with correlation ID
        this.logger.log(
            `[WEBHOOK:${correlationId}] Received banking webhook: txn=${payload.transactionId}, amount=${payload.amount}, bank=${payload.bankCode}`,
        );

        try {
            // VALIDATION: Check required payload fields
            if (!payload.transactionId || !payload.amount || !payload.content) {
                throw new BadRequestException('Missing required fields: transactionId, amount, or content');
            }

            // VALIDATION: Amount must be positive
            if (payload.amount <= 0) {
                throw new BadRequestException(`Invalid amount: ${payload.amount}. Must be positive.`);
            }

            // AC #2: Verify HMAC signature
            const secretKey = process.env.BANKING_WEBHOOK_SECRET;
            if (!secretKey) {
                this.logger.error(`[WEBHOOK:${correlationId}] BANKING_WEBHOOK_SECRET not configured`);
                throw new Error('Webhook secret not configured');
            }

            const isValid = this.bankingService.verifyWebhookSignature(
                JSON.stringify(payload),
                signature || '',
                secretKey,
            );

            if (!isValid) {
                this.logger.warn(
                    `[WEBHOOK:${correlationId}] Invalid signature for transaction ${payload.transactionId}`,
                );
                throw new UnauthorizedException('Invalid signature');
            }

            // AC #7: Idempotency check - Check if transaction already processed
            const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
            if (!workspaceId) {
                this.logger.error(`[WEBHOOK:${correlationId}] DEFAULT_WORKSPACE_ID not configured`);
                throw new Error('Workspace ID not configured');
            }

            const isProcessed = await this.orderService.isTransactionProcessed(
                workspaceId,
                payload.transactionId,
            );

            if (isProcessed) {
                this.logger.log(
                    `[WEBHOOK:${correlationId}] Transaction ${payload.transactionId} already processed, ignoring duplicate`,
                );
                return { success: true, message: 'Transaction already processed' };
            }

            // AC #3: Extract order code from transfer content
            const orderCode =
                this.bankingService.extractOrderCodeFromContent(payload.content);

            if (!orderCode) {
                this.logger.warn(
                    `[WEBHOOK:${correlationId}] Could not extract order code from content: "${payload.content}"`,
                );
                throw new BadRequestException(`Order code not found in content: "${payload.content}"`);
            }

            this.logger.log(
                `[WEBHOOK:${correlationId}] Processing payment for order ${orderCode}, txn=${payload.transactionId}`,
            );

            // Validate order exists
            const order = await this.orderService.findOrderByCode(
                workspaceId,
                orderCode,
            );

            if (!order) {
                this.logger.warn(`[WEBHOOK:${correlationId}] Order ${orderCode} not found`);
                throw new NotFoundException(`Order ${orderCode} not found`);
            }

            // AC #4: Validate amount matches (±1% tolerance)
            const isValidAmount = this.bankingService.validatePaymentAmount(
                payload.amount,
                order.totalAmount,
                1, // 1% tolerance
            );

            if (!isValidAmount) {
                this.logger.warn(
                    `[WEBHOOK:${correlationId}] Amount mismatch for order ${orderCode}: paid ${payload.amount}, expected ${order.totalAmount}`,
                );
                throw new BadRequestException(
                    `Amount mismatch: paid ${payload.amount}, expected ${order.totalAmount}`,
                );
            }

            // AC #5: Update order payment status to VERIFIED
            const updatedOrder = await this.orderService.markOrderAsPaid(
                workspaceId,
                orderCode,
                {
                    paymentStatus: 'VERIFIED',
                    transactionHash: payload.transactionId,
                    paidAt: new Date(payload.timestamp),
                    amount: payload.amount,
                    bankCode: payload.bankCode,
                },
            );

            this.logger.log(
                `[WEBHOOK:${correlationId}] Order ${orderCode} marked as VERIFIED, transactionId: ${payload.transactionId}`,
            );

            // AC #6: Trigger post-payment workflow
            await this.triggerPostPaymentWorkflow(workspaceId, updatedOrder, correlationId);

            return { success: true, message: 'Payment processed successfully' };
        } catch (error) {
            // AC #8: Log all errors for audit
            if (
                error instanceof UnauthorizedException ||
                error instanceof BadRequestException ||
                error instanceof NotFoundException
            ) {
                this.logger.warn(
                    `[WEBHOOK] Validation error: ${error.message}`,
                );
                throw error;
            }

            // Rethrow configuration errors directly for tests
            if (error.message?.includes('not configured')) {
                throw error;
            }

            this.logger.error(
                `[WEBHOOK] Error processing webhook: ${error.message}`,
                error.stack,
            );
            throw new Error('Internal error processing webhook');
        }
    }

    /**
     * AC #6: Post-payment workflow
     * - Generate tree codes for order quantity (with retry + monitoring)
     * - Send confirmation email (placeholder)
     * - Generate PDF contract (placeholder)
     * 
     * Uses TreeGenerationRetryService for:
     * - Exponential backoff retry (3 attempts)
     * - Structured logging for monitoring/alerting
     * - Partial success handling
     */
    private async triggerPostPaymentWorkflow(
        workspaceId: string,
        order: any,
        correlationId: string,
    ): Promise<void> {
        try {
            // Generate tree codes with retry support
            const result = await this.retryService.generateTreeCodesWithRetry(
                () => this.treeService.generateTreeCode(workspaceId),
                order.quantity,
                order.id,
                correlationId,
            );

            if (!result.success) {
                // Log alert-worthy event for monitoring
                this.logger.error({
                    event: 'POST_PAYMENT_PARTIAL_FAILURE',
                    orderId: order.id,
                    orderCode: order.orderCode,
                    generatedCount: result.generated.length,
                    failedCount: result.failed,
                    correlationId,
                    alertLevel: 'P1',
                });
            }

            // TODO: Store tree codes association with order
            // This will be handled when creating Tree records

            // [PLACEHOLDER] Send confirmation email
            this.logger.log(
                `[WORKFLOW:${correlationId}] TODO: Send confirmation email for order ${order.orderCode} with ${result.generated.length} tree codes`,
            );

            // Generate PDF contract using orchestration method
            try {
                this.logger.log(`[WORKFLOW:${correlationId}] Generating contract for Order ${order.orderCode}`);

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
                        paymentMethod: 'BANKING' as const,
                        paymentDate: new Date(),
                        contractDate: new Date(),
                    };

                    // Use orchestration method
                    const contractResult = await this.contractService.generateAndSendContract(contractData);

                    if (contractResult.success && contractResult.s3Url) {
                        await this.orderService.updateContractUrl(workspaceId, fullOrder.orderCode, contractResult.s3Url);
                        this.logger.log(`[WORKFLOW:${correlationId}] Contract generated: ${contractResult.s3Url}, email: ${contractResult.emailDelivery?.messageId || 'skipped'}`);
                    } else {
                        this.logger.warn(`[WORKFLOW:${correlationId}] Contract generation incomplete: ${contractResult.errors?.join(', ')}`);
                    }
                }
            } catch (contractError) {
                this.logger.error(`[WORKFLOW:${correlationId}] Failed to generate contract: ${contractError.message}`, contractError.stack);
            }

            this.logger.log(
                `[WORKFLOW:${correlationId}] Post-payment workflow completed for order ${order.orderCode} (${result.generated.length}/${order.quantity} trees)`,
            );
        } catch (error) {
            // Log but don't fail webhook if post-payment workflow fails
            this.logger.error({
                event: 'POST_PAYMENT_WORKFLOW_ERROR',
                orderId: order.id,
                orderCode: order.orderCode,
                correlationId,
                error: error.message,
                alertLevel: 'P0',
            });
        }
    }
}
