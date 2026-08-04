import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/database.tokens';
import { DealRadarService } from './deal-radar.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
};

const SELLER_ID = 'seller-1';
const FILTER_ID = 'filter-1';
const LISTING_ID = 'listing-1';

describe('DealRadarService — Story 5.1', () => {
  let service: DealRadarService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealRadarService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();
    service = module.get(DealRadarService);
  });

  describe('parseRawQuery', () => {
    it('should parse apartment Bình Thạnh 3-4 tỷ 60-70m2', () => {
      const result = service.parseRawQuery('chung cư Bình Thạnh 3-4 tỷ 60-70m2');
      expect(result.propertyType).toBe('apartment');
      expect(result.location).toBe('bình thạnh');
      expect(result.minPrice).toBe(3000000000);
      expect(result.maxPrice).toBe(4000000000);
      expect(result.minArea).toBe(60);
      expect(result.maxArea).toBe(70);
      expect(result.keywords).toContain('chung');
    });

    it('should return empty parsed for unknown query', () => {
      const result = service.parseRawQuery('abc xyz');
      expect(result.propertyType).toBeUndefined();
      expect(result.location).toBeUndefined();
    });
  });

  describe('createFilter', () => {
    it('should parse raw query and return filter fields', async () => {
      const returning = jest.fn().mockResolvedValue([{
        id: FILTER_ID,
        sellerId: SELLER_ID,
        rawQuery: 'chung cư Bình Thạnh 3-4 tỷ 60-70m2',
        propertyType: 'apartment',
        location: 'bình thạnh',
        minPrice: '3000000000',
        maxPrice: '4000000000',
        minArea: '60',
        maxArea: '70',
        keywords: 'chung,bình,thạnh',
        isActive: true,
      }]);
      const values = jest.fn().mockReturnValue({ returning });
      mockDb.insert.mockReturnValue({ values });

      const result = await service.createFilter(SELLER_ID, { rawQuery: 'chung cư Bình Thạnh 3-4 tỷ 60-70m2' });
      expect(result?.propertyType).toBe('apartment');
      expect(result?.location).toBe('bình thạnh');
    });

    it('should throw 400 for empty raw query', async () => {
      await expect(service.createFilter(SELLER_ID, { rawQuery: '' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('listFilters', () => {
    it('should return only filters belonging to seller', async () => {
      const orderBy = jest.fn().mockResolvedValue([{
        id: FILTER_ID,
        sellerId: SELLER_ID,
        rawQuery: 'chung cư Bình Thạnh',
      }]);
      const where = jest.fn().mockReturnValue({ orderBy });
      const from = jest.fn().mockReturnValue({ where });
      mockDb.select.mockReturnValue({ from });

      const result = await service.listFilters(SELLER_ID);
      expect(result).toHaveLength(1);
      expect(result[0]?.sellerId).toBe(SELLER_ID);
    });
  });

  describe('matchListings', () => {
    it('should return listings matching propertyType and price range', async () => {
      const limitFn = jest.fn().mockReturnThis();
      const offsetFn = jest.fn().mockResolvedValue([{
        id: LISTING_ID,
        title: 'Căn hộ Bình Thạnh',
        price: 3500000000,
        area: '65',
        propertyType: 'apartment',
        district: 'Bình Thạnh',
        ward: 'P. 25',
        address: 'Bình Thạnh, TP.HCM',
        description: 'Chung cư đẹp',
      }]);
      const where2 = jest.fn().mockReturnValue({ limit: limitFn, offset: offsetFn });
      limitFn.mockReturnValue({ offset: offsetFn });
      const from2 = jest.fn().mockReturnValue({ where: where2 });

      const filterLimit = jest.fn().mockResolvedValue([{
        id: FILTER_ID,
        sellerId: SELLER_ID,
        propertyType: 'apartment',
        location: 'bình thạnh',
        minPrice: '3000000000',
        maxPrice: '4000000000',
        minArea: '60',
        maxArea: '70',
        keywords: 'chung,bình,thạnh',
      }]);
      const filterWhere = jest.fn().mockReturnValue({ limit: filterLimit });
      const filterFrom = jest.fn().mockReturnValue({ where: filterWhere });

      mockDb.select
        .mockReturnValueOnce({ from: filterFrom })
        .mockReturnValueOnce({ from: from2 });

      const result = await service.matchListings(FILTER_ID, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.score).toBeGreaterThan(0);
    });
  });
});
