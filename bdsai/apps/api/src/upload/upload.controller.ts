import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';

/**
 * UploadController (AC5, AC9, AD-1) — Story 2.3.
 *
 * POST /upload/avatar — avatar upload (JwtAuthGuard + sharp WebP + Supabase Storage).
 * AD-1: module riêng (reusable cho Story 3.2 listing image upload).
 *
 * AC9: rate limit 10 upload / 15 phút / IP (tránh spam upload).
 * AC5b: FileInterceptor limits fileSize 10MB (reject trước sharp convert — tránh OOM).
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  // AC9: rate limit 10 upload / 15 phút / IP.
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — AC5b/E5.
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh');
    }
    // Guard đã verify JWT + attach request.user = { id, email }.
    const user = (req as Request & { user: JwtUser }).user;
    return this.uploadService.uploadAvatar(user.id, file);
  }
}
