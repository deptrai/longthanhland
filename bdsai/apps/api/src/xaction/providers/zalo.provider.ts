import { Injectable, Logger } from '@nestjs/common';
import { ZaloListingFormatter } from '../zalo-listing-formatter';
import type {
  IPromotionProvider,
  PostListingInput,
  PostResult,
  ProviderPostStatus,
  RemovePostInput,
} from './promotion-provider.interface';

/**
 * ZaloProvider (AC1, AC2, AC7) — Story 5.4.
 *
 * Implements IPromotionProvider — Zalo "assisted posting" MVP.
 * Zalo không có public API cho third-party posting → same approach as Chợ Tốt:
 * format listing + generate posting URL → seller tự đăng manual → PATCH confirm.
 *
 * - postListing: format via ZaloListingFormatter → return assisted result
 *   { externalUrl: postingUrl, providerJobId: 'zalo-assisted-{listingId}', assisted: true }
 * - removePost: throw "not supported" (AD-9 best-effort → removal_failed).
 * - getPostStatus: 'pending' cho assisted (chưa confirm).
 *
 * Upgrade path: Zalo OA API (enterprise) hoặc Puppeteer automation (post-MVP).
 */
@Injectable()
export class ZaloProvider implements IPromotionProvider {
  private readonly logger = new Logger(ZaloProvider.name);
  readonly platform = 'zalo' as const;

  constructor(private readonly formatter: ZaloListingFormatter) {}

  async postListing(input: PostListingInput): Promise<PostResult> {
    const { postingUrl, postText } = this.formatter.formatForZalo(input);
    const providerJobId = `zalo-assisted-${input.listingId}`;

    this.logger.log(
      {
        action: 'zalo-assisted',
        listingId: input.listingId,
        postingUrl,
        textLen: postText.length,
      },
      'ZaloProvider postListing — assisted mode (seller tự đăng)',
    );

    return {
      externalUrl: postingUrl,
      providerJobId,
      assisted: true,
    };
  }

  async removePost(input: RemovePostInput): Promise<void> {
    // AD-9: Zalo removal not supported — throw → processor retry 3x → removal_failed.
    void input;
    throw new Error('Zalo removal not supported — gỡ thủ công trên Zalo');
  }

  async getPostStatus(providerJobId: string): Promise<ProviderPostStatus> {
    // Assisted mode: luôn 'pending' cho đến khi seller PATCH confirm.
    void providerJobId;
    return 'pending';
  }
}
