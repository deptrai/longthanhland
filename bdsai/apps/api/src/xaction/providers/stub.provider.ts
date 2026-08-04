import { Injectable } from '@nestjs/common';
import type {
  IPromotionProvider,
  PostListingInput,
  PostResult,
  ProviderPostStatus,
  RemovePostInput,
} from './promotion-provider.interface';

/**
 * StubProvider (AC1, E10) — Story 5.1.
 *
 * Mock/no-op provider để verify provider pattern + registry + queue + lifecycle
 * hoạt động end-to-end. KHÔNG gọi XActions API thật.
 *
 * Story 5.x thay stub bằng FacebookProvider/ChoTotProvider/ZaloProvider
 * (gọi XActions API/MCP) — interface IPromotionProvider không đổi (AD-3).
 */
@Injectable()
export class StubProvider implements IPromotionProvider {
  readonly platform = 'facebook' as const;

  async postListing(input: PostListingInput): Promise<PostResult> {
    // Simulate async (100ms delay).
    await delay(100);
    return {
      externalUrl: `https://stub.example/post/${input.listingId}`,
      providerJobId: `stub-${input.listingId}-${Date.now()}`,
    };
  }

  async removePost(input: RemovePostInput): Promise<void> {
    // Simulate async (100ms delay) — resolve void (success).
    // input contains crossPostId/externalUrl/providerJobId (unused by stub).
    void input;
    await delay(100);
  }

  async getPostStatus(providerJobId: string): Promise<ProviderPostStatus> {
    void providerJobId;
    return 'posted';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
