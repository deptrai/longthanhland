/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { DedupService } from './dedup.service';

// Story 5.7: DedupService tests — hash computation, phone normalization, dedup logic.
// DB queries are mocked — focus on pure logic (hash, normalize).

function createService(salt = 'test-salt'): DedupService {
  const config: any = { get: jest.fn((key: string) => (key === 'SUPABASE_PROJECT_ID' ? salt : undefined)) };
  const db: any = {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };
  return new DedupService(db, config as ConfigService<any, true>);
}

describe('DedupService — Story 5.7', () => {
  describe('computeDedupHash', () => {
    it('same input → same hash', () => {
      const svc = createService();
      const input = {
        title: 'Căn hộ Long Thành',
        province: 'Đồng Nai',
        district: 'Long Thành',
        price: 2500000000,
        phone: '0901234567',
      };
      const h1 = svc.computeDedupHash(input);
      const h2 = svc.computeDedupHash(input);
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64); // sha256 hex
    });

    it('different title → different hash', () => {
      const svc = createService();
      const h1 = svc.computeDedupHash({
        title: 'Căn hộ Long Thành', province: 'ĐN', district: 'LT', price: 1000, phone: '0901',
      });
      const h2 = svc.computeDedupHash({
        title: 'Nhà đất Biên Hòa', province: 'ĐN', district: 'LT', price: 1000, phone: '0901',
      });
      expect(h1).not.toBe(h2);
    });

    it('Vietnamese diacritics normalized (unaccent)', () => {
      const svc = createService();
      const h1 = svc.computeDedupHash({
        title: 'Căn hộ Long Thành', province: 'p', district: 'd', price: 1, phone: '0',
      });
      const h2 = svc.computeDedupHash({
        title: 'can ho long thanh', province: 'p', district: 'd', price: 1, phone: '0',
      });
      expect(h1).toBe(h2); // unaccent + lower → same hash
    });

    it('different price → different hash', () => {
      const svc = createService();
      const h1 = svc.computeDedupHash({ title: 't', province: 'p', district: 'd', price: 1000, phone: '0' });
      const h2 = svc.computeDedupHash({ title: 't', province: 'p', district: 'd', price: 2000, phone: '0' });
      expect(h1).not.toBe(h2);
    });
  });

  describe('hashPhone', () => {
    it('+84 normalized to 0', () => {
      const svc = createService();
      const h1 = svc.hashPhone('+84901234567');
      const h2 = svc.hashPhone('0901234567');
      expect(h1).toBe(h2);
    });

    it('84 prefix normalized to 0', () => {
      const svc = createService();
      const h1 = svc.hashPhone('84901234567');
      const h2 = svc.hashPhone('0901234567');
      expect(h1).toBe(h2);
    });

    it('spaces and dashes removed', () => {
      const svc = createService();
      const h1 = svc.hashPhone('0901-234-567');
      const h2 = svc.hashPhone('0901 234 567');
      const h3 = svc.hashPhone('0901234567');
      expect(h1).toBe(h3);
      expect(h2).toBe(h3);
    });

    it('different salt → different hash', () => {
      const config1: any = { get: jest.fn(() => 'salt-1') };
      const config2: any = { get: jest.fn(() => 'salt-2') };
      const db: any = {};
      const svc1 = new DedupService(db, config1);
      const svc2 = new DedupService(db, config2);
      const h1 = svc1.hashPhone('0901234567');
      const h2 = svc2.hashPhone('0901234567');
      expect(h1).not.toBe(h2);
    });

    it('returns 64-char hex (sha256)', () => {
      const svc = createService();
      expect(svc.hashPhone('0901234567')).toHaveLength(64);
    });
  });

  describe('checkDuplicate', () => {
    it('no match → isDuplicate=false', async () => {
      const svc = createService();
      const result = await svc.checkDuplicate({
        title: 'Test', province: 'P', district: 'D', price: 1000, phone: '0',
      });
      expect(result.isDuplicate).toBe(false);
      expect(result.dedupHash).toHaveLength(64);
    });

    it('exact match → isDuplicate=true, matchType=exact', async () => {
      const db: any = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn()
                .mockResolvedValueOnce([{ listingId: 'existing-123' }]) // exact match
                .mockResolvedValueOnce([]), // fuzzy match (not reached)
            }),
          }),
        }),
      };
      const config: any = { get: jest.fn(() => 'salt') };
      const svc = new DedupService(db, config);
      const result = await svc.checkDuplicate({
        title: 'Test', province: 'P', district: 'D', price: 1000, phone: '0',
      });
      expect(result.isDuplicate).toBe(true);
      expect(result.existingListingId).toBe('existing-123');
      expect(result.matchType).toBe('exact');
    });

    it('fuzzy match → isDuplicate=true, matchType=fuzzy', async () => {
      const db: any = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn()
                .mockResolvedValueOnce([]) // no exact match
                .mockResolvedValueOnce([{ id: 'fuzzy-456', sim: 0.9 }]), // fuzzy match
            }),
          }),
        }),
      };
      const config: any = { get: jest.fn(() => 'salt') };
      const svc = new DedupService(db, config);
      const result = await svc.checkDuplicate({
        title: 'Căn hộ Long Thành', province: 'ĐN', district: 'LT', price: 1000, phone: '0',
      });
      expect(result.isDuplicate).toBe(true);
      expect(result.existingListingId).toBe('fuzzy-456');
      expect(result.matchType).toBe('fuzzy');
    });
  });
});
