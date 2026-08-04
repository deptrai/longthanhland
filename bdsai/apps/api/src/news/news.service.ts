import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, desc, and, sql, type SQL } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { newsArticles } from '../db/schema/news-articles';

/**
 * NewsService — Story 5.8.
 *
 * CRUD for admin-curated BĐS news articles.
 *   - Public: listPublished() — published articles, sorted by publishedAt DESC
 *   - Admin: create(), listAll(), update(), archive()
 *
 * AD-2: mutation qua Service → Drizzle.
 */
export type NewsArticle = typeof newsArticles.$inferSelect;
export type NewsArticleInput = typeof newsArticles.$inferInsert;

export interface NewsListResponse {
  items: NewsArticle[];
  total: number;
  page: number;
  limit: number;
}

const VALID_CATEGORIES = ['thi-truong', 'phap-ly', 'du-an', 'tai-chinh'];
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  /**
   * Public feed — published articles, sorted by publishedAt DESC.
   * Optional category filter.
   */
  async listPublished(page = 1, limit = DEFAULT_LIMIT, category?: string): Promise<NewsListResponse> {
    const clampedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const clampedPage = Math.max(page, 1);
    const offset = (clampedPage - 1) * clampedLimit;

    const conditions: SQL[] = [eq(newsArticles.status, 'published')];
    if (category && VALID_CATEGORIES.includes(category)) {
      conditions.push(eq(newsArticles.category, category));
    }

    const where = conditions.length === 1 ? conditions[0]! : and(...conditions);

    const items = await this.db
      .select()
      .from(newsArticles)
      .where(where)
      .orderBy(desc(newsArticles.publishedAt))
      .limit(clampedLimit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsArticles)
      .where(where);
    const total = countResult[0]?.count ?? 0;

    return { items, total, page: clampedPage, limit: clampedLimit };
  }

  /**
   * Admin list — all articles (including draft + archived).
   */
  async listAll(page = 1, limit = DEFAULT_LIMIT): Promise<NewsListResponse> {
    const clampedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const clampedPage = Math.max(page, 1);
    const offset = (clampedPage - 1) * clampedLimit;

    const items = await this.db
      .select()
      .from(newsArticles)
      .orderBy(desc(newsArticles.createdAt))
      .limit(clampedLimit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsArticles);
    const total = countResult[0]?.count ?? 0;

    return { items, total, page: clampedPage, limit: clampedLimit };
  }

  async getById(id: string): Promise<NewsArticle> {
    const result = await this.db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, id))
      .limit(1);
    if (!result[0]) throw new NotFoundException('Bài viết không tồn tại');
    return result[0];
  }

  async create(input: {
    title: string;
    summary: string;
    sourceUrl: string;
    sourceName: string;
    category: string;
    imageUrl?: string;
    publishedAt?: string;
    status?: 'draft' | 'published';
  }): Promise<NewsArticle> {
    this.validateCategory(input.category);
    this.validateUrl(input.sourceUrl, 'sourceUrl');
    if (input.imageUrl) this.validateUrl(input.imageUrl, 'imageUrl');

    const article: NewsArticleInput = {
      title: input.title,
      summary: input.summary,
      sourceUrl: input.sourceUrl,
      sourceName: input.sourceName,
      category: input.category,
      imageUrl: input.imageUrl ?? null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
      status: input.status ?? 'published',
    };

    const result = await this.db.insert(newsArticles).values(article).returning();
    const created = result[0];
    if (!created) throw new Error('Failed to create news article');
    this.logger.log({ action: 'news-create', id: created.id, title: input.title });
    return created;
  }

  async update(id: string, input: Partial<{
    title: string;
    summary: string;
    sourceUrl: string;
    sourceName: string;
    category: string;
    imageUrl: string | null;
    publishedAt: string;
    status: 'draft' | 'published' | 'archived';
  }>): Promise<NewsArticle> {
    if (input.category) this.validateCategory(input.category);
    if (input.sourceUrl) this.validateUrl(input.sourceUrl, 'sourceUrl');
    if (input.imageUrl) this.validateUrl(input.imageUrl, 'imageUrl');

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) updateData.title = input.title;
    if (input.summary !== undefined) updateData.summary = input.summary;
    if (input.sourceUrl !== undefined) updateData.sourceUrl = input.sourceUrl;
    if (input.sourceName !== undefined) updateData.sourceName = input.sourceName;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.publishedAt !== undefined) updateData.publishedAt = new Date(input.publishedAt);
    if (input.status !== undefined) updateData.status = input.status;

    const result = await this.db
      .update(newsArticles)
      .set(updateData)
      .where(eq(newsArticles.id, id))
      .returning();
    const updated = result[0];
    if (!updated) throw new NotFoundException('Bài viết không tồn tại');
    this.logger.log({ action: 'news-update', id });
    return updated;
  }

  async archive(id: string): Promise<void> {
    const result = await this.db
      .update(newsArticles)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(newsArticles.id, id))
      .returning();
    if (!result[0]) throw new NotFoundException('Bài viết không tồn tại');
    this.logger.log({ action: 'news-archive', id });
  }

  private validateCategory(category: string): void {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new BadRequestException(`Category không hợp lệ: ${category}. Phải là: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  private validateUrl(url: string, field: string): void {
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`${field} không phải là URL hợp lệ`);
    }
  }
}

export { VALID_CATEGORIES };
