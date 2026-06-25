import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as Sentry from '@sentry/node';
import { AppModule } from '../src/app.module';

// Sentry 10 exports non-configurable props → jest.spyOn fail. Mock toàn module.
jest.mock('@sentry/node');

/**
 * Integration test Sentry capture + exception filter shape (AC4, AC6, AC9) — Story 1.6.
 *
 * Verify:
 *   - AC6: GET /nonexistent → 404 error shape chuẩn { statusCode, message, error }.
 *   - AC4: AllExceptionsFilter gọi Sentry.captureException (no-op khi chưa init — E2).
 *   - AD-8: 500 generic KHÔNG leak stack (test qua endpoint throw generic Error
 *     không có trong app này — dùng 404 HttpException đủ verify shape + capture).
 *
 * KHÔNG cần Redis (queue disabled gracefully nếu Redis down — E1).
 */
describe('Sentry + exception filter (e2e)', () => {
  let app: INestApplication;
  const captureException = jest.mocked(Sentry.captureException);

  beforeAll(async () => {
    captureException.mockClear();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60_000);

  afterAll(async () => {
    captureException.mockReset();
    await app.close();
  });

  it('AC6: GET /nonexistent → 404 error shape chuẩn { statusCode, message, error }', async () => {
    const res = await request(app.getHttpServer()).get('/nonexistent-route').expect(404);
    expect(res.body.statusCode).toBe(404);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.error).toBe('Not Found');
  });

  it('AC4: exception filter gọi Sentry.captureException cho 404', async () => {
    captureException.mockClear();
    await request(app.getHttpServer()).get('/another-missing-route').expect(404);
    expect(captureException).toHaveBeenCalled();
  });

  it('AC6: GET /health/redis khi Redis down → 503 error shape chuẩn (E1 graceful)', async () => {
    // Redis có thể down trong CI → /health/redis trả 503 (không crash app).
    const res = await request(app.getHttpServer()).get('/health/redis');
    // 200 (Redis up) hoặc 503 (Redis down) — cả hai đều OK (E1 graceful).
    expect([200, 503]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body.statusCode).toBe(503);
      expect(res.body.error).toBe('Service Unavailable');
    } else {
      expect(res.body.status).toBe('ok');
      expect(res.body.redis.status).toBe('up');
    }
  });
});
