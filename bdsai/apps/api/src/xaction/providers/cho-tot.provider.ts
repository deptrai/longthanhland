import { Injectable, Logger } from '@nestjs/common';
import { ChoTotListingFormatter } from '../cho-tot-listing-formatter';
import type {
  IPromotionProvider,
  PostListingInput,
  PostResult,
  ProviderPostStatus,
  RemovePostInput,
} from './promotion-provider.interface';

/**
 * ChoTotProvider (AC1, AC2, AC9) — Story 5.3.
 *
 * Implements IPromotionProvider — Chợ Tốt "assisted posting" MVP.
 * Chợ Tốt không có public API + Cloudflare anti-bot mạnh → full Puppeteer
 * automation fragile. MVP: format listing + generate posting URL → seller
 * tự đăng manual → PATCH confirm với ad URL.
 *
 * - postListing: format via ChoTotListingFormatter → return assisted result
 *   { externalUrl: postingUrl, providerJobId: 'chotot-assisted-{listingId}', assisted: true }
 * - removePost: throw "not supported" (AD-9 best-effort → removal_failed).
 * - getPostStatus: 'pending' cho assisted (chưa confirm), 'posted' cho confirmed.
 *
 * Upgrade path: thay postListing bằng Puppeteer automation (post-MVP).
 */
@Injectable()
export class ChoTotProvider implements IPromotionProvider {
  private readonly logger = new Logger(ChoTotProvider.name);
  readonly platform = 'cho_tot' as const;

  constructor(private readonly formatter: ChoTotListingFormatter) {}

  async postListing(input: PostListingInput): Promise<PostResult> {
    const { formatted, postingUrl } = this.formatter.formatForChoTot(input);
    const providerJobId = `chotot-assisted-${input.listingId}`;

    this.logger.log(
      {
        action: 'chotot-assisted',
        listingId: input.listingId,
        postingUrl,
        titleLen: formatted.title.length,
        descLen: formatted.description.length,
      },
      'ChoTotProvider postListing — assisted mode (seller tự đăng)',
    );

    return {
      externalUrl: postingUrl,
      providerJobId,
      assisted: true,
    };
  }

  async removePost(input: RemovePostInput): Promise<void> {
    // AD-9: Chợ Tốt removal not supported — throw → processor retry 3x → removal_failed.
    // UI hiển thị "gỡ thủ công trên Chợ Tốt" (story FE sau).
    void input;
    throw new Error('Chợ Tốt removal not supported — gỡ thủ công trên Chợ Tốt');
  }

  async getPostStatus(providerJobId: string): Promise<ProviderPostStatus> {
    // Assisted mode: providerJobId = 'chotot-assisted-{listingId}'.
    // Status 'pending' cho đến khi seller PATCH confirm → status='posted' (DB).
    // Provider không có cách check Chợ Tốt ad status → luôn 'pending'.
    // Processor/Service dùng DB status thay vì getPostStatus cho assisted.
    void providerJobId;
    return 'pending';
  }
}
