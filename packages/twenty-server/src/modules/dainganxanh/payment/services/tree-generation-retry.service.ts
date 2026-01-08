import { Injectable, Logger } from '@nestjs/common';

/**
 * Tree Generation Retry Service
 * 
 * Handles retrying failed tree code generation with exponential backoff.
 * Also tracks failed generations for manual recovery.
 */
@Injectable()
export class TreeGenerationRetryService {
    private readonly logger = new Logger(TreeGenerationRetryService.name);
    private readonly MAX_RETRIES = 3;
    private readonly BASE_DELAY_MS = 100;

    /**
     * Generate multiple tree codes with retry logic
     * Returns partial results if some generations fail
     */
    async generateTreeCodesWithRetry(
        generateFn: () => Promise<string>,
        quantity: number,
        orderId: string,
        correlationId: string,
    ): Promise<{
        generated: string[];
        failed: number;
        success: boolean;
    }> {
        const generated: string[] = [];
        let failed = 0;

        for (let i = 0; i < quantity; i++) {
            try {
                const treeCode = await this.retryWithBackoff(generateFn, i + 1, quantity);
                generated.push(treeCode);
                this.logger.log(
                    `[TREE_GEN:${correlationId}] Generated ${i + 1}/${quantity}: ${treeCode}`,
                );
            } catch (error) {
                failed++;
                this.logger.error(
                    `[TREE_GEN:${correlationId}] Failed to generate tree ${i + 1}/${quantity} for order ${orderId}: ${error.message}`,
                );

                // Log for monitoring/alerting
                this.logFailedGeneration(orderId, i + 1, quantity, correlationId, error.message);
            }
        }

        const success = failed === 0;

        if (!success) {
            this.logger.warn(
                `[TREE_GEN:${correlationId}] Partial success: ${generated.length}/${quantity} trees generated, ${failed} failed`,
            );
        }

        return { generated, failed, success };
    }

    /**
     * Retry a function with exponential backoff
     */
    private async retryWithBackoff(
        fn: () => Promise<string>,
        currentIndex: number,
        total: number,
    ): Promise<string> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    this.logger.warn(
                        `Tree generation attempt ${attempt}/${this.MAX_RETRIES} failed for ${currentIndex}/${total}, retrying in ${delay}ms...`,
                    );
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    /**
     * Log failed generation for monitoring/alerting
     * This creates structured logs that can trigger alerts
     */
    private logFailedGeneration(
        orderId: string,
        treeIndex: number,
        totalQuantity: number,
        correlationId: string,
        errorMessage: string,
    ): void {
        // Structured log for alerting systems
        this.logger.error({
            event: 'TREE_GENERATION_FAILED',
            orderId,
            treeIndex,
            totalQuantity,
            correlationId,
            errorMessage,
            alertLevel: 'P1', // High priority alert
            recoveryAction: 'MANUAL_TREE_GENERATION_REQUIRED',
        });
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
