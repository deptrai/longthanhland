import { execSync } from 'node:child_process';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { AppModule } from '../src/app.module';
import { ECHO_QUEUE } from '../src/queue/queue.tokens';

/**
 * Integration test BullMQ queue (AC2, AC9) — Story 1.6.
 *
 * Yêu cầu Redis chạy (docker run -d --name bdsai-redis -p 6379:6379 redis:7-alpine
 * HOẶC native Redis trên host:6379).
 * Nếu Redis không reach → SKIP toàn suite (env guard — KHÔNG fail CI khi thiếu Redis).
 *
 * Verify: enqueue echo job → processor chạy → job complete (AD-6 async).
 */

// Env guard SYNC: describe/describe.skip phải chọn lúc module eval (trước beforeAll).
// Dùng redis-cli execSync — có sẵn trên dev machine (homebrew) + CI Redis container.
// Không có redis-cli → catch → false → skip (đúng behavior khi Redis thiếu).
function isRedisReachable(): boolean {
  try {
    const out = execSync('redis-cli -h 127.0.0.1 -p 6379 ping', {
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return out === 'PONG';
  } catch {
    return false;
  }
}

const redisAvailable = isRedisReachable();

// Dùng describe.skip khi Redis không reach — KHÔNG fail CI (AC9/E1).
const suite = redisAvailable ? describe : describe.skip;

suite('Queue /queue/test (e2e)', () => {
  let app: INestApplication;
  let queue: Queue;
  let redis: IORedis;

  beforeAll(async () => {
    redis = new IORedis('redis://localhost:6379', { maxRetriesPerRequest: null });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    queue = app.get<Queue>(getQueueToken(ECHO_QUEUE));
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    // OBLITERATE queue để job test không leak sang suite sau.
    await queue?.obliterate({ force: true }).catch(() => undefined);
    await redis?.quit().catch(() => undefined);
  });

  jest.setTimeout(30_000);

  it('POST /queue/test → enqueue echo job, processor chạy → job completed (AC2, AD-6)', async () => {
    const res = await request(app.getHttpServer())
      .post('/queue/test')
      .send({ message: 'hello-bdsai-e2e' })
      .expect(201);

    expect(res.body.queued).toBe(true);
    const jobId = res.body.jobId;
    expect(typeof jobId).toBe('string');
    expect(jobId.length).toBeGreaterThan(0);

    // Poll job state cho đến khi completed (AD-6 async — KHÔNG await trong handler).
    const job = await queue.getJob(jobId);
    expect(job).toBeTruthy();
    if (!job) return; // type guard cho noUncheckedIndexedAccess

    let state = await job.getState();
    let attempts = 0;
    while (state === 'waiting' || state === 'active' || state === 'delayed') {
      await new Promise((r) => setTimeout(r, 200));
      state = await job.getState();
      if (++attempts > 50) break; // 10s timeout
    }

    expect(state).toBe('completed');
    // Re-fetch job để lấy returnvalue mới nhất (BullMQ cache returnvalue lúc getJob).
    const completedJob = await queue.getJob(jobId);
    expect(completedJob).toBeTruthy();
    if (!completedJob) return;
    const result = await completedJob.returnvalue;
    expect(result).toEqual({ echoed: 'hello-bdsai-e2e' });
  });

  it('GET /health/redis → 200 { status: ok, redis: { status: up } } (AC1)', async () => {
    const res = await request(app.getHttpServer()).get('/health/redis').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.redis.status).toBe('up');
  });
});
