import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicListings } from '../db/schema/public-listings';
import { importedListings } from '../db/schema/imported-listings';
import { DedupService, type DedupInput } from './dedup.service';

/**
 * ImportService — Story 5.7.
 *
 * Import listings from external sources (CSV/JSON) with dedup.
 *   - parseCsv(): parse CSV text → ImportRow[]
 *   - parseJson(): parse JSON body → ImportRow[]
 *   - importRows(): for each row → dedup check → insert if new, skip if dup
 *
 * AD-9: imported listings start as PENDING (admin must approve).
 */
export interface ImportRow {
  title: string;
  description: string;
  price: number;
  area: number;
  province: string;
  district: string;
  address: string;
  phone: string;
  propertyType: string; // land | house | apartment | commercial | project
  listingType: string; // sell | rent
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
}

const BATCH_SIZE = 100;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly dedupService: DedupService,
  ) {}

  /**
   * Parse CSV text → ImportRow[].
   * Expected header: title,description,price,area,province,district,address,phone,propertyType,listingType
   */
  parseCsv(csvText: string): ImportRow[] {
    const text = csvText.trim();
    if (!text) throw new BadRequestException('File rỗng');

    const lines = text.split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV không có dữ liệu (chỉ có header)');

    const header = (lines[0] ?? '').split(',').map((h) => h.trim().toLowerCase());
    const requiredCols = ['title', 'price', 'province', 'district', 'address', 'phone'];
    const missing = requiredCols.filter((c) => !header.includes(c));
    if (missing.length > 0) {
      throw new BadRequestException(`Thiếu cột bắt buộc: ${missing.join(', ')}`);
    }

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = (lines[i] ?? '').trim();
      if (!line) continue;
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      header.forEach((col, idx) => {
        row[col] = values[idx] ?? '';
      });
      rows.push({
        title: row['title'] ?? '',
        description: row['description'] ?? '',
        price: parseInt(row['price'] ?? '0', 10) || 0,
        area: parseFloat(row['area'] ?? '0') || 0,
        province: row['province'] ?? '',
        district: row['district'] ?? '',
        address: row['address'] ?? '',
        phone: row['phone'] ?? '',
        propertyType: row['propertytype'] ?? 'land',
        listingType: row['listingtype'] ?? 'sell',
      });
    }
    return rows;
  }

  /**
   * Parse JSON body → ImportRow[].
   */
  parseJson(body: { listings?: ImportRow[] }): ImportRow[] {
    if (!body.listings || !Array.isArray(body.listings)) {
      throw new BadRequestException('Body phải có trường "listings" (array)');
    }
    if (body.listings.length === 0) {
      throw new BadRequestException('Mảng listings rỗng');
    }
    return body.listings;
  }

  /**
   * Import rows with dedup. Process in batches of BATCH_SIZE.
   */
  async importRows(rows: ImportRow[], sourceType: string, sourceUrl?: string): Promise<ImportResult> {
    let imported = 0;
    let duplicates = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      for (let j = 0; j < batch.length; j++) {
        const rowIdx = i + j + 1; // 1-based for error reporting
        const row = batch[j]!;
        try {
          const dedupInput: DedupInput = {
            title: row.title,
            province: row.province,
            district: row.district,
            price: row.price,
            phone: row.phone,
          };
          const dedupResult = await this.dedupService.checkDuplicate(dedupInput);

          if (dedupResult.isDuplicate && dedupResult.existingListingId) {
            // Record as duplicate.
            await this.db.insert(importedListings).values({
              sourceType,
              sourceUrl: sourceUrl ?? null,
              dedupHash: dedupResult.dedupHash,
              sellerPhoneHash: this.dedupService.hashPhone(row.phone),
              rawPayload: row as unknown as Record<string, unknown>,
              listingId: dedupResult.existingListingId,
              status: 'duplicate',
            }).onConflictDoNothing();
            duplicates++;
            continue;
          }

          // Validate propertyType + listingType.
          const validPropertyTypes = ['land', 'house', 'apartment', 'commercial', 'project'];
          const validListingTypes = ['sell', 'rent'];
          if (!validPropertyTypes.includes(row.propertyType)) {
            throw new Error(`propertyType không hợp lệ: ${row.propertyType}`);
          }
          if (!validListingTypes.includes(row.listingType)) {
            throw new Error(`listingType không hợp lệ: ${row.listingType}`);
          }

          // Create listing as PENDING (AD-9 — admin must approve).
          // sellerId: use a system/import admin user — for MVP, require admin to assign.
          // For now, insert with a placeholder sellerId that admin will reassign.
          // NOTE: This requires a system user. For MVP, we skip listing creation
          // and only record the import. Admin manually creates listing from import.
          // When auto-scrape is unblocked, this will auto-create with system user.
          await this.db.insert(importedListings).values({
            sourceType,
            sourceUrl: sourceUrl ?? null,
            dedupHash: dedupResult.dedupHash,
            sellerPhoneHash: this.dedupService.hashPhone(row.phone),
            rawPayload: row as unknown as Record<string, unknown>,
            listingId: null, // No listing created — admin reviews import
            status: 'imported',
          });
          imported++;
        } catch (err) {
          errors.push({
            row: rowIdx,
            message: err instanceof Error ? err.message : 'Lỗi không xác định',
          });
          this.logger.warn({ action: 'import-row-error', row: rowIdx, err: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return { imported, duplicates, errors };
  }
}

/**
 * Parse a single CSV line — handles quoted values with commas.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
