import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralStatus } from '../objects/referral.object';

export interface CreateReferralDto {
    referralCode: string;
    referrerId: string;
    refereeId?: string;
}

export interface ReferralStats {
    totalReferrals: number;
    convertedReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
}

/**
 * ReferralService handles referral code generation, tracking, and commission calculation
 */
@Injectable()
export class ReferralService {
    private readonly COMMISSION_RATE = 0.1; // 10%
    private readonly TREE_PRICE = 260000; // VND
    private readonly COMMISSION_PER_TREE = this.TREE_PRICE * this.COMMISSION_RATE; // 26,000 VND

    constructor(
        @InjectRepository('Referral')
        private readonly referralRepository: Repository<any>,
    ) { }

    /**
     * Generate unique referral code (6 alphanumeric chars)
     */
    generateReferralCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0, O, I, 1)
        const length = 6;
        let code = '';

        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return code;
    }

    /**
     * Get or create referral code for user
     */
    async getOrCreateReferralCode(userId: string): Promise<string> {
        // Check if user already has a referral code
        const existing = await this.referralRepository.findOne({
            where: { referrerId: userId },
            order: { createdAt: 'DESC' },
        });

        if (existing?.referralCode) {
            return existing.referralCode;
        }

        // Generate new unique code
        let code = this.generateReferralCode();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const exists = await this.referralRepository.findOne({
                where: { referralCode: code },
            });

            if (!exists) {
                break;
            }

            code = this.generateReferralCode();
            attempts++;
        }

        return code;
    }

    /**
     * Get referrer by referral code
     */
    async getReferralByCode(code: string): Promise<any> {
        return this.referralRepository.findOne({
            where: { referralCode: code },
        });
    }

    /**
     * Track new referral
     */
    async trackReferral(data: CreateReferralDto): Promise<any> {
        const referral = this.referralRepository.create({
            ...data,
            status: ReferralStatus.PENDING,
            commission: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return this.referralRepository.save(referral);
    }

    /**
     * Convert referral when order is placed
     */
    async convertReferral(
        referralId: string,
        orderId: string,
        treeCount: number,
    ): Promise<any> {
        const commission = this.COMMISSION_PER_TREE * treeCount;

        return this.referralRepository.update(referralId, {
            status: ReferralStatus.CONVERTED,
            orderId,
            commission,
            updatedAt: new Date(),
        });
    }

    /**
     * Calculate commission for order
     */
    calculateCommission(treeCount: number): number {
        return this.COMMISSION_PER_TREE * treeCount;
    }

    /**
     * Get all referrals for user
     */
    async getUserReferrals(userId: string): Promise<any[]> {
        return this.referralRepository.find({
            where: { referrerId: userId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get user earnings stats
     */
    async getUserEarnings(userId: string): Promise<ReferralStats> {
        const referrals = await this.getUserReferrals(userId);

        const totalReferrals = referrals.length;
        const convertedReferrals = referrals.filter(
            (r) => r.status === ReferralStatus.CONVERTED || r.status === ReferralStatus.PAID,
        ).length;

        const totalEarnings = referrals
            .filter((r) => r.status === ReferralStatus.CONVERTED || r.status === ReferralStatus.PAID)
            .reduce((sum, r) => sum + (r.commission || 0), 0);

        const pendingEarnings = referrals
            .filter((r) => r.status === ReferralStatus.CONVERTED)
            .reduce((sum, r) => sum + (r.commission || 0), 0);

        return {
            totalReferrals,
            convertedReferrals,
            totalEarnings,
            pendingEarnings,
        };
    }

    /**
     * Mark referral as paid
     */
    async markAsPaid(referralId: string): Promise<any> {
        return this.referralRepository.update(referralId, {
            status: ReferralStatus.PAID,
            updatedAt: new Date(),
        });
    }
}
