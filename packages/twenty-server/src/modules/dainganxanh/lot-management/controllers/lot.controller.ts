import { Controller, Get, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt.auth.guard';
import { LotService } from '../services/lot.service';

@Controller('lots')
@UseGuards(JwtAuthGuard)
export class LotController {
    constructor(private readonly lotService: LotService) { }

    @Get('admin')
    async getAllLots(@Req() req: any) {
        const workspaceId = req.user?.workspaceId || 'default';
        return this.lotService.getAllLots(workspaceId);
    }

    @Patch(':id/assign-operator')
    async assignOperator(
        @Param('id') lotId: string,
        @Body('operatorId') operatorId: string,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        return this.lotService.assignOperator(lotId, operatorId, workspaceId);
    }

    @Patch('trees/:id/reassign')
    async reassignTree(
        @Param('id') treeId: string,
        @Body('newLotId') newLotId: string,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        return this.lotService.reassignTree(treeId, newLotId, workspaceId);
    }
}
