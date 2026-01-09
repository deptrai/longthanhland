import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { GlobalWorkspaceOrmManager } from 'src/engine/workspace-manager/workspace-orm-manager/global-workspace-orm-manager';

@Injectable()
export class LotService {
    private readonly logger = new Logger(LotService.name);

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

                const updatedLot = await treeLotRepository.findOne({
                    where: { id: lotId },
                    relations: ['assignedOperator'],
                });

                // Send notification to operator
                await this.notifyOperatorAssignment(
                    operatorId,
                    updatedLot,
                    workspaceId,
                );

                return updatedLot;
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

    /**
     * Send notification to operator about lot assignment
     * This creates a system notification that the operator can view in their dashboard
     */
    private async notifyOperatorAssignment(
        operatorId: string,
        lot: any,
        workspaceId: string,
    ): Promise<void> {
        try {
            const workspaceMemberRepository =
                await this.globalWorkspaceOrmManager.getRepository<any>(
                    workspaceId,
                    'workspaceMember',
                );

            const operator = await workspaceMemberRepository.findOne({
                where: { id: operatorId },
                relations: ['name'],
            });

            if (!operator) {
                this.logger.warn(`Operator ${operatorId} not found for notification`);
                return;
            }

            const operatorName = operator.name
                ? `${operator.name.firstName || ''} ${operator.name.lastName || ''}`.trim()
                : 'Operator';

            this.logger.log(
                `📢 Notification: ${operatorName} assigned to lot ${lot.lotName} (${lot.lotCode})`,
            );

            // TODO: Integrate with Twenty CRM notification system when available
            // For now, we log the notification. In production, this would:
            // 1. Create a notification record in the database
            // 2. Send an email notification
            // 3. Trigger a push notification if mobile app exists
            // 4. Create an in-app notification badge

            // Example notification payload:
            const notificationPayload = {
                recipientId: operatorId,
                type: 'LOT_ASSIGNMENT',
                title: 'New Lot Assignment',
                message: `You have been assigned to manage ${lot.lotName} (${lot.lotCode})`,
                metadata: {
                    lotId: lot.id,
                    lotName: lot.lotName,
                    lotCode: lot.lotCode,
                    capacity: lot.capacity,
                    currentCount: lot.trees?.length || 0,
                },
                createdAt: new Date().toISOString(),
            };

            this.logger.debug(
                `Notification payload: ${JSON.stringify(notificationPayload)}`,
            );

            // When notification service is available, uncomment:
            // await this.notificationService.create(notificationPayload);
        } catch (error) {
            this.logger.error(
                `Failed to send notification to operator ${operatorId}:`,
                error,
            );
            // Don't throw - notification failure shouldn't block the assignment
        }
    }
}
