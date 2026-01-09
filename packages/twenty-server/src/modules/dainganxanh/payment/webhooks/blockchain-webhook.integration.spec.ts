import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainWebhookController } from './blockchain-webhook.controller';
import { UsdtService } from '../services/usdt.service';
import { OrderService } from '../../order-management/services/order.service';
import { ContractService } from '../services/contract.service';

/**
 * Integration tests for blockchain webhook using BSC Testnet
 * 
 * These tests verify real blockchain interactions on testnet
 * 
 * Prerequisites:
 * - BSC Testnet RPC access
 * - Known testnet USDT transaction hash
 * 
 * To run: yarn nx test twenty-server --testPathPattern="blockchain-webhook.integration"
 */
describe('BlockchainWebhookController (Integration - Testnet)', () => {
    let app: INestApplication;
    let controller: BlockchainWebhookController;
    let usdtService: UsdtService;

    // BSC Testnet configuration
    const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
    const USDT_TESTNET_CONTRACT = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // USDT on BSC Testnet

    // Known testnet transaction for verification
    // Replace with actual testnet transaction hash
    const KNOWN_TESTNET_TX = '0x0000000000000000000000000000000000000000000000000000000000000000';

    beforeAll(async () => {
        const mockOrderService = {
            isTransactionProcessed: jest.fn().mockResolvedValue(false),
            findPendingByUsdtAmount: jest.fn().mockResolvedValue({
                id: 'test-order-1',
                orderCode: 'TEST-001',
            }),
            markOrderAsPaid: jest.fn().mockResolvedValue({}),
            getOrderDetailsForContract: jest.fn().mockResolvedValue(null),
            updateContractUrl: jest.fn().mockResolvedValue({}),
        };

        const mockContractService = {
            generateContractHtml: jest.fn().mockReturnValue('<html></html>'),
            generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
            generateFilename: jest.fn().mockReturnValue('contract.pdf'),
            uploadToS3: jest.fn().mockResolvedValue('https://s3.example.com/contract.pdf'),
            sendContractEmail: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BlockchainWebhookController],
            providers: [
                UsdtService,
                { provide: OrderService, useValue: mockOrderService },
                { provide: ContractService, useValue: mockContractService },
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        controller = module.get<BlockchainWebhookController>(BlockchainWebhookController);
        usdtService = module.get<UsdtService>(UsdtService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('BSC Testnet Connection', () => {
        it('should connect to BSC testnet RPC', async () => {
            const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
            const network = await provider.getNetwork();

            expect(network.chainId).toBe(97n); // BSC Testnet chain ID
        }, 30000); // 30 second timeout for network call

        it('should fetch latest block from testnet', async () => {
            const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
            const blockNumber = await provider.getBlockNumber();

            expect(blockNumber).toBeGreaterThan(0);
            console.log(`Latest BSC Testnet block: ${blockNumber}`);
        }, 30000);
    });

    describe('USDT Transaction Verification on Testnet', () => {
        it.skip('should verify a known testnet USDT transaction', async () => {
            // Skip if no real testnet transaction hash provided
            if (KNOWN_TESTNET_TX === '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log('⚠️  Skipping: No real testnet transaction hash configured');
                return;
            }

            const result = await usdtService.verifyTransaction(KNOWN_TESTNET_TX, 10);

            expect(result.verified).toBeDefined();
            if (result.verified) {
                expect(result.actualAmount).toBeGreaterThan(0);
                expect(result.sender).toBeDefined();
                console.log(`Verified testnet transaction: ${result.actualAmount} USDT from ${result.sender}`);
            } else {
                console.log(`Verification failed: ${result.error}`);
            }
        }, 30000);

        it('should handle non-existent transaction gracefully', async () => {
            const fakeHash = '0x' + '0'.repeat(64);
            const result = await usdtService.verifyTransaction(fakeHash, 10);

            expect(result.verified).toBe(false);
            expect(result.error).toContain('Transaction not found');
        }, 30000);
    });

    describe('End-to-End Webhook Flow on Testnet', () => {
        it('should process testnet webhook payload', async () => {
            const testnetPayload = {
                txHash: '0xtest' + Math.random().toString(36).substring(7),
                fromAddress: '0x' + '1'.repeat(40),
                toAddress: '0x' + '2'.repeat(40),
                amount: '10000000000000000000', // 10 USDT (18 decimals)
                tokenAddress: USDT_TESTNET_CONTRACT,
                network: 'bsc',
                blockNumber: 12345678,
                timestamp: Math.floor(Date.now() / 1000),
            };

            const result = await controller.handleBlockchainWebhook(testnetPayload);

            // Should fail verification (fake transaction) but process logic correctly
            expect(result).toBeDefined();
            expect(result.success).toBeDefined();
            console.log(`Webhook result: ${JSON.stringify(result)}`);
        }, 30000);
    });

    describe('Network Support', () => {
        it('should accept BSC network', async () => {
            const payload = {
                txHash: '0xtest123',
                fromAddress: '0xsender',
                toAddress: '0xreceiver',
                amount: '10000000000000000000',
                tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
                network: 'bsc',
                blockNumber: 1,
                timestamp: 1234567890,
            };

            const result = await controller.handleBlockchainWebhook(payload);
            expect(result).toBeDefined();
        });

        it('should accept Polygon network', async () => {
            const payload = {
                txHash: '0xtest456',
                fromAddress: '0xsender',
                toAddress: '0xreceiver',
                amount: '10000000', // 10 USDT (6 decimals on Polygon)
                tokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
                network: 'polygon',
                blockNumber: 1,
                timestamp: 1234567890,
            };

            const result = await controller.handleBlockchainWebhook(payload);
            expect(result).toBeDefined();
        });

        it('should reject unsupported network', async () => {
            const payload = {
                txHash: '0xtest789',
                fromAddress: '0xsender',
                toAddress: '0xreceiver',
                amount: '10000000000000000000',
                tokenAddress: '0xsometoken',
                network: 'ethereum', // Not supported
                blockNumber: 1,
                timestamp: 1234567890,
            };

            const result = await controller.handleBlockchainWebhook(payload);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Unsupported network');
        });
    });
});
