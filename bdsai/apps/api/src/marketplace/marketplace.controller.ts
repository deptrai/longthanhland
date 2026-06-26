import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError, z } from 'zod';
import type { Request } from 'express';
import { MarketplaceService, type ListingItem } from './marketplace.service';
import { DevThrottle } from '../common/throttle/dev-throttle.decorator';
import { ModerationService, REJECT_REASONS } from './moderation.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { createListingSchema, updateListingSchema } from './dto/create-listing.dto';

/**
 * MarketplaceController (AC1-AC4) — Story 3.1.
 *
 * CRUD listing + status workflow cho seller.
 * Guard: JwtAuthGuard (verify JWT) — ownership check trong service.
 *
 * Endpoints:
 *   POST   /marketplace/listings          — create DRAFT (seller)
 *   GET    /marketplace/listings          — list own listings (seller)
 *   GET    /marketplace/listings/:id      — get listing (owner/admin/PUBLISHED)
 *   PATCH  /marketplace/listings/:id      — update (owner, DRAFT/PENDING/REJECTED)
 *   DELETE /marketplace/listings/:id      — delete (owner only)
 *   POST   /marketplace/listings/:id/submit — DRAFT → PENDING (owner)
 *   POST   /marketplace/listings/:id/duplicate — duplicate (owner, Story 3.2)
 *   POST   /marketplace/listings/:id/approve  — admin approve (Story 3.3)
 *   POST   /marketplace/listings/:id/reject   — admin reject (Story 3.3)
 *   GET    /marketplace/admin/pending     — admin pending queue (Story 3.3)
 */
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
// Dev: x10 (600/min).
@DevThrottle({ prodLimit: 60, ttl: 60_000 })
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly moderationService: ModerationService,
  ) {}

  // AC1: POST /marketplace/listings — create DRAFT.
  @Post('listings')
  async createListing(
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<ListingItem> {
    const result = createListingSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.createListing(user.id, result.data);
  }

  // AC1: GET /marketplace/listings — list own listings.
  @Get('listings')
  async listMyListings(@Req() req: Request): Promise<ListingItem[]> {
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.listMyListings(user.id);
  }

  // AC1: GET /marketplace/listings/:id — get listing.
  // Story 3.1: admin xem được non-PUBLISHED (isAdmin từ role attached by AdminGuard).
  @Get('listings/:id')
  async getListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser & { role?: string } }).user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    return this.marketplaceService.getListing(id, user.id, isAdmin);
  }

  // AC1: PATCH /marketplace/listings/:id — update (owner, DRAFT/PENDING/REJECTED).
  @Patch('listings/:id')
  async updateListing(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const result = updateListingSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.updateListing(id, user.id, result.data);
  }

  // AC1: DELETE /marketplace/listings/:id — delete (owner only).
  @Delete('listings/:id')
  @HttpCode(HttpStatus.OK)
  async deleteListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    await this.marketplaceService.deleteListing(id, user.id);
    return { success: true };
  }

  // Story 3.2: POST /marketplace/listings/:id/duplicate — tạo DRAFT mới từ listing có sẵn.
  @Post('listings/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.duplicateListing(id, user.id);
  }

  // AC4: POST /marketplace/listings/:id/submit — DRAFT → PENDING.
  @Post('listings/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.submitListing(id, user.id);
  }

  // Story 3.3 + 3.5: POST /marketplace/listings/:id/approve — admin PENDING → PUBLISHED + audit log.
  @Post('listings/:id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async approveListing(
    @Param('id') id: string,
    @Body() body: { spamFlagged?: boolean },
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.moderationService.approveWithAudit(id, user.id, body.spamFlagged ?? false);
  }

  // Story 3.3 + 3.5: POST /marketplace/listings/:id/reject — admin PENDING → REJECTED + audit log.
  @Post('listings/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async rejectListing(
    @Param('id') id: string,
    @Body() body: { reason?: string; spamFlagged?: boolean },
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.moderationService.rejectWithAudit(id, user.id, body.reason ?? '', body.spamFlagged ?? false);
  }

  // Story 3.3 + 3.5: GET /marketplace/admin/pending — admin pending queue with spam flags.
  @Get('admin/pending')
  @UseGuards(AdminGuard)
  async listPendingQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: Array<ListingItem & { spamFlagged: boolean; spamReasons: string[] }>; total: number; page: number; limit: number; totalPages: number }> {
    return this.moderationService.listPendingWithSpamFlags({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // Story 3.5: POST /marketplace/admin/bulk-approve — bulk approve.
  @Post('admin/bulk-approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async bulkApprove(
    @Body() body: { listingIds?: string[] },
    @Req() req: Request,
  ): Promise<{ approved: string[]; failed: Array<{ id: string; error: string }> }> {
    const user = (req as Request & { user: JwtUser }).user;
    return this.moderationService.bulkApprove(body.listingIds ?? [], user.id);
  }

  // Story 3.5: GET /marketplace/admin/reject-reasons — reject reason templates.
  @Get('admin/reject-reasons')
  @UseGuards(AdminGuard)
  async getRejectReasons(): Promise<{ reasons: string[] }> {
    return { reasons: REJECT_REASONS };
  }

  // Story 3.6: POST /marketplace/listings/:id/renew — owner gia hạn EXPIRED → PUBLISHED.
  @Post('listings/:id/renew')
  @HttpCode(HttpStatus.OK)
  async renewListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.renewListing(id, user.id);
  }

  // Story 3.6: POST /marketplace/listings/:id/sold — owner mark PUBLISHED → SOLD.
  @Post('listings/:id/sold')
  @HttpCode(HttpStatus.OK)
  async markAsSold(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.markAsSold(id, user.id);
  }

  // Story 3.6: POST /marketplace/admin/expire — cron trigger to expire listings.
  @Post('admin/expire')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async expireListings(): Promise<{ expired: number }> {
    return this.marketplaceService.expireListings();
  }

  private assertUuid(id: string): void {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException('ID tin không hợp lệ');
    }
  }
}

// Story 3.3: Public search controller — NO JWT (public access to PUBLISHED listings).
@Controller('marketplace')
// Dev: x10 (1000/min).
@DevThrottle({ prodLimit: 100, ttl: 60_000 })
export class MarketplacePublicController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // GET /marketplace/search — public search PUBLISHED listings (FTS + filter + sort + pagination).
  @Get('search')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  async searchListings(
    @Query('q') q?: string,
    @Query('province') province?: string,
    @Query('district') district?: string,
    @Query('listingType') listingType?: string,
    @Query('propertyType') propertyType?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minArea') minArea?: string,
    @Query('maxArea') maxArea?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: ListingItem[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.marketplaceService.searchListings({
      q,
      province,
      district,
      listingType,
      propertyType,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minArea: minArea ? Number(minArea) : undefined,
      maxArea: maxArea ? Number(maxArea) : undefined,
      sort: sort as 'newest' | 'price_asc' | 'price_desc' | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // Story 3.4: GET /marketplace/listings/:id/detail — public detail (PUBLISHED only, for SSR).
  @Get('listings/:id/detail')
  @Header('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
  async getPublicListing(@Param('id') id: string): Promise<ListingItem> {
    this.assertUuid(id);
    // getListing allows PUBLISHED without auth (no requesterId, no isAdmin).
    return this.marketplaceService.getListing(id, undefined, false);
  }

  private assertUuid(id: string): void {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException('ID không hợp lệ');
    }
  }
}
