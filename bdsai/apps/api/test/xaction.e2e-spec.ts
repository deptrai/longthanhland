/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
import { execSync } from 'node:child_process';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { type DrizzleDB, DRIZZLE } from '../src/db/database.tokens';
import { publicListings } from '../src/db/schema/public-listings';
import { publicUsers } from '../src/db/schema/public-users';
import { crossPosts } from '../src/db/schema/cross-posts';
import { SupabaseService } from '../src/supabase/supabase.service';

/**
 * Integration test XactionModule (AC10b) — Story 5.1.
 *
 * Yêu cầu Redis + Supabase chạy (real). Nếu không reach → SKIP toàn suite
 * (env guard — KHÔNG fail CI khi thiếu infra).
 *
 * Verify: POST /xaction/promote → 202, GET /xaction/cross-posts → list,
 * DELETE /xaction/cross-posts/:id → 202 (AD-3 async, BullMQ enqueue).
 */

// Env guard SYNC: describe/describe.skip phải chọn lúc module eval (trước beforeAll).
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

const supabaseUrl = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54351';
const supabaseAvailable = (() => {
  try {
    const u = new URL(supabaseUrl);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
})();

const redisAvailable = isRedisReachable();
const suite = redisAvailable && supabaseAvailable ? describe : describe.skip;
const testPassword = 'Test1234!';

// Enable StubProvider cho cho_tot trước AppModule boot (ConfigModule đọc process.env).
// Story 5.2: facebook nay la FacebookProvider (can XActions that) — e2e endpoint
// flow test dung cho_tot (van StubProvider) de khong phu thuoc XActions.
process.env['XACTION_ENABLED_PROVIDERS'] = 'cho_tot';

suite('Xaction endpoints (e2e — Story 5.1 AC10b)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let supabase: SupabaseService;
  let sellerToken: string;
  let sellerId: string;
  let otherToken: string;
  let otherId: string;
  let listingId: string;
  let crossPostId: string;
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 4)}`;

  jest.setTimeout(90_000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    db = app.get(DRIZZLE);
    supabase = app.get(SupabaseService);

    // Register seller + other user.
    const sellerEmail = `e2e51seller${uniqueSuffix}@bdsai.vn`;
    const otherEmail = `e2e51other${uniqueSuffix}@bdsai.vn`;
    const sellerPhone = `090${String(Date.now()).slice(-7)}`;
    const otherPhone = `091${String(Date.now()).slice(-7)}`;

    const sellerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: sellerEmail, phone: sellerPhone, password: testPassword })
      .expect(201);
    sellerId = sellerReg.body.userId;
    await supabase.auth.admin.updateUserById(sellerId, { email_confirm: true });

    const otherReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: otherEmail, phone: otherPhone, password: testPassword })
      .expect(201);
    otherId = otherReg.body.userId;
    await supabase.auth.admin.updateUserById(otherId, { email_confirm: true });

    const sellerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: sellerEmail, password: testPassword })
      .expect(200);
    sellerToken = sellerLogin.body.accessToken;

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: otherEmail, password: testPassword })
      .expect(200);
    otherToken = otherLogin.body.accessToken;

    // Create + submit + approve a listing → PUBLISHED (needed for promote).
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Đất nền Long Thành xaction e2e',
        description: 'Đất nền sổ đỏ gần sân bay Long Thành',
        price: 2000000000,
        area: 100,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 1, Long Thành',
        legalStatus: 'so_do',
      })
      .expect(201);
    listingId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    // Set seller as admin to approve.
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, sellerId));
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: sellerEmail, password: testPassword })
      .expect(200);
    sellerToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({})
      .expect(200);
  });

  afterAll(async () => {
    try {
      await db.delete(crossPosts).where(eq(crossPosts.listingId, listingId));
    } catch {}
    try {
      await db.delete(publicListings).where(eq(publicListings.sellerId, sellerId));
    } catch {}
    try {
      await supabase.auth.admin.deleteUser(sellerId);
    } catch {}
    try {
      await supabase.auth.admin.deleteUser(otherId);
    } catch {}
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, sellerId));
    } catch {}
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, otherId));
    } catch {}
    await app?.close();
  });

  // AC10b: POST /xaction/promote → 202 + crossPosts + enqueued.
  it('AC10b: POST /xaction/promote (PUBLISHED, owner) → 202 + crossPost pending', async () => {
    const res = await request(app.getHttpServer())
      .post('/xaction/promote')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ listingId, platforms: ['cho_tot'] })
      .expect(202);
    expect(res.body.crossPosts).toBeInstanceOf(Array);
    expect(res.body.crossPosts.length).toBe(1);
    expect(res.body.crossPosts[0].status).toBe('pending');
    expect(res.body.crossPosts[0].platform).toBe('cho_tot');
    expect(res.body.enqueued).toBe(1);
    expect(res.body.errors).toEqual([]);
    crossPostId = res.body.crossPosts[0].id;
  });

  // AC10b: GET /xaction/cross-posts → list (owner).
  it('AC10b: GET /xaction/cross-posts (owner) → 200 + list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/xaction/cross-posts?listingId=${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((cp: any) => cp.id === crossPostId)).toBe(true);
  });

  // H1: non-owner GET cross-posts → 403.
  it('H1: non-owner GET /xaction/cross-posts → 403', async () => {
    await request(app.getHttpServer())
      .get(`/xaction/cross-posts?listingId=${listingId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  // H2: non-owner promote → 403 (NOT 202 with buried error).
  it('H2: non-owner POST /xaction/promote → 403 (fail-fast, not 202)', async () => {
    await request(app.getHttpServer())
      .post('/xaction/promote')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ listingId, platforms: ['cho_tot'] })
      .expect(403);
  });

  // H2: duplicate platform → 202 with errors[] (E9 partial — only 409 in errors).
  it('H2/E9: promote duplicate platform → 202 + errors[] contains 409', async () => {
    const res = await request(app.getHttpServer())
      .post('/xaction/promote')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ listingId, platforms: ['cho_tot'] })
      .expect(202);
    expect(res.body.crossPosts).toHaveLength(0);
    expect(res.body.enqueued).toBe(0);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].platform).toBe('cho_tot');
  });

  // AC10b: DELETE /xaction/cross-posts/:id → 202.
  it('AC10b: DELETE /xaction/cross-posts/:id (owner) → 202', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/xaction/cross-posts/${crossPostId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(202);
    expect(res.body.message).toMatch(/removal/i);
  });

  // H1: no token → 401.
  it('E1: GET /xaction/cross-posts no token → 401', async () => {
    await request(app.getHttpServer())
      .get(`/xaction/cross-posts?listingId=${listingId}`)
      .expect(401);
  });

  // H1: invalid UUID → 400.
  it('E2: GET /xaction/cross-posts invalid UUID → 400', async () => {
    await request(app.getHttpServer())
      .get('/xaction/cross-posts?listingId=not-a-uuid')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(400);
  });
});
