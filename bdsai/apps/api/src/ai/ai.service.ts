import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { aiResults } from '../db/schema/ai-results';
import { publicListings } from '../db/schema/public-listings';

type ListingItem = typeof publicListings.$inferSelect;

// Story 4.1 — AI Summary service (GPT-4 via OpenAI API).
// AD-6: AI cost control — cache theo content_hash, KHÔNG re-generate nếu nội dung không đổi.
// NFR6: rate limit ≤ 100 AI calls/giờ; vượt quota → fallback GPT-3.5-turbo.

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PRIMARY_MODEL = 'gpt-4o-mini';
const FALLBACK_MODEL = 'gpt-3.5-turbo';
const MAX_CALLS_PER_HOUR = 100;

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private callTimestamps: number[] = [];

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
  ) {}

  // Compute content hash for cache invalidation (AD-6).
  computeContentHash(listing: { title: string; description: string; price: number; area: string; propertyType: string; province: string; district: string }): string {
    const content = `${listing.title}|${listing.description}|${listing.price}|${listing.area}|${listing.propertyType}|${listing.province}|${listing.district}`;
    return createHash('sha256').update(content).digest('hex');
  }

  // Check rate limit (NFR6 — ≤ 100 calls/hour).
  isWithinRateLimit(): boolean {
    const now = Date.now();
    this.callTimestamps = this.callTimestamps.filter((ts) => now - ts < 3600_000);
    return this.callTimestamps.length < MAX_CALLS_PER_HOUR;
  }

  // Generate AI summary for a listing (called by BullMQ processor).
  async generateSummary(listing: ListingItem): Promise<{ summary: string; model: string } | null> {
    const contentHash = this.computeContentHash(listing);

    // Check cache — skip if content unchanged (AD-6).
    const existing = await this.db
      .select()
      .from(aiResults)
      .where(eq(aiResults.listingId, listing.id));
    if (existing[0] && existing[0].contentHash === contentHash && existing[0].summary) {
      this.logger.log(
        { action: 'ai-summary-cache-hit', listingId: listing.id },
        'AI summary cache hit — skipping generation',
      );
      return { summary: existing[0].summary, model: existing[0].summaryModel ?? '' };
    }

    // Rate limit check (NFR6).
    const useFallback = !this.isWithinRateLimit();
    const model = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
    if (useFallback) {
      this.logger.warn(
        { action: 'ai-rate-limit-exceeded', listingId: listing.id },
        'AI rate limit exceeded — using fallback model',
      );
    }

    const prompt = this.buildPrompt(listing);
    const apiKey = process.env['OPENAI_API_KEY'];

    if (!apiKey) {
      this.logger.warn(
        { action: 'ai-no-api-key', listingId: listing.id },
        'OPENAI_API_KEY not set — skipping AI summary',
      );
      return null;
    }

    try {
      this.callTimestamps.push(Date.now());
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Bạn là chuyên gia bất động sản Việt Nam. Tóm tắt tin đăng BĐS ngắn gọn, khách quan, bằng tiếng Việt. Tối đa 3 câu. Nêu điểm nổi bật (vị trí, giá, pháp lý) và lưu ý nếu có.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 200,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as OpenAIResponse;
      const summary = data.choices[0]?.message?.content?.trim() ?? '';

      // Save to DB (upsert).
      await this.db
        .insert(aiResults)
        .values({
          listingId: listing.id,
          summary,
          summaryModel: model,
          contentHash,
        })
        .onConflictDoUpdate({
          target: aiResults.listingId,
          set: {
            summary,
            summaryModel: model,
            contentHash,
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      this.logger.log(
        { action: 'ai-summary-generated', listingId: listing.id, model },
        'AI summary generated and saved',
      );
      return { summary, model };
    } catch (e) {
      this.logger.error(
        { action: 'ai-summary-failed', listingId: listing.id, err: e instanceof Error ? e.message : String(e) },
        'AI summary generation failed',
      );
      return null;
    }
  }

  // Get AI results for a listing (used by SSR page, Story 4.4).
  async getAiResults(listingId: string) {
    const rows = await this.db
      .select()
      .from(aiResults)
      .where(eq(aiResults.listingId, listingId));
    return rows[0] ?? null;
  }

  // Story 4.2a: Trust Score Phase 1 — seller verify + listing quality (0-100).
  // KHÔNG dùng market alignment (Phase 2 — Track B).
  computeTrustScore(listing: ListingItem, seller: { phoneVerified: boolean; createdAt: string }): {
    score: number;
    factors: Record<string, number>;
    isEvaluating: boolean;
  } {
    const factors: Record<string, number> = {};
    let score = 0;

    // Seller verified (phone) — 30 points.
    if (seller.phoneVerified) {
      factors['phone_verified'] = 30;
      score += 30;
    }

    // Listing completeness — up to 70 points.
    // Has images: 20 points.
    if (listing.images && listing.images.length > 0) {
      factors['has_images'] = 20;
      score += 20;
    }
    // Has 3+ images: +10 bonus.
    if (listing.images && listing.images.length >= 3) {
      factors['multiple_images'] = 10;
      score += 10;
    }
    // Has legal status: 15 points.
    if (listing.legalStatus) {
      factors['legal_status'] = 15;
      score += 15;
    }
    // Description > 100 chars: 10 points.
    if (listing.description.length > 100) {
      factors['detailed_description'] = 10;
      score += 10;
    }
    // Has ward + street: 10 points (precise location).
    if (listing.ward && listing.street) {
      factors['precise_location'] = 10;
      score += 10;
    }
    // Has bedrooms/bathrooms (for house/apartment): 5 points.
    if (listing.bedrooms != null || listing.bathrooms != null) {
      factors['property_details'] = 5;
      score += 5;
    }

    // Story 4.2a AC: tin mới chưa đủ data → điểm "đang đánh giá" thay vì 0.
    const isEvaluating = score < 20 && !seller.phoneVerified;

    return { score: Math.min(100, score), factors, isEvaluating };
  }

  // Story 4.2a: save trust score to ai_results.
  async saveTrustScore(listingId: string, score: number, factors: Record<string, number>, contentHash: string): Promise<void> {
    try {
      await this.db
        .insert(aiResults)
        .values({
          listingId,
          trustScore: score,
          trustScoreFactors: factors,
          contentHash,
        })
        .onConflictDoUpdate({
          target: aiResults.listingId,
          set: {
            trustScore: score,
            trustScoreFactors: factors,
            contentHash,
            updatedAt: new Date(),
          },
        });
    } catch (e) {
      this.logger.error(
        { action: 'save-trust-score', listingId, err: e instanceof Error ? e.message : String(e) },
        'Failed to save trust score',
      );
    }
  }

  private buildPrompt(listing: ListingItem): string {
    return [
      `Tiêu đề: ${listing.title}`,
      `Mô tả: ${listing.description}`,
      `Giá: ${listing.price.toLocaleString('vi-VN')} VND`,
      `Diện tích: ${listing.area} m²`,
      `Loại BĐS: ${listing.propertyType}`,
      `Loại giao dịch: ${listing.listingType === 'sell' ? 'Bán' : 'Cho thuê'}`,
      `Vị trí: ${listing.address}, ${listing.district}, ${listing.province}`,
      listing.legalStatus ? `Pháp lý: ${listing.legalStatus}` : '',
    ].filter(Boolean).join('\n');
  }
}
