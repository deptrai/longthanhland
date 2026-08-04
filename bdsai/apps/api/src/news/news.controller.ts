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
  Query,
  UseGuards,
} from '@nestjs/common';
import { NewsService, VALID_CATEGORIES, type NewsArticle, type NewsListResponse } from './news.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * NewsController — Story 5.8.
 *
 * Public endpoints:
 *   - GET /news — published articles (paginated, optional category filter)
 *
 * Admin endpoints (AdminGuard):
 *   - GET /admin/news — all articles
 *   - POST /admin/news — create
 *   - PATCH /admin/news/:id — update
 *   - DELETE /admin/news/:id — archive (soft delete)
 */
@Controller()
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // === PUBLIC ===

  /**
   * GET /news — public feed of published articles.
   */
  @Get('news')
  async listPublic(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ): Promise<NewsListResponse> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    if (category && !VALID_CATEGORIES.includes(category)) {
      throw new BadRequestException(`Category không hợp lệ: ${category}`);
    }
    return this.newsService.listPublished(p, l, category);
  }

  // === ADMIN ===

  @Get('admin/news')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<NewsListResponse> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.newsService.listAll(p, l);
  }

  @Post('admin/news')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: {
    title?: string;
    summary?: string;
    sourceUrl?: string;
    sourceName?: string;
    category?: string;
    imageUrl?: string;
    publishedAt?: string;
    status?: 'draft' | 'published';
  }): Promise<NewsArticle> {
    if (!body.title || !body.summary || !body.sourceUrl || !body.sourceName || !body.category) {
      throw new BadRequestException('Thiếu trường bắt buộc: title, summary, sourceUrl, sourceName, category');
    }
    return this.newsService.create({
      title: body.title,
      summary: body.summary,
      sourceUrl: body.sourceUrl,
      sourceName: body.sourceName,
      category: body.category,
      imageUrl: body.imageUrl,
      publishedAt: body.publishedAt,
      status: body.status,
    });
  }

  @Patch('admin/news/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>): Promise<NewsArticle> {
    return this.newsService.update(id, body as Parameters<NewsService['update']>[1]);
  }

  @Delete('admin/news/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@Param('id') id: string): Promise<void> {
    await this.newsService.archive(id);
  }
}
