import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import IORedis from 'ioredis';
import { REDIS_CONNECTION } from '../queue/queue.tokens';
import { NowingClient } from './nowing.client';

/**
 * NowingService — Story 7.1e.
 *
 * Cache kết quả Nowing engine theo contentHash và cung cấp fallback đồng nhất.
 * Dùng Redis từ QueueModule (REDIS_CONNECTION).
 */

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h
const CACHE_KEY_PREFIX = 'nowing';

export interface RewriteListingInput {
  title: string;
  price: number;
  area: number;
  location: string;
  propertyType: string;
}

export interface RewriteListingResponse {
  description: string | null;
  seoScore?: number | null;
  error?: string;
}

export interface MarketSummaryInput {
  location: string;
  propertyType: string;
  priceRange: string;
}

export interface MarketSummaryResponse {
  summary: string | null;
  highlights?: string[];
  error?: string;
}

export interface MatchListingsInput {
  filter: Record<string, unknown>;
  listings: Record<string, unknown>[];
}

export interface MatchListingsResponse {
  matches: { listingId: string; score: number; reason: string }[];
  error?: string;
}

@Injectable()
export class NowingService {
  private readonly logger = new Logger(NowingService.name);

  constructor(
    private readonly client: NowingClient,
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
  ) {}

  async rewriteListing(input: RewriteListingInput): Promise<RewriteListingResponse> {
    const key = this.cacheKey('rewrite-listing', input);
    const cached = await this.getCache<RewriteListingResponse>(key);
    if (cached) return cached;

    try {
      const result = await this.client.request<RewriteListingResponse>('POST', '/agent/rewrite-listing', input);
      await this.setCache(key, result);
      return result;
    } catch (e) {
      this.logger.warn(
        { action: 'nowing-rewrite-listing-failed', err: e instanceof Error ? e.message : String(e) },
        'Nowing rewrite-listing failed — returning fallback',
      );
      return { description: null, error: 'AI không khả dụng' };
    }
  }

  async getMarketSummary(input: MarketSummaryInput): Promise<MarketSummaryResponse> {
    const key = this.cacheKey('market-summary', input);
    const cached = await this.getCache<MarketSummaryResponse>(key);
    if (cached) return cached;

    try {
      const result = await this.client.request<MarketSummaryResponse>('POST', '/agent/market-summary', input);
      await this.setCache(key, result);
      return result;
    } catch (e) {
      this.logger.warn(
        { action: 'nowing-market-summary-failed', err: e instanceof Error ? e.message : String(e) },
        'Nowing market-summary failed — returning fallback',
      );
      return { summary: null, highlights: [], error: 'AI không khả dụng' };
    }
  }

  async matchListings(input: MatchListingsInput): Promise<MatchListingsResponse> {
    const key = this.cacheKey('match-listings', input);
    const cached = await this.getCache<MatchListingsResponse>(key);
    if (cached) return cached;

    try {
      const result = await this.client.request<MatchListingsResponse>('POST', '/agent/match-listings', input);
      await this.setCache(key, result);
      return result;
    } catch (e) {
      this.logger.warn(
        { action: 'nowing-match-listings-failed', err: e instanceof Error ? e.message : String(e) },
        'Nowing match-listings failed — returning fallback',
      );
      return { matches: [], error: 'AI không khả dụng' };
    }
  }

  private cacheKey(endpoint: string, input: unknown): string {
    const sorted = this.sortKeys(input);
    const hash = createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
    return `${CACHE_KEY_PREFIX}:${endpoint}:${hash}`;
  }

  private sortKeys(input: unknown): unknown {
    if (input === null || typeof input !== 'object') return input;
    if (Array.isArray(input)) {
      return input.map((item) => this.sortKeys(item));
    }
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(input as Record<string, unknown>).sort()) {
      sorted[key] = this.sortKeys((input as Record<string, unknown>)[key]);
    }
    return sorted;
  }

  private async getCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (e) {
      this.logger.warn(
        { action: 'nowing-cache-read-failed', key, err: e instanceof Error ? e.message : String(e) },
        'Failed to read Nowing cache',
      );
      return null;
    }
  }

  private async setCache<T>(key: string, value: T): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    } catch (e) {
      this.logger.warn(
        { action: 'nowing-cache-write-failed', key, err: e instanceof Error ? e.message : String(e) },
        'Failed to cache Nowing result',
      );
    }
  }
}
