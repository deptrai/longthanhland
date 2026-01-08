import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type FindOptionsWhere } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

/**
 * Order entity interface matching custom object fields in Twenty CRM
 * Corresponds to Order object from Story E1.3
 */
export interface OrderEntity {
    id: string;
    orderCode: string;
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
    paymentMethod: 'BANK_TRANSFER' | 'USDT';
    paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
    totalAmount: number;
    quantity: number;
    buyerId: string | null;
    transactionHash: string | null; // Used for storing banking transactionId
    paidAt: string | null;
    verifiedAt: string | null;
    verifiedById: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

/**
 * DTO for updating order payment status
 */
export interface UpdateOrderPaymentDto {
    paymentStatus: 'VERIFIED' | 'FAILED';
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
                        status: 'PAID', // Also update main status
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
    async getOrdersByBuyer(
        workspaceId: string,
        buyerId: string,
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

                    return orderRepository.find({
                        where: { buyerId },
                        order: { createdAt: 'DESC' } as any,
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to get orders for buyer ${buyerId}: ${error.message}`,
                        error.stack,
                    );
                    throw error;
                }
            },
        );
    }
}
