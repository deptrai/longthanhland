import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { crossPosts } from '../db/schema/cross-posts';
import { publicListings } from '../db/schema/public-listings';
import { ProviderRegistry } from './provider-registry';
import type {
  CrossPostPlatform,
  PostListingInput,
} from './providers/promotion-provider.interface';

/**
 * CrossPostProcessor (AC4, AD-3) — Story 5.1.
 *
 * BullMQ @Processor('cross-post') — async job processing (AD-3).
 * Retry 3x exponential backoff (NFR7) — BullMQ attempts=3 set lúc enqueue.
 *
 * Job types:
 *   - 'post'   — call provider.postListing(), update status posted/failed.
 *   - 'remove' — call provider.removePost(), update status removed/removal_failed.
 *
 * E7: crossPostId not found (listing deleted → cascade) → log warn + return
 *     (KHÔNG throw, không retry — row đã không tồn tại).
 *
 * Hết retry (job.attemptsMade >= job.opts.attempts) → set terminal status
 * (failed/removal_failed) + errorMessage. KHÔNG throw (tránh BullMQ retry thêm).
 */
interface CrossPostJobData {
  crossPostId: string;
  platform: CrossPostPlatform;
  listingId: string;
  action: 'post' | 'remove';
  externalUrl?: string | null;
  providerJobId?: string | null;
}

@Processor('cross-post', { concurrency: 2 })
export class CrossPostProcessor extends WorkerHost {
  private readonly logger = new Logger(CrossPostProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly registry: ProviderRegistry,
  ) {
    super();
  }

  async process(job: Job<CrossPostJobData>): Promise<void> {
    const { crossPostId, platform, listingId, action } = job.data;
    this.logger.log(
      { action: 'cross-post-process', crossPostId, platform, listingId, jobType: action, attempt: job.attemptsMade + 1 },
      'Processing cross-post job',
    );

    if (action === 'post') {
      await this.processPost(job);
    } else if (action === 'remove') {
      await this.processRemove(job);
    }
  }

  /**
   * processPost — call provider.postListing(), update status posted/failed.
   * E7: crossPostId not found → graceful skip.
   * Hết retry → status='failed' + errorMessage (KHÔNG throw).
   */
  private async processPost(job: Job<CrossPostJobData>): Promise<void> {
    const { crossPostId, platform, listingId } = job.data;

    // Fetch cross_post row.
    const cpRows = await this.db
      .select()
      .from(crossPosts)
      .where(eq(crossPosts.id, crossPostId));
    const crossPost = cpRows[0];
    // E7: row not found (listing deleted → cascade) → graceful skip.
    if (!crossPost) {
      this.logger.warn(
        { action: 'cross-post-process', crossPostId, reason: 'not-found' },
        'Cross-post not found — graceful skip (listing may be deleted)',
      );
      return;
    }

    // Fetch listing data for postListing input.
    const listingRows = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, listingId));
    const listing = listingRows[0];
    if (!listing) {
      this.logger.warn(
        { action: 'cross-post-process', crossPostId, listingId, reason: 'listing-not-found' },
        'Listing not found — graceful skip',
      );
      return;
    }

    const provider = this.registry.getProvider(platform);
    const input: PostListingInput = {
      listingId: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      area: listing.area,
      province: listing.province,
      district: listing.district,
      address: listing.address,
      propertyType: listing.propertyType,
      listingType: listing.listingType,
      images: listing.images ?? [],
    };

    try {
      const result = await provider.postListing(input);
      // Story 5.3: assisted result → status='assisted' (seller tự đăng, PATCH confirm sau).
      const status = result.assisted ? 'assisted' : 'posted';
      await this.db
        .update(crossPosts)
        .set({
          status,
          externalUrl: result.externalUrl,
          providerJobId: result.providerJobId,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(crossPosts.id, crossPostId));
      this.logger.log(
        { action: `cross-post-${status}`, crossPostId, platform, externalUrl: result.externalUrl },
        `Cross-post ${status} successfully`,
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      // Hết retry → set terminal status failed (KHÔNG throw — tránh retry thêm).
      if (this.isLastAttempt(job)) {
        await this.db
          .update(crossPosts)
          .set({
            status: 'failed',
            errorMessage: errMsg,
            updatedAt: new Date(),
          })
          .where(eq(crossPosts.id, crossPostId));
        this.logger.error(
          { action: 'cross-post-failed', crossPostId, platform, err: errMsg, attempts: job.attemptsMade + 1 },
          'Cross-post failed after retries — status=failed',
        );
        return;
      }
      // Còn retry → throw để BullMQ retry (exponential backoff).
      throw e;
    }
  }

  /**
   * processRemove — call provider.removePost(), update status removed/removal_failed.
   * E7: crossPostId not found → graceful skip (row deleted, listing gone).
   * H3 fix: nếu row not found NHƯNG job data mang externalUrl/providerJobId
   *   (luồng deleteListing — cascade đã xóa row nhưng job đủ data) → vẫn gọi
   *   provider.removePost() để gỡ bài ngoài (AD-9 orphan prevention).
   * Hết retry → status='removal_failed' + errorMessage (AD-9 best-effort).
   */
  private async processRemove(job: Job<CrossPostJobData>): Promise<void> {
    const { crossPostId, platform, externalUrl, providerJobId } = job.data;

    // E7: row not found → check job data có đủ để gỡ không.
    const cpRows = await this.db
      .select()
      .from(crossPosts)
      .where(eq(crossPosts.id, crossPostId));
    const crossPost = cpRows[0];
    if (!crossPost) {
      // H3: row gone (cascade delete) — nếu job mang externalUrl/providerJobId,
      // vẫn gọi provider.removePost() để gỡ bài ngoài (AD-9 orphan prevention).
      if (!externalUrl && !providerJobId) {
        this.logger.warn(
          { action: 'cross-post-remove', crossPostId, reason: 'not-found-no-data' },
          'Cross-post not found + no job data — graceful skip',
        );
        return;
      }
      this.logger.log(
        { action: 'cross-post-remove', crossPostId, reason: 'row-gone-job-data', platform },
        'Cross-post row gone but job has data — proceeding with provider.removePost (H3/AD-9)',
      );
    }

    const provider = this.registry.getProvider(platform);
    try {
      await provider.removePost({
        crossPostId,
        externalUrl: externalUrl ?? crossPost?.externalUrl,
        providerJobId: providerJobId ?? crossPost?.providerJobId,
      });
      // Update status removed — nếu row đã cascade-deleted, update affects 0 rows (OK).
      await this.db
        .update(crossPosts)
        .set({
          status: 'removed',
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(crossPosts.id, crossPostId));
      this.logger.log(
        { action: 'cross-post-removed', crossPostId, platform },
        'Cross-post removed successfully',
      );
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      // Hết retry → status='removal_failed' (AD-9 best-effort, KHÔNG throw).
      // Nếu row đã cascade-deleted, update affects 0 rows (OK — job data đã dùng).
      if (this.isLastAttempt(job)) {
        await this.db
          .update(crossPosts)
          .set({
            status: 'removal_failed',
            errorMessage: errMsg,
            updatedAt: new Date(),
          })
          .where(eq(crossPosts.id, crossPostId));
        this.logger.error(
          { action: 'cross-post-removal-failed', crossPostId, platform, err: errMsg, attempts: job.attemptsMade + 1 },
          'Cross-post removal failed after retries — status=removal_failed',
        );
        return;
      }
      // Còn retry → throw để BullMQ retry.
      throw e;
    }
  }

  /**
   * isLastAttempt — check if this is the last allowed attempt.
   * BullMQ attemptsMade is 0-indexed (first attempt = 0).
   */
  private isLastAttempt(job: Job<CrossPostJobData>): boolean {
    const maxAttempts = job.opts.attempts ?? 3;
    return job.attemptsMade + 1 >= maxAttempts;
  }
}
