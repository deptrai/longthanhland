import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicListings, type publicListings as listingsTable } from '../db/schema/public-listings';

/**
 * MarketplaceService (AC1-AC4, AD-2, AD-9) — Story 3.1.
 *
 * Business logic cho listing CRUD + status workflow:
 *   - createListing(): tạo DRAFT (seller)
 *   - listMyListings(): list own listings (seller)
 *   - getListing(): get by id (owner/admin/PUBLISHED)
 *   - updateListing(): update (owner, DRAFT/PENDING/REJECTED only)
 *   - deleteListing(): delete (owner only)
 *   - submitListing(): DRAFT → PENDING (AC4 workflow)
 *
 * AD-2: mutation qua Service → Drizzle.
 * AD-9: status workflow enforce trong service (KHÔNG DB-level).
 */
export type ListingStatus = typeof listingsTable.$inferSelect.status;
export type ListingItem = typeof listingsTable.$inferSelect;

// AC4: valid status transitions.
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: ['EXPIRED', 'SOLD'],
  EXPIRED: ['PUBLISHED'],
  REJECTED: ['PENDING'],
  SOLD: [],
};

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
  ) {}

  // AC1: POST /marketplace/listings — create DRAFT.
  async createListing(
    sellerId: string,
    dto: Record<string, unknown>,
  ): Promise<ListingItem> {
    try {
      const [row] = await this.db
        .insert(publicListings)
        .values({
          sellerId,
          status: 'DRAFT',
          ...dto,
          // Drizzle numeric returns string — convert number → string.
          area: dto.area != null ? String(dto.area) : undefined,
          lat: dto.lat != null ? String(dto.lat) : undefined,
          lng: dto.lng != null ? String(dto.lng) : undefined,
        } as Record<string, unknown>)
        .returning();
      if (!row) throw new InternalServerErrorException('Tạo tin thất bại');
      this.logger.log(
        { action: 'create-listing', listingId: row.id, sellerId, reason: 'success' },
        'Listing created (DRAFT)',
      );
      return row;
    } catch (e) {
      this.logger.error(
        { action: 'create-listing', sellerId, reason: 'db-fail', err: this.safeErr(e) },
        'createListing thất bại',
      );
      throw new InternalServerErrorException('Tạo tin thất bại');
    }
  }

  // AC1: GET /marketplace/listings — list own listings (seller).
  async listMyListings(sellerId: string): Promise<ListingItem[]> {
    try {
      return await this.db
        .select()
        .from(publicListings)
        .where(eq(publicListings.sellerId, sellerId))
        .orderBy(desc(publicListings.createdAt));
    } catch (e) {
      this.logger.error(
        { action: 'list-my', sellerId, reason: 'db-fail', err: this.safeErr(e) },
        'listMyListings thất bại',
      );
      throw new InternalServerErrorException('Lỗi truy vấn danh sách tin');
    }
  }

  // AC1: GET /marketplace/listings/:id — get listing.
  // Owner/admin xem mọi status. User khác chỉ xem PUBLISHED.
  async getListing(
    listingId: string,
    requesterId?: string,
    isAdmin = false,
  ): Promise<ListingItem> {
    const row = await this.findListingOrThrow(listingId);
    if (!isAdmin && row.sellerId !== requesterId && row.status !== 'PUBLISHED') {
      throw new ForbiddenException('Không có quyền xem tin này');
    }
    return row;
  }

  // AC1: PATCH /marketplace/listings/:id — update (owner, DRAFT/PENDING/REJECTED).
  async updateListing(
    listingId: string,
    sellerId: string,
    dto: Record<string, unknown>,
  ): Promise<ListingItem> {
    const row = await this.findListingOrThrow(listingId);
    if (row.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền sửa tin này');
    }
    // AC4: chỉ DRAFT/PENDING/REJECTED mới sửa được.
    if (!['DRAFT', 'PENDING', 'REJECTED'].includes(row.status)) {
      throw new BadRequestException(
        `Không thể sửa tin ở trạng thái ${row.status} (chỉ sửa được DRAFT/PENDING/REJECTED)`,
      );
    }
    try {
      const setValues: Record<string, unknown> = { ...dto, updatedAt: new Date() };
      // Drizzle numeric returns string — convert number → string.
      if (dto.area != null) setValues.area = String(dto.area);
      if (dto.lat != null) setValues.lat = String(dto.lat);
      if (dto.lng != null) setValues.lng = String(dto.lng);
      const [updated] = await this.db
        .update(publicListings)
        .set(setValues as Record<string, unknown>)
        .where(eq(publicListings.id, listingId))
        .returning();
      if (!updated) throw new InternalServerErrorException('Cập nhật tin thất bại');
      this.logger.log(
        { action: 'update-listing', listingId, sellerId, reason: 'success' },
        'Listing updated',
      );
      return updated;
    } catch (e) {
      this.logger.error(
        { action: 'update-listing', listingId, sellerId, reason: 'db-fail', err: this.safeErr(e) },
        'updateListing thất bại',
      );
      throw new InternalServerErrorException('Cập nhật tin thất bại');
    }
  }

  // AC1: DELETE /marketplace/listings/:id — delete (owner only).
  async deleteListing(listingId: string, sellerId: string): Promise<void> {
    const row = await this.findListingOrThrow(listingId);
    if (row.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền xóa tin này');
    }
    try {
      await this.db.delete(publicListings).where(eq(publicListings.id, listingId));
      this.logger.log(
        { action: 'delete-listing', listingId, sellerId, reason: 'success' },
        'Listing deleted',
      );
    } catch (e) {
      this.logger.error(
        { action: 'delete-listing', listingId, sellerId, reason: 'db-fail', err: this.safeErr(e) },
        'deleteListing thất bại',
      );
      throw new InternalServerErrorException('Xóa tin thất bại');
    }
  }

  // AC4: POST /marketplace/listings/:id/submit — DRAFT → PENDING.
  async submitListing(listingId: string, sellerId: string): Promise<ListingItem> {
    const row = await this.findListingOrThrow(listingId);
    if (row.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền gửi duyệt tin này');
    }
    return this.transitionStatus(listingId, sellerId, row.status, 'PENDING');
  }

  // AC4: status transition với workflow validation.
  async transitionStatus(
    listingId: string,
    actorId: string,
    fromStatus: ListingStatus,
    toStatus: ListingStatus,
    extra?: { rejectedReason?: string; expiresAt?: Date },
  ): Promise<ListingItem> {
    const allowed = VALID_TRANSITIONS[fromStatus]?.includes(toStatus);
    if (!allowed) {
      throw new BadRequestException(
        `Không thể chuyển từ ${fromStatus} → ${toStatus} (workflow không hợp lệ)`,
      );
    }
    const set: Record<string, unknown> = {
      status: toStatus,
      updatedAt: new Date(),
    };
    if (toStatus === 'PUBLISHED') {
      set.publishedAt = new Date();
      // Default expiry 30 days (Story 3.6 sẽ customize).
      set.expiresAt = extra?.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    if (toStatus === 'REJECTED') {
      set.rejectedReason = extra?.rejectedReason ?? null;
    }
    try {
      const [updated] = await this.db
        .update(publicListings)
        .set(set)
        .where(eq(publicListings.id, listingId))
        .returning();
      if (!updated) throw new InternalServerErrorException('Chuyển trạng thái thất bại');
      this.logger.log(
        { action: 'status-transition', listingId, actorId, fromStatus, toStatus, reason: 'success' },
        `Listing ${fromStatus} → ${toStatus}`,
      );
      return updated;
    } catch (e) {
      this.logger.error(
        { action: 'status-transition', listingId, actorId, reason: 'db-fail', err: this.safeErr(e) },
        'transitionStatus thất bại',
      );
      throw new InternalServerErrorException('Chuyển trạng thái thất bại');
    }
  }

  private async findListingOrThrow(listingId: string): Promise<ListingItem> {
    let row: ListingItem | undefined;
    try {
      const rows = await this.db
        .select()
        .from(publicListings)
        .where(eq(publicListings.id, listingId));
      row = rows[0];
    } catch (e) {
      this.logger.error(
        { action: 'find-listing', listingId, reason: 'db-fail', err: this.safeErr(e) },
        'findListingOrThrow DB query thất bại',
      );
      throw new InternalServerErrorException('Lỗi truy vấn tin');
    }
    if (!row) {
      throw new NotFoundException('Tin không tồn tại');
    }
    return row;
  }

  private safeErr(e: unknown): { name: string; message: string } {
    if (e instanceof Error) return { name: e.name, message: e.message };
    return { name: 'Unknown', message: String(e) };
  }
}
