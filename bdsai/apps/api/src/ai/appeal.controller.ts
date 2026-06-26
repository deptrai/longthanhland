import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AppealService } from './appeal.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

// Story 4.4 — Appeal controller.
// POST /ai/appeals — seller tạo appeal (JWT required).
// GET /ai/appeals — admin list appeals (admin only).
// POST /ai/appeals/:id/resolve — admin resolve (admin only).
@Controller('ai/appeals')
export class AppealController {
  constructor(private readonly appealService: AppealService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createAppeal(
    @Body() body: { listingId?: string; reason?: string },
    @Req() req: Request,
  ) {
    const user = (req as Request & { user: JwtUser }).user;
    if (!body.listingId || !body.reason) {
      throw new Error('listingId + reason là bắt buộc');
    }
    return this.appealService.createAppeal(user.id, body.listingId, body.reason);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listAppeals(@Query('status') status?: string) {
    return this.appealService.listAppeals(status);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resolveAppeal(
    @Param('id') id: string,
    @Body() body: { status?: string; adminNote?: string },
    @Req() req: Request,
  ) {
    const user = (req as Request & { user: JwtUser }).user;
    if (body.status !== 'reviewed' && body.status !== 'resolved') {
      throw new Error('status phải là reviewed hoặc resolved');
    }
    await this.appealService.resolveAppeal(id, user.id, body.status, body.adminNote);
    return { resolved: true };
  }
}
