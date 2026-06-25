import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from 'nestjs-pino';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { Env } from '../config/env.validation';
import {
  ECHO_QUEUE,
  EMAIL_QUEUE,
  REDIS_CONNECTION,
  type EchoJobData,
  type EmailVerificationJobData,
} from './queue.tokens';

/**
 * QueueService (AC2, AD-6, AD-1) — Story 1.6.
 *
 * Wrapper add job vào BullMQ queue. Module nghiệp vụ (AI, Xaction epic sau)
 * inject service này + enqueue, KHÔNG tạo queue riêng (AD-1).
 *
 * AD-6 (Background Job): job chạy async NGÒAI request path — handler KHÔNG await
 * job hoàn thành, chỉ enqueue rồi return. Test job "echo" verify pipeline.
 *
 * E1 graceful degradation: onModuleInit ping Redis — nếu fail, log warn + mark
 * `enabled=false`, app vẫn boot. `addEchoJob` throw clear error khi Redis down.
 *
 * E3 retry: BullMQ default attempts 3 + exponential backoff 1s.
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private enabled = true;

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    @InjectQueue(ECHO_QUEUE) private readonly echoQueue: Queue<EchoJobData>,
    @InjectQueue(EMAIL_QUEUE)
    private readonly emailQueue: Queue<EmailVerificationJobData>,
    private readonly config: ConfigService<Env, true>,
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error(`Redis ping trả '${pong}' (không phải PONG)`);
      }
      this.logger.log(`Redis kết nối OK — queue enabled (host=${this.redisHost()})`);
      this.enabled = true;
    } catch (e) {
      // E1: graceful degradation — KHÔNG crash app. Redis là hạ tầng job nền.
      this.enabled = false;
      this.logger.warn(`Redis không kết nối được — queue disabled (E1): ${this.safeMsg(e)}`);
    }
  }

  /** Redis có sẵn không (queue enabled). */
  get isReady(): boolean {
    return this.enabled;
  }

  /**
   * Enqueue test job "echo" (AC2). Trả jobId.
   * AD-6: KHÔNG await job hoàn thành — chỉ enqueue.
   * E1: throw clear error khi Redis down (queue disabled).
   */
  async addEchoJob(data: EchoJobData): Promise<string> {
    if (!this.enabled) {
      throw new Error(
        'Queue disabled — Redis không kết nối được (E1). Kiểm tra REDIS_URL + docker run redis.',
      );
    }
    // E3 retry: attempts 3 + exponential backoff 1s.
    const job = await this.echoQueue.add(ECHO_QUEUE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return job.id ?? '';
  }

  /**
   * Enqueue email verification job (Story 2.1 AC4d, AD-6).
   * Supabase Auth đã gửi email tự động — job wrapper cho future custom SMTP.
   * AD-6: KHÔNG await job hoàn thành — chỉ enqueue.
   * E1: throw clear error khi Redis down (queue disabled). AuthService catch
   *   và log warn (KHÔNG block registration — email Supabase đã gửi).
   */
  async addEmailVerificationJob(data: EmailVerificationJobData): Promise<string> {
    if (!this.enabled) {
      throw new Error(
        'Queue disabled — Redis không kết nối được (E1). Kiểm tra REDIS_URL + docker run redis.',
      );
    }
    const job = await this.emailQueue.add(EMAIL_QUEUE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return job.id ?? '';
  }

  private redisHost(): string {
    const url = this.config.get('REDIS_URL', { infer: true });
    try {
      return new URL(url).host;
    } catch {
      return 'unknown';
    }
  }

  private safeMsg(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    // AD-8: redact connection string nếu lọt vào message.
    return msg.replace(/redis:\/\/[^\s]+/gi, '[redacted-url]').slice(0, 200);
  }
}
