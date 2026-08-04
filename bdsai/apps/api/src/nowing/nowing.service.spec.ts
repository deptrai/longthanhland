/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { NowingClient } from './nowing.client';
import { NowingService } from './nowing.service';

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

class MockRedis {
  store = new Map<string, { value: string; ttl?: number }>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key)?.value ?? null;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<string | null> {
    this.store.set(key, { value, ttl });
    return 'OK';
  }

  async ttl(): Promise<number> {
    return -1;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async flushall(): Promise<void> {
    this.store.clear();
  }
}

function createService(redis: MockRedis, overrides: Record<string, string> = {}): NowingService {
  const defaults: Record<string, string> = {
    NOWING_ENGINE_URL: 'http://nowing.test:8000',
    NOWING_ENGINE_API_KEY: 'nowing-test-key',
    ...overrides,
  };
  const config: any = {
    get: jest.fn((key: string) => defaults[key]),
  };
  const client = new NowingClient(config as ConfigService<any, true>);
  return new NowingService(client, redis as any);
}

describe('NowingService — Story 7.1e', () => {
  let redis: MockRedis;
  let service: NowingService;

  beforeEach(() => {
    fetchMock.mockReset();
    redis = new MockRedis();
    service = createService(redis);
  });

  describe('rewriteListing', () => {
    it('should cache result with key nowing:rewrite-listing:{contentHash}', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ description: 'SEO mô tả', seoScore: 85 }));
      const input = { title: 'Căn hộ Bình Thạnh', price: 3500000000, area: 65, location: 'Bình Thạnh', propertyType: 'apartment' };
      await service.rewriteListing(input);
      const keys = await redis.keys();
      expect(keys.length).toBe(1);
      expect(keys[0]).toMatch(/^nowing:rewrite-listing:/);
    });

    it('should compute contentHash from sorted JSON input', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ description: 'SEO mô tả', seoScore: 85 }));
      const input1 = { title: 'A', price: 1, area: 1, location: 'B', propertyType: 'C' };
      const input2 = { price: 1, area: 1, location: 'B', propertyType: 'C', title: 'A' };
      await service.rewriteListing(input1);
      const keys1 = await redis.keys();
      redis.flushall();
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(jsonResponse({ description: 'SEO mô tả', seoScore: 85 }));
      await service.rewriteListing(input2);
      const keys2 = await redis.keys();
      expect(keys1[0]).toBe(keys2[0]);
    });

    it('should return cached result without calling Nowing on second call', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ description: 'SEO mô tả', seoScore: 85 }));
      const input = { title: 'Căn hộ Bình Thạnh', price: 3500000000, area: 65, location: 'Bình Thạnh', propertyType: 'apartment' };
      await service.rewriteListing(input);
      fetchMock.mockClear();
      const result = await service.rewriteListing(input);
      expect(result.description).toBe('SEO mô tả');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return fallback when Nowing returns 503', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'service unavailable' }),
        text: () => Promise.resolve('service unavailable'),
      } as unknown as Response);
      const input = { title: 'Căn hộ Bình Thạnh', price: 3500000000, area: 65, location: 'Bình Thạnh', propertyType: 'apartment' };
      const result = await service.rewriteListing(input);
      expect(result).toEqual({ description: null, error: 'AI không khả dụng' });
    });

    it('should return fallback when Nowing times out', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);
      const input = { title: 'Căn hộ Bình Thạnh', price: 3500000000, area: 65, location: 'Bình Thạnh', propertyType: 'apartment' };
      const result = await service.rewriteListing(input);
      expect(result).toEqual({ description: null, error: 'AI không khả dụng' });
    });

    it('should not cache fallback responses', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'service unavailable' }),
        text: () => Promise.resolve('service unavailable'),
      } as unknown as Response);
      const input = { title: 'Căn hộ Bình Thạnh', price: 3500000000, area: 65, location: 'Bình Thạnh', propertyType: 'apartment' };
      await service.rewriteListing(input);
      const keys = await redis.keys();
      expect(keys.length).toBe(0);
    });
  });

  describe('getMarketSummary', () => {
    it('should return cached result without calling Nowing', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ summary: 'Thị trường sôi động', highlights: ['a', 'b'] }));
      const input = { location: 'Bình Thạnh', propertyType: 'apartment', priceRange: '3-4 tỷ' };
      await service.getMarketSummary(input);
      fetchMock.mockClear();
      const result = await service.getMarketSummary(input);
      expect(result.summary).toBe('Thị trường sôi động');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return fallback on Nowing error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'boom' }),
        text: () => Promise.resolve('boom'),
      } as unknown as Response);
      const input = { location: 'Bình Thạnh', propertyType: 'apartment', priceRange: '3-4 tỷ' };
      const result = await service.getMarketSummary(input);
      expect(result).toEqual({ summary: null, highlights: [], error: 'AI không khả dụng' });
    });
  });

  describe('matchListings', () => {
    it('should return cached result without calling Nowing', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ matches: [{ listingId: '1', score: 0.9, reason: 'khớp' }] }));
      const input = { filter: { propertyType: 'apartment' }, listings: [{ id: '1', title: 'A' }] };
      await service.matchListings(input);
      fetchMock.mockClear();
      const result = await service.matchListings(input);
      expect(result.matches[0]?.listingId).toBe('1');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return fallback on Nowing error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'boom' }),
        text: () => Promise.resolve('boom'),
      } as unknown as Response);
      const input = { filter: { propertyType: 'apartment' }, listings: [{ id: '1', title: 'A' }] };
      const result = await service.matchListings(input);
      expect(result).toEqual({ matches: [], error: 'AI không khả dụng' });
    });
  });
});
