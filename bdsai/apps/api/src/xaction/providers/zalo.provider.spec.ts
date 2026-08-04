/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZaloProvider } from './zalo.provider';
import type { PostListingInput } from './promotion-provider.interface';

function makeInput(overrides: Partial<PostListingInput> = {}): PostListingInput {
  return {
    listingId: 'listing-1',
    title: 'Đất nền Long Thành',
    description: 'Mô tả ngắn',
    price: 2_000_000_000,
    area: '100',
    province: 'Đồng Nai',
    district: 'Long Thành',
    address: 'Khu phố 1',
    propertyType: 'land',
    listingType: 'sell',
    images: [],
    ...overrides,
  };
}

function createProvider(formatterMock: any): ZaloProvider {
  return new ZaloProvider(formatterMock as any);
}

describe('ZaloProvider (AC1, AC2, AC7) — Story 5.4', () => {
  let formatterMock: any;

  beforeEach(() => {
    formatterMock = {
      formatForZalo: jest.fn().mockReturnValue({
        formatted: { title: 'Test', description: 'Desc', price: '2.000.000.000', location: 'Hà Nội, Quận 1', link: 'https://bdsai.vn/listings/1' },
        postingUrl: 'https://chat.zalo.me/?ref=bdsai',
        postText: '🏠 Test\n💰 2.000.000.000 VND\n📍 Hà Nội, Quận 1\n\nDesc\n\n🔗 https://bdsai.vn/listings/1',
      }),
    };
  });

  describe('postListing (AC2)', () => {
    it('format listing → return assisted result', async () => {
      const provider = createProvider(formatterMock);
      const result = await provider.postListing(makeInput());

      expect(formatterMock.formatForZalo).toHaveBeenCalledWith(makeInput());
      expect(result.assisted).toBe(true);
      expect(result.externalUrl).toBe('https://chat.zalo.me/?ref=bdsai');
      expect(result.providerJobId).toBe('zalo-assisted-listing-1');
    });

    it('platform = "zalo"', () => {
      const provider = createProvider(formatterMock);
      expect(provider.platform).toBe('zalo');
    });

    it('providerJobId includes listingId', async () => {
      const provider = createProvider(formatterMock);
      const result = await provider.postListing(makeInput({ listingId: 'abc-123' }));
      expect(result.providerJobId).toBe('zalo-assisted-abc-123');
    });
  });

  describe('removePost (AC7, AD-9)', () => {
    it('always throws "Zalo removal not supported"', async () => {
      const provider = createProvider(formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1', externalUrl: 'https://zalo.me/1', providerJobId: 'op-1' }),
      ).rejects.toThrow(/Zalo removal not supported/);
    });

    it('throws even with no externalUrl/providerJobId', async () => {
      const provider = createProvider(formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1' }),
      ).rejects.toThrow(/Zalo removal not supported/);
    });
  });

  describe('getPostStatus (AC8)', () => {
    it('always returns "pending" (assisted mode)', async () => {
      const provider = createProvider(formatterMock);
      expect(await provider.getPostStatus('zalo-assisted-1')).toBe('pending');
    });

    it('returns pending regardless of providerJobId', async () => {
      const provider = createProvider(formatterMock);
      expect(await provider.getPostStatus('any-id')).toBe('pending');
    });
  });
});
