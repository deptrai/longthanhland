import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicListings } from '../db/schema/public-listings';
import { AiService } from './ai.service';

// Story 4.1 — BullMQ processor cho AI summary generation.
// Job data: { listingId: string }
// Retry: backoff (BullMQ default exponential), fail cuối → tin vẫn hiển thị bình thường.

@Processor('ai-summary', {
  concurrency: 2,
})
export class AiSummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(AiSummaryProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly aiService: AiService,
  ) {
    super();
  }

  async process(job: Job<{ listingId: string }>): Promise<void> {
    const { listingId } = job.data;
    this.logger.log(
      { action: 'ai-summary-job', listingId, attempt: job.attemptsMade },
      'Processing AI summary job',
    );

    // Fetch listing from DB.
    const rows = await this.db
      .select()
      .from(publicListings)
      .where(eq(publicListings.id, listingId));

    const listing = rows[0];
    if (!listing) {
      this.logger.warn(
        { action: 'ai-summary-job', listingId, reason: 'not-found' },
        'Listing not found — skipping',
      );
      return;
    }

    // Generate summary (handles cache + rate limit internally).
    const result = await this.aiService.generateSummary(listing);
    if (!result) {
      this.logger.warn(
        { action: 'ai-summary-job', listingId, reason: 'generation-failed' },
        'AI summary generation returned null — tin vẫn hiển thị bình thường',
      );
    }
  }
}
