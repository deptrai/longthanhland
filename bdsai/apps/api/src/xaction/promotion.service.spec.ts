/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { ProviderRegistry } from './provider-registry';
import { DRIZZLE } from '../db/database.tokens';

// Mock Drizzle — controllable state for select/insert/update.
function createMockDb() {
  // listings state: keyed by id.
  const listings: Record<string, any> = {};
  // crossPosts state: keyed by id.
  const crossPostsState: Record<string, any> = {};
  // selectRows: what select().from().where() returns (mutable per-test).
  let selectRows: any[] = [];
  // track which "table" the select is targeting.
  let selectTable: string = '';
  // Story 5.3: track last update set + configurable return rows.
  let lastUpdateSet: any = null;
  let returnRows: any[] | null = null;

  const db: any = {
    select: (fields?: any) => ({
      from: (table: any) => {
        // Identify table by its name property (drizzle pgTable has _.name).
        const tName = (table as any)?._?.name ?? (table as any)?.name ?? '';
        selectTable = tName;
        const query: any = {
          where: (cond: any) => {
            const w: any = {
              then: (resolve: any, reject?: any) =>
                Promise.resolve(selectRows).then(resolve, reject),
            };
            return w;
          },
          then: (resolve: any, reject?: any) =>
            Promise.resolve(selectRows).then(resolve, reject),
        };
        return query;
      },
    }),
    insert: (table: any) => ({
      values: (v: any) => ({
        returning: () => {
          const row = {
            id: 'cp-new-id',
            listingId: v.listingId,
            platform: v.platform,
            status: v.status ?? 'pending',
            externalUrl: null,
            providerJobId: null,
            errorMessage: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          };
          crossPostsState[row.id] = row;
          return Promise.resolve([row]);
        },
      }),
    }),
    update: (table: any) => ({
      set: (s: any) => {
        lastUpdateSet = s;
        return {
          where: (cond: any) => ({
            returning: () => {
              if (returnRows) return Promise.resolve(returnRows);
              // Return updated row based on set values.
              const row = {
                id: 'cp-existing-id',
                listingId: 'listing-1',
                platform: 'facebook',
                status: s.status ?? 'pending',
                externalUrl: s.externalUrl ?? null,
                providerJobId: s.providerJobId ?? null,
                errorMessage: s.errorMessage ?? null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
              };
              return Promise.resolve([row]);
            },
          }),
        };
      },
    }),
  };
  db._listings = listings;
  db._crossPosts = crossPostsState;
  db._setSelectRows = (rows: any[]) => {
    selectRows = rows;
  };
  db._selectTable = () => selectTable;
  db._getUpdateSet = () => lastUpdateSet;
  db._setReturnRows = (rows: any[]) => {
    returnRows = rows;
  };
  return db;
}

describe('PromotionService (AC6, AC9, AD-9)', () => {
  let service: PromotionService;
  let db: any;
  let mockQueue: any;
  let mockRegistry: any;

  const sampleListing = {
    id: 'listing-1',
    sellerId: 'seller-1',
    status: 'PUBLISHED',
    title: 'Đất nền Long Thành',
    description: 'Đất nền sổ đỏ',
    price: 2_000_000_000,
    area: '100.00',
    province: 'Đồng Nai',
    district: 'Long Thành',
    address: 'Khu phố 1',
    images: [],
  };

  beforeEach(async () => {
    db = createMockDb();
    mockQueue = { add: jest.fn().mockResolvedValue(undefined) };
    mockRegistry = {
      getProvider: jest.fn().mockReturnValue({}),
      getEnabledPlatforms: jest.fn().mockReturnValue(['facebook']),
      isEnabled: jest.fn().mockReturnValue(true),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: DRIZZLE, useValue: db },
        { provide: 'BullQueue_cross-post', useValue: mockQueue },
        { provide: ProviderRegistry, useValue: mockRegistry },
      ],
    }).compile();
    service = module.get(PromotionService);
  });

  // AC6: createCrossPost — PUBLISHED → insert + enqueue.
  it('createCrossPost: PUBLISHED listing + no existing → insert pending + enqueue post job', async () => {
    // First select (listing) → PUBLISHED. Second select (cross_posts) → empty.
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            // call 1 = listing, call 2 = existing cross_post.
            const rows = callCount === 1 ? [sampleListing] : [];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    const result = await service.createCrossPost('listing-1', 'facebook', 'seller-1');
    expect(result.status).toBe('pending');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'post',
      expect.objectContaining({ platform: 'facebook', action: 'post', listingId: 'listing-1' }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  // E2: non-PUBLISHED → 400.
  it('createCrossPost: non-PUBLISHED (DRAFT) → BadRequestException', async () => {
    db._setSelectRows([{ ...sampleListing, status: 'DRAFT' }]);
    await expect(
      service.createCrossPost('listing-1', 'facebook', 'seller-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // AC9: listing not found → 404.
  it('createCrossPost: listing not found → NotFoundException', async () => {
    db._setSelectRows([]);
    await expect(
      service.createCrossPost('nonexistent', 'facebook', 'seller-1'),
    ).rejects.toThrow(NotFoundException);
  });

  // AC9: wrong seller → 403.
  it('createCrossPost: wrong seller → ForbiddenException', async () => {
    db._setSelectRows([{ ...sampleListing, sellerId: 'other-seller' }]);
    await expect(
      service.createCrossPost('listing-1', 'facebook', 'seller-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  // E1: duplicate (status pending/posted) → 409.
  it('createCrossPost: duplicate platform (status posted) → ConflictException', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [sampleListing]
                : [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    await expect(
      service.createCrossPost('listing-1', 'facebook', 'seller-1'),
    ).rejects.toThrow(ConflictException);
  });

  // E1 edge: duplicate but status failed → allow (update existing row).
  it('createCrossPost: existing row status failed → allow promote again (update row)', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [sampleListing]
                : [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'failed' }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    const result = await service.createCrossPost('listing-1', 'facebook', 'seller-1');
    expect(result.status).toBe('pending');
    expect(mockQueue.add).toHaveBeenCalled();
  });

  // E5: platform not enabled → 400 (registry throws).
  it('createCrossPost: platform not enabled → BadRequestException', async () => {
    mockRegistry.getProvider = jest.fn(() => {
      throw new BadRequestException('Nền tảng zalo chưa được bật');
    });
    await expect(
      service.createCrossPost('listing-1', 'zalo', 'seller-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // M1: concurrent unique violation (PG code 23505) → ConflictException 409.
  it('createCrossPost: insert unique violation (code 23505) → ConflictException (no raw PG leak)', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows = callCount === 1 ? [sampleListing] : [];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    // Simulate PG unique violation on insert.
    db.insert = jest.fn(() => ({
      values: () => ({
        returning: () => Promise.reject(Object.assign(new Error('duplicate key'), { code: '23505' })),
      }),
    }));
    await expect(
      service.createCrossPost('listing-1', 'facebook', 'seller-1'),
    ).rejects.toThrow(ConflictException);
  });

  // H2: validatePromoteRequest — ownership/PUBLISHED/enabled pre-check.
  it('validatePromoteRequest: PUBLISHED + owner + enabled → OK (no throw)', async () => {
    db._setSelectRows([sampleListing]);
    await expect(
      service.validatePromoteRequest('listing-1', 'seller-1', ['facebook']),
    ).resolves.toBeUndefined();
  });

  it('validatePromoteRequest: wrong seller → ForbiddenException', async () => {
    db._setSelectRows([{ ...sampleListing, sellerId: 'other-seller' }]);
    await expect(
      service.validatePromoteRequest('listing-1', 'seller-1', ['facebook']),
    ).rejects.toThrow(ForbiddenException);
  });

  it('validatePromoteRequest: non-PUBLISHED → BadRequestException', async () => {
    db._setSelectRows([{ ...sampleListing, status: 'DRAFT' }]);
    await expect(
      service.validatePromoteRequest('listing-1', 'seller-1', ['facebook']),
    ).rejects.toThrow(BadRequestException);
  });

  it('validatePromoteRequest: disabled platform → BadRequestException', async () => {
    mockRegistry.getProvider = jest.fn(() => {
      throw new BadRequestException('Nền tảng zalo chưa được bật');
    });
    db._setSelectRows([sampleListing]);
    await expect(
      service.validatePromoteRequest('listing-1', 'seller-1', ['zalo']),
    ).rejects.toThrow(BadRequestException);
  });

  // AC6: removeCrossPost → enqueue remove job.
  it('removeCrossPost: existing active cross_post → enqueue remove job', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            // call 1 = cross_post, call 2 = listing (ownership).
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted', externalUrl: 'https://x', providerJobId: 'job-1' }]
                : [{ sellerId: 'seller-1' }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    await service.removeCrossPost('cp-1', 'seller-1');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'remove',
      expect.objectContaining({ crossPostId: 'cp-1', action: 'remove', platform: 'facebook' }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  // removeCrossPost: not found → 404.
  it('removeCrossPost: not found → NotFoundException', async () => {
    db._setSelectRows([]);
    await expect(service.removeCrossPost('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // removeCrossPost: wrong seller → 403.
  it('removeCrossPost: wrong seller → ForbiddenException', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' }]
                : [{ sellerId: 'other-seller' }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    await expect(service.removeCrossPost('cp-1', 'seller-1')).rejects.toThrow(ForbiddenException);
  });

  // removeCrossPost: not active (already removed) → skip enqueue.
  it('removeCrossPost: status removed → skip enqueue (not active)', async () => {
    db._setSelectRows([{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'removed' }]);
    await service.removeCrossPost('cp-1');
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  // AC6: listCrossPosts → return rows (H1: ownership check first).
  it('listCrossPosts: owner → return rows for listingId', async () => {
    const cpRows = [
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' },
      { id: 'cp-2', listingId: 'listing-1', platform: 'cho_tot', status: 'pending' },
    ];
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            // call 1 = listing (ownership), call 2 = cross_posts.
            const rows = callCount === 1 ? [{ sellerId: 'seller-1' }] : cpRows;
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    const result = await service.listCrossPosts('listing-1', 'seller-1');
    expect(result).toHaveLength(2);
  });

  // H1: listCrossPosts wrong seller → 403.
  it('listCrossPosts: wrong seller → ForbiddenException', async () => {
    db._setSelectRows([{ sellerId: 'other-seller' }]);
    await expect(service.listCrossPosts('listing-1', 'seller-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // H1: listCrossPosts listing not found → 404.
  it('listCrossPosts: listing not found → NotFoundException', async () => {
    db._setSelectRows([]);
    await expect(service.listCrossPosts('nonexistent', 'seller-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  // AD-9: removeActiveCrossPosts → enqueue remove for active rows.
  it('removeActiveCrossPosts: active rows (pending/posted) → enqueue remove for each', async () => {
    const rows = [
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted', externalUrl: 'https://x', providerJobId: 'j1' },
      { id: 'cp-2', listingId: 'listing-1', platform: 'cho_tot', status: 'pending', externalUrl: null, providerJobId: null },
    ];
    db._setSelectRows(rows);
    const result = await service.removeActiveCrossPosts('listing-1');
    expect(result.enqueued).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });

  // AD-9: no active rows → enqueued 0.
  it('removeActiveCrossPosts: no active rows → enqueued 0', async () => {
    db._setSelectRows([]);
    const result = await service.removeActiveCrossPosts('listing-1');
    expect(result.enqueued).toBe(0);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  // AD-3: independent failure — 1 enqueue fail ≠ total fail.
  it('removeActiveCrossPosts: 1 enqueue fail → others still enqueued (independent failure)', async () => {
    const rows = [
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' },
      { id: 'cp-2', listingId: 'listing-1', platform: 'cho_tot', status: 'posted' },
    ];
    db._setSelectRows(rows);
    mockQueue.add = jest.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Redis down'));
    const result = await service.removeActiveCrossPosts('listing-1');
    expect(result.enqueued).toBe(1);
  });

  // Story 5.3: confirmAssistedPost — seller confirm manual posting.
  describe('confirmAssistedPost (AC5, AC6) — Story 5.3', () => {
    it('assisted cross_post + owner → update status=posted + externalUrl', async () => {
      let callCount = 0;
      db.select = jest.fn(() => ({
        from: () => ({
          where: () => ({
            then: (resolve: any) => {
              callCount++;
              // call 1 = cross_post, call 2 = listing (ownership).
              const rows = callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'cho_tot', status: 'assisted', externalUrl: 'https://chotot.com/dang-tin?ref=bdsai' }]
                : [{ sellerId: 'seller-1' }];
              resolve(Promise.resolve(rows));
            },
          }),
        }),
      }));
      db._setReturnRows([{ id: 'cp-1', listingId: 'listing-1', platform: 'cho_tot', status: 'posted', externalUrl: 'https://chotot.com/ad/123' }]);
      const result = await service.confirmAssistedPost('cp-1', 'seller-1', 'https://chotot.com/ad/123');
      expect(db._getUpdateSet().status).toBe('posted');
      expect(db._getUpdateSet().externalUrl).toBe('https://chotot.com/ad/123');
      expect(result.status).toBe('posted');
    });

    it('cross_post not found → NotFoundException', async () => {
      db._setSelectRows([]);
      await expect(
        service.confirmAssistedPost('nonexistent', 'seller-1', 'https://chotot.com/ad/1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('wrong seller → ForbiddenException', async () => {
      let callCount = 0;
      db.select = jest.fn(() => ({
        from: () => ({
          where: () => ({
            then: (resolve: any) => {
              callCount++;
              const rows = callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'cho_tot', status: 'assisted' }]
                : [{ sellerId: 'other-seller' }];
              resolve(Promise.resolve(rows));
            },
          }),
        }),
      }));
      await expect(
        service.confirmAssistedPost('cp-1', 'seller-1', 'https://chotot.com/ad/1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('status not assisted → ConflictException', async () => {
      let callCount = 0;
      db.select = jest.fn(() => ({
        from: () => ({
          where: () => ({
            then: (resolve: any) => {
              callCount++;
              const rows = callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'cho_tot', status: 'posted' }]
                : [{ sellerId: 'seller-1' }];
              resolve(Promise.resolve(rows));
            },
          }),
        }),
      }));
      await expect(
        service.confirmAssistedPost('cp-1', 'seller-1', 'https://chotot.com/ad/1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
