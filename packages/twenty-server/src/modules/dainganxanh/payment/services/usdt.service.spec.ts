import { Test, TestingModule } from '@nestjs/testing';
import { UsdtService } from './usdt.service';
import { ethers } from 'ethers';
import { PAYMENT_CONSTANTS } from '../../shared/constants/payment.constants';

// Mock ethers
jest.mock('ethers', () => {
    return {
        ethers: {
            JsonRpcProvider: jest.fn(),
            id: jest.fn((str) => '0xMockTopic'),
            getAddress: jest.fn((addr) => addr),
        },
    };
});

describe('UsdtService', () => {
    let service: UsdtService;
    let mockProvider: any;

    const mockTxHash = '0x123456789';
    const mockCompanyWallet = '0xCompanyWallet';
    const mockUsdtContract = PAYMENT_CONSTANTS.USDT_BSC_CONTRACT;

    beforeEach(async () => {
        mockProvider = {
            getTransactionReceipt: jest.fn(),
        };
        (ethers.JsonRpcProvider as unknown as jest.Mock).mockReturnValue(mockProvider);

        // Mock process.env
        process.env.DGNX_USDT_WALLET = mockCompanyWallet;

        const module: TestingModule = await Test.createTestingModule({
            providers: [UsdtService],
        }).compile();

        service = module.get<UsdtService>(UsdtService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generatePaymentInfo', () => {
        it('should generate correct QR value for BSC', () => {
            const amountVnd = 250000;
            // 1 USDT = 25,000 VND -> 10 USDT

            const result = service.generatePaymentInfo(amountVnd);

            expect(result.amount).toBe(amountVnd);
            expect(result.usdtAmount).toBe(10);
            expect(result.network).toBe('BSC');
            expect(result.walletAddress).toBe(mockCompanyWallet);

            // Verify QR format: ethereum:CONTRACT@56/transfer?address=WALLET&uint256=AMOUNT_WEI
            // 10 USDT * 1e18 = 10000000000000000000
            const expectedWei = BigInt(10) * BigInt(1e18);
            const expectedQr = `ethereum:${mockUsdtContract}@56/transfer?address=${mockCompanyWallet}&uint256=${expectedWei.toString()}`;

            expect(result.qrValue).toBe(expectedQr);
        });
    });

    describe('verifyTransaction', () => {
        it('should verify valid transaction', async () => {
            const expectedAmount = 10; // 10 USDT
            const expectedWei = BigInt(expectedAmount) * BigInt(1e18);

            const mockLog = {
                address: mockUsdtContract, // Correct contract
                topics: [
                    '0xMockTopic', // Transfer signature
                    '0xSender',
                    '0x000000000000000000000000' + mockCompanyWallet.slice(2).toLowerCase(), // Recipient (padded)
                    // Amount in hex? Usually logs have data or topic. Assuming topic for simplicity or data.
                    // The service checks topic[3] || data.
                    '0x' + expectedWei.toString(16),
                ],
                data: '0x'
            };

            mockProvider.getTransactionReceipt.mockResolvedValue({
                status: 1,
                logs: [mockLog],
            });

            // Mock getAddress to return cleaned address
            (ethers.getAddress as jest.Mock).mockReturnValue(mockCompanyWallet);

            const result = await service.verifyTransaction(mockTxHash, expectedAmount);

            expect(result.verified).toBe(true);
            expect(result.actualAmount).toBe(expectedAmount);
        });

        it('should fail if transaction failed on chain', async () => {
            mockProvider.getTransactionReceipt.mockResolvedValue({
                status: 0, // Failed
            });

            const result = await service.verifyTransaction(mockTxHash, 10);
            expect(result.verified).toBe(false);
            expect(result.error).toBe('Transaction failed');
        });

        it('should fail if transaction is for wrong token', async () => {
            const mockLog = {
                address: '0xFakeToken',
                topics: ['0xMockTopic'],
            };
            mockProvider.getTransactionReceipt.mockResolvedValue({
                status: 1,
                logs: [mockLog],
            });

            const result = await service.verifyTransaction(mockTxHash, 10);
            expect(result.verified).toBe(false);
            expect(result.error).toBe('USDT transfer not found in transaction');
        });
    });
});
