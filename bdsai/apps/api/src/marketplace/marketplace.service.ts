import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(setValues as any)
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

  // Story 3.2: duplicate listing — tạo DRAFT mới từ listing có sẵn.
  async duplicateListing(listingId: string, sellerId: string): Promise<ListingItem> {
    const row = await this.findListingOrThrow(listingId);
    if (row.sellerId !== sellerId) {
      throw new ForbiddenException('Không có quyền nhân bản tin này');
    }
    // Tạo DRAFT mới copy tất cả field trừ id, status, createdAt, updatedAt,
    // publishedAt, expiresAt, rejectedReason, searchVector.
    try {
      const [newRow] = await this.db
        .insert(publicListings)
        .values({
          sellerId,
          status: 'DRAFT',
          listingType: row.listingType,
          title: `${row.title} (bản sao)`,
          description: row.description,
          price: row.price,
          area: row.area,
          propertyType: row.propertyType,
          province: row.province,
          district: row.district,
          ward: row.ward,
          street: row.street,
          address: row.address,
          lat: row.lat,
          lng: row.lng,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          floorCount: row.floorCount,
          legalStatus: row.legalStatus,
          // Copy images nhưng reset isCover (form sẽ set lại).
          images: (row.images ?? []).map((img: { url: string; isCover: boolean }) => ({ url: img.url, isCover: false })),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .returning();
      if (!newRow) throw new InternalServerErrorException('Nhân bản tin thất bại');
      this.logger.log(
        { action: 'duplicate-listing', sourceId: listingId, newId: newRow.id, sellerId, reason: 'success' },
        'Listing duplicated',
      );
      return newRow;
    } catch (e) {
      this.logger.error(
        { action: 'duplicate-listing', listingId, sellerId, reason: 'db-fail', err: this.safeErr(e) },
        'duplicateListing thất bại',
      );
      throw new InternalServerErrorException('Nhân bản tin thất bại');
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

  // Story 3.3: public search — PUBLISHED only, FTS + filter + sort + pagination.
  async searchListings(params: {
    q?: string;
    province?: string;
    district?: string;
    listingType?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc';
    page?: number;
    limit?: number;
  }): Promise<{ items: ListingItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(publicListings.status, 'PUBLISHED')];

    if (params.q && params.q.trim()) {
      // FTS tiếng Việt không dấu (Story 1.5 — f_unaccent_query).
      conditions.push(
        sql`f_unaccent_to_tsvector(
          COALESCE(${publicListings.title}, '') || ' ' ||
          COALESCE(${publicListings.description}, '') || ' ' ||
          COALESCE(${publicListings.province}, '') || ' ' ||
          COALESCE(${publicListings.district}, '') || ' ' ||
          COALESCE(${publicListings.ward}, '') || ' ' ||
          COALESCE(${publicListings.street}, '') || ' ' ||
          COALESCE(${publicListings.address}, '')
        ) @@ f_unaccent_query(${params.q.trim()})`,
      );
    }
    if (params.province) conditions.push(eq(publicListings.province, params.province));
    if (params.district) conditions.push(eq(publicListings.district, params.district));
    if (params.listingType) conditions.push(eq(publicListings.listingType, params.listingType as 'sell' | 'rent'));
    if (params.propertyType) conditions.push(eq(publicListings.propertyType, params.propertyType as 'land' | 'house' | 'apartment' | 'commercial' | 'project'));
    if (params.minPrice != null) conditions.push(gte(publicListings.price, params.minPrice));
    if (params.maxPrice != null) conditions.push(lte(publicListings.price, params.maxPrice));
    if (params.minArea != null) conditions.push(gte(publicListings.area, String(params.minArea)));
    if (params.maxArea != null) conditions.push(lte(publicListings.area, String(params.maxArea)));

    const where = and(...conditions);

    // Sort.
    const orderBy: SQL =
      params.sort === 'price_asc' ? asc(publicListings.price) :
      params.sort === 'price_desc' ? desc(publicListings.price) :
      desc(publicListings.createdAt);

    try {
      const [items, countRows] = await Promise.all([
        this.db
          .select()
          .from(publicListings)
          .where(where)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(publicListings)
          .where(where),
      ]);
      const total = countRows[0]?.count ?? 0;
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      this.logger.error(
        { action: 'search-listings', reason: 'db-fail', err: this.safeErr(e) },
        'searchListings DB query thất bại',
      );
      throw new InternalServerErrorException('Tìm kiếm thất bại');
    }
  }

  // Story 3.3: admin approve — PENDING → PUBLISHED.
  async approveListing(listingId: string, adminId: string): Promise<ListingItem> {
    return this.transitionStatus(listingId, adminId, 'PENDING', 'PUBLISHED' as ListingStatus);
  }

  // Story 3.3: admin reject — PENDING → REJECTED (kèm lý do).
  async rejectListing(listingId: string, adminId: string, reason: string): Promise<ListingItem> {
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Lý do từ chối tối thiểu 3 ký tự');
    }
    return this.transitionStatus(listingId, adminId, 'PENDING', 'REJECTED' as ListingStatus, {
      rejectedReason: reason.trim(),
    });
  }

  // Story 3.3: admin list pending queue — for moderation.
  async listPendingQueue(params: {
    page?: number;
    limit?: number;
  }): Promise<{ items: ListingItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;
    try {
      const [items, countRows] = await Promise.all([
        this.db
          .select()
          .from(publicListings)
          .where(eq(publicListings.status, 'PENDING'))
          .orderBy(asc(publicListings.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(publicListings)
          .where(eq(publicListings.status, 'PENDING')),
      ]);
      const total = countRows[0]?.count ?? 0;
      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    } catch (e) {
      this.logger.error(
        { action: 'list-pending', reason: 'db-fail', err: this.safeErr(e) },
        'listPendingQueue DB query thất bại',
      );
      throw new InternalServerErrorException('Lỗi truy vấn hàng đợi duyệt');
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
