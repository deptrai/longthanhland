import { Controller, Get, Post, Req, Logger, Param, Body } from '@nestjs/common';
import { OrderService } from '../services/order.service';
// import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('orders')
// @UseGuards(JwtAuthGuard)
export class OrderController {
    private readonly logger = new Logger(OrderController.name);

    constructor(private readonly orderService: OrderService) { }

    @Get('admin')
    async getAllOrders(@Req() req: Request) {
        const workspaceId = req.user?.workspaceId || 'default';
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string || 'ALL';
        const paymentMethod = req.query.paymentMethod as string || 'ALL';
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const offset = (page - 1) * limit;

        const { orders, total } = await this.orderService.getAllOrders(
            workspaceId,
            { status, paymentMethod, startDate, endDate },
            { limit, offset }
        );

        return {
            data: orders.map(order => ({
                ...order,
                contractUrl: order.contractPdfUrl,
                trees: order.trees || [],
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    @Post(':id/verify')
    async verifyPayment(
        @Req() req: Request,
        @Param('id') id: string,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        await this.orderService.verifyPayment(workspaceId, id);
        return { success: true };
    }

    @Post(':id/assign-lot')
    async assignLot(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() body: { lotId: string },
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        await this.orderService.assignLot(workspaceId, id, body.lotId);
        return { success: true };
    }

    @Get('lots')
    async getLots(@Req() req: Request) {
        const workspaceId = req.user?.workspaceId || 'default';
        const lots = await this.orderService.getLots(workspaceId);
        return { data: lots };
    }

    @Get('my-history')
    async getMyOrderHistory(@Req() req: Request) {
        const userId = req.user?.id;
        const workspaceId = req.user?.workspaceId || 'default';

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string || 'ALL';

        this.logger.log(`Fetching order history for user ${userId} (page=${page}, status=${status})`);

        if (!userId) {
            return { orders: [], total: 0 };
        }

        const offset = (page - 1) * limit;

        const { orders, total } = await this.orderService.getOrdersByBuyer(
            workspaceId,
            userId,
            { status },
            { limit, offset }
        );

        return {
            data: orders.map(order => ({
                ...order,
                contractUrl: order.contractPdfUrl,
                trees: order.trees || [], // Ensure trees are included
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }
}
