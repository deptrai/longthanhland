import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodError, z } from 'zod';
import type { Request } from 'express';
import { MarketplaceService, type ListingItem } from './marketplace.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
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
 */
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

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
  @Get('listings/:id')
  async getListing(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ListingItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.marketplaceService.getListing(id, user.id, false);
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

  private assertUuid(id: string): void {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException('ID tin không hợp lệ');
    }
  }
}
