import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * WebhookSignatureGuard verifies HMAC signatures from blockchain webhook providers
 * Supports Alchemy, Moralis, and QuickNode webhook signature schemes
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
    private readonly logger = new Logger(WebhookSignatureGuard.name);
    private readonly webhookSecret: string;
    private readonly provider: 'alchemy' | 'moralis' | 'quicknode';

    constructor() {
        this.webhookSecret = process.env.BLOCKCHAIN_WEBHOOK_SECRET || '';
        this.provider = (process.env.BLOCKCHAIN_WEBHOOK_PROVIDER || 'alchemy') as 'alchemy' | 'moralis' | 'quicknode';

        if (!this.webhookSecret) {
            this.logger.warn('⚠️  BLOCKCHAIN_WEBHOOK_SECRET not set - signature verification DISABLED');
        }
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // If no secret configured, allow all requests (development mode)
        if (!this.webhookSecret) {
            this.logger.warn('Webhook signature verification SKIPPED - no secret configured');
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const signature = this.extractSignature(request);

        if (!signature) {
            this.logger.error('Missing webhook signature header');
            throw new UnauthorizedException('Missing webhook signature');
        }

        const isValid = this.verifySignature(request, signature);

        if (!isValid) {
            this.logger.error('Invalid webhook signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        this.logger.log('✅ Webhook signature verified');
        return true;
    }

    private extractSignature(request: Request): string | undefined {
        // Alchemy uses X-Alchemy-Signature
        // Moralis uses X-Moralis-Signature
        // QuickNode uses X-QN-Signature
        const alchemySignature = request.headers['x-alchemy-signature'] as string;
        const moralisSignature = request.headers['x-moralis-signature'] as string;
        const quicknodeSignature = request.headers['x-qn-signature'] as string;

        return alchemySignature || moralisSignature || quicknodeSignature;
    }

    private verifySignature(request: Request, providedSignature: string): boolean {
        try {
            // Get raw body (must be preserved by NestJS)
            const rawBody = (request as any).rawBody || JSON.stringify(request.body);

            // Compute HMAC-SHA256
            const hmac = crypto.createHmac('sha256', this.webhookSecret);
            hmac.update(rawBody);
            const computedSignature = hmac.digest('hex');

            // Alchemy prefixes with '0x', Moralis doesn't
            const normalizedProvided = providedSignature.toLowerCase().replace('0x', '');
            const normalizedComputed = computedSignature.toLowerCase();

            // Constant-time comparison to prevent timing attacks
            return crypto.timingSafeEqual(
                Buffer.from(normalizedProvided, 'hex'),
                Buffer.from(normalizedComputed, 'hex')
            );
        } catch (error) {
            this.logger.error(`Signature verification error: ${error.message}`);
            return false;
        }
    }
}
