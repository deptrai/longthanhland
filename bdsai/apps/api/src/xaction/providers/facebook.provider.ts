import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';
import { ListingFormatter } from '../listing-formatter';
import { XactionsClient, type FacebookAuthCookie } from '../xactions-client';
import type {
  IPromotionProvider,
  PostListingInput,
  PostResult,
  ProviderPostStatus,
  RemovePostInput,
} from './promotion-provider.interface';

/**
 * FacebookProvider (AC1, AC9) — Story 5.2 / Story 5.5.
 *
 * Implements IPromotionProvider — gọi XActions REST API qua XactionsClient
 * để đăng tin BĐS lên Facebook. Story 5.5: pass mediaUrls (forward-compatible —
 * XActions field exists but upload not yet implemented).
 *
 * - postListing: format listing via ListingFormatter → XactionsClient.postToFacebook
 *   → return { externalUrl: postUrl ?? null, providerJobId: operationId } (E3).
 * - removePost: throw "not supported" (AD-9 best-effort → processor set removal_failed).
 * - getPostStatus: map XActions status → ProviderPostStatus (AC9).
 *
 * AD-8: KHÔNG log raw cookie/token. cross_posts chỉ lưu externalUrl + providerJobId.
 */
@Injectable()
export class FacebookProvider implements IPromotionProvider {
  private readonly logger = new Logger(FacebookProvider.name);
  readonly platform = 'facebook' as const;

  constructor(
    private readonly client: XactionsClient,
    private readonly formatter: ListingFormatter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async postListing(input: PostListingInput): Promise<PostResult> {
    const content = this.formatter.formatForFacebook(input);
    const authCookie = this.buildAuthCookie();
    // Story 5.5: pass image URLs to XActions (forward-compatible — upload not yet impl).
    const mediaUrls = extractImageUrls(input.images);

    this.logger.log(
      { action: 'fb-post', listingId: input.listingId, contentLen: content.length, imageCount: mediaUrls.length },
      'FacebookProvider postListing — calling XActions',
    );

    const result = await this.client.postToFacebook({ text: content, authCookie, mediaUrls });

    // E3: postUrl frequently null (FB XHR submit, no navigation).
    return {
      externalUrl: result.postUrl ?? null,
      providerJobId: result.operationId,
    };
  }

  async removePost(input: RemovePostInput): Promise<void> {
    // AD-9: FB removal not supported — throw → processor retry 3x → removal_failed.
    // UI hiển thị "gỡ thủ công trên Facebook" (story FE sau).
    void input;
    throw new Error('FB removal not supported — gỡ thủ công trên Facebook');
  }

  async getPostStatus(providerJobId: string): Promise<ProviderPostStatus> {
    const op = await this.client.getOperationStatus(providerJobId);
    return this.mapStatus(op.status);
  }

  /**
   * Map XActions operation status → ProviderPostStatus (AC9).
   *   pending/running → pending (vẫn đang chạy)
   *   completed      → posted (đăng thành công)
   *   failed/cancelled/unknown → failed (defensive)
   */
  private mapStatus(status: string): ProviderPostStatus {
    switch (status) {
      case 'pending':
      case 'running':
        return 'pending';
      case 'completed':
        return 'posted';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        // Unknown → failed (defensive — E8).
        this.logger.warn(
          { action: 'fb-status-map', status, reason: 'unknown' },
          `Unknown XActions operation status "${status}" → failed`,
        );
        return 'failed';
    }
  }

  /**
   * Build authCookie từ env: accountId (preferred) HOẶC c_user+xs (raw fallback).
   * E6 validation nằm trong XactionsClient (throw nếu cả hai path empty).
   */
  private buildAuthCookie(): FacebookAuthCookie {
    const accountId = this.config.get('XACTIONS_FB_ACCOUNT_ID', { infer: true }) ?? '';
    const cUser = this.config.get('XACTIONS_FB_C_USER', { infer: true }) ?? '';
    const xs = this.config.get('XACTIONS_FB_XS', { infer: true }) ?? '';

    if (accountId && accountId.trim().length > 0) {
      return { accountId };
    }
    return { cUser, xs };
  }
}

/**
 * Extract image URLs from listing images — cover first, max 10 (AC6, AC7).
 * Forward-compatible: XActions mediaUrls field accepts array but upload not yet impl.
 */
function extractImageUrls(images: Array<{ url: string; isCover: boolean }>): string[] {
  if (!images || images.length === 0) return [];
  // Sort: cover first, then rest by order.
  const sorted = [...images].sort((a, b) => {
    if (a.isCover && !b.isCover) return -1;
    if (!a.isCover && b.isCover) return 1;
    return 0;
  });
  return sorted.slice(0, 10).map((img) => img.url);
}
