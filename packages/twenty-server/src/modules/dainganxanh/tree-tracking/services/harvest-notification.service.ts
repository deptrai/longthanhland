import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { TreeService } from './tree.service';
import { QuarterlyUpdateService } from './quarterly-update.service';

export interface HarvestNotification {
    treeId: string;
    treeCode: string;
    ownerId: string;
    ownerEmail: string;
    ownerName: string;
    ageMonths: number;
    sentAt: Date;
    reminderSentAt?: Date;
}

/**
 * HarvestNotificationService handles automated harvest notifications
 * for trees approaching 60 months (5 years)
 */
@Injectable()
export class HarvestNotificationService {
    private readonly logger = new Logger(HarvestNotificationService.name);

    constructor(
        @InjectRepository('Tree')
        private readonly treeRepository: Repository<any>,
        private readonly treeService: TreeService,
        private readonly quarterlyUpdateService: QuarterlyUpdateService,
    ) { }

    /**
     * Find trees approaching harvest (57-59 months old)
     * that haven't been notified yet
     */
    async findTreesApproachingHarvest(): Promise<any[]> {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 57);

        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 60);

        // Find trees planted 57-59 months ago that haven't been notified
        const trees = await this.treeRepository.find({
            where: {
                plantingDate: LessThan(threeMonthsAgo),
                plantingDate: MoreThan(twoMonthsAgo),
                harvestNotificationSentAt: null,
            },
        });

        return trees;
    }

    /**
     * Send harvest notification email to tree owner
     */
    async sendHarvestNotification(tree: any): Promise<void> {
        try {
            const ageMonths = this.treeService.calculateAgeInMonths(
                new Date(tree.plantingDate),
            );

            // Generate email using existing template
            const emailContent = this.quarterlyUpdateService.generateHarvestReminderEmail(
                tree.treeCode,
                ageMonths,
            );

            // TODO: Send email via email service
            // await this.emailService.send({
            //     to: tree.ownerEmail,
            //     subject: emailContent.subject,
            //     html: emailContent.body,
            // });

            // Track notification sent
            await this.trackNotificationStatus(tree.id);

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
     * Track that notification was sent
     */
    async trackNotificationStatus(treeId: string): Promise<void> {
        await this.treeRepository.update(treeId, {
            harvestNotificationSentAt: new Date(),
            updatedAt: new Date(),
        });
    }

    /**
     * Find trees needing reminder (7+ days since notification, no decision)
     */
    async findTreesNeedingReminder(): Promise<any[]> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trees = await this.treeRepository.find({
            where: {
                harvestNotificationSentAt: LessThan(sevenDaysAgo),
                harvestDecision: null,
                harvestReminderSentAt: null,
            },
        });

        return trees;
    }

    /**
     * Send reminder email
     */
    async sendReminder(tree: any): Promise<void> {
        try {
            const ageMonths = this.treeService.calculateAgeInMonths(
                new Date(tree.plantingDate),
            );

            // Generate reminder email
            const emailContent = this.quarterlyUpdateService.generateHarvestReminderEmail(
                tree.treeCode,
                ageMonths,
            );

            // TODO: Send email via email service
            // await this.emailService.send({
            //     to: tree.ownerEmail,
            //     subject: `[Nhắc nhở] ${emailContent.subject}`,
            //     html: emailContent.body,
            // });

            // Track reminder sent
            await this.treeRepository.update(tree.id, {
                harvestReminderSentAt: new Date(),
                updatedAt: new Date(),
            });

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

        const sentNotifications = await this.treeRepository.count({
            where: {
                harvestNotificationSentAt: MoreThan(new Date(0)),
            },
        });

        const pendingDecisions = await this.treeRepository.count({
            where: {
                harvestNotificationSentAt: MoreThan(new Date(0)),
                harvestDecision: null,
            },
        });

        return {
            pendingNotifications: pendingNotifications.length,
            sentNotifications,
            pendingReminders: pendingReminders.length,
            pendingDecisions,
        };
    }
}
