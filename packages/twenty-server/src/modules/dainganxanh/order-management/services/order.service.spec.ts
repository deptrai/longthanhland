import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import {
    OrderService,
    type OrderEntity,
    type UpdateOrderPaymentDto,
} from './order.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

describe('OrderService', () => {
    let service: OrderService;
    let mockGlobalWorkspaceOrmManager: jest.Mocked<GlobalWorkspaceOrmManager>;
    let mockOrderRepository: {
        findOne: jest.Mock;
        find: jest.Mock;
        findAndCount: jest.Mock;
        update: jest.Mock;
    };

    const workspaceId = 'test-workspace-id';

    beforeEach(async () => {
        mockOrderRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
        };

        mockGlobalWorkspaceOrmManager = {
            getRepository: jest.fn().mockResolvedValue(mockOrderRepository),
            executeInWorkspaceContext: jest
                .fn()
                .mockImplementation((_authContext, fn) => fn()),
        } as unknown as jest.Mocked<GlobalWorkspaceOrmManager>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrderService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockGlobalWorkspaceOrmManager,
                },
            ],
        }).compile();

        service = module.get<OrderService>(OrderService);
    });

    describe('findOrderByCode', () => {
        it('should return order when found', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                status: 'PENDING',
                paymentStatus: 'PENDING',
                totalAmount: 260000,
                quantity: 1,
            };

            mockOrderRepository.findOne.mockResolvedValue(mockOrder);

            const result = await service.findOrderByCode(
                workspaceId,
                'DGX-20260109-ABC12',
            );

            expect(result).toEqual(mockOrder);
            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: { orderCode: 'DGX-20260109-ABC12' },
            });
        });

        it('should return null when order not found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);

            const result = await service.findOrderByCode(
                workspaceId,
                'NONEXISTENT',
            );

            expect(result).toBeNull();
        });
    });

    describe('findOrderById', () => {
        it('should return order by ID', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
            };

            mockOrderRepository.findOne.mockResolvedValue(mockOrder);

            const result = await service.findOrderById(workspaceId, 'order-1');

            expect(result).toEqual(mockOrder);
        });
    });

    describe('isTransactionProcessed', () => {
        it('should return true if transaction already processed', async () => {
            const mockOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                transactionHash: 'TXN123456',
                paymentStatus: 'VERIFIED',
            };

            mockOrderRepository.findOne.mockResolvedValue(mockOrder);

            const result = await service.isTransactionProcessed(
                workspaceId,
                'TXN123456',
            );

            expect(result).toBe(true);
            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: {
                    transactionHash: 'TXN123456',
                    paymentStatus: 'VERIFIED',
                },
            });
        });

        it('should return false if transaction not processed', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);

            const result = await service.isTransactionProcessed(
                workspaceId,
                'NEW_TXN',
            );

            expect(result).toBe(false);
        });
    });

    describe('markOrderAsPaid', () => {
        it('should update order to VERIFIED status', async () => {
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
                transactionHash: 'TXN123456',
                paidAt: '2026-01-09T06:00:00Z',
            };

            const paymentData: UpdateOrderPaymentDto = {
                paymentStatus: 'VERIFIED',
                transactionHash: 'TXN123456',
                paidAt: new Date('2026-01-09T06:00:00Z'),
                amount: 260000,
                bankCode: 'VCB',
            };

            mockOrderRepository.findOne
                .mockResolvedValueOnce(mockOrder)
                .mockResolvedValueOnce(updatedOrder);

            mockOrderRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.markOrderAsPaid(
                workspaceId,
                'DGX-20260109-ABC12',
                paymentData,
            );

            expect(result.paymentStatus).toBe('VERIFIED');
            expect(result.transactionHash).toBe('TXN123456');
            expect(mockOrderRepository.update).toHaveBeenCalledWith('order-1', {
                paymentStatus: 'VERIFIED',
                transactionHash: 'TXN123456',
                paidAt: '2026-01-09T06:00:00.000Z',
                orderStatus: 'PAID',
            });
        });

        it('should throw NotFoundException when order not found', async () => {
            mockOrderRepository.findOne.mockResolvedValue(null);

            const paymentData: UpdateOrderPaymentDto = {
                paymentStatus: 'VERIFIED',
                transactionHash: 'TXN123456',
                paidAt: new Date(),
                amount: 260000,
            };

            await expect(
                service.markOrderAsPaid(workspaceId, 'NONEXISTENT', paymentData),
            ).rejects.toThrow(NotFoundException);
        });

        it('should return existing order if already verified', async () => {
            const alreadyVerifiedOrder: Partial<OrderEntity> = {
                id: 'order-1',
                orderCode: 'DGX-20260109-ABC12',
                status: 'PAID',
                paymentStatus: 'VERIFIED',
                transactionHash: 'EXISTING_TXN',
            };

            mockOrderRepository.findOne.mockResolvedValue(alreadyVerifiedOrder);

            const paymentData: UpdateOrderPaymentDto = {
                paymentStatus: 'VERIFIED',
                transactionHash: 'NEW_TXN',
                paidAt: new Date(),
                amount: 260000,
            };

            const result = await service.markOrderAsPaid(
                workspaceId,
                'DGX-20260109-ABC12',
                paymentData,
            );

            expect(result.transactionHash).toBe('EXISTING_TXN');
            expect(mockOrderRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('getPendingOrders', () => {
        it('should return all pending orders', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                { id: 'order-1', paymentStatus: 'PENDING', orderCode: 'DGX-001' },
                { id: 'order-2', paymentStatus: 'PENDING', orderCode: 'DGX-002' },
            ];

            mockOrderRepository.find.mockResolvedValue(mockOrders);

            const result = await service.getPendingOrders(workspaceId);

            expect(result).toHaveLength(2);
            expect(mockOrderRepository.find).toHaveBeenCalledWith({
                where: { paymentStatus: 'PENDING' },
                order: { createdAt: 'DESC' },
                take: 100,
            });
        });
    });

    describe('getOrdersByCustomer', () => {
        it('should return orders for specific buyer', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                { id: 'order-1', customerId: 'buyer-1', orderCode: 'DGX-001' },
                { id: 'order-2', customerId: 'buyer-1', orderCode: 'DGX-002' },
            ];

            // findAndCount returns [orders, total] tuple
            mockOrderRepository.findAndCount.mockResolvedValue([mockOrders, 2]);

            const result = await service.getOrdersByCustomer(workspaceId, 'buyer-1');

            expect(result.orders).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(mockOrderRepository.findAndCount).toHaveBeenCalled();
        });
    });
    describe('findPendingByUsdtAmount', () => {
        it('should return order matching approximate USDT amount', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                {
                    id: 'order-1',
                    totalAmount: 250000, // ~10 USDT
                    paymentStatus: 'PENDING',
                    paymentMethod: 'USDT',
                },
                {
                    id: 'order-2',
                    totalAmount: 500000, // ~20 USDT
                    paymentStatus: 'PENDING',
                    paymentMethod: 'USDT',
                },
            ];

            mockOrderRepository.find.mockResolvedValue(mockOrders);

            // Rate is 1/25000. 10 USDT = 250,000 VND.
            const result = await service.findPendingByUsdtAmount(workspaceId, 10);

            expect(result?.id).toBe('order-1');
            expect(mockOrderRepository.find).toHaveBeenCalled();
        });

        it('should return null if no order matches within tolerance', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                {
                    id: 'order-1',
                    totalAmount: 250000, // ~10 USD
                },
            ];
            mockOrderRepository.find.mockResolvedValue(mockOrders);

            // Searching for 50 USDT (1,250,000 VND), should not match 10 USDT
            const result = await service.findPendingByUsdtAmount(workspaceId, 50);

            expect(result).toBeNull();
        });

        it('should respects tolerance', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                {
                    id: 'order-1',
                    totalAmount: 250000, // Exactly 10 USD
                },
            ];
            mockOrderRepository.find.mockResolvedValue(mockOrders);

            // 10.05 is within 1% of 10?
            // Expected: 10. Diff: 0.05. Tolerance: 10 * 0.01 = 0.1.
            // 0.05 <= 0.1 -> Match.
            const resultInside = await service.findPendingByUsdtAmount(workspaceId, 10.05, 0.01);
            expect(resultInside?.id).toBe('order-1');

            // 10.2 is diff 0.2. Tolerance 0.1.
            // 0.2 > 0.1 -> No match.
            const resultOutside = await service.findPendingByUsdtAmount(workspaceId, 10.2, 0.01);
            expect(resultOutside).toBeNull();
        });
    });
});
