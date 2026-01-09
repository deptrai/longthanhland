import {
    Controller,
    Get,
    Post,
    Body,
    // UseGuards,
    Req,
} from '@nestjs/common';
// import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { ReferralService, CreateReferralDto } from '../services/referral.service';

@Controller('referral')
// @UseGuards(JwtAuthGuard)
export class ReferralController {
    constructor(private readonly referralService: ReferralService) { }

    /**
     * Get user's referral code (create if not exists)
     */
    @Get('code')
    async getReferralCode(@Req() req: any) {
        const userId = req.user?.id || 'default';
        const code = await this.referralService.getOrCreateReferralCode(userId);

        return {
            code,
            url: `https://dainganxanh.vn?ref=${code}`,
        };
    }

    /**
     * Get referral stats
     */
    @Get('stats')
    async getStats(@Req() req: any) {
        const userId = req.user?.id || 'default';
        return this.referralService.getUserEarnings(userId);
    }

    /**
     * Get user's referrals list
     */
    @Get('list')
    async getReferrals(@Req() req: any) {
        const userId = req.user?.id || 'default';
        return this.referralService.getUserReferrals(userId);
    }

    /**
     * Track referral (called when user arrives with ref param)
     */
    @Post('track')
    async trackReferral(
        @Body() data: { referralCode: string; refereeId?: string },
        @Req() req: any,
    ) {
        const referrer = await this.referralService.getReferralByCode(data.referralCode);

        if (!referrer) {
            return { success: false, message: 'Invalid referral code' };
        }

        // Prevent self-referral
        const userId = req.user?.id;
        if (userId && userId === referrer.referrerId) {
            return { success: false, message: 'Cannot refer yourself' };
        }

        const referralData: CreateReferralDto = {
            referralCode: data.referralCode,
            referrerId: referrer.referrerId,
            refereeId: data.refereeId || userId,
        };

        const result = await this.referralService.trackReferral(referralData);

        return {
            success: true,
            referralId: result.id,
        };
    }
}
