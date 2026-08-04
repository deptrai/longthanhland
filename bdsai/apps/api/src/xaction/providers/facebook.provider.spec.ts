/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { FacebookProvider } from './facebook.provider';
import { ListingFormatter } from '../listing-formatter';
import { XactionsClient } from '../xactions-client';
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

function createProvider(
  clientMock: any,
  formatterMock: any,
  configOverrides: Record<string, string> = {},
): FacebookProvider {
  const defaults: Record<string, string> = {
    XACTIONS_FB_ACCOUNT_ID: 'fb-account-1',
    XACTIONS_FB_C_USER: '',
    XACTIONS_FB_XS: '',
    ...configOverrides,
  };
  const config: any = {
    get: jest.fn((key: string) => defaults[key]),
  };
  return new FacebookProvider(
    clientMock as unknown as XactionsClient,
    formatterMock as unknown as ListingFormatter,
    config as ConfigService<any, true>,
  );
}

describe('FacebookProvider (AC1, AC9, E3, E10) — Story 5.2', () => {
  let clientMock: any;
  let formatterMock: any;

  beforeEach(() => {
    clientMock = {
      postToFacebook: jest.fn(),
      getOperationStatus: jest.fn(),
    };
    formatterMock = {
      formatForFacebook: jest.fn().mockReturnValue('formatted content'),
    };
  });

  describe('postListing', () => {
    it('format listing → call client.postToFacebook → return { externalUrl, providerJobId }', async () => {
      clientMock.postToFacebook.mockResolvedValue({
        ok: true,
        operationId: 'op-123',
        postUrl: 'https://fb.com/post/123',
      });
      const provider = createProvider(clientMock, formatterMock);
      const input = makeInput();
      const result = await provider.postListing(input);

      expect(formatterMock.formatForFacebook).toHaveBeenCalledWith(input);
      expect(clientMock.postToFacebook).toHaveBeenCalledWith({
        text: 'formatted content',
        authCookie: { accountId: 'fb-account-1' },
        mediaUrls: [],
      });
      expect(result).toEqual({
        externalUrl: 'https://fb.com/post/123',
        providerJobId: 'op-123',
      });
    });

    it('E3: postUrl null → externalUrl null, providerJobId still set', async () => {
      clientMock.postToFacebook.mockResolvedValue({
        ok: true,
        operationId: 'op-456',
        postUrl: null,
      });
      const provider = createProvider(clientMock, formatterMock);
      const result = await provider.postListing(makeInput());
      expect(result.externalUrl).toBeNull();
      expect(result.providerJobId).toBe('op-456');
    });

    it('E3: postUrl undefined → externalUrl null', async () => {
      clientMock.postToFacebook.mockResolvedValue({
        ok: true,
        operationId: 'op-789',
        postUrl: undefined,
      });
      const provider = createProvider(clientMock, formatterMock);
      const result = await provider.postListing(makeInput());
      expect(result.externalUrl).toBeNull();
      expect(result.providerJobId).toBe('op-789');
    });

    it('raw cookie path → authCookie { cUser, xs }', async () => {
      clientMock.postToFacebook.mockResolvedValue({
        ok: true,
        operationId: 'op-1',
        postUrl: null,
      });
      const provider = createProvider(clientMock, formatterMock, {
        XACTIONS_FB_ACCOUNT_ID: '',
        XACTIONS_FB_C_USER: 'c1',
        XACTIONS_FB_XS: 'x1',
      });
      await provider.postListing(makeInput());
      expect(clientMock.postToFacebook).toHaveBeenCalledWith({
        text: 'formatted content',
        authCookie: { cUser: 'c1', xs: 'x1' },
        mediaUrls: [],
      });
    });

    it('platform = "facebook"', () => {
      const provider = createProvider(clientMock, formatterMock);
      expect(provider.platform).toBe('facebook');
    });
  });

  describe('removePost (E10, AD-9)', () => {
    it('always throws "FB removal not supported"', async () => {
      const provider = createProvider(clientMock, formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1', externalUrl: 'https://fb.com/x', providerJobId: 'op-1' }),
      ).rejects.toThrow(/FB removal not supported/);
    });

    it('throws even with no externalUrl/providerJobId', async () => {
      const provider = createProvider(clientMock, formatterMock);
      await expect(
        provider.removePost({ crossPostId: 'cp-1' }),
      ).rejects.toThrow(/FB removal not supported/);
    });
  });

  describe('getPostStatus (AC9)', () => {
    it('pending → pending', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'pending' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('pending');
    });

    it('running → pending', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'running' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('pending');
    });

    it('completed → posted', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'completed' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('posted');
    });

    it('failed → failed', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'failed' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('failed');
    });

    it('E8: cancelled → failed', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'cancelled' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('failed');
    });

    it('unknown status → failed (defensive)', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'weird-status' });
      const provider = createProvider(clientMock, formatterMock);
      expect(await provider.getPostStatus('op-1')).toBe('failed');
    });

    it('passes operationId to client', async () => {
      clientMock.getOperationStatus.mockResolvedValue({ status: 'completed' });
      const provider = createProvider(clientMock, formatterMock);
      await provider.getPostStatus('op-xyz');
      expect(clientMock.getOperationStatus).toHaveBeenCalledWith('op-xyz');
    });
  });

  // Story 5.5: mediaUrls passed to XactionsClient
  describe('postListing — mediaUrls (Story 5.5)', () => {
    it('no images → mediaUrls=[]', async () => {
      clientMock.postToFacebook.mockResolvedValue({ ok: true, operationId: 'op-1', postUrl: null });
      const provider = createProvider(clientMock, formatterMock);
      await provider.postListing(makeInput({ images: [] }));
      expect(clientMock.postToFacebook).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrls: [] }),
      );
    });

    it('with images → mediaUrls includes cover first', async () => {
      clientMock.postToFacebook.mockResolvedValue({ ok: true, operationId: 'op-1', postUrl: null });
      const provider = createProvider(clientMock, formatterMock);
      await provider.postListing(makeInput({
        images: [
          { url: 'https://a.jpg', isCover: false },
          { url: 'https://b.jpg', isCover: true },
        ],
      }));
      expect(clientMock.postToFacebook).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrls: ['https://b.jpg', 'https://a.jpg'] }),
      );
    });

    it('15 images → mediaUrls truncated to 10', async () => {
      clientMock.postToFacebook.mockResolvedValue({ ok: true, operationId: 'op-1', postUrl: null });
      const provider = createProvider(clientMock, formatterMock);
      const images = Array.from({ length: 15 }, (_, i) => ({ url: `u${i}`, isCover: i === 0 }));
      await provider.postListing(makeInput({ images }));
      const call = clientMock.postToFacebook.mock.calls[0][0];
      expect(call.mediaUrls).toHaveLength(10);
    });
  });
});
