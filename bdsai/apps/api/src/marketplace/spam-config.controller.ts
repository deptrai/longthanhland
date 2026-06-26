import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import { SpamConfigService } from './spam-config.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

// Story 4.3 — Spam config controller (admin only).
@Controller('marketplace/admin/spam')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SpamConfigController {
  constructor(private readonly spamConfigService: SpamConfigService) {}

  @Get('keywords')
  async listKeywords() {
    return this.spamConfigService.listKeywords();
  }

  @Post('keywords')
  async addKeyword(@Body() body: { keyword?: string }, @Req() req: Request) {
    const user = (req as Request & { user: JwtUser }).user;
    if (!body.keyword) throw new Error('Keyword là bắt buộc');
    return this.spamConfigService.addKeyword(body.keyword, user.id);
  }

  @Delete('keywords/:id')
  async removeKeyword(@Param('id') id: string) {
    await this.spamConfigService.removeKeyword(id);
    return { deleted: true };
  }

  @Get('config')
  async listConfig() {
    return this.spamConfigService.listConfig();
  }

  @Put('config/:key')
  async updateConfig(
    @Param('key') key: string,
    @Body() body: { value?: string },
    @Req() req: Request,
  ) {
    const user = (req as Request & { user: JwtUser }).user;
    if (!body.value) throw new Error('Value là bắt buộc');
    return this.spamConfigService.updateConfig(key, body.value, user.id);
  }

  // Story 4.3: override spam flag for false positive.
  @Post('listings/:id/override')
  async overrideSpam(
    @Param('id') id: string,
    @Body() body: { spamFlagged?: boolean },
    @Req() req: Request,
  ) {
    const user = (req as Request & { user: JwtUser }).user;
    const schema = z.object({ spamFlagged: z.boolean() });
    const result = schema.safeParse(body);
    if (!result.success) throw new Error('spamFlagged boolean là bắt buộc');
    await this.spamConfigService.overrideSpamFlag(id, user.id, result.data.spamFlagged);
    return { overridden: true };
  }
}
