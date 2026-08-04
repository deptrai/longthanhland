import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { crossPosts, type CrossPost } from '../db/schema/cross-posts';
import { publicListings } from '../db/schema/public-listings';
import { ProviderRegistry } from './provider-registry';
import type { CrossPostPlatform } from './providers/promotion-provider.interface';

/**
 * isUniqueViolation — detect Postgres unique constraint violation (code 23505).
 * M1: map raw PG error → ConflictException (không rò rỉ constraint name).
 * Drizzle/postgres.js wrap error trong object có `code` property.
 */
function isUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as Record<string, unknown>;
  if (err['code'] === '23505') return true;
  const msg = typeof err['message'] === 'string' ? err['message'] : '';
  return /unique constraint|duplicate key/i.test(msg);
}

/**
 * PromotionService (AC6, AD-2, AD-9) — Story 5.1.
 *
 * Single data mutation path cho cross_posts (AD-2).
 * Public methods:
 *   - createCrossPost(listingId, platform, sellerId) — validate PUBLISHED,
 *     check duplicate, insert pending, enqueue post job.
 *   - removeCrossPost(crossPostId, sellerId?) — enqueue remove job.
 *   - listCrossPosts(listingId) — list for seller dashboard (FR12).
 *   - removeActiveCrossPosts(listingId) — AD-9 lifecycle removal
 *     (called by marketplace on status change → REJECTED/DELETED/SOLD/EXPIRED).
 *
 * HTTP handler KHÔNG await job — chỉ enqueue + return (AD-3 async).
 */
@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @InjectQueue('cross-post') private readonly crossPostQueue: Queue,
    private readonly registry: ProviderRegistry,
  ) {}

  /**
   * validatePromoteRequest — pre-validate request-level (H2 fix).
   * Kiểm tra MỘT LẦN trước vòng lặp promote:
   *   - listing tồn tại → 404
   *   - ownership (sellerId) → 403
   *   - status PUBLISHED → 400 (E2)
   *   - mọi platform enabled → 400 (E5)
   * Throw ngay (fail-fast) — KHÔNG chôn vào errors[].
   * Chỉ lỗi per-platform (duplicate 409) mới vào errors[] ở controller.
   */
  async validatePromoteRequest(
    listingId: string,
    sellerId: string,
    platforms: CrossPostPlatform[],
  ): Promise<void> {
    // E5: validate mọi platform enabled trước (fail-fast).
    for (const platform of platforms) {
      this.registry.getProvider(platform);
    }

    // Fetch listing — validate exists + ownership + PUBLISHED.
    const listingRows = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, listingId));
    const listing = listingRows[0];
    if (!listing) {
      throw new NotFoundException('Tin không tồn tại');
    }
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền quảng bá tin này');
    }
    if (listing.status !== 'PUBLISHED') {
      throw new BadRequestException('Chỉ quảng bá được tin đang hiển thị (PUBLISHED)');
    }
  }

  /**
   * createCrossPost — validate PUBLISHED, check duplicate, insert pending, enqueue.
   * E1: duplicate (listingId, platform) with status pending/posted → 409.
   * E2: non-PUBLISHED listing → 400.
   * Cho promote lại nếu status = failed/removed/removal_failed (update existing row).
   * Lưu ý: ownership/PUBLISHED/enabled đã được validatePromoteRequest check
   * (controller gọi trước vòng lặp). Method này vẫn giữ check để an toàn khi
   * gọi độc lập, nhưng controller KHÔNG chôn 403/400 vào errors[] nữa.
   */
  async createCrossPost(
    listingId: string,
    platform: CrossPostPlatform,
    sellerId: string,
  ): Promise<CrossPost> {
    // E5: platform không enabled → 400.
    this.registry.getProvider(platform);

    // Fetch listing — validate exists + PUBLISHED + ownership.
    const listingRows = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, listingId));
    const listing = listingRows[0];
    if (!listing) {
      throw new NotFoundException('Tin không tồn tại');
    }
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền quảng bá tin này');
    }
    // E2: chỉ PUBLISHED mới promote được.
    if (listing.status !== 'PUBLISHED') {
      throw new BadRequestException('Chỉ quảng bá được tin đang hiển thị (PUBLISHED)');
    }

    // E1: check existing cross_post cho (listingId, platform).
    const existingRows = await this.db
      .select()
      .from(crossPosts)
      .where(and(eq(crossPosts.listingId, listingId), eq(crossPosts.platform, platform)));
    const existing = existingRows[0];

    let crossPost: CrossPost;
    if (existing) {
      // Cho promote lại nếu status = failed/removed/removal_failed.
      if (existing.status === 'pending' || existing.status === 'posted') {
        throw new ConflictException('Tin đã quảng bá trên nền tảng này');
      }
      // Reuse existing row — update status pending.
      const [updated] = await this.db
        .update(crossPosts)
        .set({
          status: 'pending',
          externalUrl: null,
          providerJobId: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(crossPosts.id, existing.id))
        .returning();
      if (!updated) throw new Error('Failed to update cross_post');
      crossPost = updated;
    } else {
      // Insert new row status pending.
      // M1: catch unique violation (concurrent race — 2 request qua service-check,
      // 1 insert fail với PG code 23505) → map sang ConflictException 409
      // (KHÔNG rò rỉ raw PG error / constraint name ra client).
      try {
        const [inserted] = await this.db
          .insert(crossPosts)
          .values({
            listingId,
            platform,
            status: 'pending',
          })
          .returning();
        if (!inserted) throw new Error('Failed to create cross_post');
        crossPost = inserted;
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new ConflictException('Tin đã quảng bá trên nền tảng này');
        }
        throw e;
      }
    }

    // Enqueue post job (AD-3 async — KHÔNG await job completion).
    await this.crossPostQueue.add(
      'post',
      {
        crossPostId: crossPost.id,
        platform,
        listingId,
        action: 'post',
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(
      { action: 'create-cross-post', crossPostId: crossPost.id, listingId, platform, sellerId },
      'Cross-post created + post job enqueued',
    );

    return crossPost;
  }

  /**
   * removeCrossPost — enqueue remove job (best-effort, AD-9).
   * Validate cross_post tồn tại + ownership (nếu sellerId cung cấp).
   * KHÔNG await job completion.
   */
  async removeCrossPost(crossPostId: string, sellerId?: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(crossPosts)
      .where(eq(crossPosts.id, crossPostId));
    const crossPost = rows[0];
    if (!crossPost) {
      throw new NotFoundException('Cross-post không tồn tại');
    }

    // Ownership check — join listing để lấy sellerId.
    if (sellerId) {
      const listingRows = await this.db
        .select({ sellerId: publicListings.sellerId })
        .from(publicListings)
        .where(eq(publicListings.id, crossPost.listingId));
      const listing = listingRows[0];
      if (!listing || listing.sellerId !== sellerId) {
        throw new ForbiddenException('Không có quyền gỡ cross-post này');
      }
    }

    // Chỉ enqueue remove nếu status đang active (pending/posted/assisted).
    // Tránh enqueue remove cho row đã removed/failed.
    if (crossPost.status !== 'pending' && crossPost.status !== 'posted' && crossPost.status !== 'assisted') {
      this.logger.warn(
        { action: 'remove-cross-post', crossPostId, status: crossPost.status, reason: 'not-active' },
        'Cross-post not active — skip remove enqueue',
      );
      return;
    }

    await this.crossPostQueue.add(
      'remove',
      {
        crossPostId: crossPost.id,
        platform: crossPost.platform,
        listingId: crossPost.listingId,
        externalUrl: crossPost.externalUrl,
        providerJobId: crossPost.providerJobId,
        action: 'remove',
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(
      { action: 'remove-cross-post', crossPostId, platform: crossPost.platform },
      'Cross-post remove job enqueued',
    );
  }

  /**
   * listCrossPosts — list cross-posts for seller dashboard (FR12).
   * H1 fix: verify ownership (sellerId) trước khi trả — IDOR prevention.
   * Query listing → 404 if not found, 403 if sellerId mismatch.
   */
  async listCrossPosts(listingId: string, sellerId: string): Promise<CrossPost[]> {
    // H1: ownership check — fetch listing, verify sellerId.
    const listingRows = await this.db
      .select({ sellerId: publicListings.sellerId })
      .from(publicListings)
      .where(eq(publicListings.id, listingId));
    const listing = listingRows[0];
    if (!listing) {
      throw new NotFoundException('Tin không tồn tại');
    }
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền xem cross-post của tin này');
    }
    return this.db
      .select()
      .from(crossPosts)
      .where(eq(crossPosts.listingId, listingId));
  }

  /**
   * removeActiveCrossPosts — AD-9 lifecycle removal.
   * Called by marketplace when listing transition → REJECTED/DELETED/SOLD/EXPIRED.
   * Query active cross_posts (status pending/posted) → enqueue remove job cho mỗi row.
   * Best-effort — KHÔNG throw (caller dùng non-blocking .catch()).
   */
  async removeActiveCrossPosts(listingId: string): Promise<{ enqueued: number }> {
    const activeRows = await this.db
      .select()
      .from(crossPosts)
      .where(
        and(
          eq(crossPosts.listingId, listingId),
          inArray(crossPosts.status, ['pending', 'posted', 'assisted']),
        ),
      );

    if (activeRows.length === 0) {
      return { enqueued: 0 };
    }

    let enqueued = 0;
    for (const row of activeRows) {
      try {
        await this.crossPostQueue.add(
          'remove',
          {
            crossPostId: row.id,
            platform: row.platform,
            listingId: row.listingId,
            externalUrl: row.externalUrl,
            providerJobId: row.providerJobId,
            action: 'remove',
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
        enqueued++;
      } catch (e) {
        // AD-3 independent failure — 1 platform fail ≠ total fail.
        this.logger.error(
          {
            action: 'lifecycle-remove-enqueue',
            crossPostId: row.id,
            platform: row.platform,
            err: e instanceof Error ? { name: e.name, message: e.message } : String(e),
          },
          'Failed to enqueue removal for cross-post (non-blocking)',
        );
      }
    }

    this.logger.log(
      { action: 'lifecycle-remove', listingId, enqueued, total: activeRows.length },
      'Active cross-posts removal enqueued (AD-9)',
    );

    return { enqueued };
  }

  /**
   * confirmAssistedPost — Story 5.3.
   * Seller đã manual post trên Chợ Tốt → confirm với ad URL.
   * Validate: cross_post tồn tại, ownership, status='assisted' (409 nếu không).
   * Update: status='posted', externalUrl=adUrl.
   */
  async confirmAssistedPost(crossPostId: string, sellerId: string, externalUrl: string): Promise<CrossPost> {
    const rows = await this.db
      .select()
      .from(crossPosts)
      .where(eq(crossPosts.id, crossPostId));
    const crossPost = rows[0];
    if (!crossPost) {
      throw new NotFoundException('Cross-post không tồn tại');
    }

    // Ownership check — join listing để lấy sellerId.
    const listingRows = await this.db
      .select({ sellerId: publicListings.sellerId })
      .from(publicListings)
      .where(eq(publicListings.id, crossPost.listingId));
    const listing = listingRows[0];
    if (!listing || listing.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền cập nhật cross-post này');
    }

    // Chỉ confirm được khi status='assisted'.
    if (crossPost.status !== 'assisted') {
      throw new ConflictException('Chỉ xác nhận được tin đang chờ đăng thủ công (assisted)');
    }

    const [updated] = await this.db
      .update(crossPosts)
      .set({
        status: 'posted',
        externalUrl,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(crossPosts.id, crossPostId))
      .returning();
    if (!updated) throw new Error('Failed to update cross_post');

    this.logger.log(
      { action: 'confirm-assisted', crossPostId, externalUrl },
      'Assisted cross-post confirmed by seller',
    );

    return updated;
  }
}
