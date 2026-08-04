/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, type TestingModule } from '@nestjs/testing';
import { CrossPostProcessor } from './cross-post.processor';
import { ProviderRegistry } from './provider-registry';
import { DRIZZLE } from '../db/database.tokens';

// Mock Drizzle — select returns controllable rows; update captures set values.
function createMockDb() {
  let selectRows: any[] = [];
  let updateSetValues: any = null;
  const db: any = {
    select: () => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => Promise.resolve(selectRows).then(resolve),
        }),
      }),
    }),
    update: () => ({
      set: (s: any) => {
        updateSetValues = s;
        return {
          where: () => Promise.resolve(),
        };
      },
    }),
  };
  db._setSelectRows = (rows: any[]) => {
    selectRows = rows;
  };
  db._getUpdateSet = () => updateSetValues;
  db._resetUpdateSet = () => {
    updateSetValues = null;
  };
  return db;
}

function createJob(data: any, opts: { attempts: number; attemptsMade: number }): any {
  return {
    data,
    opts: { attempts: opts.attempts },
    attemptsMade: opts.attemptsMade,
  };
}

describe('CrossPostProcessor (AC4, AD-3, AD-9, E3, E7)', () => {
  let processor: CrossPostProcessor;
  let db: any;
  let mockRegistry: any;

  beforeEach(async () => {
    db = createMockDb();
    mockRegistry = {
      getProvider: jest.fn().mockReturnValue({
        postListing: jest.fn().mockResolvedValue({
          externalUrl: 'https://stub.example/post/listing-1',
          providerJobId: 'stub-listing-1-123',
        }),
        removePost: jest.fn().mockResolvedValue(undefined),
        getPostStatus: jest.fn().mockResolvedValue('posted'),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossPostProcessor,
        { provide: DRIZZLE, useValue: db },
        { provide: ProviderRegistry, useValue: mockRegistry },
      ],
    }).compile();
    processor = module.get(CrossPostProcessor);
  });

  // AC4: post job success → status posted + externalUrl + providerJobId.
  it('post job: provider.postListing success → update status=posted + externalUrl + providerJobId', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' },
    ]);
    // Second select (listing) — return listing data.
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' }]
                : [{
                    id: 'listing-1',
                    title: 'Đất nền',
                    description: 'Mô tả',
                    price: 2_000_000_000,
                    area: '100.00',
                    province: 'Đồng Nai',
                    district: 'Long Thành',
                    address: 'Khu phố 1',
                    propertyType: 'land',
                    listingType: 'sell',
                    images: [],
                  }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 0 },
    );
    await processor.process(job);
    expect(db._getUpdateSet().status).toBe('posted');
    expect(db._getUpdateSet().externalUrl).toBe('https://stub.example/post/listing-1');
    expect(db._getUpdateSet().providerJobId).toBe('stub-listing-1-123');
  });

  // Story 5.3 AC4: assisted result → status=assisted (not posted).
  it('post job: provider.postListing returns assisted=true → status=assisted', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'cho_tot', status: 'pending' }]
                : [{ id: 'listing-1', title: 'T', description: 'D', price: 1, area: '1', province: 'P', district: 'D', address: 'A', propertyType: 'land', listingType: 'sell', images: [] }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    mockRegistry.getProvider = jest.fn().mockReturnValue({
      postListing: jest.fn().mockResolvedValue({
        externalUrl: 'https://www.chotot.com/dang-tin?ref=bdsai',
        providerJobId: 'chotot-assisted-listing-1',
        assisted: true,
      }),
    });
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'cho_tot', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 0 },
    );
    await processor.process(job);
    expect(db._getUpdateSet().status).toBe('assisted');
    expect(db._getUpdateSet().externalUrl).toBe('https://www.chotot.com/dang-tin?ref=bdsai');
    expect(db._getUpdateSet().providerJobId).toBe('chotot-assisted-listing-1');
  });

  // AC4: post job fail (not last attempt) → throw (BullMQ retry).
  it('post job: provider throw (attempt 1/3) → throw for retry', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' },
    ]);
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' }]
                : [{ id: 'listing-1', title: 'T', description: 'D', price: 1, area: '1', province: 'P', district: 'D', address: 'A', propertyType: 'land', listingType: 'sell', images: [] }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    mockRegistry.getProvider = jest.fn().mockReturnValue({
      postListing: jest.fn().mockRejectedValue(new Error('Platform down')),
    });
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 0 },
    );
    await expect(processor.process(job)).rejects.toThrow('Platform down');
  });

  // AC4: post job fail (last attempt) → status=failed + errorMessage (no throw).
  it('post job: provider throw (last attempt) → status=failed + errorMessage', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' },
    ]);
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' }]
                : [{ id: 'listing-1', title: 'T', description: 'D', price: 1, area: '1', province: 'P', district: 'D', address: 'A', propertyType: 'land', listingType: 'sell', images: [] }];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    mockRegistry.getProvider = jest.fn().mockReturnValue({
      postListing: jest.fn().mockRejectedValue(new Error('Platform down')),
    });
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 2 },
    );
    await processor.process(job);
    expect(db._getUpdateSet().status).toBe('failed');
    expect(db._getUpdateSet().errorMessage).toBe('Platform down');
  });

  // AC4: remove job success → status=removed.
  it('remove job: provider.removePost success → status=removed', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted', externalUrl: 'https://x', providerJobId: 'j1' },
    ]);
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'remove', externalUrl: 'https://x', providerJobId: 'j1' },
      { attempts: 3, attemptsMade: 0 },
    );
    await processor.process(job);
    expect(db._getUpdateSet().status).toBe('removed');
  });

  // E3: remove job fail (last attempt) → status=removal_failed + errorMessage.
  it('remove job: provider throw (last attempt) → status=removal_failed + errorMessage', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' },
    ]);
    mockRegistry.getProvider = jest.fn().mockReturnValue({
      removePost: jest.fn().mockRejectedValue(new Error('Account banned')),
    });
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'remove' },
      { attempts: 3, attemptsMade: 2 },
    );
    await processor.process(job);
    expect(db._getUpdateSet().status).toBe('removal_failed');
    expect(db._getUpdateSet().errorMessage).toBe('Account banned');
  });

  // E3: remove job fail (not last attempt) → throw for retry.
  it('remove job: provider throw (attempt 1/3) → throw for retry', async () => {
    db._setSelectRows([
      { id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'posted' },
    ]);
    mockRegistry.getProvider = jest.fn().mockReturnValue({
      removePost: jest.fn().mockRejectedValue(new Error('Timeout')),
    });
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'remove' },
      { attempts: 3, attemptsMade: 0 },
    );
    await expect(processor.process(job)).rejects.toThrow('Timeout');
  });

  // E7: crossPostId not found → graceful skip (no throw, no update).
  it('post job: crossPostId not found → graceful skip (no throw)', async () => {
    db._setSelectRows([]);
    const job = createJob(
      { crossPostId: 'nonexistent', platform: 'facebook', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 0 },
    );
    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(db._getUpdateSet()).toBeNull();
  });

  // E7: remove job crossPostId not found → graceful skip.
  it('remove job: crossPostId not found → graceful skip (no throw)', async () => {
    db._setSelectRows([]);
    const job = createJob(
      { crossPostId: 'nonexistent', platform: 'facebook', listingId: 'listing-1', action: 'remove' },
      { attempts: 3, attemptsMade: 0 },
    );
    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(db._getUpdateSet()).toBeNull();
  });

  // H3: remove job row gone (cascade delete) BUT job has externalUrl/providerJobId
  // → vẫn gọi provider.removePost() để gỡ bài ngoài (AD-9 orphan prevention).
  it('H3: remove job row gone + job has data → provider.removePost called (orphan prevention)', async () => {
    db._setSelectRows([]); // row not found (cascade deleted).
    const mockRemovePost = jest.fn().mockResolvedValue(undefined);
    mockRegistry.getProvider = jest.fn().mockReturnValue({ removePost: mockRemovePost });
    const job = createJob(
      { crossPostId: 'cp-gone', platform: 'facebook', listingId: 'listing-1', action: 'remove', externalUrl: 'https://fb.example/post/123', providerJobId: 'fb-123' },
      { attempts: 3, attemptsMade: 0 },
    );
    await processor.process(job);
    expect(mockRemovePost).toHaveBeenCalledWith(
      expect.objectContaining({ crossPostId: 'cp-gone', externalUrl: 'https://fb.example/post/123', providerJobId: 'fb-123' }),
    );
    expect(db._getUpdateSet().status).toBe('removed');
  });

  // E7: post job listing not found → graceful skip.
  it('post job: listing not found → graceful skip', async () => {
    let callCount = 0;
    db.select = jest.fn(() => ({
      from: () => ({
        where: () => ({
          then: (resolve: any) => {
            callCount++;
            // cross_post found, listing not found.
            const rows =
              callCount === 1
                ? [{ id: 'cp-1', listingId: 'listing-1', platform: 'facebook', status: 'pending' }]
                : [];
            resolve(Promise.resolve(rows));
          },
        }),
      }),
    }));
    const job = createJob(
      { crossPostId: 'cp-1', platform: 'facebook', listingId: 'listing-1', action: 'post' },
      { attempts: 3, attemptsMade: 0 },
    );
    await expect(processor.process(job)).resolves.toBeUndefined();
    expect(db._getUpdateSet()).toBeNull();
  });
});
