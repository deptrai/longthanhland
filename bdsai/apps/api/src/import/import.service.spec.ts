/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common';
import { ImportService, type ImportRow } from './import.service';
import { DedupService } from './dedup.service';

// Story 5.7: ImportService tests — CSV parse, JSON parse, dedup integration.

function createService(dedupOverrides: Partial<DedupService> = {}): ImportService {
  const db: any = {
    insert: jest.fn().mockImplementation(() => ({
      values: jest.fn().mockReturnValue({
        onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
      }),
    })),
  };
  const dedup: any = {
    computeDedupHash: jest.fn().mockReturnValue('hash-123'),
    hashPhone: jest.fn().mockReturnValue('phone-hash-123'),
    checkDuplicate: jest.fn().mockResolvedValue({ isDuplicate: false, dedupHash: 'hash-123' }),
    ...dedupOverrides,
  };
  return new ImportService(db, dedup as unknown as DedupService);
}

const sampleRow: ImportRow = {
  title: 'Căn hộ Long Thành',
  description: 'Mô tả',
  price: 2500000000,
  area: 80,
  province: 'Đồng Nai',
  district: 'Long Thành',
  address: 'Khu phố 1, Long Thành',
  phone: '0901234567',
  propertyType: 'apartment',
  listingType: 'sell',
};

describe('ImportService — Story 5.7', () => {
  describe('parseCsv', () => {
    it('valid CSV → ImportRow[]', () => {
      const svc = createService();
      const csv = 'title,description,price,area,province,district,address,phone,propertyType,listingType\n'
        + 'Căn hộ Long Thành,Mô tả,2500000000,80,Đồng Nai,Long Thành,Khu phố 1,0901234567,apartment,sell';
      const rows = svc.parseCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.title).toBe('Căn hộ Long Thành');
      expect(rows[0]!.price).toBe(2500000000);
      expect(rows[0]!.area).toBe(80);
    });

    it('empty CSV → BadRequestException', () => {
      const svc = createService();
      expect(() => svc.parseCsv('')).toThrow(BadRequestException);
    });

    it('header only → BadRequestException', () => {
      const svc = createService();
      expect(() => svc.parseCsv('title,price,province,district,address,phone')).toThrow(BadRequestException);
    });

    it('missing required column → BadRequestException', () => {
      const svc = createService();
      const csv = 'title,price,province\nTest,1000,ĐN';
      expect(() => svc.parseCsv(csv)).toThrow(BadRequestException);
    });

    it('multiple rows → all parsed', () => {
      const svc = createService();
      const csv = 'title,price,province,district,address,phone\n'
        + 'Row1,1000,P,D,A,01\n'
        + 'Row2,2000,P,D,A,02\n'
        + 'Row3,3000,P,D,A,03';
      const rows = svc.parseCsv(csv);
      expect(rows).toHaveLength(3);
      expect(rows[2]!.title).toBe('Row3');
    });

    it('quoted values with commas → parsed correctly', () => {
      const svc = createService();
      const csv = 'title,price,province,district,address,phone\n'
        + '"Căn hộ, 2PN",1000,P,D,A,01';
      const rows = svc.parseCsv(csv);
      expect(rows[0]!.title).toBe('Căn hộ, 2PN');
    });

    it('empty lines skipped', () => {
      const svc = createService();
      const csv = 'title,price,province,district,address,phone\n'
        + 'Row1,1000,P,D,A,01\n'
        + '\n'
        + 'Row2,2000,P,D,A,02';
      const rows = svc.parseCsv(csv);
      expect(rows).toHaveLength(2);
    });
  });

  describe('parseJson', () => {
    it('valid JSON → ImportRow[]', () => {
      const svc = createService();
      const rows = svc.parseJson({ listings: [sampleRow] });
      expect(rows).toHaveLength(1);
      expect(rows[0]!.title).toBe('Căn hộ Long Thành');
    });

    it('missing listings field → BadRequestException', () => {
      const svc = createService();
      expect(() => svc.parseJson({})).toThrow(BadRequestException);
    });

    it('empty array → BadRequestException', () => {
      const svc = createService();
      expect(() => svc.parseJson({ listings: [] })).toThrow(BadRequestException);
    });
  });

  describe('importRows', () => {
    it('no duplicates → all imported', async () => {
      const svc = createService();
      const result = await svc.importRows([sampleRow, { ...sampleRow, title: 'Other' }], 'csv');
      expect(result.imported).toBe(2);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('duplicate detected → counted as duplicate', async () => {
      const svc = createService({
        checkDuplicate: jest.fn().mockResolvedValue({
          isDuplicate: true,
          existingListingId: 'existing-1',
          dedupHash: 'hash-123',
        }),
      });
      const result = await svc.importRows([sampleRow], 'csv');
      expect(result.imported).toBe(0);
      expect(result.duplicates).toBe(1);
    });

    it('invalid propertyType → error recorded', async () => {
      const svc = createService();
      const result = await svc.importRows([{ ...sampleRow, propertyType: 'invalid' }], 'csv');
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('propertyType');
    });

    it('invalid listingType → error recorded', async () => {
      const svc = createService();
      const result = await svc.importRows([{ ...sampleRow, listingType: 'invalid' }], 'csv');
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('listingType');
    });

    it('mixed: 1 new + 1 dup + 1 error', async () => {
      const dedup: any = {
        computeDedupHash: jest.fn().mockReturnValue('hash'),
        hashPhone: jest.fn().mockReturnValue('phone-hash'),
        checkDuplicate: jest.fn()
          .mockResolvedValueOnce({ isDuplicate: false, dedupHash: 'h1' })
          .mockResolvedValueOnce({ isDuplicate: true, existingListingId: 'ex', dedupHash: 'h2' })
          .mockResolvedValueOnce({ isDuplicate: false, dedupHash: 'h3' }),
      };
      const svc = createService(dedup);
      const result = await svc.importRows([
        sampleRow,
        { ...sampleRow, title: 'Dup' },
        { ...sampleRow, title: 'Err', propertyType: 'bad' },
      ], 'json');
      expect(result.imported).toBe(1);
      expect(result.duplicates).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });
});
