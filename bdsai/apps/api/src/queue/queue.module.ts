import { Global, Module, type OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import IORedis from 'ioredis';
import type { QueueOptions } from 'bullmq';
import type { Env } from '../config/env.validation';
import { ECHO_QUEUE, REDIS_CONNECTION } from './queue.tokens';
import { QueueService } from './queue.service';
import { EchoProcessor } from './queue.processor';

/**
 * QueueModule (AC2, AD-1, AD-6) — Story 1.6.
 *
 * @Global: hạ tầng queue dùng chung như DatabaseModule — module nghiệp vụ inject
 * QueueService mà KHÔNG cần import QueueModule (AD-1).
 *
 * Cấu trúc:
 *   - REDIS_CONNECTION: ioredis instance dùng chung (Queue + Worker + healthcheck ping).
 *   - BullModule.forRootAsync: connection = redis instance hiện có (tránh tạo connection riêng).
 *   - BullModule.registerQueue: echo queue (test job AC2).
 *   - QueueService: wrapper add job (AD-6 — enqueue async, KHÔNG await job).
 *   - EchoProcessor: Worker xử lý echo job.
 *
 * E1 graceful degradation: Redis down → QueueService.onModuleInit log warn + disabled,
 * app vẫn boot. BullModule.forRoot sẽ tạo connection lazy (BullMQ không fail-fast
 * lúc init — chỉ fail khi add job, đã handle trong QueueService).
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [REDIS_CONNECTION],
      // Cast: top-level ioredis (5.11.1) vs bullmq's nested ioredis có type defs
      // khác nhau (duplicate node_modules) — runtime compatible (cùng ioredis API).
      useFactory: (redis: IORedis) => ({ connection: redis }) as unknown as QueueOptions,
    }),
    BullModule.registerQueue({ name: ECHO_QUEUE }),
  ],
  providers: [
    {
      provide: REDIS_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): IORedis => {
        const url = config.get('REDIS_URL', { infer: true });
        // maxRetriesPerRequest: null — bắt buộc cho BullMQ (BullMQ tự quản lý retry).
        return new IORedis(url, { maxRetriesPerRequest: null });
      },
    },
    QueueService,
    EchoProcessor,
  ],
  exports: [QueueService, REDIS_CONNECTION],
})
export class QueueModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CONNECTION) private readonly redis: IORedis) {}

  /** Đóng Redis connection khi app shutdown — tránh leak. */
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
