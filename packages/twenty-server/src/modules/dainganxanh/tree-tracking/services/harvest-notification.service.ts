import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TreeService } from './tree.service';
import { QuarterlyUpdateService } from './quarterly-update.service';

/**
 * HarvestNotificationService handles automated harvest notifications
 * for trees approaching 60 months (5 years)
 */
@Injectable()
export class HarvestNotificationService {
    private readonly logger = new Logger(HarvestNotificationService.name);

    constructor(
        private readonly treeService: TreeService,
        private readonly quarterlyUpdateService: QuarterlyUpdateService,
    ) { }

    /**
     * Find trees approaching harvest (57-59 months old)
     * that haven't been notified yet
     */
    async findTreesApproachingHarvest(): Promise<any[]> {
        // This would be implemented using TreeService to query
        // trees where age is 57-59 months and harvestNotificationSentAt is null
        // For now, return empty array as placeholder
        this.logger.log('Finding trees approaching harvest...');
        return [];
    }

    /**
     * Send harvest notification email to tree owner
     */
    async sendHarvestNotification(tree: any): Promise<void> {
        try {
            const ageMonths = this.treeService.calculateTreeAgeMonths(
                new Date(tree.plantingDate),
            );

            // Generate email using existing template
            const emailContent = this.quarterlyUpdateService.generateHarvestReminderEmail(
                tree.ownerName || 'Quý khách',
                tree.treeCode,
                new Date(tree.plantingDate),
                tree.co2Absorbed || 0,
            );

            // TODO: Send email via email service
            // await this.emailService.send({
            //     to: tree.ownerEmail,
            //     subject: emailContent.subject,
            //     html: emailContent.body,
            // });

            this.logger.log(
                `Harvest notification sent for tree ${tree.treeCode} (${ageMonths} months)`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send harvest notification for tree ${tree.treeCode}`,
                error,
            );
        }
    }

    /**
     * Find trees needing reminder (7+ days since notification, no decision)
     */
    async findTreesNeedingReminder(): Promise<any[]> {
        // This would query trees with harvestNotificationSentAt > 7 days ago
        // and harvestDecision is null
        this.logger.log('Finding trees needing harvest reminder...');
        return [];
    }

    /**
     * Send reminder email
     */
    async sendReminder(tree: any): Promise<void> {
        try {
            const ageMonths = this.treeService.calculateTreeAgeMonths(
                new Date(tree.plantingDate),
            );

            // Generate reminder email
            const emailContent = this.quarterlyUpdateService.generateHarvestReminderEmail(
                tree.ownerName || 'Quý khách',
                tree.treeCode,
                new Date(tree.plantingDate),
                tree.co2Absorbed || 0,
            );

            // TODO: Send email via email service

            this.logger.log(
                `Harvest reminder sent for tree ${tree.treeCode}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send harvest reminder for tree ${tree.treeCode}`,
                error,
            );
        }
    }

    /**
     * Get harvest notification stats
     */
    async getNotificationStats(): Promise<{
        pendingNotifications: number;
        sentNotifications: number;
        pendingReminders: number;
        pendingDecisions: number;
    }> {
        const pendingNotifications = await this.findTreesApproachingHarvest();
        const pendingReminders = await this.findTreesNeedingReminder();

        return {
            pendingNotifications: pendingNotifications.length,
            sentNotifications: 0, // TODO: Query from database
            pendingReminders: pendingReminders.length,
            pendingDecisions: 0, // TODO: Query from database
        };
    }

    /**
     * Weekly cron job to check for trees approaching harvest
     * Runs every Monday at 9:00 AM Vietnam time
     */
    @Cron('0 9 * * 1', {
        name: 'harvest-notification-check',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async checkHarvestNotifications() {
        this.logger.log('Starting harvest notification check...');

        try {
            const trees = await this.findTreesApproachingHarvest();

            this.logger.log(`Found ${trees.length} trees approaching harvest`);

            for (const tree of trees) {
                await this.sendHarvestNotification(tree);
            }

            this.logger.log(
                `Harvest notification check completed. Sent ${trees.length} notifications.`,
            );
        } catch (error) {
            this.logger.error('Harvest notification check failed', error);
        }
    }

    /**
     * Weekly cron job to send reminders
     * Runs every Monday at 9:30 AM Vietnam time
     */
    @Cron('30 9 * * 1', {
        name: 'harvest-reminder-check',
        timeZone: 'Asia/Ho_Chi_Minh',
    })
    async sendHarvestReminders() {
        this.logger.log('Starting harvest reminder check...');

        try {
            const trees = await this.findTreesNeedingReminder();

            this.logger.log(`Found ${trees.length} trees needing reminders`);

            for (const tree of trees) {
                await this.sendReminder(tree);
            }

            this.logger.log(
                `Harvest reminder check completed. Sent ${trees.length} reminders.`,
            );
        } catch (error) {
            this.logger.error('Harvest reminder check failed', error);
        }
    }
}
