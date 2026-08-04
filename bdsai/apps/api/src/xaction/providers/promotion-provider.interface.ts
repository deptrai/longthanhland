/**
 * IPromotionProvider interface (AC1) — Story 5.1.
 *
 * Common contract cho mọi platform provider (FB, Chợ Tốt, Zalo).
 * Mỗi platform = 1 provider class implement interface này.
 * Provider bật/tắt qua config XACTION_ENABLED_PROVIDERS (AC8).
 * 1 channel fail KHÔNG kéo sập promotion khác (AD-3 independent failure).
 *
 * Story 5.1 tạo interface + StubProvider. Provider thật (FB/Chợ Tốt/Zalo
 * gọi XActions API/MCP) ở story 5.x — interface không đổi (AD-3).
 */

export type CrossPostPlatform = 'facebook' | 'cho_tot' | 'zalo';

export type CrossPostStatus = 'pending' | 'posted' | 'failed' | 'removed' | 'removal_failed';

export type ProviderPostStatus = 'pending' | 'posted' | 'failed' | 'removed';

/**
 * Input cho postListing — data cần thiết để đăng tin lên platform.
 * AD-8: KHÔNG chứa PII raw (chỉ listingId + public content fields).
 */
export interface PostListingInput {
  listingId: string;
  title: string;
  description: string;
  price: number;
  area: string;
  province: string;
  district: string;
  address: string;
  propertyType: string;
  listingType: string;
  images: Array<{ url: string; isCover: boolean }>;
}

/**
 * Kết quả postListing — externalUrl + providerJobId từ platform.
 * externalUrl nullable (E3 — FB XHR submit thường không có postUrl).
 * assisted flag (Story 5.3): true → processor set status='assisted' (seller tự đăng).
 */
export interface PostResult {
  externalUrl: string | null;
  providerJobId: string;
  assisted?: boolean;
}

/**
 * Input cho removePost — data cần thiết để gỡ bài trên platform.
 */
export interface RemovePostInput {
  crossPostId: string;
  externalUrl?: string | null;
  providerJobId?: string | null;
}

/**
 * IPromotionProvider — mỗi platform provider implement 3 method:
 *   - postListing(): đăng tin lên platform, trả { externalUrl, providerJobId }.
 *   - removePost(): gỡ bài trên platform (best-effort — AD-9).
 *   - getPostStatus(): poll trạng thái bài đăng.
 */
export interface IPromotionProvider {
  readonly platform: CrossPostPlatform;

  postListing(input: PostListingInput): Promise<PostResult>;

  removePost(input: RemovePostInput): Promise<void>;

  getPostStatus(providerJobId: string): Promise<ProviderPostStatus>;
}
