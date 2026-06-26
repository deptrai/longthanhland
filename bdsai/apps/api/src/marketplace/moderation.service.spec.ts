import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModerationService } from './moderation.service';
import { MarketplaceService } from './marketplace.service';
import { DRIZZLE } from '../db/database.tokens';

// Story 3.5 — ModerationService unit tests (spam filter + bulk approve).
describe('ModerationService (Story 3.5)', () => {
  let service: ModerationService;
  let mockMarketplaceService: { approveListing: jest.Mock; rejectListing: jest.Mock; listPendingQueue: jest.Mock };
  let mockDb: { insert: jest.Mock };

  beforeEach(async () => {
    mockMarketplaceService = {
      approveListing: jest.fn().mockResolvedValue({ id: 'l1', status: 'PUBLISHED' }),
      rejectListing: jest.fn().mockResolvedValue({ id: 'l1', status: 'REJECTED' }),
      listPendingQueue: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
    };
    mockDb = {
      insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: MarketplaceService, useValue: mockMarketplaceService },
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();
    service = moduleRef.get(ModerationService);
  });

  describe('checkSpam', () => {
    it('clean listing → not flagged', () => {
      const result = service.checkSpam({ title: 'Đất nền Long Thành', description: 'Bán đất sổ đỏ', price: 2000000000 });
      expect(result.flagged).toBe(false);
      expect(result.matchedKeywords).toHaveLength(0);
    });

    it('spam keyword in title → flagged', () => {
      const result = service.checkSpam({ title: 'VAY TIỀN nhanh', description: 'desc', price: 1000000000 });
      expect(result.flagged).toBe(true);
      expect(result.matchedKeywords).toContain('vay tiền');
    });

    it('spam keyword in description → flagged', () => {
      const result = service.checkSpam({ title: 'Bán đất', description: 'click link để xem', price: 1000000000 });
      expect(result.flagged).toBe(true);
      expect(result.matchedKeywords).toContain('click link');
    });

    it('price too low → flagged', () => {
      const result = service.checkSpam({ title: 'Bán đất', description: 'desc', price: 500000 });
      expect(result.flagged).toBe(true);
      expect(result.reasons.some((r) => r.includes('Giá bất thường'))).toBe(true);
    });

    it('title ALL CAPS → flagged', () => {
      const result = service.checkSpam({ title: 'BÁN ĐẤT NỀN LONG THÀNH RẺ', description: 'desc', price: 1000000000 });
      expect(result.flagged).toBe(true);
      expect(result.reasons.some((r) => r.includes('chữ hoa'))).toBe(true);
    });
  });

  describe('bulkApprove', () => {
    it('empty list → 400', async () => {
      await expect(service.bulkApprove([], 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('valid IDs → approved', async () => {
      const result = await service.bulkApprove(['l1', 'l2'], 'admin-1');
      expect(result.approved).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('one fails → partial success', async () => {
      mockMarketplaceService.approveListing.mockRejectedValueOnce(new Error('Not PENDING'));
      const result = await service.bulkApprove(['l1', 'l2'], 'admin-1');
      expect(result.approved).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('approveWithAudit', () => {
    it('calls approveListing + writes audit log', async () => {
      const result = await service.approveWithAudit('l1', 'admin-1', true);
      expect(result.status).toBe('PUBLISHED');
      expect(mockMarketplaceService.approveListing).toHaveBeenCalledWith('l1', 'admin-1');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('rejectWithAudit', () => {
    it('calls rejectListing + writes audit log', async () => {
      const result = await service.rejectWithAudit('l1', 'admin-1', 'Spam content', true);
      expect(result.status).toBe('REJECTED');
      expect(mockMarketplaceService.rejectListing).toHaveBeenCalledWith('l1', 'admin-1', 'Spam content');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
