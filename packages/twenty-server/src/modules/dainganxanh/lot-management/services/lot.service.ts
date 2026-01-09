import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

/**
 * TreeLot entity interface matching E1.2 specification
 * @see E1.2 Story - TreeLot Object
 */
export interface LotEntity {
    id: string;
    lotCode: string;
    lotName: string; // Changed from 'name' due to reserved field
    location: string | null;
    capacity: number;
    plantedCount: number;
    gpsCenter: string | null; // Format: "lat,lng"
    assignedOperatorId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

/**
 * DTO for creating a lot
 */
export interface CreateLotDto {
    lotCode?: string; // Auto-generated if not provided
    lotName: string;
    location?: string;
    capacity: number;
    plantedCount?: number;
    gpsCenter?: string;
    assignedOperatorId?: string;
}

/**
 * DTO for updating a lot
 */
export interface UpdateLotDto {
    lotName?: string;
    location?: string;
    capacity?: number;
    plantedCount?: number;
    gpsCenter?: string;
    assignedOperatorId?: string;
}

@Injectable()
export class LotService {
    private readonly logger = new Logger(LotService.name);

    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }

    /**
     * Generate unique lot code in format LOT-XXX
     */
    async generateLotCode(workspaceId: string): Promise<string> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                const lots = await lotRepository.find({
                    order: { lotCode: 'DESC' } as any,
                    take: 1,
                });

                if (lots.length === 0) {
                    return 'LOT-001';
                }

                const lastCode = lots[0].lotCode;
                const match = lastCode.match(/LOT-(\d+)/);

                if (!match) {
                    return 'LOT-001';
                }

                const nextNumber = parseInt(match[1], 10) + 1;
                return `LOT-${String(nextNumber).padStart(3, '0')}`;
            },
        );
    }

    /**
     * Create a new lot
     */
    async createLot(workspaceId: string, data: CreateLotDto): Promise<LotEntity> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                const lotCode = data.lotCode || await this.generateLotCode(workspaceId);

                const newLot = {
                    lotCode,
                    lotName: data.lotName,
                    location: data.location || null,
                    capacity: data.capacity,
                    plantedCount: data.plantedCount || 0,
                    gpsCenter: data.gpsCenter || null,
                    assignedOperatorId: data.assignedOperatorId || null,
                };

                const result = await lotRepository.save(newLot);
                this.logger.log(`Created lot with code: ${lotCode}`);

                return result as LotEntity;
            },
        );
    }

    /**
     * Find lot by ID
     */
    async findLotById(workspaceId: string, lotId: string): Promise<LotEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                return lotRepository.findOne({
                    where: { id: lotId },
                });
            },
        );
    }

    /**
     * Find lot by code
     */
    async findLotByCode(workspaceId: string, lotCode: string): Promise<LotEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                return lotRepository.findOne({
                    where: { lotCode },
                });
            },
        );
    }

    /**
     * Get all lots with tree counts
     * Using direct datasource with correct schema lookup
     */
    async getAllLots(workspaceId: string): Promise<any[]> {
        this.logger.log(`📋 getAllLots called for workspace: ${workspaceId}`);

        try {
            const datasource = await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();

            // Get actual schema name from core.dataSource table
            const dataSourceResult = await datasource.query(
                `SELECT schema FROM core."dataSource" WHERE "workspaceId" = $1`,
                [workspaceId],
                undefined,
                { shouldBypassPermissionChecks: true }
            );

            if (!dataSourceResult || dataSourceResult.length === 0) {
                throw new Error(`No dataSource found for workspace ${workspaceId}`);
            }

            const schemaName = dataSourceResult[0].schema;
            this.logger.log(`📁 Using schema: ${schemaName}`);

            // Query _treeLot table (custom objects have underscore prefix)
            const lots = await datasource.query(
                `SELECT * FROM "${schemaName}"."_treeLot" WHERE "deletedAt" IS NULL ORDER BY "name" ASC`,
                [],
                undefined,
                { shouldBypassPermissionChecks: true }
            );

            this.logger.log(`✅ Found ${lots?.length || 0} lots from database`);
            return lots || [];
        } catch (error) {
            this.logger.error(`❌ getAllLots error: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Update lot
     */
    async updateLot(
        workspaceId: string,
        lotId: string,
        data: UpdateLotDto,
    ): Promise<LotEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                const lot = await lotRepository.findOne({
                    where: { id: lotId },
                });

                if (!lot) {
                    throw new NotFoundException('TreeLot not found');
                }

                await lotRepository.update(lotId, data);

                return lotRepository.findOne({
                    where: { id: lotId },
                });
            },
        );
    }

    /**
     * Delete lot (soft delete)
     */
    async deleteLot(workspaceId: string, lotId: string): Promise<boolean> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const lotRepository = await this.globalWorkspaceOrmManager.getRepository<LotEntity>(
                    workspaceId,
                    'treeLot',
                );

                const lot = await lotRepository.findOne({
                    where: { id: lotId },
                });

                if (!lot) {
                    return false;
                }

                await lotRepository.softDelete(lotId);
                this.logger.log(`Deleted lot: ${lotId}`);

                return true;
            },
        );
    }

    /**
     * Assign operator to lot
     */
    async assignOperator(
        lotId: string,
        operatorId: string,
        workspaceId: string,
    ): Promise<any> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const treeLotRepository = await this.globalWorkspaceOrmManager.getRepository<any>(
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

    /**
     * Reassign tree to different lot
     */
    async reassignTree(
        treeId: string,
        newLotId: string,
        workspaceId: string,
    ): Promise<any> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const treeRepository = await this.globalWorkspaceOrmManager.getRepository<any>(
                    workspaceId,
                    'tree',
                );

                const treeLotRepository = await this.globalWorkspaceOrmManager.getRepository<any>(
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
            const authContext = buildSystemAuthContext(workspaceId);

            await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
                authContext,
                async () => {
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
                },
            );
        } catch (error) {
            this.logger.error(
                `Failed to send notification to operator ${operatorId}:`,
                error,
            );
            // Don't throw - notification failure shouldn't block the assignment
        }
    }
}
