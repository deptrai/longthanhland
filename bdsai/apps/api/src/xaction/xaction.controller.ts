import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import { PromotionService } from './promotion.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { ProviderRegistry } from './provider-registry';
import type { CrossPostPlatform } from './providers/promotion-provider.interface';
import type { CrossPost } from '../db/schema/cross-posts';

/**
 * XactionController (AC7) — Story 5.1.
 *
 * API endpoints cho seller promote + view + remove cross-post (FR10, FR12).
 * Guard: JwtAuthGuard (seller phải đăng nhập). Ownership check trong service.
 *
 * Endpoints:
 *   POST   /xaction/promote              — promote listing to platforms (202)
 *   GET    /xaction/cross-posts?listingId — list cross-posts for seller dashboard
 *   DELETE /xaction/cross-posts/:id       — remove cross-post (202)
 *   PATCH  /xaction/cross-posts/:id       — confirm assisted post (Story 5.3)
 *
 * AD-3: HTTP handler KHÔNG await job — chỉ enqueue + return 202 Accepted.
 * E9: multiple platforms, 1 fail → partial success (AD-3 independent failure).
 */
const promoteSchema = z.object({
  listingId: z.string().uuid(),
  platforms: z.array(z.enum(['facebook', 'cho_tot', 'zalo'])).min(1),
});

// Story 5.3: PATCH confirm assisted post.
const confirmSchema = z.object({
  status: z.literal('posted'),
  externalUrl: z.string().url('externalUrl phải là URL hợp lệ'),
});

interface PromoteError {
  platform: CrossPostPlatform;
  message: string;
}

interface PromoteResponse {
  crossPosts: CrossPost[];
  enqueued: number;
  errors: PromoteError[];
}

@Controller('xaction')
@UseGuards(JwtAuthGuard)
export class XactionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly registry: ProviderRegistry,
  ) {}

  /**
   * POST /xaction/promote — promote listing to multiple platforms.
   * Body: { listingId, platforms[] } → createCrossPost for each → 202.
   * H2 fix: pre-validate request-level MỘT LẦN trước vòng lặp
   *   (ownership 403, PUBLISHED 400, platform enabled 400) → throw ngay.
   * Chỉ lỗi per-platform duplicate (409) mới vào errors[] (E9 partial success).
   * E9: 1 platform duplicate → skip + return error detail, KHÔNG fail toàn request.
   */
  @Post('promote')
  @HttpCode(HttpStatus.ACCEPTED)
  async promote(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<PromoteResponse> {
    const result = promoteSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        details: result.error.issues,
      });
    }
    const { listingId, platforms } = result.data;
    const user = (req as Request & { user: JwtUser }).user;

    // H2: pre-validate request-level (ownership + PUBLISHED + enabled platforms).
    // Fail-fast — throw 403/400/404 ngay, KHÔNG chôn vào errors[].
    await this.promotionService.validatePromoteRequest(listingId, user.id, platforms);

    const crossPosts: CrossPost[] = [];
    const errors: PromoteError[] = [];
    let enqueued = 0;

    for (const platform of platforms) {
      try {
        const cp = await this.promotionService.createCrossPost(listingId, platform, user.id);
        crossPosts.push(cp);
        enqueued++;
      } catch (e) {
        // Chỉ ConflictException (duplicate 409) → errors[] (E9 partial success).
        // Lỗi 403/400/404 đã được validatePromoteRequest chặn trước vòng lặp.
        if (e instanceof ConflictException) {
          errors.push({ platform, message: e.message });
          continue;
        }
        throw e;
      }
    }

    return { crossPosts, enqueued, errors };
  }

  /**
   * GET /xaction/cross-posts?listingId= — list cross-posts for seller dashboard.
   * H1 fix: ownership check — service verify sellerId === listing.sellerId (403 if not).
   */
  @Get('cross-posts')
  async listCrossPosts(
    @Query('listingId') listingId: string,
    @Req() req: Request,
  ): Promise<CrossPost[]> {
    if (!listingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
      throw new BadRequestException('listingId không hợp lệ (UUID)');
    }
    const user = (req as Request & { user: JwtUser }).user;
    // H1: service kiểm ownership (403 nếu sellerId mismatch, 404 nếu listing không tồn tại).
    return this.promotionService.listCrossPosts(listingId, user.id);
  }

  /**
   * DELETE /xaction/cross-posts/:id — remove cross-post (202 Accepted).
   */
  @Delete('cross-posts/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  async removeCrossPost(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const user = (req as Request & { user: JwtUser }).user;
    await this.promotionService.removeCrossPost(id, user.id);
    return { message: 'Cross-post removal enqueued' };
  }

  /**
   * PATCH /xaction/cross-posts/:id — confirm assisted post (Story 5.3).
   * Seller đã manual post trên Chợ Tốt → confirm với ad URL.
   * Body: { status: 'posted', externalUrl: 'https://chotot.com/ad/...' }
   * Chỉ cho phép khi cross_post.status='assisted' (409 nếu không).
   */
  @Patch('cross-posts/:id')
  async confirmAssistedPost(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<CrossPost> {
    const result = confirmSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        details: result.error.issues,
      });
    }
    const user = (req as Request & { user: JwtUser }).user;
    return this.promotionService.confirmAssistedPost(id, user.id, result.data.externalUrl);
  }
}
