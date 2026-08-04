/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { ZaloListingFormatter } from './zalo-listing-formatter';
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

function createFormatter(overrides: Record<string, string> = {}): ZaloListingFormatter {
  const defaults: Record<string, string> = {
    ZALO_POSTING_URL: 'https://chat.zalo.me/',
    BDSAI_WEB_URL: 'https://bdsai.vn',
    ...overrides,
  };
  const config: any = { get: jest.fn((key: string) => defaults[key]) };
  return new ZaloListingFormatter(config as ConfigService<any, true>);
}

describe('ZaloListingFormatter (AC5, AC6) — Story 5.4', () => {
  describe('formatForZalo', () => {
    it('returns formatted listing + posting URL + postText', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput());

      expect(result.formatted.title).toBe('Đất nền Long Thành');
      expect(result.formatted.price).toBe('2.000.000.000');
      expect(result.formatted.location).toBe('Đồng Nai, Long Thành');
      expect(result.formatted.link).toBe('https://bdsai.vn/listings/listing-123');
    });

    it('postText includes header (🏠 title, 💰 price, 📍 location)', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput());
      expect(result.postText).toContain('🏠 Đất nền Long Thành');
      expect(result.postText).toContain('💰 2.000.000.000 VND');
      expect(result.postText).toContain('📍 Đồng Nai, Long Thành');
    });

    it('postText includes link footer', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput());
      expect(result.postText).toContain('🔗 https://bdsai.vn/listings/listing-123');
    });

    it('posting URL includes ref=bdsai + listing tracking', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput());
      expect(result.postingUrl).toContain('ref=bdsai');
      expect(result.postingUrl).toContain('listing_listing-123');
    });

    it('description > 2000 chars → truncate + link', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ description: 'D'.repeat(5000) }));
      expect(result.postText.length).toBeLessThanOrEqual(2000);
      expect(result.postText).toContain('🔗 https://bdsai.vn/listings/listing-123');
    });

    it('price 0 → "0"', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ price: 0 }));
      expect(result.formatted.price).toBe('0');
    });

    it('price 1500000 → "1.500.000"', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ price: 1_500_000 }));
      expect(result.formatted.price).toBe('1.500.000');
    });

    it('price negative → "0" (Math.trunc)', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ price: -100 }));
      expect(result.formatted.price).toBe('0');
    });

    it('price NaN → "0"', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ price: NaN }));
      expect(result.formatted.price).toBe('0');
    });

    it('custom ZALO_POSTING_URL', () => {
      const formatter = createFormatter({ ZALO_POSTING_URL: 'https://custom.zalo.me/' });
      const result = formatter.formatForZalo(makeInput());
      expect(result.postingUrl).toContain('https://custom.zalo.me/');
    });

    it('postText total ≤ 2000 chars (hard cap)', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({
        title: 'T'.repeat(500),
        description: 'D'.repeat(5000),
      }));
      expect(result.postText.length).toBeLessThanOrEqual(2000);
    });
  });

  // Story 5.5: image URLs in post text
  describe('image URLs (Story 5.5)', () => {
    it('no images → no 📷 section in postText', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({ images: [] }));
      expect(result.postText).not.toContain('📷');
    });

    it('with images → includes 📷 Images section', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({
        images: [
          { url: 'https://img1.jpg', isCover: true },
          { url: 'https://img2.jpg', isCover: false },
        ],
      }));
      expect(result.postText).toContain('📷 Images:');
      expect(result.postText).toContain('https://img1.jpg');
      expect(result.postText).toContain('https://img2.jpg');
    });

    it('cover image appears first', () => {
      const formatter = createFormatter();
      const result = formatter.formatForZalo(makeInput({
        images: [
          { url: 'https://non-cover.jpg', isCover: false },
          { url: 'https://cover.jpg', isCover: true },
        ],
      }));
      const coverIdx = result.postText.indexOf('https://cover.jpg');
      const nonCoverIdx = result.postText.indexOf('https://non-cover.jpg');
      expect(coverIdx).toBeLessThan(nonCoverIdx);
    });

    it('15 images → only first 10', () => {
      const formatter = createFormatter();
      const images = Array.from({ length: 15 }, (_, i) => ({
        url: `https://img${i}.jpg`,
        isCover: i === 0,
      }));
      const result = formatter.formatForZalo(makeInput({ images }));
      expect(result.postText).toContain('https://img9.jpg');
      expect(result.postText).not.toContain('https://img10.jpg');
    });
  });
});
