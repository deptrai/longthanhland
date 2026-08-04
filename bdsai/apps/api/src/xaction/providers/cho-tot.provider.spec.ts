/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChoTotProvider } from './cho-tot.provider';
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

function createProvider(formatterMock: any): ChoTotProvider {
  return new ChoTotProvider(formatterMock as any);
}

describe('ChoTotProvider (AC1, AC2, AC9) — Story 5.3', () => {
  let formatterMock: any;

  beforeEach(() => {
    formatterMock = {
      formatForChoTot: jest.fn().mockReturnValue({
        formatted: { title: 'Test', description: 'Desc', price: 1000, area: 50, province: 'Hà Nội', district: 'Quận 1', propertyType: 'Nhà đất', listingType: 'sell' },
        postingUrl: 'https://www.chotot.com/dang-tin?ref=bdsai',
      }),
    };
  });

  describe('postListing (AC2)', () => {
    it('format listing → return assisted result', async () => {
      const provider = createProvider(formatterMock);
      const result = await provider.postListing(makeInput());

      expect(formatterMock.formatForChoTot).toHaveBeenCalledWith(makeInput());
      expect(result.assisted).toBe(true);
      expect(result.externalUrl).toBe('https://www.chotot.com/dang-tin?ref=bdsai');
      expect(result.providerJobId).toBe('chotot-assisted-listing-1');
    });

    it('platform = "cho_tot"', () => {
      const provider = createProvider(formatterMock);
      expect(provider.platform).toBe('cho_tot');
    });

    it('providerJobId includes listingId', async () => {
      const provider = createProvider(formatterMock);
      const result = await provider.postListing(makeInput({ listingId: 'abc-123' }));
      expect(result.providerJobId).toBe('chotot-assisted-abc-123');
    });
  });

  describe('removePost (AC9, AD-9)', () => {
    it('always throws "Chợ Tốt removal not supported"', async () => {
      const provider = createProvider(formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1', externalUrl: 'https://chotot.com/ad/1', providerJobId: 'op-1' }),
      ).rejects.toThrow(/Chợ Tốt removal not supported/);
    });

    it('throws even with no externalUrl/providerJobId', async () => {
      const provider = createProvider(formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1' }),
      ).rejects.toThrow(/Chợ Tốt removal not supported/);
    });
  });

  describe('getPostStatus (AC10)', () => {
    it('always returns "pending" (assisted mode — no way to check Chợ Tốt)', async () => {
      const provider = createProvider(formatterMock);
      expect(await provider.getPostStatus('chotot-assisted-1')).toBe('pending');
    });

    it('returns pending regardless of providerJobId', async () => {
      const provider = createProvider(formatterMock);
      expect(await provider.getPostStatus('any-id')).toBe('pending');
    });
  });
});
