import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

export enum TreeHealthStatus {
    HEALTHY = 'HEALTHY',
    SICK = 'SICK',
    DEAD = 'DEAD',
    REPLANTED = 'REPLANTED',
}

export interface TreeHealthLogEntity {
    id: string;
    status: TreeHealthStatus;
    notes: string | null;
    treatment: string | null;
    treeId: string;
    loggedById: string | null;
    loggedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface TreeHealthUpdateDto {
    treeId: string;
    status: TreeHealthStatus;
    notes?: string;
    treatment?: string;
    loggedAt?: string;
    loggedById?: string;
}

/**
 * TreeHealthService manages tree health status updates
 * and triggers appropriate actions based on status changes.
 */
@Injectable()
export class TreeHealthService {
    private readonly logger = new Logger(TreeHealthService.name);

    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }
    /**
     * Validate health status transition
     * Some transitions are not allowed (e.g., DEAD -> HEALTHY)
     */
    isValidStatusTransition(
        currentStatus: TreeHealthStatus,
        newStatus: TreeHealthStatus,
    ): boolean {
        // DEAD trees can only transition to REPLANTED
        if (currentStatus === TreeHealthStatus.DEAD) {
            return newStatus === TreeHealthStatus.REPLANTED;
        }

        // REPLANTED trees act like new trees - any status is valid
        if (currentStatus === TreeHealthStatus.REPLANTED) {
            return true;
        }

        // Normal transitions are allowed
        return true;
    }

    /**
     * Determine required actions based on status change
     */
    getRequiredActions(newStatus: TreeHealthStatus): string[] {
        const actions: string[] = [];

        switch (newStatus) {
            case TreeHealthStatus.SICK:
                actions.push('LOG_TREATMENT');
                actions.push('SCHEDULE_FOLLOWUP');
                break;

            case TreeHealthStatus.DEAD:
                actions.push('CREATE_REPLANT_TASK');
                actions.push('NOTIFY_OWNER');
                actions.push('UPDATE_SURVIVAL_METRICS');
                break;

            case TreeHealthStatus.REPLANTED:
                actions.push('RESET_TREE_AGE');
                actions.push('NOTIFY_OWNER');
                actions.push('CREATE_MONITORING_TASK');
                break;

            case TreeHealthStatus.HEALTHY:
                // No special actions for healthy status
                break;
        }

        return actions;
    }

    /**
     * Calculate health score based on recent logs (0-100)
     * 100 = perfectly healthy, 0 = very poor
     */
    calculateHealthScore(recentStatuses: TreeHealthStatus[]): number {
        if (recentStatuses.length === 0) return 100;

        const weightedSum = recentStatuses.reduce((sum, status, index) => {
            // More recent statuses have higher weight
            const weight = recentStatuses.length - index;

            switch (status) {
                case TreeHealthStatus.HEALTHY:
                    return sum + 100 * weight;
                case TreeHealthStatus.SICK:
                    return sum + 40 * weight;
                case TreeHealthStatus.REPLANTED:
                    return sum + 80 * weight;
                case TreeHealthStatus.DEAD:
                    return sum + 0 * weight;
                default:
                    return sum + 50 * weight;
            }
        }, 0);

        const totalWeight = recentStatuses.reduce(
            (sum, _, index) => sum + (recentStatuses.length - index),
            0,
        );

        return Math.round(weightedSum / totalWeight);
    }

    /**
     * Generate notification message for owner based on status
     */
    generateOwnerNotificationMessage(
        treeName: string,
        status: TreeHealthStatus,
        notes?: string,
    ): { subject: string; body: string } {
        switch (status) {
            case TreeHealthStatus.SICK:
                return {
                    subject: `🌱 Cập nhật về cây ${treeName}`,
                    body: `Cây ${treeName} của bạn đang được chăm sóc đặc biệt. ${notes || 'Đội ngũ của chúng tôi đang theo dõi và xử lý.'}`,
                };

            case TreeHealthStatus.DEAD:
                return {
                    subject: `🌳 Thông báo về cây ${treeName}`,
                    body: `Rất tiếc, cây ${treeName} của bạn đã không may mắn. Chúng tôi sẽ trồng một cây mới thay thế hoàn toàn miễn phí. ${notes || ''}`,
                };

            case TreeHealthStatus.REPLANTED:
                return {
                    subject: `🌱 Cây mới đã được trồng!`,
                    body: `Một cây Dó Đen mới đã được trồng thay thế cho cây ${treeName}. Chúng tôi sẽ tiếp tục theo dõi và cập nhật cho bạn.`,
                };

            default:
                return {
                    subject: `🌳 Cập nhật về cây ${treeName}`,
                    body: `Cây ${treeName} của bạn đang phát triển tốt!`,
                };
        }
    }

    /**
     * Create a new health log record
     * AC: #1.5 - Create TreeHealthLog object
     */
    async createHealthLog(
        workspaceId: string,
        data: TreeHealthUpdateDto,
    ): Promise<TreeHealthLogEntity> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const repository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeHealthLogEntity>(
                            workspaceId,
                            'treeHealthLog',
                        );

                    // Get the latest log to check current status
                    const lastLog = await repository.findOne({
                        where: { treeId: data.treeId },
                        order: { createdAt: 'DESC' } as any,
                    });

                    if (lastLog) {
                        const isValid = this.isValidStatusTransition(lastLog.status, data.status);
                        if (!isValid) {
                            throw new BadRequestException(
                                `Invalid health status transition from ${lastLog.status} to ${data.status}`,
                            );
                        }
                    }

                    const newLog = {
                        status: data.status,
                        notes: data.notes || null,
                        treatment: data.treatment || null,
                        loggedAt: data.loggedAt || new Date().toISOString(),
                        treeId: data.treeId,
                        loggedById: data.loggedById || null,
                    };

                    const result = await repository.save(newLog);
                    this.logger.log(`Created health log for tree ${data.treeId} with status ${data.status}`);
                    return result as TreeHealthLogEntity;
                } catch (error) {
                    this.logger.error(`Failed to create health log: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Get health logs for a tree
     */
    async findHealthLogsByTree(
        workspaceId: string,
        treeId: string,
    ): Promise<TreeHealthLogEntity[]> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const repository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeHealthLogEntity>(
                            workspaceId,
                            'treeHealthLog',
                        );

                    return repository.find({
                        where: { treeId },
                        order: { createdAt: 'DESC' } as any,
                    });
                } catch (error) {
                    this.logger.error(`Failed to find health logs: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }
}
