import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { PostListingInput } from './providers/promotion-provider.interface';
import { extractImageUrls } from './listing-formatter';

/**
 * ZaloListingFormatter (AC5, AC6) — Story 5.4.
 *
 * Format listing data → Zalo post text + posting URL.
 * Zalo post format giống FB (text post) nhưng ngắn hơn (2000 chars limit).
 *
 * Zalo posting URL: https://chat.zalo.me/ (Zalo web client — seller tự đăng).
 * Zalo KHÔNG có public posting API → assisted flow (manual post + PATCH confirm).
 *
 * Description limit: 2000 chars (Zalo limit, conservative).
 */
const ZALO_DESC_LIMIT = 2000;
const ZALO_TOTAL_LIMIT = 2000;

export interface ZaloFormattedListing {
  title: string;
  description: string;
  price: string;
  location: string;
  link: string;
}

export interface ZaloPostResult {
  formatted: ZaloFormattedListing;
  postingUrl: string;
  postText: string;
}

@Injectable()
export class ZaloListingFormatter {
  constructor(private readonly config: ConfigService<Env, true>) {}

  formatForZalo(input: PostListingInput): ZaloPostResult {
    const postingUrlBase = this.config.get('ZALO_POSTING_URL', { infer: true }) ?? 'https://chat.zalo.me/';
    const webUrl = this.config.get('BDSAI_WEB_URL', { infer: true }) ?? 'https://bdsai.vn';

    const link = `${webUrl}/listings/${input.listingId}`;
    const price = formatVnd(input.price);
    const location = `${input.province}, ${input.district}`;

    // Story 5.5: image URLs section (only if images exist, cover first, max 10).
    const imageUrls = extractImageUrls(input.images);
    const imageSection = imageUrls.length > 0
      ? `\n\n📷 Images:\n${imageUrls.join('\n')}`
      : '';

    // Build post text — Zalo format (similar to FB but shorter).
    const header = `🏠 ${input.title}\n💰 ${price} VND\n📍 ${location}\n\n`;
    const footer = `\n\n🔗 ${link}`;
    const maxDesc = ZALO_TOTAL_LIMIT - header.length - imageSection.length - footer.length;
    const description = truncateText(input.description, Math.max(maxDesc, 100));
    const postText = `${header}${description}${imageSection}${footer}`;

    // Hard cap — Zalo total limit.
    const finalText = postText.length > ZALO_TOTAL_LIMIT
      ? postText.slice(0, ZALO_TOTAL_LIMIT)
      : postText;

    const formatted: ZaloFormattedListing = {
      title: input.title,
      description,
      price,
      location,
      link,
    };

    const postingUrl = `${postingUrlBase}?ref=bdsai&utm_source=bdsai&utm_medium=crosspost&utm_campaign=listing_${input.listingId}`;

    return { formatted, postingUrl, postText: finalText };
  }
}

/**
 * Format VND với thousand separator (dấu chấm — Việt Nam).
 */
function formatVnd(price: number): string {
  if (!Number.isFinite(price) || price < 0) return '0';
  return Math.trunc(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Truncate text tới maxLen chars + '...' nếu dài hơn.
 */
function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = Math.max(maxLen - 3, 0);
  return `${text.slice(0, cut)}...`;
}
