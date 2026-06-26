import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { moderationAuditLogs } from '../db/schema/moderation-audit-logs';
import { MarketplaceService, type ListingItem } from './marketplace.service';

// Story 3.5 — keyword blacklist cho spam filter (rule-based cơ bản).
// Admin có thể thêm/xóa keyword (Story 4.3 sẽ nâng cấp thành heuristic).
const SPAM_KEYWORDS = [
  'vay tiền',
  'cho vay',
  'lãi suất 0%',
  'trúng thưởng',
  'click link',
  'viagra',
  'casino',
  'cờ bạc',
  'đại lý',
  'multi level',
  'đầu tư nhanh',
  'x3 tiền',
  'double tiền',
];

// Reject reason templates (AC: "lý do reject chọn từ mẫu").
export const REJECT_REASONS = [
  'Tiêu đề không rõ ràng hoặc gây hiểu nhầm',
  'Thông tin không đầy đủ (thiếu diện tích, giá, hoặc địa chỉ)',
  'Ảnh không hợp lệ hoặc không phải ảnh BĐS thực tế',
  'Tin trùng lặp với tin đã đăng',
  'Nội dung có dấu hiệu spam hoặc quảng cáo không liên quan',
  'Giá không hợp lý so với mặt bằng khu vực',
];

export interface SpamCheckResult {
  flagged: boolean;
  reasons: string[];
  matchedKeywords: string[];
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly marketplaceService: MarketplaceService,
  ) {}

  // AC: spam check — keyword blacklist trên title + description.
  checkSpam(listing: { title: string; description: string; price: number }): SpamCheckResult {
    const text = `${listing.title} ${listing.description}`.toLowerCase();
    const matched = SPAM_KEYWORDS.filter((kw) => text.includes(kw));
    const reasons: string[] = [];
    if (matched.length > 0) {
      reasons.push(`Khớp keyword blacklist: ${matched.join(', ')}`);
    }
    // Heuristic cơ bản: giá = 0 hoặc giá quá thấp (< 1 triệu) → nghi ngờ.
    if (listing.price > 0 && listing.price < 1_000_000) {
      reasons.push('Giá bất thường (quá thấp < 1 triệu VND)');
      matched.push('low_price');
    }
    // Heuristic: title ALL CAPS → spam signal.
    if (listing.title.length > 10 && listing.title === listing.title.toUpperCase()) {
      reasons.push('Tiêu đề toàn chữ hoa (dấu hiệu spam)');
      matched.push('all_caps');
    }
    return {
      flagged: reasons.length > 0,
      reasons,
      matchedKeywords: matched,
    };
  }

  // AC: bulk approve nhiều tin cùng lúc.
  async bulkApprove(listingIds: string[], adminId: string): Promise<{ approved: string[]; failed: Array<{ id: string; error: string }> }> {
    if (!listingIds.length) {
      throw new BadRequestException('Danh sách tin trống');
    }
    const approved: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];
    for (const id of listingIds) {
      try {
        await this.marketplaceService.approveListing(id, adminId);
        await this.logAudit(adminId, id, 'bulk_approve', null, false);
        approved.push(id);
      } catch (e) {
        failed.push({ id, error: e instanceof Error ? e.message : 'Lỗi không xác định' });
      }
    }
    this.logger.log(
      { action: 'bulk-approve', adminId, approved: approved.length, failed: failed.length },
      'Bulk approve completed',
    );
    return { approved, failed };
  }

  // AC: approve single + audit log.
  async approveWithAudit(listingId: string, adminId: string, spamFlagged: boolean): Promise<ListingItem> {
    const result = await this.marketplaceService.approveListing(listingId, adminId);
    await this.logAudit(adminId, listingId, 'approve', null, spamFlagged);
    return result;
  }

  // AC: reject single + audit log.
  async rejectWithAudit(listingId: string, adminId: string, reason: string, spamFlagged: boolean): Promise<ListingItem> {
    const result = await this.marketplaceService.rejectListing(listingId, adminId, reason);
    await this.logAudit(adminId, listingId, 'reject', reason, spamFlagged);
    return result;
  }

  // AC: list pending queue with spam flags.
  async listPendingWithSpamFlags(params: { page?: number; limit?: number }): Promise<{
    items: Array<ListingItem & { spamFlagged: boolean; spamReasons: string[] }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queue = await this.marketplaceService.listPendingQueue(params);
    const items = queue.items.map((listing) => {
      const spamCheck = this.checkSpam(listing);
      return {
        ...listing,
        spamFlagged: spamCheck.flagged,
        spamReasons: spamCheck.reasons,
      };
    });
    return {
      items,
      total: queue.total,
      page: queue.page,
      limit: queue.limit,
      totalPages: queue.totalPages,
    };
  }

  private async logAudit(adminId: string, listingId: string, action: string, reason: string | null, spamFlagged: boolean): Promise<void> {
    try {
      await this.db.insert(moderationAuditLogs).values({
        adminId,
        listingId,
        action,
        reason,
        spamFlagged,
      });
    } catch (e) {
      this.logger.error(
        { action: 'audit-log', adminId, listingId, err: e instanceof Error ? e.message : String(e) },
        'Failed to write audit log',
      );
    }
  }
}
