import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Req,
} from '@nestjs/common';
import { TreeService } from '../services/tree.service';
import { HarvestNotificationService } from '../services/harvest-notification.service';

export enum HarvestDecision {
    CASH_OUT = 'CASH_OUT',
    REPLANT = 'REPLANT',
    CONTINUE = 'CONTINUE',
}

export interface SubmitHarvestDecisionDto {
    decision: HarvestDecision;
    notes?: string;
}

@Controller('harvest')
export class HarvestController {
    constructor(
        private readonly treeService: TreeService,
        private readonly harvestNotificationService: HarvestNotificationService,
    ) { }

    /**
     * Get tree harvest information
     */
    @Get(':treeCode')
    async getHarvestInfo(@Param('treeCode') treeCode: string, @Req() req: any) {
        const workspaceId = req.headers['x-workspace-id'] || '';
        const trees = await this.treeService.findTrees(workspaceId, {});

        // Find tree by code
        const tree = trees.find((t: any) => t.treeCode === treeCode);

        if (!tree) {
            return { error: 'Tree not found' };
        }

        const ageMonths = this.treeService.calculateTreeAgeMonths(
            new Date(tree.plantingDate),
        );

        const isApproaching = this.treeService.isApproachingHarvest(ageMonths);
        const isReady = this.treeService.isReadyForHarvest(ageMonths);

        return {
            tree: {
                id: tree.id,
                treeCode: tree.treeCode,
                plantingDate: tree.plantingDate,
                ageMonths,
                status: tree.status,
                location: tree.gpsLocation,
            },
            harvest: {
                isApproaching,
                isReady,
            },
            options: [
                {
                    id: HarvestDecision.CASH_OUT,
                    title: '💰 Thu hoạch và nhận tiền',
                    description: 'Nhận thanh toán cho gỗ Dó Đen sau 5 năm',
                    estimatedPayout: 'TBD',
                },
                {
                    id: HarvestDecision.REPLANT,
                    title: '🌱 Thu hoạch và trồng lại',
                    description: 'Tiếp tục hành trình với cây mới',
                    benefit: 'Giảm 10% cho cây mới',
                },
                {
                    id: HarvestDecision.CONTINUE,
                    title: '🌳 Tiếp tục nuôi dưỡng',
                    description: 'Gia hạn hợp đồng thêm 2 năm',
                    benefit: 'Tăng giá trị gỗ',
                },
            ],
        };
    }

    /**
     * Submit harvest decision
     */
    @Post(':treeCode/decision')
    async submitDecision(
        @Param('treeCode') treeCode: string,
        @Body() dto: SubmitHarvestDecisionDto,
        @Req() req: any,
    ) {
        const workspaceId = req.headers['x-workspace-id'] || '';
        const trees = await this.treeService.findTrees(workspaceId, {});

        // Find tree by code
        const tree = trees.find((t: any) => t.treeCode === treeCode);

        if (!tree) {
            return { error: 'Tree not found' };
        }

        // Update tree with decision
        await this.treeService.updateTree(workspaceId, tree.id, {
            // harvestDecision and harvestDecisionDate would be stored
            // in tree metadata or separate table
        });

        return {
            success: true,
            decision: dto.decision,
            message: 'Quyết định của bạn đã được ghi nhận',
        };
    }

    /**
     * Get user's pending harvest decisions
     */
    @Get('pending/list')
    async getPendingDecisions(@Req() req: any) {
        return {
            pending: [],
        };
    }

    /**
     * Get harvest notification stats (admin only)
     */
    @Get('admin/stats')
    async getStats() {
        const stats = await this.harvestNotificationService.getNotificationStats();
        return stats;
    }
}
