import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { spamKeywords, spamConfig } from '../db/schema/spam-config';
import { publicListings } from '../db/schema/public-listings';
import { moderationAuditLogs } from '../db/schema/moderation-audit-logs';

// Story 4.3 — SpamConfigService.
// Admin CRUD cho blacklist keywords + heuristic thresholds + override spam flag.
@Injectable()
export class SpamConfigService {
  private readonly logger = new Logger(SpamConfigService.name);

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  // --- Keywords CRUD ---

  async listKeywords(): Promise<{ id: string; keyword: string }[]> {
    return this.db
      .select({ id: spamKeywords.id, keyword: spamKeywords.keyword })
      .from(spamKeywords)
      .orderBy(spamKeywords.keyword);
  }

  async addKeyword(keyword: string, adminId: string): Promise<{ id: string; keyword: string }> {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed.length < 2) throw new BadRequestException('Keyword tối thiểu 2 ký tự');
    const [row] = await this.db
      .insert(spamKeywords)
      .values({ keyword: trimmed, createdBy: adminId })
      .onConflictDoNothing()
      .returning({ id: spamKeywords.id, keyword: spamKeywords.keyword });
    if (!row) {
      // Already existed — fetch.
      const [existing] = await this.db
        .select({ id: spamKeywords.id, keyword: spamKeywords.keyword })
        .from(spamKeywords)
        .where(eq(spamKeywords.keyword, trimmed));
      return existing ?? { id: '', keyword: trimmed };
    }
    return row;
  }

  async removeKeyword(id: string): Promise<void> {
    const [deleted] = await this.db.delete(spamKeywords).where(eq(spamKeywords.id, id)).returning();
    if (!deleted) throw new NotFoundException('Keyword không tồn tại');
  }

  // --- Config (thresholds) ---

  async listConfig(): Promise<{ key: string; value: string }[]> {
    return this.db
      .select({ key: spamConfig.key, value: spamConfig.value })
      .from(spamConfig)
      .orderBy(spamConfig.key);
  }

  async updateConfig(key: string, value: string, adminId: string): Promise<{ key: string; value: string }> {
    if (!key.trim()) throw new BadRequestException('Key không được để trống');
    const [row] = await this.db
      .insert(spamConfig)
      .values({ key: key.trim(), value: value.trim(), updatedBy: adminId })
      .onConflictDoUpdate({
        target: spamConfig.key,
        set: { value: value.trim(), updatedAt: new Date(), updatedBy: adminId },
      })
      .returning({ key: spamConfig.key, value: spamConfig.value });
    if (!row) throw new Error('Cập nhật config thất bại');
    return row;
  }

  // --- Override spam flag (false positive) ---

  async overrideSpamFlag(listingId: string, adminId: string, spamFlagged: boolean): Promise<void> {
    // Story 4.3 AC: admin override cờ spam cho false positive.
    // Audit log ghi lại override action.
    await this.db.insert(moderationAuditLogs).values({
      adminId,
      listingId,
      action: spamFlagged ? 'override-spam-on' : 'override-spam-off',
      spamFlagged,
    });
    this.logger.log(
      { action: 'override-spam', listingId, adminId, spamFlagged },
      'Spam flag overridden by admin',
    );
  }
}
