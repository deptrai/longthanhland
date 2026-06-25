import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { EMAIL_QUEUE, type EmailVerificationJobData } from './queue.tokens';

/**
 * EmailProcessor (AC4d, AD-6) — Story 2.1.
 *
 * Worker xử lý email verification job. Supabase Auth đã gửi email xác thực
 * tự động khi createUser({ email_confirm: false }) — job này là wrapper
 * no-op cho future custom SMTP (Story 2.3/6.2).
 *
 * AD-6: processor chạy NGÒAI request path (BullMQ Worker event loop).
 * AD-8: KHÔNG log email raw — pino redact *.email. Log chỉ userId.
 */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(private readonly logger: Logger) {
    super();
  }

  async process(
    job: Job<EmailVerificationJobData>,
  ): Promise<{ sent: boolean }> {
    // AD-8: log userId only — email redact bởi pino redact config.
    this.logger.log(
      { jobId: job.id, userId: job.data.userId, queue: EMAIL_QUEUE },
      'Email verification job (no-op — Supabase Auth đã gửi email tự động)',
    );
    // Future: custom SMTP send qua Story 6.2.
    return { sent: true };
  }
}
