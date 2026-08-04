/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

describe('MarketplaceService — delete & status transitions', () => {
  let service: MarketplaceService;
  let db: any;
  let mockPromotionService: any;

  beforeEach(async () => {
    db = createMockDb();
    const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const mockAiService = { generateSummary: jest.fn().mockResolvedValue(undefined) };
    mockPromotionService = { removeActiveCrossPosts: jest.fn().mockResolvedValue({ enqueued: 0 }) };
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

  it('submitListing: DRAFT → PENDING (valid transition)', async () => {
    db._state.rows = [sampleListing];
    const result = await service.submitListing('listing-1', 'seller-1');
    expect(result.status).toBe('PENDING');
  });

  it('submitListing: PENDING → PENDING (invalid — already PENDING)', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PENDING' }];
    await expect(service.submitListing('listing-1', 'seller-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('submitListing: SOLD → PENDING (invalid — terminal)', async () => {
    db._state.rows = [{ ...sampleListing, status: 'SOLD' }];
    await expect(service.submitListing('listing-1', 'seller-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('submitListing: wrong seller → 403', async () => {
    db._state.rows = [sampleListing];
    await expect(service.submitListing('listing-1', 'other-seller')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deleteListing: owner → OK', async () => {
    db._state.rows = [sampleListing];
    await expect(service.deleteListing('listing-1', 'seller-1')).resolves.toBeUndefined();
  });

  it('deleteListing: wrong seller → 403', async () => {
    db._state.rows = [sampleListing];
    await expect(service.deleteListing('listing-1', 'other-seller')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('transitionStatus: DRAFT → PUBLISHED (invalid — must go through PENDING)', async () => {
    db._state.rows = [sampleListing];
    await expect(
      service.transitionStatus('listing-1', 'admin-1', 'DRAFT', 'PUBLISHED' as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('transitionStatus: PENDING → PUBLISHED (valid — admin approve)', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PENDING' }];
    const result = await service.transitionStatus(
      'listing-1',
      'admin-1',
      'PENDING',
      'PUBLISHED' as any,
    );
    expect(result.status).toBe('PUBLISHED');
    expect(result.publishedAt).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  // Story 3.6: renewListing.
  it('renewListing: EXPIRED → PUBLISHED + new expiry', async () => {
    db._state.rows = [{ ...sampleListing, status: 'EXPIRED', sellerId: 'seller-1' }];
    const result = await service.renewListing('listing-1', 'seller-1');
    expect(result.status).toBe('PUBLISHED');
  });

  it('renewListing: wrong seller → 403', async () => {
    db._state.rows = [{ ...sampleListing, status: 'EXPIRED', sellerId: 'seller-1' }];
    await expect(service.renewListing('listing-1', 'other-seller')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('renewListing: non-EXPIRED → 400', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PUBLISHED', sellerId: 'seller-1' }];
    await expect(service.renewListing('listing-1', 'seller-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  // Story 3.6: markAsSold.
  it('markAsSold: PUBLISHED → SOLD', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PUBLISHED', sellerId: 'seller-1' }];
    const result = await service.markAsSold('listing-1', 'seller-1');
    expect(result.status).toBe('SOLD');
  });

  it('markAsSold: non-PUBLISHED → 400', async () => {
    db._state.rows = [{ ...sampleListing, status: 'DRAFT', sellerId: 'seller-1' }];
    await expect(service.markAsSold('listing-1', 'seller-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  // M5/AC5: transition PUBLISHED→SOLD triggers removeActiveCrossPosts (AD-9).
  it('M5: markAsSold PUBLISHED→SOLD → removeActiveCrossPosts called with listingId', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PUBLISHED', sellerId: 'seller-1' }];
    await service.markAsSold('listing-1', 'seller-1');
    // transitionStatus fires removeActiveCrossPosts non-blocking (.then/.catch) —
    // flush microtasks để mock được gọi.
    await new Promise((r) => setImmediate(r));
    expect(mockPromotionService.removeActiveCrossPosts).toHaveBeenCalledWith('listing-1');
  });

  // M5/AC5: transition PENDING→REJECTED triggers removeActiveCrossPosts (AD-9).
  it('M5: rejectListing PENDING→REJECTED → removeActiveCrossPosts called with listingId', async () => {
    db._state.rows = [{ ...sampleListing, status: 'PENDING', sellerId: 'seller-1' }];
    await service.rejectListing('listing-1', 'admin-1', 'Lý do từ chối hợp lệ');
    await new Promise((r) => setImmediate(r));
    expect(mockPromotionService.removeActiveCrossPosts).toHaveBeenCalledWith('listing-1');
  });

  // H3/AC5: deleteListing triggers removeActiveCrossPosts BEFORE hard delete (AD-9).
  it('H3: deleteListing (owner) → removeActiveCrossPosts called before delete', async () => {
    db._state.rows = [sampleListing];
    await service.deleteListing('listing-1', 'seller-1');
    // deleteListing AWAIT removeActiveCrossPosts (not fire-and-forget) — đã sync.
    expect(mockPromotionService.removeActiveCrossPosts).toHaveBeenCalledWith('listing-1');
  });

  // H3/AC5: deleteListing wrong seller → 403, removeActiveCrossPosts NOT called.
  it('H3: deleteListing wrong seller → 403, removeActiveCrossPosts NOT called', async () => {
    db._state.rows = [sampleListing];
    await expect(service.deleteListing('listing-1', 'other-seller')).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockPromotionService.removeActiveCrossPosts).not.toHaveBeenCalled();
  });
});
