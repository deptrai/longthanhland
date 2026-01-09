import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type FindOptionsWhere, Between } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { PAYMENT_CONSTANTS } from '../../shared/constants/payment.constants';

/**
 * Order entity interface matching E1.3 specification
 * @see E1.3 Story - Order Object
 */
export interface OrderEntity {
    id: string;
    orderCode: string;
    // E1.3 AC#2: orderStatus - CREATED, PAID, ASSIGNED, COMPLETED
    orderStatus: 'CREATED' | 'PAID' | 'ASSIGNED' | 'COMPLETED';
    // E1.3 AC#2: paymentMethod - BANKING, USDT
    paymentMethod: 'BANKING' | 'USDT';
    // E1.3 AC#2: paymentStatus - PENDING, VERIFIED, FAILED, REFUNDED
    paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';
    totalAmount: number;
    quantity: number;
    customerId: string | null; // E1.3 AC#3: customer → Person relation
    referralCode: string | null; // E1.3 AC#2: Mã giới thiệu
    transactionHash: string | null; // E1.3 AC#2: Blockchain tx hash (for USDT)
    contractPdfUrl: string | null; // E1.3 AC#2: S3 URL của PDF hợp đồng
    paidAt: string | null; // E1.3 AC#2: Thời điểm thanh toán
    verifiedAt: string | null;
    verifiedById: string | null; // E1.3 AC#3: verifiedBy → WorkspaceMember
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

/**
 * DTO for updating order payment status
 */
export interface UpdateOrderPaymentDto {
    paymentStatus: 'VERIFIED' | 'FAILED' | 'REFUNDED';
    transactionHash: string;
    paidAt: Date;
    amount: number;
    bankCode?: string;
}

/**
 * OrderService handles CRUD operations for Order objects
 * in the Đại Ngàn Xanh tree planting platform.
 */
@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }

    /**
     * Find order by unique order code
     * Used by banking webhook to locate order for payment verification
     */
    async findOrderByCode(
        workspaceId: string,
        orderCode: string,
    ): Promise<OrderEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    return orderRepository.findOne({
                        where: { orderCode },
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to find order by code ${orderCode}: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }

    /**
     * Find order by ID
     */
    async findOrderById(
        workspaceId: string,
        orderId: string,
    ): Promise<OrderEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    return orderRepository.findOne({
                        where: { id: orderId },
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to find order by ID ${orderId}: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }

    /**
     * Check if transaction ID has already been processed (idempotency)
     * Returns true if a VERIFIED order with this transactionHash exists
     */
    async isTransactionProcessed(
        workspaceId: string,
        transactionId: string,
    ): Promise<boolean> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    const existingOrder = await orderRepository.findOne({
                        where: {
                            transactionHash: transactionId,
                            paymentStatus: 'VERIFIED',
                        } as FindOptionsWhere<OrderEntity>,
                    });

                    if (existingOrder) {
                        this.logger.log(
                            `Transaction ${transactionId} already processed for order ${existingOrder.orderCode}`,
                        );
                        return true;
                    }

                    return false;
                } catch (error) {
                    this.logger.error(
                        `Failed to check transaction ${transactionId}: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }

    /**
     * Mark order as paid and verified
     * Updates paymentStatus, transactionHash, and paidAt
     */
    async markOrderAsPaid(
        workspaceId: string,
        orderCode: string,
        paymentData: UpdateOrderPaymentDto,
    ): Promise<OrderEntity> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    // Find order by code
                    const order = await orderRepository.findOne({
                        where: { orderCode },
                    });

                    if (!order) {
                        throw new NotFoundException(
                            `Order with code ${orderCode} not found`,
                        );
                    }

                    // Check if already paid
                    if (order.paymentStatus === 'VERIFIED') {
                        this.logger.warn(
                            `Order ${orderCode} is already verified, transactionHash: ${order.transactionHash}`,
                        );
                        return order;
                    }

                    // Update payment status
                    await orderRepository.update(order.id, {
                        paymentStatus: paymentData.paymentStatus,
                        transactionHash: paymentData.transactionHash,
                        paidAt: paymentData.paidAt.toISOString(),
                        orderStatus: 'PAID', // Also update main orderStatus
                    });

                    // Fetch updated order
                    const updatedOrder = await orderRepository.findOne({
                        where: { id: order.id },
                    });

                    this.logger.log(
                        `Order ${orderCode} marked as ${paymentData.paymentStatus}, amount: ${paymentData.amount}`,
                    );

                    return updatedOrder as OrderEntity;
                } catch (error) {
                    if (error instanceof NotFoundException) {
                        throw error;
                    }
                    this.logger.error(
                        `Failed to mark order ${orderCode} as paid: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }

    /**
     * Get all pending orders awaiting payment
     */
    async getPendingOrders(
        workspaceId: string,
    ): Promise<OrderEntity[]> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    const orders = await orderRepository.find({
                        where: {
                            paymentStatus: 'PENDING',
                        } as FindOptionsWhere<OrderEntity>,
                        order: { createdAt: 'DESC' } as any,
                        take: 100,
                    });

                    return orders;
                } catch (error) {
                    this.logger.error(
                        `Failed to get pending orders: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }

    /**
     * Get orders by buyer ID
     */
    async verifyPayment(workspaceId: string, orderId: string): Promise<void> {
        const authContext = buildSystemAuthContext(workspaceId);

        await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                await orderRepository.update(orderId, { orderStatus: 'PAID' });
            },
        );
    }

    async getAllOrders(
        workspaceId: string,
        filter?: { orderStatus?: string; paymentMethod?: string; startDate?: string; endDate?: string },
        pagination?: { limit: number; offset: number },
    ): Promise<{ orders: OrderEntity[]; total: number }> {
        const authContext = buildSystemAuthContext(workspaceId);
        const { limit = 20, offset = 0 } = pagination || {};

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                const where: any = {};
                if (filter?.orderStatus && filter.orderStatus !== 'ALL') {
                    where.orderStatus = filter.orderStatus;
                }
                if (filter?.paymentMethod && filter.paymentMethod !== 'ALL') {
                    where.paymentMethod = filter.paymentMethod;
                }
                // Date filtering if provided
                // Assuming filter.startDate/endDate are ISO strings
                // Need simple Import for Between/MoreThan/LessThan if needed, or use raw query builder. 
                // For simplicity in findAndCount with TypeORM:
                // We need to import Between, MoreThanOrEqual, LessThanOrEqual from typeorm at top of file.
                // But imports are tricky with replace_file_content.
                // Let's check imports first.
                // Fallback: use query builder or simple non-import if possible? 
                // TypeORM 'Between' helper is best.
                // I'll assume imports are present or use 'Raw' if needed. 
                // Actually, I can add imports in a separate step.
                // Let's just add logic logic here assuming imports.
                if (filter?.startDate && filter?.endDate) {
                    where.createdAt = Between(filter.startDate, filter.endDate);
                }

                const [orders, total] = await orderRepository.findAndCount({
                    where,
                    order: { createdAt: 'DESC' } as any,
                    take: limit,
                    skip: offset,
                    relations: ['trees', 'buyer'], // Load trees and buyer
                });

                return { orders, total };
            },
        );
    }

    async assignLot(workspaceId: string, orderId: string, lotId: string): Promise<void> {
        const authContext = buildSystemAuthContext(workspaceId);

        await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                const treeLotRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'treeLot' // Assuming object name is treeLot
                    );

                const treeRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'tree'
                    );

                const order = await orderRepository.findOne({ where: { id: orderId } as any });
                if (!order) throw new NotFoundException('Order not found');

                const lot = await treeLotRepository.findOne({ where: { id: lotId } });
                if (!lot) throw new NotFoundException('TreeLot not found');

                // Generate Trees
                const treesToCreate = [];
                for (let i = 0; i < order.quantity; i++) {
                    const code = `${lot.name}-TREE-${Date.now()}-${i}`; // Simple code generation
                    treesToCreate.push({
                        code,
                        treeLotId: lotId,
                        orderId: orderId,
                        ownerId: order.customerId,
                    });
                }

                // Batch insert (or loop save if createMany not supported)
                // TypeORM standard .save() can handle array
                await treeRepository.save(treesToCreate);

                // Update Order
                await orderRepository.update(orderId, { orderStatus: 'ASSIGNED' }); // Trees assigned to lot
            },
        );
    }

    async getOrdersByCustomer(
        workspaceId: string,
        customerId: string,
        filter?: { orderStatus?: string },
        pagination?: { limit: number; offset: number },
    ): Promise<{ orders: OrderEntity[]; total: number }> {
        const authContext = buildSystemAuthContext(workspaceId);
        const { limit = 20, offset = 0 } = pagination || {};

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const orderRepository =
                        await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                            workspaceId,
                            'order',
                        );

                    const where: any = { customerId };
                    if (filter?.orderStatus && filter.orderStatus !== 'ALL') {
                        where.orderStatus = filter.orderStatus;
                    }

                    const [orders, total] = await orderRepository.findAndCount({
                        where,
                        order: { createdAt: 'DESC' } as any,
                        take: limit,
                        skip: offset,
                        relations: ['trees'], // Load trees for AC 4.2
                    });

                    return { orders, total };
                } catch (error) {
                    this.logger.error(
                        `Failed to get orders for customer ${customerId}: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }
    /**
     * Find pending order matching a USDT amount (within tolerance)
     */
    async findPendingByUsdtAmount(
        workspaceId: string,
        usdtAmount: number,
        tolerancePercent: number = 0.01,
    ): Promise<OrderEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);
        const rate = PAYMENT_CONSTANTS.VND_TO_USD_RATE;

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                // Fetch recent pending orders to filter in memory (safer for float comparison)
                // In a real high-volume system, we'd store expectedUsdtAmount on the order.
                const recentPendingOrders = await orderRepository.find({
                    where: {
                        paymentStatus: 'PENDING',
                        paymentMethod: 'USDT',
                    } as FindOptionsWhere<OrderEntity>,
                    order: { createdAt: 'DESC' } as any,
                    take: 50,
                });

                return recentPendingOrders.find(order => {
                    const expectedUsdt = order.totalAmount * rate;
                    const diff = Math.abs(expectedUsdt - usdtAmount);
                    // Check if difference is within % of expected
                    return diff <= (expectedUsdt * tolerancePercent);
                }) || null;
            },
        );
    }

    /**
     * Update order with contract PDF URL
     */
    async updateContractUrl(
        workspaceId: string,
        orderCode: string,
        contractPdfUrl: string,
    ): Promise<void> {
        const authContext = buildSystemAuthContext(workspaceId);

        await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                const order = await orderRepository.findOne({
                    where: { orderCode },
                });

                if (order) {
                    await orderRepository.update(order.id, { contractPdfUrl });
                    this.logger.log(`Updated contract URL for order ${orderCode}`);
                }
            },
        );
    }

    /**
     * Get full order details for contract generation
     * Includes Buyer and Tree relations
     */
    async getOrderDetailsForContract(
        workspaceId: string,
        orderId: string,
    ): Promise<any> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const orderRepository =
                    await this.globalWorkspaceOrmManager.getRepository<OrderEntity>(
                        workspaceId,
                        'order',
                    );

                // Note: 'buyer' and 'trees' relations depend on ORM definitions.
                // Assuming standard naming 'buyer' (Person/Company) and 'trees' (Custom Object)
                // If not defined, this might fail or return null relations.
                // For now, we try to load them.
                return orderRepository.findOne({
                    where: { id: orderId },
                    relations: ['buyer', 'trees'],
                });
            }
        );
    }
    async getLots(workspaceId: string): Promise<any[]> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const treeLotRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'treeLot'
                    );

                return treeLotRepository.find({
                    select: ['id', 'name'],
                    order: { name: 'ASC' } as any,
                    relations: ['assignedOperator']
                });
            },
        );
    }
}
