/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { ListingFormatter, formatVnd, truncateText, extractImageUrls } from './listing-formatter';
import type { PostListingInput } from './providers/promotion-provider.interface';

function createFormatter(webUrl = 'https://bdsai.vn'): ListingFormatter {
  const config: any = {
    get: jest.fn((key: string) => (key === 'BDSAI_WEB_URL' ? webUrl : undefined)),
  };
  return new ListingFormatter(config as ConfigService<any, true>);
}

function makeListing(overrides: Partial<PostListingInput> = {}): PostListingInput {
  return {
    listingId: 'listing-123',
    title: 'Đất nền Long Thành',
    description: 'Đất nền sổ đỏ, gần sân bay Long Thành, diện tích 100m2.',
    price: 2_500_000_000,
    area: '100',
    province: 'Đồng Nai',
    district: 'Long Thành',
    address: 'Khu phố 1, Long Thành',
    propertyType: 'land',
    listingType: 'sell',
    images: [],
    ...overrides,
  };
}

describe('ListingFormatter (AC3) — Story 5.2', () => {
  it('format listing đầy đủ → đúng text shape (🏠/💰/📍/🔗/hashtags)', () => {
    const formatter = createFormatter();
    const text = formatter.formatForFacebook(makeListing());
    expect(text).toContain('🏠 Đất nền Long Thành');
    expect(text).toContain('💰 2.500.000.000 VND');
    expect(text).toContain('📍 Đồng Nai, Long Thành');
    expect(text).toContain('Đất nền sổ đỏ, gần sân bay Long Thành, diện tích 100m2.');
    expect(text).toContain('🔗 https://bdsai.vn/listings/listing-123');
    expect(text).toContain('#bdsai.vn #batdongsan');
  });

  it('description 1000 chars → truncate 500 chars + ...', () => {
    const formatter = createFormatter();
    const longDesc = 'A'.repeat(1000);
    const text = formatter.formatForFacebook(makeListing({ description: longDesc }));
    // Description truncated to 500 chars (497 + '...').
    expect(text).toContain('...');
    // Original 1000 chars should NOT be fully present.
    expect(text).not.toContain('A'.repeat(600));
  });

  it('description 200 chars → nguyên (không truncate)', () => {
    const formatter = createFormatter();
    const shortDesc = 'B'.repeat(200);
    const text = formatter.formatForFacebook(makeListing({ description: shortDesc }));
    expect(text).not.toContain('...');
    expect(text).toContain(shortDesc);
  });

  it('total > 5000 (long title + desc) → truncate description thêm, tổng ≤ 5000', () => {
    const formatter = createFormatter();
    // Title 4500 chars → header ~4540; + 500 desc + footer ~50 = ~5090 > 5000.
    // Formatter phải truncate description thêm để tổng ≤ 5000.
    const text = formatter.formatForFacebook(
      makeListing({ title: 'T'.repeat(4500), description: 'X'.repeat(10_000) }),
    );
    expect(text.length).toBeLessThanOrEqual(5000);
    expect(text).toContain('🔗 https://bdsai.vn/listings/listing-123');
    expect(text).toContain('#bdsai.vn #batdongsan');
  });

  it('price 2500000000 → "2.500.000.000 VND"', () => {
    const formatter = createFormatter();
    const text = formatter.formatForFacebook(makeListing({ price: 2_500_000_000 }));
    expect(text).toContain('💰 2.500.000.000 VND');
  });

  it('price 0 → "0 VND"', () => {
    const formatter = createFormatter();
    const text = formatter.formatForFacebook(makeListing({ price: 0 }));
    expect(text).toContain('💰 0 VND');
  });

  it('location: province + district → "Hồ Chí Minh, Quận 1"', () => {
    const formatter = createFormatter();
    const text = formatter.formatForFacebook(
      makeListing({ province: 'Hồ Chí Minh', district: 'Quận 1' }),
    );
    expect(text).toContain('📍 Hồ Chí Minh, Quận 1');
  });

  it('URL dùng BDSAI_WEB_URL custom base', () => {
    const formatter = createFormatter('https://custom.bdsai.vn');
    const text = formatter.formatForFacebook(makeListing());
    expect(text).toContain('🔗 https://custom.bdsai.vn/listings/listing-123');
  });

  it('default BDSAI_WEB_URL (undefined config) → https://bdsai.vn', () => {
    const config: any = { get: jest.fn(() => undefined) };
    const formatter = new ListingFormatter(config as ConfigService<any, true>);
    const text = formatter.formatForFacebook(makeListing());
    expect(text).toContain('🔗 https://bdsai.vn/listings/listing-123');
  });

  // E7: title 6000 chars → truncate (giữ link + hashtags nguyên).
  it('E7: title cực dài → truncate, tổng ≤ 5000, giữ link + hashtags', () => {
    const formatter = createFormatter();
    const text = formatter.formatForFacebook(
      makeListing({ title: 'T'.repeat(6000), description: 'D'.repeat(6000) }),
    );
    expect(text.length).toBeLessThanOrEqual(5000);
    expect(text).toContain('🔗 https://bdsai.vn/listings/listing-123');
    expect(text).toContain('#bdsai.vn #batdongsan');
  });
});

describe('formatVnd (helper)', () => {
  it('2500000000 → 2.500.000.000', () => {
    expect(formatVnd(2_500_000_000)).toBe('2.500.000.000');
  });
  it('0 → 0', () => {
    expect(formatVnd(0)).toBe('0');
  });
  it('1000 → 1.000', () => {
    expect(formatVnd(1000)).toBe('1.000');
  });
  it('NaN → 0', () => {
    expect(formatVnd(Number.NaN)).toBe('0');
  });
});

describe('truncateText (helper)', () => {
  it('text ≤ maxLen → nguyên', () => {
    expect(truncateText('abc', 5)).toBe('abc');
  });
  it('text > maxLen → cut + ...', () => {
    expect(truncateText('abcde', 4)).toBe('a...');
  });
});

// Story 5.5: image URL tests
describe('ListingFormatter — image URLs (Story 5.5)', () => {
  it('no images → no image section in post text', () => {
    const formatter = createFormatter();
    const result = formatter.formatForFacebook(makeListing({ images: [] }));
    expect(result).not.toContain('📷');
  });

  it('with images → includes 📷 Images section', () => {
    const formatter = createFormatter();
    const result = formatter.formatForFacebook(makeListing({
      images: [
        { url: 'https://img1.jpg', isCover: true },
        { url: 'https://img2.jpg', isCover: false },
      ],
    }));
    expect(result).toContain('📷 Images:');
    expect(result).toContain('https://img1.jpg');
    expect(result).toContain('https://img2.jpg');
  });

  it('cover image appears first', () => {
    const formatter = createFormatter();
    const result = formatter.formatForFacebook(makeListing({
      images: [
        { url: 'https://non-cover.jpg', isCover: false },
        { url: 'https://cover.jpg', isCover: true },
      ],
    }));
    const coverIdx = result.indexOf('https://cover.jpg');
    const nonCoverIdx = result.indexOf('https://non-cover.jpg');
    expect(coverIdx).toBeLessThan(nonCoverIdx);
  });

  it('15 images → only first 10 included', () => {
    const formatter = createFormatter();
    const images = Array.from({ length: 15 }, (_, i) => ({
      url: `https://img${i}.jpg`,
      isCover: i === 0,
    }));
    const result = formatter.formatForFacebook(makeListing({ images }));
    expect(result).toContain('https://img0.jpg');
    expect(result).toContain('https://img9.jpg');
    expect(result).not.toContain('https://img10.jpg');
  });
});

describe('extractImageUrls (helper) — Story 5.5', () => {
  it('empty array → empty', () => {
    expect(extractImageUrls([])).toEqual([]);
  });

  it('cover first, then non-cover', () => {
    const result = extractImageUrls([
      { url: 'a', isCover: false },
      { url: 'b', isCover: true },
      { url: 'c', isCover: false },
    ]);
    expect(result).toEqual(['b', 'a', 'c']);
  });

  it('max 10 images', () => {
    const images = Array.from({ length: 15 }, (_, i) => ({ url: `u${i}`, isCover: false }));
    expect(extractImageUrls(images)).toHaveLength(10);
  });
});
