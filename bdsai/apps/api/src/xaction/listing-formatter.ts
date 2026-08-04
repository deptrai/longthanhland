import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { PostListingInput } from './providers/promotion-provider.interface';

/**
 * ListingFormatter (AC3) — Story 5.2 / Story 5.5.
 *
 * Format listing data → Facebook post text (tiêu đề, giá, địa điểm, mô tả, link, images).
 * Inject ConfigService chỉ để đọc BDSAI_WEB_URL (testable qua DI).
 *
 * Format:
 *   🏠 [title]
 *   💰 [price] VND
 *   📍 [province], [district]
 *
 *   [description — truncate 500 chars + '...']
 *
 *   📷 Images: [url1] [url2] ...    (Story 5.5 — only if images exist)
 *
 *   🔗 https://bdsai.vn/listings/[id]
 *
 *   #bdsai.vn #batdongsan
 *
 * Max 5000 chars (FB limit). Nếu tổng vượt 5000 → truncate description thêm
 * (giữ title + price + location + link + hashtags nguyên — E7).
 */
const TRUNCATE_SUFFIX = '...';
const MAX_TOTAL = 5000;
const DESC_TRUNCATE = 500;
// Buffer cho 🔗 link + hashtags + newlines khi truncate title (edge cực).
const FOOTER_OVERHEAD = 200;

@Injectable()
export class ListingFormatter {
  constructor(private readonly config: ConfigService<Env, true>) {}

  formatForFacebook(input: PostListingInput): string {
    const webUrl = this.config.get('BDSAI_WEB_URL', { infer: true }) ?? 'https://bdsai.vn';
    const price = formatVnd(input.price);
    const location = `${input.province}, ${input.district}`;
    const link = `${webUrl}/listings/${input.listingId}`;
    const header = `🏠 ${input.title}\n💰 ${price} VND\n📍 ${location}\n\n`;
    const footer = `\n\n🔗 ${link}\n\n#bdsai.vn #batdongsan`;

    // Story 5.5: image URLs section (only if images exist, cover first, max 10).
    const imageUrls = extractImageUrls(input.images);
    const imageSection = imageUrls.length > 0
      ? `\n\n📷 Images:\n${imageUrls.join('\n')}`
      : '';

    // Description truncate 500 chars mặc định.
    let desc = truncateText(input.description, DESC_TRUNCATE);

    let text = `${header}${desc}${imageSection}${footer}`;

    // E7: tổng > 5000 → truncate description thêm (giữ header + imageSection + footer nguyên).
    if (text.length > MAX_TOTAL) {
      const availableForDesc = MAX_TOTAL - header.length - imageSection.length - footer.length;
      if (availableForDesc > 0) {
        desc = truncateText(input.description, availableForDesc);
        text = `${header}${desc}${imageSection}${footer}`;
      }

      // Edge cực: header + imageSection + footer đã > 5000 → truncate title.
      if (text.length > MAX_TOTAL) {
        const titleOverhead = header.length - input.title.length;
        const titleBudget = MAX_TOTAL - titleOverhead - imageSection.length - footer.length - FOOTER_OVERHEAD;
        const truncatedTitle = truncateText(input.title, Math.max(titleBudget, 50));
        const trimmedHeader = `🏠 ${truncatedTitle}\n💰 ${price} VND\n📍 ${location}\n\n`;
        const descBudget = MAX_TOTAL - trimmedHeader.length - imageSection.length - footer.length;
        const trimmedDesc = descBudget > 0 ? truncateText(input.description, descBudget) : '';
        text = `${trimmedHeader}${trimmedDesc}${imageSection}${footer}`;
        if (text.length > MAX_TOTAL) {
          const overflow = text.length - MAX_TOTAL;
          const fixedLen = trimmedHeader.length + imageSection.length + footer.length;
          const descPart = text.slice(trimmedHeader.length, text.length - imageSection.length - footer.length);
          const cutDesc = descPart.slice(0, Math.max(descPart.length - overflow, 0));
          text = `${trimmedHeader}${cutDesc}${imageSection}${footer}`;
          void fixedLen; // kept for clarity
        }
      }
    }

    return text;
  }
}

/**
 * Format VND với thousand separator (dấu chấm — Việt Nam).
 * 2500000000 → '2.500.000.000'. 0 → '0'.
 */
export function formatVnd(price: number): string {
  if (!Number.isFinite(price)) return '0';
  return Math.trunc(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Truncate text tới maxLen chars + '...' nếu dài hơn. Giữ nguyên nếu ≤ maxLen.
 * maxLen bao gồm cả suffix — VD truncateText('abcde', 4) → 'a...'.
 */
export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = Math.max(maxLen - TRUNCATE_SUFFIX.length, 0);
  return `${text.slice(0, cut)}${TRUNCATE_SUFFIX}`;
}

/**
 * Extract image URLs from listing images — cover first, max 10 (AC6, AC7).
 * Story 5.5: include image URLs in formatted text for all platforms.
 */
export function extractImageUrls(images: Array<{ url: string; isCover: boolean }>): string[] {
  if (!images || images.length === 0) return [];
  const sorted = [...images].sort((a, b) => {
    if (a.isCover && !b.isCover) return -1;
    if (!a.isCover && b.isCover) return 1;
    return 0;
  });
  return sorted.slice(0, 10).map((img) => img.url);
}
