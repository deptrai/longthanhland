import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { AiService } from './ai.service';
import { DRIZZLE } from '../db/database.tokens';

// Story 4.1 + 4.2a — AiService unit tests.
describe('AiService (Story 4.1 + 4.2a)', () => {
  let service: AiService;
  let mockDb: { select: jest.Mock; insert: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  describe('computeContentHash', () => {
    it('returns consistent hash for same content', () => {
      const listing = { title: 'Test', description: 'Desc', price: 1000, area: '100', propertyType: 'land', province: 'DN', district: 'LT' };
      const hash1 = service.computeContentHash(listing);
      const hash2 = service.computeContentHash(listing);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('returns different hash for different content', () => {
      const l1 = { title: 'Test1', description: 'Desc', price: 1000, area: '100', propertyType: 'land', province: 'DN', district: 'LT' };
      const l2 = { title: 'Test2', description: 'Desc', price: 1000, area: '100', propertyType: 'land', province: 'DN', district: 'LT' };
      expect(service.computeContentHash(l1)).not.toBe(service.computeContentHash(l2));
    });
  });

  describe('isWithinRateLimit', () => {
    it('returns true when under limit', () => {
      expect(service.isWithinRateLimit()).toBe(true);
    });
  });

  describe('computeTrustScore (Story 4.2a)', () => {
    const baseListing = {
      id: 'l1',
      title: 'Test',
      description: 'A'.repeat(150),
      price: 1000000000,
      area: '100',
      propertyType: 'land',
      listingType: 'sell',
      province: 'DN',
      district: 'LT',
      ward: 'P1',
      street: 'D1',
      address: 'Addr',
      bedrooms: null,
      bathrooms: null,
      floorCount: null,
      legalStatus: 'so_do',
      images: [{ url: 'http://example.com/1.jpg', isCover: true }, { url: 'http://example.com/2.jpg', isCover: false }, { url: 'http://example.com/3.jpg', isCover: false }],
      status: 'PUBLISHED',
      sellerId: 's1',
      expiresAt: null,
      publishedAt: null,
      rejectedReason: null,
      searchVector: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    it('verified seller + complete listing → high score', () => {
      const result = service.computeTrustScore(baseListing, { phoneVerified: true, createdAt: new Date().toISOString() });
      expect(result.score).toBeGreaterThan(60);
      expect(result.isEvaluating).toBe(false);
      expect(result.factors['phone_verified']).toBe(30);
      expect(result.factors['has_images']).toBe(20);
      expect(result.factors['legal_status']).toBe(15);
    });

    it('unverified seller + empty listing → evaluating', () => {
      const emptyListing = { ...baseListing, description: 'short', images: [], legalStatus: null, ward: null, street: null };
      const result = service.computeTrustScore(emptyListing, { phoneVerified: false, createdAt: new Date().toISOString() });
      expect(result.isEvaluating).toBe(true);
      expect(result.score).toBeLessThan(20);
    });

    it('score capped at 100', () => {
      const fullListing = { ...baseListing, bedrooms: 3, bathrooms: 2 };
      const result = service.computeTrustScore(fullListing, { phoneVerified: true, createdAt: new Date().toISOString() });
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});
