import { Injectable } from '@nestjs/common';

export enum TreeHealthStatus {
    HEALTHY = 'HEALTHY',
    SICK = 'SICK',
    DEAD = 'DEAD',
    REPLANTED = 'REPLANTED',
}

export interface TreeHealthUpdate {
    treeId: string;
    status: TreeHealthStatus;
    notes?: string;
    treatment?: string;
    loggedById: string;
}

/**
 * TreeHealthService manages tree health status updates
 * and triggers appropriate actions based on status changes.
 */
@Injectable()
export class TreeHealthService {
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
}
