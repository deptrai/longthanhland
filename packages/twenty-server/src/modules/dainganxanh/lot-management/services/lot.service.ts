import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { GlobalWorkspaceOrmManager } from 'src/engine/workspace-manager/workspace-orm-manager/global-workspace-orm-manager';

@Injectable()
export class LotService {
    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }

    async getAllLots(workspaceId: string) {
        return this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
            workspaceId,
            async () => {
                const treeLotRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'treeLot',
                    );

                const lots = await treeLotRepository.find({
                    relations: ['assignedOperator', 'trees'],
                    order: { lotName: 'ASC' } as any,
                });

                // Enrich with tree count
                return lots.map((lot: any) => ({
                    ...lot,
                    treeCount: lot.trees?.length || 0,
                }));
            },
        );
    }

    async assignOperator(
        lotId: string,
        operatorId: string,
        workspaceId: string,
    ) {
        return this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
            workspaceId,
            async () => {
                const treeLotRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'treeLot',
                    );

                const lot = await treeLotRepository.findOne({
                    where: { id: lotId },
                });

                if (!lot) {
                    throw new NotFoundException('TreeLot not found');
                }

                // Update assignedOperator relation
                await treeLotRepository.update(lotId, {
                    assignedOperatorId: operatorId,
                });

                return treeLotRepository.findOne({
                    where: { id: lotId },
                    relations: ['assignedOperator'],
                });
            },
        );
    }

    async reassignTree(
        treeId: string,
        newLotId: string,
        workspaceId: string,
    ) {
        return this.globalWorkspaceOrmManager.runInWorkspaceTransaction(
            workspaceId,
            async () => {
                const treeRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'tree',
                    );

                const treeLotRepository =
                    await this.globalWorkspaceOrmManager.getRepository<any>(
                        workspaceId,
                        'treeLot',
                    );

                // Fetch tree and lots
                const tree = await treeRepository.findOne({
                    where: { id: treeId },
                });

                if (!tree) {
                    throw new NotFoundException('Tree not found');
                }

                const oldLotId = tree.treeLotId;

                const newLot = await treeLotRepository.findOne({
                    where: { id: newLotId },
                    relations: ['trees'],
                });

                if (!newLot) {
                    throw new NotFoundException('Target TreeLot not found');
                }

                // Capacity validation
                const currentCount = newLot.trees?.length || 0;
                if (currentCount >= newLot.capacity) {
                    throw new BadRequestException(
                        `Lot ${newLot.lotName} is at full capacity (${newLot.capacity})`,
                    );
                }

                // Update tree's lot
                await treeRepository.update(treeId, {
                    treeLotId: newLotId,
                });

                // Update plantedCount for both lots
                if (oldLotId) {
                    await treeLotRepository.decrement(
                        { id: oldLotId },
                        'plantedCount',
                        1,
                    );
                }

                await treeLotRepository.increment(
                    { id: newLotId },
                    'plantedCount',
                    1,
                );

                return treeRepository.findOne({
                    where: { id: treeId },
                    relations: ['treeLot'],
                });
            },
        );
    }
}
