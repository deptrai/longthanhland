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
} from '@nestjs/common';

import { BankingService } from '../services/banking.service';
import { OrderService } from '../../order-management/services/order.service';
import { TreeService } from '../../tree-tracking/services/tree.service';

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
 * - IP whitelist validation (via middleware) - DEFERRED
 * - Idempotency check by transactionId
 * - Audit logging
 * 
 * Flow:
 * 1. Verify signature
 * 2. Check idempotency (duplicate webhook)
 * 3. Extract order code from content
 * 4. Validate order exists and amount matches
 * 5. Update order payment status
 * 6. Trigger post-payment workflow (tree generation, email, PDF)
 */
@Controller('webhooks/banking')
export class BankingWebhookController {
    private readonly logger = new Logger(BankingWebhookController.name);

    constructor(
        private readonly bankingService: BankingService,
        private readonly orderService: OrderService,
        private readonly treeService: TreeService,
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
     * - Generate tree codes for order quantity
     * - Send confirmation email (placeholder)
     * - Generate PDF contract (placeholder)
     * 
     * NOTE: This is NOT atomic with order update. If tree generation fails,
     * order is already marked PAID. Recovery: Manual tree generation or retry mechanism.
     */
    private async triggerPostPaymentWorkflow(
        workspaceId: string,
        order: any,
        correlationId: string,
    ): Promise<void> {
        try {
            // Generate N tree codes for order quantity
            this.logger.log(
                `[WORKFLOW:${correlationId}] Generating ${order.quantity} tree codes for order ${order.orderCode}`,
            );

            const generatedCodes: string[] = [];
            for (let i = 0; i < order.quantity; i++) {
                const treeCode = await this.treeService.generateTreeCode(workspaceId);
                generatedCodes.push(treeCode);
                this.logger.log(
                    `[WORKFLOW:${correlationId}] Generated tree code ${i + 1}/${order.quantity}: ${treeCode}`,
                );
            }

            // TODO: Store tree codes association with order
            // This will be handled in E3.2 or when creating Tree records

            // [PLACEHOLDER] Send confirmation email
            this.logger.log(
                `[WORKFLOW:${correlationId}] TODO: Send confirmation email for order ${order.orderCode} with ${generatedCodes.length} tree codes`,
            );

            // [PLACEHOLDER] Generate PDF contract
            this.logger.log(
                `[WORKFLOW:${correlationId}] TODO: Queue PDF contract generation for order ${order.orderCode}`,
            );

            this.logger.log(
                `[WORKFLOW:${correlationId}] Post-payment workflow completed for order ${order.orderCode}`,
            );
        } catch (error) {
            // Log but don't fail webhook if post-payment workflow fails
            // These can be retried separately or recovered manually
            this.logger.error(
                `[WORKFLOW:${correlationId}] Error in post-payment workflow for order ${order.orderCode}: ${error.message}`,
                error.stack,
            );
        }
    }
}
