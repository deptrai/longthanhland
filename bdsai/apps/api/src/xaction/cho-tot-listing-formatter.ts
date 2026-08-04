import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { PostListingInput } from './providers/promotion-provider.interface';
import { extractImageUrls } from './listing-formatter';

/**
 * ChoTotListingFormatter (AC7, AC8) — Story 5.3.
 *
 * Format listing data → Chợ Tốt structured fields + posting URL.
 * Khác FB (text post), Chợ Tốt cần structured fields (title, price, area, category).
 *
 * Chợ Tốt posting URL: https://www.chotot.com/dang-tin
 * Chợ Tốt KHÔNG hỗ trợ URL pre-fill params (form JS-driven) → trả base URL.
 * Seller tự fill form (assisted flow — manual post + PATCH confirm).
 *
 * Description limit: 3000 chars (Chợ Tốt limit).
 */
const CHOTOT_DESC_LIMIT = 3000;

export interface ChoTotFormattedListing {
  title: string;
  description: string;
  price: number;
  area: number;
  province: string;
  district: string;
  propertyType: string;
  listingType: string;
}

export interface ChoTotPostResult {
  formatted: ChoTotFormattedListing;
  postingUrl: string;
}

@Injectable()
export class ChoTotListingFormatter {
  constructor(private readonly config: ConfigService<Env, true>) {}

  formatForChoTot(input: PostListingInput): ChoTotPostResult {
    const postingUrlBase = this.config.get('CHOTOT_POSTING_URL', { infer: true }) ?? 'https://www.chotot.com/dang-tin';
    const webUrl = this.config.get('BDSAI_WEB_URL', { infer: true }) ?? 'https://bdsai.vn';

    // Story 5.5: include image URLs in description (seller can see/copy when manual post).
    const imageUrls = extractImageUrls(input.images);
    const imageText = imageUrls.length > 0
      ? `\n\n📷 Hình ảnh:\n${imageUrls.join('\n')}`
      : '';

    const description = truncateDescription(input.description, imageText, input.listingId, webUrl);

    const formatted: ChoTotFormattedListing = {
      title: truncateTitle(input.title),
      description,
      price: input.price,
      area: parseFloat(input.area) || 0,
      province: input.province,
      district: input.district,
      propertyType: mapPropertyType(input.propertyType),
      listingType: input.listingType === 'sell' ? 'sell' : 'rent',
    };

    // Chợ Tốt không hỗ trợ URL pre-fill → base URL + reference param for tracking.
    const postingUrl = `${postingUrlBase}?ref=bdsai&utm_source=bdsai&utm_medium=crosspost&utm_campaign=listing_${input.listingId}`;

    return { formatted, postingUrl };
  }
}

/**
 * Truncate title to 100 chars (Chợ Tốt title limit).
 */
function truncateTitle(title: string): string {
  const MAX = 100;
  if (title.length <= MAX) return title;
  return `${title.slice(0, MAX - 3)}...`;
}

/**
 * Truncate description to 3000 chars + image URLs + bdsai.vn reference link.
 * Story 5.5: imageText counted toward 3000 char limit.
 */
function truncateDescription(desc: string, imageText: string, listingId: string, webUrl: string): string {
  const link = `\n\nTin gốc: ${webUrl}/listings/${listingId}`;
  const fixedOverhead = imageText.length + link.length;
  const maxDesc = CHOTOT_DESC_LIMIT - fixedOverhead;
  if (maxDesc <= 0) {
    // Edge: imageText + link already > 3000 → just link (drop desc + images).
    return `${desc.slice(0, Math.max(CHOTOT_DESC_LIMIT - link.length, 0))}${link}`;
  }
  if (desc.length <= maxDesc) return `${desc}${imageText}${link}`;
  return `${desc.slice(0, maxDesc - 3)}...${imageText}${link}`;
}

/**
 * Map bdsai.vn propertyType → Chợ Tốt category labels.
 * Chợ Tốt BĐS categories: Căn hộ, Nhà đất, Mặt bằng.
 */
function mapPropertyType(propertyType: string): string {
  const map: Record<string, string> = {
    apartment: 'Căn hộ',
    house: 'Nhà đất',
    land: 'Nhà đất',
    villa: 'Nhà đất',
    townhouse: 'Nhà đất',
    office: 'Mặt bằng',
    retail: 'Mặt bằng',
    warehouse: 'Mặt bằng',
  };
  return map[propertyType] ?? 'Nhà đất';
}
