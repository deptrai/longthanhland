import { Controller, Get, Patch, Param, Body, Req, Logger } from '@nestjs/common';
// import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { LotService } from '../services/lot.service';

@Controller('api/dainganxanh/lots')
// @UseGuards(JwtAuthGuard)
export class LotController {
    private readonly logger = new Logger(LotController.name);

    constructor(private readonly lotService: LotService) { }

    @Get('health')
    healthCheck() {
        return { status: 'ok', controller: 'LotController', time: new Date().toISOString() };
    }

    @Get('admin')
    async getAllLots(@Req() req: any) {
        try {
            const workspaceId = req.user?.workspaceId || '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
            this.logger.log(`Getting lots for workspace: ${workspaceId}`);
            const result = await this.lotService.getAllLots(workspaceId);
            this.logger.log(`Found ${result?.length || 0} lots`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to get lots: ${error.message}`, error.stack);
            // Return error in response body for debugging
            return {
                error: true,
                message: error.message,
                stack: error.stack,
            };
        }
    }

    @Patch(':id/assign-operator')
    async assignOperator(
        @Param('id') lotId: string,
        @Body('operatorId') operatorId: string,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
        return this.lotService.assignOperator(lotId, operatorId, workspaceId);
    }

    @Patch('trees/:id/reassign')
    async reassignTree(
        @Param('id') treeId: string,
        @Body('newLotId') newLotId: string,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || '3b8e6458-5fc1-4e63-8563-008ccdaa6db';
        return this.lotService.reassignTree(treeId, newLotId, workspaceId);
    }
}
