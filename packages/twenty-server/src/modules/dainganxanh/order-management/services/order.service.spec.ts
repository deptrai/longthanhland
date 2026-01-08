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
        update: jest.Mock;
    };

    const workspaceId = 'test-workspace-id';

    beforeEach(async () => {
        mockOrderRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
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
                status: 'PAID',
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

    describe('getOrdersByBuyer', () => {
        it('should return orders for specific buyer', async () => {
            const mockOrders: Partial<OrderEntity>[] = [
                { id: 'order-1', buyerId: 'buyer-1', orderCode: 'DGX-001' },
                { id: 'order-2', buyerId: 'buyer-1', orderCode: 'DGX-002' },
            ];

            mockOrderRepository.find.mockResolvedValue(mockOrders);

            const result = await service.getOrdersByBuyer(workspaceId, 'buyer-1');

            expect(result).toHaveLength(2);
            expect(mockOrderRepository.find).toHaveBeenCalledWith({
                where: { buyerId: 'buyer-1' },
                order: { createdAt: 'DESC' },
            });
        });
    });
});
