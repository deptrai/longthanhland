/* eslint-disable @typescript-eslint/no-explicit-any, no-empty */
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
import { SupabaseService } from '../src/supabase/supabase.service';

// Story 3.1 e2e — listing CRUD + status workflow (real Supabase + Redis).

const supabaseUrl = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54351';
const supabaseAvailable = (() => {
  try {
    const u = new URL(supabaseUrl);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
})();

const suite = supabaseAvailable ? describe : describe.skip;
const testPassword = 'Test1234!';

suite('Marketplace endpoints (e2e — Story 3.1 AC1-AC4)', () => {
  let app: INestApplication;
  let db: DrizzleDB;
  let supabase: SupabaseService;
  let sellerToken: string;
  let sellerId: string;
  let otherToken: string;
  let otherId: string;
  let listingId: string;
  const uniqueSuffix = randomUUID().slice(0, 8);

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

    // Register seller + other user via /auth/register (creates both auth + public_users).
    const sellerEmail = `e2e31seller${uniqueSuffix}@bdsai.vn`;
    const otherEmail = `e2e31other${uniqueSuffix}@bdsai.vn`;

    const sellerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: sellerEmail, phone: '0903000020', password: testPassword })
      .expect(201);
    sellerId = sellerReg.body.userId;
    await supabase.auth.admin.updateUserById(sellerId, { email_confirm: true });

    const otherReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: otherEmail, phone: '0903000021', password: testPassword })
      .expect(201);
    otherId = otherReg.body.userId;
    await supabase.auth.admin.updateUserById(otherId, { email_confirm: true });

    // Login both.
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
  });

  afterAll(async () => {
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
    await app.close();
  });

  // AC1: POST /marketplace/listings — create DRAFT.
  it('AC1: seller POST /marketplace/listings → 201 + status=DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Đất nền Long Thành e2e',
        description: 'Đất nền sổ đỏ, gần sân bay Long Thành',
        price: 2000000000,
        area: 100,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 1, Long Thành',
        legalStatus: 'so_do',
      })
      .expect(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.sellerId).toBe(sellerId);
    listingId = res.body.id;
  });

  // AC1: GET /marketplace/listings — list own.
  it('AC1: GET /marketplace/listings → list own listings', async () => {
    const res = await request(app.getHttpServer())
      .get('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((l: any) => l.id === listingId)).toBe(true);
  });

  // AC1: GET /marketplace/listings/:id — owner xem DRAFT.
  it('AC1: owner GET /marketplace/listings/:id (DRAFT) → 200', async () => {
    const res = await request(app.getHttpServer())
      .get(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.id).toBe(listingId);
  });

  // AC3: non-owner xem DRAFT → 403.
  it('AC3: non-owner GET DRAFT → 403', async () => {
    await request(app.getHttpServer())
      .get(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  // AC1: PATCH /marketplace/listings/:id — update DRAFT.
  it('AC1: owner PATCH DRAFT → 200', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Đất nền Long Thành (đã sửa)' })
      .expect(200);
    expect(res.body.title).toBe('Đất nền Long Thành (đã sửa)');
  });

  // AC3: non-owner PATCH → 403.
  it('AC3: non-owner PATCH → 403', async () => {
    await request(app.getHttpServer())
      .patch(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'hack title' })
      .expect(403);
  });

  // AC4: POST /marketplace/listings/:id/submit — DRAFT → PENDING.
  it('AC4: submit DRAFT → PENDING → 200', async () => {
    const res = await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.status).toBe('PENDING');
  });

  // AC4: submit PENDING again → 400 (invalid transition).
  it('AC4: submit PENDING again → 400 (invalid transition)', async () => {
    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(400);
  });

  // AC1: PATCH PENDING → OK (PENDING editable).
  it('AC1: owner PATCH PENDING → 200 (PENDING editable)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ description: 'Mô tả đã cập nhật khi PENDING' })
      .expect(200);
    expect(res.body.description).toBe('Mô tả đã cập nhật khi PENDING');
  });

  // AC1: DELETE /marketplace/listings/:id — owner.
  it('AC1: owner DELETE → 200', async () => {
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  // E1: no token → 401.
  it('E1: GET /marketplace/listings không token → 401', async () => {
    await request(app.getHttpServer()).get('/marketplace/listings').expect(401);
  });

  // E2: invalid UUID → 400.
  it('E2: GET /marketplace/listings/not-a-uuid → 400', async () => {
    await request(app.getHttpServer())
      .get('/marketplace/listings/not-a-uuid')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(400);
  });

  // E3: not exist → 404.
  it('E3: GET nonexistent → 404', async () => {
    await request(app.getHttpServer())
      .get(`/marketplace/listings/${randomUUID()}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(404);
  });
});
