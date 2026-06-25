import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { QueueService } from './queue.service';
import { ECHO_QUEUE, REDIS_CONNECTION, type EchoJobData } from './queue.tokens';

/**
 * Unit test QueueService (AC2, AC9) — Story 1.6.
 *
 * Mock ioredis + BullMQ Queue + nestjs-pino Logger. Assert:
 *   - onModuleInit ping OK → enabled, addEchoJob gọi queue.add.
 *   - E1: ping fail → disabled, addEchoJob throw clear error.
 *   - E3: addEchoJob truyền attempts 3 + exponential backoff.
 */
describe('QueueService', () => {
  let service: QueueService;
  let redis: { ping: jest.Mock };
  let echoQueue: { add: jest.Mock };

  beforeEach(async () => {
    redis = { ping: jest.fn().mockResolvedValue('PONG') };
    echoQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: REDIS_CONNECTION, useValue: redis },
        { provide: getQueueToken(ECHO_QUEUE), useValue: echoQueue },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => (k === 'REDIS_URL' ? 'redis://localhost:6379' : undefined),
          },
        },
        {
          provide: Logger,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get<QueueService>(QueueService);
  });

  it('onModuleInit ping OK → enabled=true (AC1)', async () => {
    await service.onModuleInit();
    expect(redis.ping).toHaveBeenCalled();
    expect(service.isReady).toBe(true);
  });

  it('addEchoJob gọi queue.add với attempts 3 + exponential backoff (AC2, E3)', async () => {
    await service.onModuleInit();
    const data: EchoJobData = { message: 'hello' };
    const jobId = await service.addEchoJob(data);
    expect(jobId).toBe('job-1');
    expect(echoQueue.add).toHaveBeenCalledWith(ECHO_QUEUE, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  });

  it('E1: ping fail → disabled, addEchoJob throw clear error (graceful degradation)', async () => {
    redis.ping.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:6379'));
    await service.onModuleInit();
    expect(service.isReady).toBe(false);
    await expect(service.addEchoJob({ message: 'x' })).rejects.toThrow(/Queue disabled/);
    expect(echoQueue.add).not.toHaveBeenCalled();
  });

  it('E1: ping trả non-PONG → disabled', async () => {
    redis.ping.mockResolvedValue('BUSY');
    await service.onModuleInit();
    expect(service.isReady).toBe(false);
  });
});
