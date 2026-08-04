import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { inquiries } from '../db/schema/inquiries';
import { publicListings } from '../db/schema/public-listings';

// Story 6.1 + 6.2 — Inquiry service.
// Buyer gửi inquiry cho seller, email notification qua BullMQ.

@Injectable()
export class InquiryService {
  private readonly logger = new Logger(InquiryService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @InjectQueue('inquiry-notification') private readonly notificationQueue: Queue,
  ) {}

  // Story 6.1: create inquiry (buyer gửi liên hệ).
  async createInquiry(params: {
    listingId: string;
    buyerId?: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    message: string;
    ipAddress?: string;
  }) {
    // Validate.
    if (!params.buyerName || params.buyerName.trim().length < 2) {
      throw new BadRequestException('Tên tối thiểu 2 ký tự');
    }
    if (!params.buyerPhone || !/^0\d{9,10}$/.test(params.buyerPhone)) {
      throw new BadRequestException('Số điện thoại không hợp lệ (VD: 0901234567)');
    }
    if (!params.message || params.message.trim().length < 10) {
      throw new BadRequestException('Lời nhắn tối thiểu 10 ký tự');
    }

    // Check listing exists + PUBLISHED (AD-9: chặn inquiry tới EXPIRED/SOLD).
    const listings = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, params.listingId));
    const listing = listings[0];
    if (!listing) {
      throw new NotFoundException('Tin không tồn tại');
    }
    if (listing.status !== 'PUBLISHED') {
      throw new BadRequestException('Không thể liên hệ tin không còn hiển thị');
    }

    // Insert inquiry.
    const result = await this.db
      .insert(inquiries)
      .values({
        listingId: params.listingId,
        buyerId: params.buyerId ?? null,
        buyerName: params.buyerName.trim(),
        buyerPhone: params.buyerPhone.trim(),
        buyerEmail: params.buyerEmail?.trim() || null,
        message: params.message.trim(),
        ipAddress: params.ipAddress ?? null,
      })
      .returning();

    const inquiry = result[0];
    if (!inquiry) {
      throw new Error('Failed to create inquiry');
    }

    // Story 6.2: enqueue email notification (background, AD-6).
    await this.notificationQueue.add(
      'send-notification',
      { inquiryId: inquiry.id, listingId: params.listingId, sellerId: listing.sellerId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    this.logger.log(
      { action: 'inquiry-created', inquiryId: inquiry.id, listingId: params.listingId },
      'Inquiry created + notification enqueued',
    );

    return inquiry;
  }

  // Story 6.2: list inquiries for seller (dashboard).
  async listSellerInquiries(sellerId: string) {
    // Join via listing — seller owns listings, inquiries reference listings.
    // Return flat shape for frontend: { id, listingId, listingTitle, buyerName, ... }
    const result = await this.db
      .select({
        id: inquiries.id,
        listingId: inquiries.listingId,
        listingTitle: publicListings.title,
        buyerName: inquiries.buyerName,
        buyerPhone: inquiries.buyerPhone,
        buyerEmail: inquiries.buyerEmail,
        message: inquiries.message,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .innerJoin(publicListings, eq(inquiries.listingId, publicListings.id))
      .where(eq(publicListings.sellerId, sellerId))
      .orderBy(desc(inquiries.createdAt));

    return result;
  }
}
