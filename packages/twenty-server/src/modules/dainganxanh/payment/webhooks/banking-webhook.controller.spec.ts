import { Test, type TestingModule } from '@nestjs/testing';
import {
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';

import { BankingWebhookController, type BankingWebhookDto } from './banking-webhook.controller';
import { BankingService } from '../services/banking.service';
import { OrderService, type OrderEntity } from '../../order-management/services/order.service';
import { TreeService } from '../../tree-tracking/services/tree.service';
import { TreeGenerationRetryService } from '../services/tree-generation-retry.service';

describe('BankingWebhookController', () => {
    let controller: BankingWebhookController;
    let bankingService: jest.Mocked<BankingService>;
    let orderService: jest.Mocked<OrderService>;
    let treeService: jest.Mocked<TreeService>;

    beforeEach(async () => {
        const mockBankingService = {
            verifyWebhookSignature: jest.fn(),
            extractOrderCodeFromContent: jest.fn(),
            validatePaymentAmount: jest.fn(),
        };

        const mockOrderService = {
            isTransactionProcessed: jest.fn(),
            findOrderByCode: jest.fn(),
            markOrderAsPaid: jest.fn(),
        };

        const mockTreeService = {
            generateTreeCode: jest.fn(),
        };

        const mockRetryService = {
            generateTreeCodesWithRetry: jest.fn().mockImplementation(
                async (fn: () => Promise<string>, quantity: number) => {
                    const generated = [];
                    for (let i = 0; i < quantity; i++) {
                        generated.push(await fn());
                    }
                    return { generated, failed: 0, success: true };
                }
            ),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BankingWebhookController],
            providers: [
                { provide: BankingService, useValue: mockBankingService },
                { provide: OrderService, useValue: mockOrderService },
                { provide: TreeService, useValue: mockTreeService },
                { provide: TreeGenerationRetryService, useValue: mockRetryService },
            ],
        }).compile();

        controller = module.get<BankingWebhookController>(
            BankingWebhookController,
        );
        bankingService = module.get(BankingService);
        orderService = module.get(OrderService);
        treeService = module.get(TreeService);

        // Set required env vars
        process.env.BANKING_WEBHOOK_SECRET = 'test-secret';
        process.env.DEFAULT_WORKSPACE_ID = 'test-workspace';
    });

    afterEach(() => {
        delete process.env.BANKING_WEBHOOK_SECRET;
        delete process.env.DEFAULT_WORKSPACE_ID;
    });

    describe('handleBankingWebhook', () => {
        const validPayload: BankingWebhookDto = {
            transactionId: 'TXN123456',
            amount: 260000,
            content: 'Thanh toan DGX-20260109-ABC12',
            bankCode: 'VCB',
            accountNumber: '1234567890',
            timestamp: '2026-01-09T06:00:00Z',
            signature: 'valid-signature',
        };

        const validSignature = 'valid-hmac-signature';

        it('should process valid webhook successfully', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                status: 'PENDING',
                paymentStatus: 'PENDING',
                totalAmount: 260000,
                quantity: 1,
            };

            const updatedOrder: Partial<OrderEntity> = {
                ...mockOrder,
                status: 'PAID',
                paymentStatus: 'VERIFIED',
            };

            // Setup mocks
            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(false);
            bankingService.extractOrderCodeFromContent.mockReturnValue(
                'DGX-20260109-ABC12',
            );
            orderService.findOrderByCode.mockResolvedValue(mockOrder as OrderEntity);
            bankingService.validatePaymentAmount.mockReturnValue(true);
            orderService.markOrderAsPaid.mockResolvedValue(
                updatedOrder as OrderEntity,
            );
            treeService.generateTreeCode.mockResolvedValue('TREE-2026-00001');

            const result = await controller.handleBankingWebhook(
                validPayload,
                validSignature,
            );

            expect(result.success).toBe(true);
            expect(result.message).toBe('Payment processed successfully');

            // Verify all steps were called
            expect(bankingService.verifyWebhookSignature).toHaveBeenCalled();
            expect(orderService.isTransactionProcessed).toHaveBeenCalledWith(
                'test-workspace',
                'TXN123456',
            );
            expect(orderService.findOrderByCode).toHaveBeenCalledWith(
                'test-workspace',
                'DGX-20260109-ABC12',
            );
            expect(orderService.markOrderAsPaid).toHaveBeenCalled();
            expect(treeService.generateTreeCode).toHaveBeenCalledTimes(1);
        });

        it('should reject invalid signature', async () => {
            bankingService.verifyWebhookSignature.mockReturnValue(false);

            await expect(
                controller.handleBankingWebhook(validPayload, 'invalid-signature'),
            ).rejects.toThrow(UnauthorizedException);

            expect(orderService.isTransactionProcessed).not.toHaveBeenCalled();
        });

        it('should handle duplicate transactions (idempotency)', async () => {
            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(true);

            const result = await controller.handleBankingWebhook(
                validPayload,
                validSignature,
            );

            expect(result.success).toBe(true);
            expect(result.message).toBe('Transaction already processed');
            expect(orderService.findOrderByCode).not.toHaveBeenCalled();
        });

        it('should reject when order code not found in content', async () => {
            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(false);
            bankingService.extractOrderCodeFromContent.mockReturnValue(null);

            await expect(
                controller.handleBankingWebhook(validPayload, validSignature),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reject when order not found', async () => {
            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(false);
            bankingService.extractOrderCodeFromContent.mockReturnValue(
                'DGX-20260109-ABC12',
            );
            orderService.findOrderByCode.mockResolvedValue(null);

            await expect(
                controller.handleBankingWebhook(validPayload, validSignature),
            ).rejects.toThrow(NotFoundException);
        });

        it('should reject when amount mismatch', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                totalAmount: 520000, // Expecting 2 trees
            };

            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(false);
            bankingService.extractOrderCodeFromContent.mockReturnValue(
                'DGX-20260109-ABC12',
            );
            orderService.findOrderByCode.mockResolvedValue(mockOrder as OrderEntity);
            bankingService.validatePaymentAmount.mockReturnValue(false);

            await expect(
                controller.handleBankingWebhook(validPayload, validSignature),
            ).rejects.toThrow(BadRequestException);
        });

        it('should generate multiple tree codes for quantity > 1', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                status: 'PENDING',
                paymentStatus: 'PENDING',
                totalAmount: 780000, // 3 trees
                quantity: 3,
            };

            const updatedOrder: Partial<OrderEntity> = {
                ...mockOrder,
                status: 'PAID',
                paymentStatus: 'VERIFIED',
            };

            const payloadFor3Trees = {
                ...validPayload,
                amount: 780000,
            };

            bankingService.verifyWebhookSignature.mockReturnValue(true);
            orderService.isTransactionProcessed.mockResolvedValue(false);
            bankingService.extractOrderCodeFromContent.mockReturnValue(
                'DGX-20260109-ABC12',
            );
            orderService.findOrderByCode.mockResolvedValue(mockOrder as OrderEntity);
            bankingService.validatePaymentAmount.mockReturnValue(true);
            orderService.markOrderAsPaid.mockResolvedValue(
                updatedOrder as OrderEntity,
            );
            treeService.generateTreeCode
                .mockResolvedValueOnce('TREE-2026-00001')
                .mockResolvedValueOnce('TREE-2026-00002')
                .mockResolvedValueOnce('TREE-2026-00003');

            const result = await controller.handleBankingWebhook(
                payloadFor3Trees,
                validSignature,
            );

            expect(result.success).toBe(true);
            expect(treeService.generateTreeCode).toHaveBeenCalledTimes(3);
        });

        it('should handle missing webhook secret gracefully', async () => {
            delete process.env.BANKING_WEBHOOK_SECRET;

            await expect(
                controller.handleBankingWebhook(validPayload, validSignature),
            ).rejects.toThrow('Webhook secret not configured');
        });

        it('should handle missing workspace ID gracefully', async () => {
            delete process.env.DEFAULT_WORKSPACE_ID;
            bankingService.verifyWebhookSignature.mockReturnValue(true);

            await expect(
                controller.handleBankingWebhook(validPayload, validSignature),
            ).rejects.toThrow('Workspace ID not configured');
        });
    });
});
