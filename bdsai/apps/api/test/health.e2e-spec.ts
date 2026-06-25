import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/database.tokens';

/**
 * Integration test /health/supabase (AC3, AC7) — Story 1.2.
 *
 * Yêu cầu Supabase local đang chạy (supabase start, dải 5435x) + apps/api/.env có biến thật.
 * Test cả 2 nhánh:
 *   1. Supabase up   → 200 { status:'ok', db/auth/storage = up }.
 *   2. DB down (giả) → 503 + error shape chuẩn { statusCode, message, error, details }.
 */
describe('HealthController /health/supabase (e2e)', () => {
  let app: INestApplication;

  // Cold-start kết nối auth/storage qua HTTP có thể chậm khi Docker tải nặng.
  jest.setTimeout(120_000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/supabase → 200 { status: ok } khi Supabase chạy', async () => {
    const res = await request(app.getHttpServer()).get('/health/supabase').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db.status).toBe('up');
    expect(res.body.auth.status).toBe('up');
    expect(res.body.storage.status).toBe('up');
  });

  it('trả error shape chuẩn { statusCode, message, error, details } khi DB unreachable', async () => {
    // Giả lập DB down: thay DRIZZLE bằng stub execute() throw.
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DRIZZLE)
      .useValue({
        execute: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:54352');
        },
      })
      .compile();

    const brokenApp = moduleRef.createNestApplication();
    await brokenApp.init();

    const res = await request(brokenApp.getHttpServer())
      .get('/health/supabase')
      .expect(503);

    expect(res.body.statusCode).toBe(503);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toMatch(/db/);
    expect(res.body.error).toBe('Service Unavailable');
    expect(res.body.details.db.status).toBe('down');
    // AD-8: KHÔNG lộ connection string trong error (đã redact).
    expect(JSON.stringify(res.body)).not.toMatch(/postgres(ql)?:\/\//);

    await brokenApp.close();
  });
});
