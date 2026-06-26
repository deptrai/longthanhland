import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { appealRequests } from '../db/schema/appeal-requests';
import { publicListings } from '../db/schema/public-listings';

// Story 4.4 — AppealService.
// Seller tạo appeal khiếu nại điểm trust score. Admin review + resolve.
@Injectable()
export class AppealService {
  private readonly logger = new Logger(AppealService.name);

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  // Seller tạo appeal.
  async createAppeal(sellerId: string, listingId: string, reason: string): Promise<{ id: string; status: string }> {
    const trimmed = reason.trim();
    if (trimmed.length < 10) throw new BadRequestException('Lý do khiếu nại tối thiểu 10 ký tự');
    if (trimmed.length > 2000) throw new BadRequestException('Lý do khiếu nại tối đa 2000 ký tự');

    // Verify listing belongs to seller.
    const [listing] = await this.db
      .select({ id: publicListings.id, sellerId: publicListings.sellerId })
      .from(publicListings)
      .where(eq(publicListings.id, listingId))
      .limit(1);
    if (!listing) throw new NotFoundException('Tin không tồn tại');
    if (listing.sellerId !== sellerId) throw new ForbiddenException('Bạn không phải chủ tin này');

    const [row] = await this.db
      .insert(appealRequests)
      .values({ listingId, sellerId, reason: trimmed })
      .returning({ id: appealRequests.id, status: appealRequests.status });
    if (!row) throw new InternalServerErrorException('Tạo khiếu nại thất bại');
    this.logger.log({ action: 'create-appeal', appealId: row.id, sellerId, listingId }, 'Appeal created');
    return row;
  }

  // Admin list pending appeals.
  async listAppeals(status?: string): Promise<typeof appealRequests.$inferSelect[]> {
    if (status) {
      return this.db
        .select()
        .from(appealRequests)
        .where(eq(appealRequests.status, status))
        .orderBy(desc(appealRequests.createdAt));
    }
    return this.db.select().from(appealRequests).orderBy(desc(appealRequests.createdAt));
  }

  // Admin resolve appeal.
  async resolveAppeal(appealId: string, adminId: string, status: 'reviewed' | 'resolved', adminNote?: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(appealRequests)
      .where(eq(appealRequests.id, appealId))
      .limit(1);
    if (!existing) throw new NotFoundException('Khiếu nại không tồn tại');

    await this.db
      .update(appealRequests)
      .set({ status, adminNote: adminNote ?? null, reviewedBy: adminId, reviewedAt: new Date() })
      .where(eq(appealRequests.id, appealId));
    this.logger.log({ action: 'resolve-appeal', appealId, adminId, status }, 'Appeal resolved');
  }
}
