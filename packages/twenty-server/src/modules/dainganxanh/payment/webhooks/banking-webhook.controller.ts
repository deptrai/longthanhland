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
    ): Promise<{ success: boolean; message: string }> {
        // AC #8: Audit logging
        this.logger.log(
            `[WEBHOOK] Received banking webhook: ${payload.transactionId}, amount: ${payload.amount}, bankCode: ${payload.bankCode}`,
        );

        try {
            // AC #2: Verify HMAC signature
            const secretKey = process.env.BANKING_WEBHOOK_SECRET;
            if (!secretKey) {
                this.logger.error('BANKING_WEBHOOK_SECRET not configured');
                // Throw directly without wrapping to help tests
                throw new Error('Webhook secret not configured');
            }

            const isValid = this.bankingService.verifyWebhookSignature(
                JSON.stringify(payload),
                signature || '',
                secretKey,
            );

            if (!isValid) {
                this.logger.warn(
                    `[WEBHOOK] Invalid signature for transaction ${payload.transactionId}`,
                );
                throw new UnauthorizedException('Invalid signature');
            }

            // AC #7: Idempotency check - Check if transaction already processed
            const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
            if (!workspaceId) {
                this.logger.error('DEFAULT_WORKSPACE_ID not configured');
                throw new Error('Workspace ID not configured');
            }

            const isProcessed = await this.orderService.isTransactionProcessed(
                workspaceId,
                payload.transactionId,
            );

            if (isProcessed) {
                this.logger.log(
                    `[WEBHOOK] Transaction ${payload.transactionId} already processed, ignoring duplicate`,
                );
                return { success: true, message: 'Transaction already processed' };
            }

            // AC #3: Extract order code from transfer content
            const orderCode =
                this.bankingService.extractOrderCodeFromContent(payload.content);

            if (!orderCode) {
                this.logger.warn(
                    `[WEBHOOK] Could not extract order code from content: ${payload.content}`,
                );
                throw new BadRequestException('Order code not found in content');
            }

            this.logger.log(
                `[WEBHOOK] Processing payment for order ${orderCode}, amount: ${payload.amount}`,
            );

            // Validate order exists
            const order = await this.orderService.findOrderByCode(
                workspaceId,
                orderCode,
            );

            if (!order) {
                this.logger.warn(`[WEBHOOK] Order ${orderCode} not found`);
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
                    `[WEBHOOK] Amount mismatch for order ${orderCode}: paid ${payload.amount}, expected ${order.totalAmount}`,
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
                `[WEBHOOK] Order ${orderCode} marked as VERIFIED, transactionId: ${payload.transactionId}`,
            );

            // AC #6: Trigger post-payment workflow
            await this.triggerPostPaymentWorkflow(workspaceId, updatedOrder);

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
     */
    private async triggerPostPaymentWorkflow(
        workspaceId: string,
        order: any,
    ): Promise<void> {
        try {
            // Generate N tree codes for order quantity
            this.logger.log(
                `[WORKFLOW] Generating ${order.quantity} tree codes for order ${order.orderCode}`,
            );

            const generatedCodes: string[] = [];
            for (let i = 0; i < order.quantity; i++) {
                const treeCode = await this.treeService.generateTreeCode(workspaceId);
                generatedCodes.push(treeCode);
                this.logger.log(
                    `[WORKFLOW] Generated tree code ${i + 1}/${order.quantity}: ${treeCode}`,
                );
            }

            // TODO: Store tree codes association with order
            // This will be handled in E3.2 or when creating Tree records

            // [PLACEHOLDER] Send confirmation email
            this.logger.log(
                `[WORKFLOW] TODO: Send confirmation email for order ${order.orderCode} with ${generatedCodes.length} tree codes`,
            );

            // [PLACEHOLDER] Generate PDF contract
            this.logger.log(
                `[WORKFLOW] TODO: Queue PDF contract generation for order ${order.orderCode}`,
            );

            this.logger.log(
                `[WORKFLOW] Post-payment workflow completed for order ${order.orderCode}`,
            );
        } catch (error) {
            // Log but don't fail webhook if post-payment workflow fails
            // These can be retried separately
            this.logger.error(
                `[WORKFLOW] Error in post-payment workflow for order ${order.orderCode}: ${error.message}`,
                error.stack,
            );
        }
    }
}
