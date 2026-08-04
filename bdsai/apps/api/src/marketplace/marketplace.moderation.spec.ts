/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { AiService } from '../ai/ai.service';
import { PromotionService } from '../xaction/promotion.service';
import { DRIZZLE } from '../db/database.tokens';

// Mock Drizzle — each query returns a fresh Promise (avoid thenable confusion).
function createMockDb(rows: any[] = []) {
  const state = { rows };
  const db: any = {
    select: (fields?: any) => ({
      from: (table: any) => {
        const query: any = {
          where: (cond: any) => {
            const w: any = {
              orderBy: (...args: any[]) => Promise.resolve(state.rows),
              limit: (n: number) => ({
                offset: (o: number) => Promise.resolve(state.rows),
                then: (resolve: any, reject?: any) =>
                  Promise.resolve(state.rows).then(resolve, reject),
              }),
            };
            w.then = (resolve: any, reject?: any) =>
              Promise.resolve(state.rows).then(resolve, reject);
            return w;
          },
          orderBy: (...args: any[]) => ({
            limit: (n: number) => ({
              offset: (o: number) => Promise.resolve(state.rows),
              then: (resolve: any, reject?: any) =>
                Promise.resolve(state.rows).then(resolve, reject),
            }),
            then: (resolve: any, reject?: any) =>
              Promise.resolve(state.rows).then(resolve, reject),
          }),
          limit: (n: number) => ({
            offset: (o: number) => Promise.resolve(state.rows),
            then: (resolve: any, reject?: any) =>
              Promise.resolve(state.rows).then(resolve, reject),
          }),
        };
        query.then = (resolve: any, reject?: any) =>
          Promise.resolve(state.rows).then(resolve, reject);
        return query;
      },
    }),
    insert: (table: any) => ({
      values: (v: any) => ({
        returning: () =>
          Promise.resolve([{ id: 'listing-1', sellerId: v.sellerId, status: 'DRAFT', ...v }]),
      }),
    }),
    update: (table: any) => ({
      set: (s: any) => ({
        where: (cond: any) => ({
          returning: () =>
            Promise.resolve([
              {
                id: 'listing-1',
                sellerId: 'seller-1',
                status: s.status ?? 'DRAFT',
                ...s,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              },
            ]),
        }),
      }),
    }),
    delete: (table: any) => ({
      where: (cond: any) => Promise.resolve(),
    }),
  };
  db._state = state;
  return db;
}

describe('MarketplaceService — moderation (approve/reject)', () => {
  let service: MarketplaceService;
  let db: any;

  beforeEach(async () => {
    db = createMockDb();
    const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const mockAiService = { generateSummary: jest.fn().mockResolvedValue(undefined) };
    const mockPromotionService = { removeActiveCrossPosts: jest.fn().mockResolvedValue({ enqueued: 0 }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: DRIZZLE, useValue: db },
        { provide: 'BullQueue_ai-summary', useValue: mockQueue },
        { provide: AiService, useValue: mockAiService },
        { provide: PromotionService, useValue: mockPromotionService },
      ],
    }).compile();
    service = module.get(MarketplaceService);
  });

  const sampleListing = {
    id: 'listing-1',
    sellerId: 'seller-1',
    status: 'DRAFT' as const,
    listingType: 'sell' as const,
    title: 'Đất nền Long Thành',
    description: 'Đất nền sổ đỏ, gần sân bay',
    price: 2_000_000_000,
    area: '100.00',
    propertyType: 'land' as const,
    province: 'Đồng Nai',
    district: 'Long Thành',
    ward: null,
    street: null,
    address: 'Khu phố 1, Long Thành',
    lat: null,
    lng: null,
    bedrooms: null,
    bathrooms: null,
    floorCount: null,
    legalStatus: 'so_do',
    images: [],
    expiresAt: null,
    publishedAt: null,
    rejectedReason: null,
    searchVector: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  // Story 3.3: searchListings — covered by e2e (Drizzle SQL builder hard to mock).
  // Unit tests focus on approve/reject which use simpler DB operations.

  // Story 3.3: approveListing.
  it('approveListing: PENDING → PUBLISHED', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PENDING' }];
    const result = await service.approveListing('listing-1', 'admin-1');
    expect(result.status).toBe('PUBLISHED');
  });

  // Story 3.3: rejectListing.
  it('rejectListing: PENDING → REJECTED with reason', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PENDING' }];
    const result = await service.rejectListing('listing-1', 'admin-1', 'Tiêu đề không rõ ràng');
    expect(result.status).toBe('REJECTED');
  });

  it('rejectListing: reason too short → 400', async () => {
    await expect(service.rejectListing('listing-1', 'admin-1', 'ab')).rejects.toThrow(
      BadRequestException,
    );
  });
});
