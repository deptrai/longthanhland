/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
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
                updatedAt: new Date(),
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

describe('MarketplaceService (AC1-AC4, AD-9)', () => {
  let service: MarketplaceService;
  let db: any;

  beforeEach(async () => {
    db = createMockDb();
    const mockQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: DRIZZLE, useValue: db },
        { provide: 'BullQueue_ai-summary', useValue: mockQueue },
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
    createdAt: new Date(),
    updatedAt: new Date(),
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
});
