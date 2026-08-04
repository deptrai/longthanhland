import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DealRadarService, type CreateFilterDto } from './deal-radar.service';

@Controller('deal-radar')
@UseGuards(JwtAuthGuard)
export class DealRadarController {
  constructor(private readonly service: DealRadarService) {}

  @Post('filters')
  async createFilter(@Request() req: ExpressRequest, @Body() dto: CreateFilterDto) {
    const sellerId = (req as any).user?.sub;
    return this.service.createFilter(sellerId, dto);
  }

  @Get('filters')
  async listFilters(@Request() req: ExpressRequest) {
    const sellerId = (req as any).user?.sub;
    return this.service.listFilters(sellerId);
  }

  @Get('filters/:id/matches')
  async getMatches(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.service.matchListings(id, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }
}
