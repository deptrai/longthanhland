import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HarvestNotificationService } from '../services/harvest-notification.service';

/**
 * Harvest notification cron jobs
 * - Weekly check for trees approaching harvest
 * - Weekly reminder for pending decisions
 */
@Injectable()
export class HarvestNotificationCron {
    private readonly logger = new Logger(HarvestNotificationCron.name);

    constructor(
        private readonly harvestNotificationService: HarvestNotificationService,
    ) { }

    /**
     * Check for trees approaching harvest and send notifications
     * Runs every Monday at 9:00 AM
     */
    @Cron('0 9 * * 1', {
        name: 'harvest-notification-check',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async checkHarvestNotifications() {
        this.logger.log('Starting harvest notification check...');

        try {
            const trees = await this.harvestNotificationService.findTreesApproachingHarvest();

            this.logger.log(`Found ${trees.length} trees approaching harvest`);

            for (const tree of trees) {
                await this.harvestNotificationService.sendHarvestNotification(tree);
            }

            this.logger.log(
                `Harvest notification check completed. Sent ${trees.length} notifications.`,
            );
        } catch (error) {
            this.logger.error('Harvest notification check failed', error);
        }
    }

    /**
     * Send reminders for pending harvest decisions
     * Runs every Monday at 9:00 AM
     */
    @Cron('0 9 * * 1', {
        name: 'harvest-reminder-check',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async sendHarvestReminders() {
        this.logger.log('Starting harvest reminder check...');

        try {
            const trees = await this.harvestNotificationService.findTreesNeedingReminder();

            this.logger.log(`Found ${trees.length} trees needing reminders`);

            for (const tree of trees) {
                await this.harvestNotificationService.sendReminder(tree);
            }

            this.logger.log(
                `Harvest reminder check completed. Sent ${trees.length} reminders.`,
            );
        } catch (error) {
            this.logger.error('Harvest reminder check failed', error);
        }
    }

    /**
     * Log harvest notification stats
     * Runs every Monday at 8:00 AM (before notifications)
     */
    @Cron('0 8 * * 1', {
        name: 'harvest-stats-log',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async logHarvestStats() {
        try {
            const stats = await this.harvestNotificationService.getNotificationStats();

            this.logger.log(
                `Harvest Stats: ${stats.pendingNotifications} pending notifications, ` +
                `${stats.sentNotifications} sent, ` +
                `${stats.pendingReminders} pending reminders, ` +
                `${stats.pendingDecisions} pending decisions`,
            );
        } catch (error) {
            this.logger.error('Failed to log harvest stats', error);
        }
    }
}
