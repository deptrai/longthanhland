import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainWebhookController, BlockchainWebhookDto } from './blockchain-webhook.controller';
import { UsdtService } from '../services/usdt.service';
import { OrderService } from '../../order-management/services/order.service';

describe('BlockchainWebhookController', () => {
    let controller: BlockchainWebhookController;
    let usdtService: UsdtService;
    let orderService: OrderService;

    const mockUsdtService = {
        verifyTransaction: jest.fn(),
    };

    const mockOrderService = {
        isTransactionProcessed: jest.fn(),
        findPendingByUsdtAmount: jest.fn(),
        markOrderAsPaid: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BlockchainWebhookController],
            providers: [
                { provide: UsdtService, useValue: mockUsdtService },
                { provide: OrderService, useValue: mockOrderService },
            ],
        }).compile();

        controller = module.get<BlockchainWebhookController>(BlockchainWebhookController);
        usdtService = module.get<UsdtService>(UsdtService);
        orderService = module.get<OrderService>(OrderService);

        jest.clearAllMocks();
    });

    const validPayload: BlockchainWebhookDto = {
        txHash: '0x123',
        fromAddress: '0xWallet',
        toAddress: '0xMe',
        amount: '10000000000000000000', // 10 USDT (18 decimals)
        tokenAddress: '0x55d398326f99059fF775485246999027B3197955'.toLowerCase(),
        network: 'bsc',
        blockNumber: 1,
        timestamp: 1234567890,
    };

    it('should return success if transaction already processed (idempotency)', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(true);

        const result = await controller.handleBlockchainWebhook(validPayload);
        expect(result).toEqual({ success: true, message: 'Already processed' });
        expect(mockOrderService.isTransactionProcessed).toHaveBeenCalledWith('default', '0x123');
    });

    it('should fail for unsupported network', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(false);
        const result = await controller.handleBlockchainWebhook({ ...validPayload, network: 'eth' });
        expect(result).toEqual({ success: false, message: 'Unsupported network' });
    });

    it('should fail for unsupported token', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(false);
        const result = await controller.handleBlockchainWebhook({ ...validPayload, tokenAddress: '0xOther' });
        expect(result).toEqual({ success: false, message: 'Unsupported token' });
    });

    it('should fail if no matching order found', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(false);
        mockOrderService.findPendingByUsdtAmount.mockResolvedValue(null);

        const result = await controller.handleBlockchainWebhook(validPayload);
        expect(result).toEqual({ success: false, message: 'No matching order' });
        expect(mockOrderService.findPendingByUsdtAmount).toHaveBeenCalledWith('default', 10);
    });

    it('should fail if transaction verification fails', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(false);
        const mockOrder = { orderCode: 'ORD-01' };
        mockOrderService.findPendingByUsdtAmount.mockResolvedValue(mockOrder);
        mockUsdtService.verifyTransaction.mockResolvedValue({ verified: false, error: 'Bad Tx' });

        const result = await controller.handleBlockchainWebhook(validPayload);
        expect(result).toEqual({ success: false, message: 'Bad Tx' });
    });

    it('should succeed and update order if verification passes', async () => {
        mockOrderService.isTransactionProcessed.mockResolvedValue(false);
        const mockOrder = { orderCode: 'ORD-01' };
        mockOrderService.findPendingByUsdtAmount.mockResolvedValue(mockOrder);
        mockUsdtService.verifyTransaction.mockResolvedValue({ verified: true });
        mockOrderService.markOrderAsPaid.mockResolvedValue({ ...mockOrder, paymentStatus: 'VERIFIED' });

        const result = await controller.handleBlockchainWebhook(validPayload);
        expect(result).toEqual({ success: true, message: 'Payment processed' });
        expect(mockOrderService.markOrderAsPaid).toHaveBeenCalledWith('default', 'ORD-01', expect.objectContaining({
            transactionHash: '0x123',
            amount: 10,
            paymentStatus: 'VERIFIED',
        }));
    });
});
