import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from '../services/order.service';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';

describe('OrderController', () => {
    let controller: OrderController;
    let orderService: OrderService;

    const mockOrderService = {
        getOrdersByBuyer: jest.fn(),
        getAllOrders: jest.fn().mockResolvedValue({ orders: [], total: 0 }),
        verifyPayment: jest.fn(),
        assignLot: jest.fn(),
        getLots: jest.fn().mockResolvedValue([]),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderController],
            providers: [
                {
                    provide: OrderService,
                    useValue: mockOrderService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrderController>(OrderController);
        orderService = module.get<OrderService>(OrderService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getMyOrderHistory', () => {
        it('should return a list of orders for the logged-in user', async () => {
            const mockReq = {
                user: { id: 'user-123', workspaceId: 'ws-123' },
                query: {}
            };

            const mockOrders = [
                {
                    id: 'order-1',
                    orderCode: 'ORD-1',
                    totalAmount: 1000,
                    contractPdfUrl: 'http://example.com/pdf',
                    trees: []
                },
            ];

            mockOrderService.getOrdersByBuyer.mockResolvedValue({
                orders: mockOrders,
                total: 1
            });

            const result = await controller.getMyOrderHistory(mockReq as any);

            expect(orderService.getOrdersByBuyer).toHaveBeenCalledWith(
                'ws-123',
                'user-123',
                { status: 'ALL' },
                { limit: 20, offset: 0 }
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].contractUrl).toBe('http://example.com/pdf');
            expect(result.meta.total).toBe(1);
        });

        it('should return empty array if no user id', async () => {
            const mockReq = {
                user: undefined,
                query: {}
            };

            const result = await controller.getMyOrderHistory(mockReq as any);
            expect(result).toEqual({ orders: [], total: 0 });
        });
    });

    describe('getAllOrders', () => {
        it('should get all orders for admin', async () => {
            const result = await controller.getAllOrders({
                user: { workspaceId: 'default' },
                query: { page: '1', limit: '10' }
            } as any);

            expect(orderService.getAllOrders).toHaveBeenCalledWith(
                'default',
                { status: 'ALL', paymentMethod: 'ALL', startDate: undefined, endDate: undefined },
                { limit: 10, offset: 0 }
            );
            expect(result.data).toBeDefined();
        });
    });

    describe('verifyPayment', () => {
        it('should verify payment', async () => {
            const orderId = 'order-1';
            await controller.verifyPayment({ user: { workspaceId: 'default' } } as any, orderId);

            expect(orderService.verifyPayment).toHaveBeenCalledWith('default', orderId);
        });
    });

    describe('assignLot', () => {
        it('should assign lot to order', async () => {
            const orderId = 'order-1';
            const lotId = 'lot-1';
            await controller.assignLot({ user: { workspaceId: 'default' } } as any, orderId, { lotId });

            expect(orderService.assignLot).toHaveBeenCalledWith('default', orderId, lotId);
        });
    });

    describe('getLots', () => {
        it('should return list of lots', async () => {
            const result = await controller.getLots({ user: { workspaceId: 'default' } } as any);
            expect(orderService.getLots).toHaveBeenCalledWith('default');
            expect(result.data).toBeDefined();
        });
    });
});
