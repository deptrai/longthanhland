/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { ChoTotListingFormatter } from './cho-tot-listing-formatter';
import type { PostListingInput } from './providers/promotion-provider.interface';

function makeInput(overrides: Partial<PostListingInput> = {}): PostListingInput {
  return {
    listingId: 'listing-123',
    title: 'Đất nền Long Thành',
    description: 'Mô tả chi tiết',
    price: 2_000_000_000,
    area: '100',
    province: 'Đồng Nai',
    district: 'Long Thành',
    address: 'Khu phố 1',
    propertyType: 'land',
    listingType: 'sell',
    images: [],
    ...overrides,
  };
}

function createFormatter(overrides: Record<string, string> = {}): ChoTotListingFormatter {
  const defaults: Record<string, string> = {
    CHOTOT_POSTING_URL: 'https://www.chotot.com/dang-tin',
    BDSAI_WEB_URL: 'https://bdsai.vn',
    ...overrides,
  };
  const config: any = { get: jest.fn((key: string) => defaults[key]) };
  return new ChoTotListingFormatter(config as ConfigService<any, true>);
}

describe('ChoTotListingFormatter (AC7, AC8) — Story 5.3', () => {
  describe('formatForChoTot', () => {
    it('returns formatted listing + posting URL', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput());

      expect(result.formatted.title).toBe('Đất nền Long Thành');
      expect(result.formatted.price).toBe(2_000_000_000);
      expect(result.formatted.area).toBe(100);
      expect(result.formatted.province).toBe('Đồng Nai');
      expect(result.formatted.district).toBe('Long Thành');
      expect(result.formatted.propertyType).toBe('Nhà đất');
      expect(result.formatted.listingType).toBe('sell');
    });

    it('description includes bdsai.vn reference link', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput());
      expect(result.formatted.description).toContain('https://bdsai.vn/listings/listing-123');
    });

    it('posting URL includes ref=bdsai + listing tracking', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput());
      expect(result.postingUrl).toContain('ref=bdsai');
      expect(result.postingUrl).toContain('listing_listing-123');
    });

    it('title > 100 chars → truncate', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ title: 'T'.repeat(200) }));
      expect(result.formatted.title.length).toBeLessThanOrEqual(100);
      expect(result.formatted.title).toMatch(/\.\.\.$/);
    });

    it('description > 3000 chars → truncate + link', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ description: 'D'.repeat(5000) }));
      expect(result.formatted.description.length).toBeLessThanOrEqual(3000);
      expect(result.formatted.description).toContain('https://bdsai.vn/listings/listing-123');
    });

    it('area "75.5" → 75.5 number', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ area: '75.5' }));
      expect(result.formatted.area).toBe(75.5);
    });

    it('area invalid "abc" → 0', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ area: 'abc' }));
      expect(result.formatted.area).toBe(0);
    });

    it('propertyType apartment → Căn hộ', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ propertyType: 'apartment' }));
      expect(result.formatted.propertyType).toBe('Căn hộ');
    });

    it('propertyType office → Mặt bằng', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ propertyType: 'office' }));
      expect(result.formatted.propertyType).toBe('Mặt bằng');
    });

    it('propertyType unknown → Nhà đất (default)', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ propertyType: 'unknown_type' }));
      expect(result.formatted.propertyType).toBe('Nhà đất');
    });

    it('listingType rent → rent', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ listingType: 'rent' }));
      expect(result.formatted.listingType).toBe('rent');
    });

    it('custom CHOTOT_POSTING_URL', () => {
      const formatter = createFormatter({ CHOTOT_POSTING_URL: 'https://custom.chotot.com/post' });
      const result = formatter.formatForChoTot(makeInput());
      expect(result.postingUrl).toContain('https://custom.chotot.com/post');
    });
  });

  // Story 5.5: image URLs in description
  describe('image URLs (Story 5.5)', () => {
    it('no images → no 📷 section in description', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({ images: [] }));
      expect(result.formatted.description).not.toContain('📷');
    });

    it('with images → includes 📷 Hình ảnh section', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({
        images: [
          { url: 'https://img1.jpg', isCover: true },
          { url: 'https://img2.jpg', isCover: false },
        ],
      }));
      expect(result.formatted.description).toContain('📷 Hình ảnh:');
      expect(result.formatted.description).toContain('https://img1.jpg');
      expect(result.formatted.description).toContain('https://img2.jpg');
    });

    it('cover image appears first', () => {
      const formatter = createFormatter();
      const result = formatter.formatForChoTot(makeInput({
        images: [
          { url: 'https://non-cover.jpg', isCover: false },
          { url: 'https://cover.jpg', isCover: true },
        ],
      }));
      const desc = result.formatted.description;
      const coverIdx = desc.indexOf('https://cover.jpg');
      const nonCoverIdx = desc.indexOf('https://non-cover.jpg');
      expect(coverIdx).toBeLessThan(nonCoverIdx);
    });

    it('15 images → only first 10', () => {
      const formatter = createFormatter();
      const images = Array.from({ length: 15 }, (_, i) => ({
        url: `https://img${i}.jpg`,
        isCover: i === 0,
      }));
      const result = formatter.formatForChoTot(makeInput({ images }));
      expect(result.formatted.description).toContain('https://img9.jpg');
      expect(result.formatted.description).not.toContain('https://img10.jpg');
    });
  });
});
