import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import * as crypto from 'crypto';

describe('WebhookSignatureGuard', () => {
    let guard: WebhookSignatureGuard;
    const testSecret = 'test-webhook-secret-123';

    beforeEach(async () => {
        // Set environment variables for testing
        process.env.BLOCKCHAIN_WEBHOOK_SECRET = testSecret;
        process.env.BLOCKCHAIN_WEBHOOK_PROVIDER = 'alchemy';

        const module: TestingModule = await Test.createTestingModule({
            providers: [WebhookSignatureGuard],
        }).compile();

        guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    });

    afterEach(() => {
        delete process.env.BLOCKCHAIN_WEBHOOK_SECRET;
        delete process.env.BLOCKCHAIN_WEBHOOK_PROVIDER;
    });

    const createMockContext = (headers: any, body: any): ExecutionContext => {
        const request = {
            headers,
            body,
            rawBody: JSON.stringify(body),
        };

        return {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        } as ExecutionContext;
    };

    const generateValidSignature = (body: any): string => {
        const rawBody = JSON.stringify(body);
        const hmac = crypto.createHmac('sha256', testSecret);
        hmac.update(rawBody);
        return '0x' + hmac.digest('hex'); // Alchemy format with 0x prefix
    };

    describe('Signature Verification', () => {
        it('should allow request with valid Alchemy signature', async () => {
            const body = { txHash: '0x123', amount: '1000' };
            const signature = generateValidSignature(body);

            const context = createMockContext(
                { 'x-alchemy-signature': signature },
                body
            );

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
        });

        it('should allow request with valid Moralis signature', async () => {
            const body = { txHash: '0x456', amount: '2000' };
            const signature = generateValidSignature(body).replace('0x', ''); // Moralis without 0x

            const context = createMockContext(
                { 'x-moralis-signature': signature },
                body
            );

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
        });

        it('should reject request with invalid signature', async () => {
            const body = { txHash: '0x789', amount: '3000' };
            const invalidSignature = '0x' + 'a'.repeat(64); // Wrong signature

            const context = createMockContext(
                { 'x-alchemy-signature': invalidSignature },
                body
            );

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject request with missing signature', async () => {
            const body = { txHash: '0xabc', amount: '4000' };

            const context = createMockContext({}, body); // No signature header

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject request with tampered body', async () => {
            const originalBody = { txHash: '0xdef', amount: '5000' };
            const signature = generateValidSignature(originalBody);

            // Tamper the body after signature generation
            const tamperedBody = { txHash: '0xdef', amount: '9999' };

            const context = createMockContext(
                { 'x-alchemy-signature': signature },
                tamperedBody
            );

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('Development Mode', () => {
        it('should allow all requests when no secret is configured', async () => {
            // Create guard without secret
            delete process.env.BLOCKCHAIN_WEBHOOK_SECRET;
            const devGuard = new WebhookSignatureGuard();

            const body = { txHash: '0x999' };
            const context = createMockContext({}, body); // No signature

            const result = await devGuard.canActivate(context);
            expect(result).toBe(true);
        });
    });

    describe('Provider Support', () => {
        it('should handle Alchemy signature format (with 0x prefix)', async () => {
            const body = { test: 'alchemy' };
            const signature = generateValidSignature(body); // Has 0x prefix

            const context = createMockContext(
                { 'x-alchemy-signature': signature },
                body
            );

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
        });

        it('should handle Moralis signature format (without 0x prefix)', async () => {
            const body = { test: 'moralis' };
            const signature = generateValidSignature(body).replace('0x', '');

            const context = createMockContext(
                { 'x-moralis-signature': signature },
                body
            );

            const result = await guard.canActivate(context);
            expect(result).toBe(true);
        });
    });
});
