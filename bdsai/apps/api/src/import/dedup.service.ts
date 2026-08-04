import { Injectable, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicListings } from '../db/schema/public-listings';
import { importedListings } from '../db/schema/imported-listings';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { createHash } from 'node:crypto';

/**
 * DedupService — Story 5.7.
 *
 * Deduplication engine for imported listings.
 *   - Exact match: dedupHash = sha256(normalized_title + '|' + province + '|' + district + '|' + price + '|' + phoneHash)
 *   - Fuzzy match: pg_trgm similarity(title) > 0.85 AND same district AND price within 5%
 *
 * AD-8: phone is sha256 hashed with salt (SUPABASE_PROJECT_ID) — NEVER plaintext.
 */
export interface DedupInput {
  title: string;
  province: string;
  district: string;
  price: number;
  phone: string;
}

export interface DedupResult {
  isDuplicate: boolean;
  existingListingId?: string;
  matchType?: 'exact' | 'fuzzy';
  dedupHash: string;
}

const FUZZY_THRESHOLD = 0.85;
const PRICE_TOLERANCE = 0.05; // 5%

@Injectable()
export class DedupService {
  private readonly logger = new Logger(DedupService.name);
  private readonly phoneSalt: string;

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.phoneSalt = this.config.get('SUPABASE_URL', { infer: true }) ?? 'bdsai-salt';
  }

  /**
   * Compute dedup hash: sha256(normalized_title + '|' + province + '|' + district + '|' + price + '|' + phoneHash)
   */
  computeDedupHash(input: DedupInput): string {
    const normalizedTitle = normalizeText(input.title);
    const phoneHash = this.hashPhone(input.phone);
    const parts = [normalizedTitle, input.province, input.district, String(input.price), phoneHash];
    return sha256(parts.join('|'));
  }

  /**
   * Hash phone with salt (AD-8). Normalize phone before hashing.
   * +84xxxxxxxxx → 0xxxxxxxxx, remove spaces/dashes.
   */
  hashPhone(phone: string): string {
    const normalized = normalizePhone(phone);
    return sha256(`${normalized}:${this.phoneSalt}`);
  }

  /**
   * Check for duplicates — exact hash match first, then fuzzy similarity.
   */
  async checkDuplicate(input: DedupInput): Promise<DedupResult> {
    const dedupHash = this.computeDedupHash(input);

    // 1. Exact match: check imported_listings by dedupHash.
    const exactMatch = await this.db
      .select({ listingId: importedListings.listingId })
      .from(importedListings)
      .where(eq(importedListings.dedupHash, dedupHash))
      .limit(1);

    if (exactMatch.length > 0 && exactMatch[0]?.listingId) {
      return { isDuplicate: true, existingListingId: exactMatch[0].listingId, matchType: 'exact', dedupHash };
    }

    // 2. Fuzzy match: pg_trgm similarity on title + same district + price within 5%.
    const fuzzyMatch = await this.db
      .select({
        id: publicListings.id,
        sim: sql<number>`similarity(${publicListings.title}, ${input.title})`,
      })
      .from(publicListings)
      .where(
        and(
          eq(publicListings.district, input.district),
          sql`${publicListings.price} BETWEEN ${Math.floor(input.price * (1 - PRICE_TOLERANCE))} AND ${Math.ceil(input.price * (1 + PRICE_TOLERANCE))}`,
          sql`similarity(${publicListings.title}, ${input.title}) > ${FUZZY_THRESHOLD}`,
        ),
      )
      .limit(1);

    if (fuzzyMatch.length > 0 && fuzzyMatch[0]?.id) {
      return { isDuplicate: true, existingListingId: fuzzyMatch[0].id, matchType: 'fuzzy', dedupHash };
    }

    return { isDuplicate: false, dedupHash };
  }
}

/**
 * Normalize text: trim + lower + unaccent (remove Vietnamese diacritics).
 * "Căn hộ Long Thành" → "can ho long thanh"
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize phone: +84xxxxxxxxx → 0xxxxxxxxx, remove spaces/dashes.
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
  return p;
}

/**
 * SHA-256 hash helper.
 */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
