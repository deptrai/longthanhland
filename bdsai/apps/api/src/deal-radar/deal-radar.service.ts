import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/database.tokens';
import { Inject } from '@nestjs/common';
import { dealRadarFilters } from '../db/schema/deal-radar-filters';
import { dealRadarAlerts } from '../db/schema/deal-radar-alerts';
import { publicListings } from '../db/schema/public-listings';

export interface CreateFilterDto {
  rawQuery: string;
}

export interface ParsedFilter {
  propertyType?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  keywords?: string;
}

export interface FilterMatch {
  listingId: string;
  score: number;
  reason: string;
}

@Injectable()
export class DealRadarService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  parseRawQuery(rawQuery: string): ParsedFilter {
    const lower = rawQuery.toLowerCase();

    const propertyTypeMap: Record<string, string> = {
      'chung cư': 'apartment',
      'căn hộ': 'apartment',
      'nhà': 'house',
      'nhà phố': 'house',
      'đất': 'land',
      'đất nền': 'land',
      'shophouse': 'commercial',
      'văn phòng': 'commercial',
      'dự án': 'project',
    };

    let propertyType: string | undefined;
    for (const [key, value] of Object.entries(propertyTypeMap)) {
      if (lower.includes(key)) {
        propertyType = value;
        break;
      }
    }

    // Price range: e.g., "3-4 tỷ" or "3 tỷ đến 4 tỷ".
    const priceRangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:tỷ)?\s*[-–]\s*(\d+(?:\.\d+)?)\s*tỷ/);
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    if (priceRangeMatch && priceRangeMatch[1] && priceRangeMatch[2]) {
      minPrice = parseFloat(priceRangeMatch[1]) * 1_000_000_000;
      maxPrice = parseFloat(priceRangeMatch[2]) * 1_000_000_000;
    }

    // Area range: e.g., "60-70m2" or "60-70 m2".
    const areaRangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*m2?/);
    let minArea: number | undefined;
    let maxArea: number | undefined;
    if (areaRangeMatch && areaRangeMatch[1] && areaRangeMatch[2]) {
      minArea = parseFloat(areaRangeMatch[1]);
      maxArea = parseFloat(areaRangeMatch[2]);
    }

    // Location: extract district names from a small hardcoded list (MVP).
    const knownDistricts = [
      'bình thạnh', 'quận 1', 'quận 2', 'quận 3', 'quận 7', 'quận 9',
      'thủ đức', 'gò vấp', 'phú nhuận', 'tân bình', 'bình tân', 'huyện nhà bè',
    ];
    let location: string | undefined;
    for (const district of knownDistricts) {
      if (lower.includes(district)) {
        location = district;
        break;
      }
    }

    // Keywords: normalize and remove stop words.
    const stopWords = new Set(['cần', 'mua', 'bán', 'tìm', 'giá', 'tỷ', 'triệu', 'm2']);
    const keywords = Array.from(
      new Set(
        lower
          .split(/\s+/)
          .map((w) => w.replace(/[^\w\u00C0-\u1FFF\u2C00-\uD7FF]/g, ''))
          .filter((w) => w.length > 1 && !stopWords.has(w)),
      ),
    );

    return {
      propertyType,
      location,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      keywords: keywords.length > 0 ? keywords.join(',') : undefined,
    };
  }

  async createFilter(sellerId: string, dto: CreateFilterDto) {
    if (!dto.rawQuery || dto.rawQuery.trim().length === 0) {
      throw new BadRequestException('raw_query is required');
    }

    const parsed = this.parseRawQuery(dto.rawQuery);
    if (parsed.minPrice != null && parsed.maxPrice != null && parsed.minPrice > parsed.maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice');
    }

    const [filter] = await this.db
      .insert(dealRadarFilters)
      .values({
        sellerId,
        rawQuery: dto.rawQuery.trim(),
        propertyType: parsed.propertyType,
        location: parsed.location,
        minPrice: parsed.minPrice != null ? String(parsed.minPrice) : undefined,
        maxPrice: parsed.maxPrice != null ? String(parsed.maxPrice) : undefined,
        minArea: parsed.minArea != null ? String(parsed.minArea) : undefined,
        maxArea: parsed.maxArea != null ? String(parsed.maxArea) : undefined,
        keywords: parsed.keywords,
      })
      .returning();

    return filter;
  }

  async listFilters(sellerId: string) {
    return this.db
      .select()
      .from(dealRadarFilters)
      .where(eq(dealRadarFilters.sellerId, sellerId))
      .orderBy(dealRadarFilters.createdAt);
  }

  async matchListings(filterId: string, { page = 1, limit = 20 }: { page: number; limit: number }) {
    const [filter] = await this.db
      .select()
      .from(dealRadarFilters)
      .where(eq(dealRadarFilters.id, filterId))
      .limit(1);

    if (!filter) {
      throw new NotFoundException('Filter not found');
    }

    const conditions = [eq(publicListings.status, 'PUBLISHED')];
    if (filter.propertyType) {
      conditions.push(eq(publicListings.propertyType, filter.propertyType as any));
    }
    if (filter.minPrice != null) {
      conditions.push(gte(publicListings.price, Number(filter.minPrice) * 0.9));
    }
    if (filter.maxPrice != null) {
      conditions.push(lte(publicListings.price, Number(filter.maxPrice) * 1.1));
    }

    const offset = (page - 1) * limit;
    const listings = await this.db
      .select()
      .from(publicListings)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const matches = listings
      .map((listing: any) => this.scoreListing(filter, listing))
      .filter((m: FilterMatch | null) => m !== null) as FilterMatch[];

    return { items: matches, total: matches.length };
  }

  private scoreListing(filter: any, listing: any): FilterMatch | null {
    let score = 0;
    const reasons: string[] = [];

    if (filter.propertyType && listing.propertyType === filter.propertyType) {
      score += 30;
      reasons.push('property type match');
    }

    if (filter.location) {
      const listingLocation = [listing.district, listing.ward, listing.address].join(' ').toLowerCase();
      if (listingLocation.includes(filter.location.toLowerCase())) {
        score += 30;
        reasons.push('location match');
      }
    }

    if (filter.minPrice != null && filter.maxPrice != null) {
      const min = Number(filter.minPrice) * 0.9;
      const max = Number(filter.maxPrice) * 1.1;
      if (listing.price >= min && listing.price <= max) {
        score += 20;
        reasons.push('price range match');
      }
    }

    if (filter.minArea != null && filter.maxArea != null) {
      const min = Number(filter.minArea) * 0.9;
      const max = Number(filter.maxArea) * 1.1;
      const area = Number(listing.area);
      if (area >= min && area <= max) {
        score += 10;
        reasons.push('area range match');
      }
    }

    if (filter.keywords) {
      const keywordList = filter.keywords.split(',');
      const text = `${listing.title} ${listing.description}`.toLowerCase();
      const matched = keywordList.filter((k: string) => text.includes(k.toLowerCase()));
      if (matched.length > 0) {
        score += 10;
        reasons.push(`keywords match: ${matched.join(', ')}`);
      }
    }

    if (score === 0) return null;
    return { listingId: listing.id, score, reason: reasons.join('; ') };
  }
}
