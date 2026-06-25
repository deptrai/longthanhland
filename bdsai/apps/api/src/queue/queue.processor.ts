import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from 'nestjs-pino';
import { ECHO_QUEUE, type EchoJobData } from './queue.tokens';

/**
 * EchoProcessor (AC2, AD-6) — Story 1.6.
 *
 * Worker xử lý test job "echo": nhận `{ message }`, echo lại log (pino structured),
 * mark completed. BullMQ auto-retry 3x nếu processor throw (E3 — config ở QueueService).
 *
 * AD-6: processor chạy NGÒAI request path (BullMQ Worker event loop) — KHÔNG block HTTP.
 */
@Processor(ECHO_QUEUE)
export class EchoProcessor extends WorkerHost {
  constructor(private readonly logger: Logger) {
    super();
  }

  async process(job: Job<EchoJobData>): Promise<{ echoed: string }> {
    const { message } = job.data;
    this.logger.log(
      { jobId: job.id, message, queue: ECHO_QUEUE },
      'Echo job processed (AC2)',
    );
    return { echoed: message };
  }
}
