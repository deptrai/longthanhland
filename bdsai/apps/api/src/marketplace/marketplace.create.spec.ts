/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

describe('MarketplaceService — create/update (AC1-AC4, AD-9)', () => {
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

  it('createListing → DRAFT', async () => {
    const result = await service.createListing('seller-1', {
      listingType: 'sell',
      title: 'Đất nền Long Thành',
      description: 'Đất nền sổ đỏ, gần sân bay',
      price: 2_000_000_000,
      area: '100',
      propertyType: 'land',
      province: 'Đồng Nai',
      district: 'Long Thành',
      address: 'Khu phố 1, Long Thành',
      images: [],
    } as any);
    expect(result.status).toBe('DRAFT');
    expect(result.sellerId).toBe('seller-1');
  });

  it('getListing: owner xem mọi status', async () => {
    db._state.rows = [{ ...sampleListing, status: 'DRAFT' }];
    const result = await service.getListing('listing-1', 'seller-1', false);
    expect(result.id).toBe('listing-1');
  });

  it('getListing: non-owner xem DRAFT → 403', async () => {
    db._state.rows = [{ ...sampleListing, status: 'DRAFT' }];
    await expect(service.getListing('listing-1', 'other-user', false)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('getListing: non-owner xem PUBLISHED → OK', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PUBLISHED' }];
    const result = await service.getListing('listing-1', 'other-user', false);
    expect(result.id).toBe('listing-1');
  });

  it('getListing: not exist → 404', async () => {
    db._state.rows = [];
    await expect(service.getListing('nonexistent', 'seller-1', false)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateListing: owner DRAFT → OK', async () => {
    db._state.rows = [sampleListing];
    const result = await service.updateListing('listing-1', 'seller-1', {
      title: 'Đất nền mới',
    } as any);
    expect(result.title).toBe('Đất nền mới');
  });

  it('updateListing: owner PUBLISHED → 400 (cannot edit)', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PUBLISHED' }];
    await expect(
      service.updateListing('listing-1', 'seller-1', { title: 'new' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateListing: wrong seller → 403', async () => {
    db._state.rows = [sampleListing];
    await expect(
      service.updateListing('listing-1', 'other-seller', { title: 'new' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  // Story 3.2: duplicateListing.
  it('duplicateListing: owner → DRAFT mới với title "(bản sao)"', async () => {
    db._state.rows = [sampleListing];
    const result = await service.duplicateListing('listing-1', 'seller-1');
    expect(result.status).toBe('DRAFT');
    expect(result.title).toContain('(bản sao)');
  });

  it('duplicateListing: wrong seller → 403', async () => {
    db._state.rows = [sampleListing];
    await expect(service.duplicateListing('listing-1', 'other-seller')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
