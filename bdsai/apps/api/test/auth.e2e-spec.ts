import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/database.tokens';
import { publicUsers } from '../src/db/schema/public-users';
import { SupabaseService } from '../src/supabase/supabase.service';
import { eq } from 'drizzle-orm';

/**
 * Integration test POST /auth/register (AC4, AC5, AC7, AC3, AC8) — Story 2.1.
 *
 * Yêu cầu Supabase local chạy (supabase start, dải 5435x) + migration 0001
 * đã apply (public_users table) + Redis chạy (queue email job).
 * Nếu Supabase không reach → SKIP toàn suite (env guard).
 *
 * Verify:
 *   - AC4: POST /auth/register hợp lệ → 201 + public_users row tồn tại.
 *   - AC7: trùng email → 409 Conflict.
 *   - AC3: validation fail (email sai, phone sai, password ngắn) → 400.
 *   - AC5: phone +84 normalize → lưu 0xxxxxxxxx trong public_users.
 *   - AC8: error shape chuẩn { statusCode, message, error }.
 */

// Env guard SYNC — check Supabase reachability trước describe.
function isSupabaseReachable(): boolean {
  try {
    const out = execSync(
      'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54351/auth/v1/health',
      { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .toString()
      .trim();
    // 200 = healthy. Một số bản trả 200 cho /auth/v1/health.
    return out === '200';
  } catch {
    return false;
  }
}

const supabaseAvailable = isSupabaseReachable();
const suite = supabaseAvailable ? describe : describe.skip;

// Email unique per test run (UUID — tránh trùng giữa các lần chạy e2e).
const uniqueSuffix = randomUUID();
const testEmail = `e2e-2-1-${uniqueSuffix}@bdsai.vn`;

suite('POST /auth/register (e2e — AC4, AC5, AC7, AC3)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    db = app.get(DRIZZLE);
    supabase = app.get(SupabaseService);

    // Pre-cleanup: xóa Supabase Auth user + public_users nếu email đã tồn tại
    // (từ lần chạy e2e trước không cleanup sạch Supabase Auth).
    try {
      const { data } = await supabase.auth.admin.listUsers();
      const existing = data.users.find((u: { email?: string }) => u.email === testEmail);
      if (existing) {
        await supabase.auth.admin.deleteUser(existing.id);
      }
    } catch {
      // ignore pre-cleanup error
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.email, testEmail));
    } catch {
      // ignore
    }
  });

  afterAll(async () => {
    // Cleanup: xóa user test khỏi public_users + Supabase Auth (best effort).
    try {
      // Tìm userId từ public_users rồi xóa Supabase Auth user (cascade public_users).
      const rows = await db
        .select()
        .from(publicUsers)
        .where(eq(publicUsers.email, testEmail));
      if (rows.length > 0 && rows[0]?.id) {
        await supabase.auth.admin.deleteUser(rows[0].id);
      }
    } catch {
      // ignore cleanup error
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.email, testEmail));
    } catch {
      // ignore
    }
    await app?.close();
  });

  it('AC4: register hợp lệ → 201 { userId, email, phoneVerified, emailVerified }', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        phone: '0901111111',
        password: 'Abc12345',
      })
      .expect(201);

    expect(res.body.userId).toBeDefined();
    expect(typeof res.body.userId).toBe('string');
    expect(res.body.email).toBe(testEmail);
    expect(res.body.phoneVerified).toBe(false);
    expect(res.body.emailVerified).toBe(false);
  });

  it('AC4: public_users row tồn tại với role=user, phone_verified=false', async () => {
    const rows = await db
      .select()
      .from(publicUsers)
      .where(eq(publicUsers.email, testEmail));
    expect(rows.length).toBe(1);
    expect(rows[0]?.role).toBe('user');
    expect(rows[0]?.phoneVerified).toBe(false);
    expect(rows[0]?.banned).toBe(false);
    expect(rows[0]?.phone).toBe('0901111111');
  });

  it('AC7: trùng email → 409 Conflict { statusCode, message, error }', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        phone: '0912345678',
        password: 'Abc12345',
      })
      .expect(409);

    expect(res.body.statusCode).toBe(409);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.error).toBe('Conflict');
    // AD-8: KHÔNG leak email raw trong response.
    expect(JSON.stringify(res.body)).not.toContain(testEmail);
  });

  it('AC3: email sai format → 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        phone: '0901234567',
        password: 'Abc12345',
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  it('AC3: phone sai format → 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `phone-bad-${uniqueSuffix}@bdsai.vn`,
        phone: '12345',
        password: 'Abc12345',
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  it('AC3: password ngắn (< 8) → 400 Bad Request', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `pw-short-${uniqueSuffix}@bdsai.vn`,
        phone: '0901234567',
        password: 'Abc1',
      })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  it('AC5: phone +84 normalize → lưu 0xxxxxxxxx trong public_users', async () => {
    const emailNorm = `norm-${uniqueSuffix}@bdsai.vn`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: emailNorm,
        phone: '+84971234567',
        password: 'Abc12345',
      })
      .expect(201);

    expect(res.body.userId).toBeDefined();

    // Verify public_users lưu phone normalized.
    const rows = await db
      .select()
      .from(publicUsers)
      .where(eq(publicUsers.email, emailNorm));
    expect(rows.length).toBe(1);
    expect(rows[0]?.phone).toBe('0971234567');

    // Cleanup: xóa Supabase Auth user + public_users.
    try {
      const normRows = await db
        .select()
        .from(publicUsers)
        .where(eq(publicUsers.email, emailNorm));
      if (normRows.length > 0 && normRows[0]?.id) {
        await supabase.auth.admin.deleteUser(normRows[0].id);
      }
    } catch {
      // ignore
    }
    await db.delete(publicUsers).where(eq(publicUsers.email, emailNorm));
  });
});
