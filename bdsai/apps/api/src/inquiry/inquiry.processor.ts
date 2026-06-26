import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { inquiries } from '../db/schema/inquiries';
import { publicListings } from '../db/schema/public-listings';
import { publicUsers } from '../db/schema/public-users';
import { EmailService } from '../notification/email.service';

// Story 6.2 — BullMQ processor cho inquiry email notification.
// Job data: { inquiryId, listingId, sellerId }
// Email-first (FR15). SMS hoãn post-MVP.

@Processor('inquiry-notification', { concurrency: 2 })
export class InquiryNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(InquiryNotificationProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<{ inquiryId: string; listingId: string; sellerId: string }>): Promise<void> {
    const { inquiryId, listingId, sellerId } = job.data;
    this.logger.log(
      { action: 'inquiry-notification', inquiryId, listingId, sellerId },
      'Processing inquiry notification',
    );

    // Fetch inquiry + listing + seller info.
    const inquiryRows = await this.db
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId));
    const inquiry = inquiryRows[0];
    if (!inquiry) {
      this.logger.warn({ action: 'inquiry-notification', inquiryId, reason: 'not-found' }, 'Inquiry not found');
      return;
    }

    const listingRows = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, listingId));
    const listing = listingRows[0];
    if (!listing) {
      this.logger.warn({ action: 'inquiry-notification', listingId, reason: 'not-found' }, 'Listing not found');
      return;
    }

    const sellerRows = await this.db
      .select()
      .from(publicUsers)
      .where(eq(publicUsers.id, sellerId));
    const seller = sellerRows[0];
    if (!seller?.email) {
      this.logger.warn({ action: 'inquiry-notification', sellerId, reason: 'no-email' }, 'Seller email not found');
      return;
    }

    // Story 6.2: send email via EmailService (Resend prod / log dev).
    const emailBody = [
      `Bạn nhận được một inquiry mới từ ${inquiry.buyerName}.`,
      ``,
      `Tin: ${listing.title}`,
      `Liên hệ buyer: ${inquiry.buyerPhone}${inquiry.buyerEmail ? ` / ${inquiry.buyerEmail}` : ''}`,
      `Lời nhắn: ${inquiry.message}`,
      ``,
      `Xem tin: https://bdsai.vn/listings/${listing.id}`,
    ].join('\n');

    await this.emailService.send({
      to: seller.email,
      subject: `[bdsai.vn] Inquiry mới cho tin "${listing.title}"`,
      body: emailBody,
    });
  }
}
