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

    // Register seller + other user via /auth/register (creates both auth + public_users).
    // Use Date.now() in email for uniqueness across test runs (Supabase data persists).
    const sellerEmail = `e2e31seller${uniqueSuffix}@bdsai.vn`;
    const otherEmail = `e2e31other${uniqueSuffix}@bdsai.vn`;

    // Use unique phone numbers (last 8 digits of timestamp — VN phone format 090XXXXXXX).
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

  // Story 3.2: POST /marketplace/listings/:id/duplicate.
  it('Story 3.2: duplicate listing → 201 + DRAFT + title "(bản sao)"', async () => {
    // Create a listing first.
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Tin gốc để nhân bản',
        description: 'Mô tả tin gốc nhân bản',
        price: 1500000000,
        area: 80,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Nhơn Trạch',
        address: 'Khu phố 2, Nhơn Trạch',
      })
      .expect(201);
    const sourceId = createRes.body.id;

    const dupRes = await request(app.getHttpServer())
      .post(`/marketplace/listings/${sourceId}/duplicate`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(201);
    expect(dupRes.body.status).toBe('DRAFT');
    expect(dupRes.body.title).toContain('(bản sao)');
    expect(dupRes.body.id).not.toBe(sourceId);

    // Cleanup both.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${dupRes.body.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${sourceId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('Story 3.2: duplicate wrong seller → 403', async () => {
    // Create a listing as seller.
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Tin gốc test 403 duplicate',
        description: 'Mô tả test 403 duplicate',
        price: 1000000000,
        area: 50,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 3, Long Thành',
      })
      .expect(201);
    const sourceId = createRes.body.id;

    // Other user tries to duplicate → 403.
    await request(app.getHttpServer())
      .post(`/marketplace/listings/${sourceId}/duplicate`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    // Cleanup.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${sourceId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  // Story 3.2: POST /upload/listing-image — magic bytes + WebP + Storage.
  it('Story 3.2: upload listing-image (valid PNG) → 200 + url', async () => {
    // 1x1 PNG (magic bytes 89 50 4E 47).
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    const res = await request(app.getHttpServer())
      .post('/upload/listing-image')
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.url).toMatch(/^http/);
    expect(res.body.isCover).toBe(false);
  });

  it('Story 3.2: upload listing-image (magic bytes mismatch) → 400', async () => {
    // Text file with PNG content-type (magic bytes won't match).
    const textBuffer = Buffer.from('not an image file content here');
    await request(app.getHttpServer())
      .post('/upload/listing-image')
      .set('Authorization', `Bearer ${sellerToken}`)
      .attach('file', textBuffer, { filename: 'fake.png', contentType: 'image/png' })
      .expect(400);
  });

  it('Story 3.2: upload listing-image (no auth) → 401', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await request(app.getHttpServer())
      .post('/upload/listing-image')
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
      .expect(401);
  });

  // Story 3.3: public search — GET /marketplace/search (no auth needed).
  it('Story 3.3: GET /marketplace/search → 200 + paginated results', async () => {
    // Create + submit + approve a listing to make it PUBLISHED.
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Đất nền Long Thành search test',
        description: 'Đất nền sổ đỏ gần sân bay Long Thành',
        price: 2000000000,
        area: 120,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 1, Long Thành',
      })
      .expect(201);
    const searchListingId = createRes.body.id;

    // Submit → PENDING.
    await request(app.getHttpServer())
      .post(`/marketplace/listings/${searchListingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    // Set seller as admin to approve (need admin token).
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, sellerId));
    // Re-login to get fresh token with admin role.
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `e2e31seller${uniqueSuffix}@bdsai.vn`, password: testPassword })
      .expect(200);
    const adminToken = adminLogin.body.accessToken;

    // Approve → PUBLISHED.
    await request(app.getHttpServer())
      .post(`/marketplace/listings/${searchListingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Search public (no auth).
    const searchRes = await request(app.getHttpServer())
      .get('/marketplace/search?q=long thanh&province=Đồng Nai')
      .expect(200);
    expect(searchRes.body.items).toBeInstanceOf(Array);
    expect(searchRes.body.total).toBeGreaterThan(0);
    expect(searchRes.body.items.some((l: any) => l.id === searchListingId)).toBe(true);
    expect(searchRes.body.page).toBe(1);

    // Search with sort.
    const sortRes = await request(app.getHttpServer())
      .get('/marketplace/search?sort=price_asc&limit=5')
      .expect(200);
    expect(sortRes.body.items).toBeInstanceOf(Array);
    expect(sortRes.body.limit).toBe(5);

    // Search with price filter.
    const filterRes = await request(app.getHttpServer())
      .get('/marketplace/search?minPrice=1000000000&maxPrice=2100000000')
      .expect(200);
    expect(filterRes.body.items.every((l: any) => l.price >= 1000000000 && l.price <= 2100000000)).toBe(true);

    // Cleanup.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${searchListingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('Story 3.3: GET /marketplace/search empty → 200 + empty items', async () => {
    const res = await request(app.getHttpServer())
      .get('/marketplace/search?q=zzznonexistentzzz')
      .expect(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
    expect(res.body.totalPages).toBe(0);
  });

  it('Story 3.3: admin reject → REJECTED + reason', async () => {
    // Create + submit a listing.
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Tin test reject',
        description: 'Mô tả tin test reject',
        price: 500000000,
        area: 30,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 5, Long Thành',
      })
      .expect(201);
    const rejectListingId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${rejectListingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    // Seller is admin (set in previous test).
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `e2e31seller${uniqueSuffix}@bdsai.vn`, password: testPassword })
      .expect(200);
    const adminToken = adminLogin.body.accessToken;

    // Reject.
    const rejectRes = await request(app.getHttpServer())
      .post(`/marketplace/listings/${rejectListingId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Thông tin không đầy đủ' })
      .expect(200);
    expect(rejectRes.body.status).toBe('REJECTED');
    expect(rejectRes.body.rejectedReason).toBe('Thông tin không đầy đủ');

    // Cleanup.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${rejectListingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('Story 3.3: admin reject reason too short → 400', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Tin test reject short reason',
        description: 'Mô tả tin test reject short reason',
        price: 400000000,
        area: 25,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 6, Long Thành',
      })
      .expect(201);
    const listingId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `e2e31seller${uniqueSuffix}@bdsai.vn`, password: testPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/reject`)
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({ reason: 'ab' })
      .expect(400);

    // Cleanup.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });

  it('Story 3.3: non-admin approve → 403', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/marketplace/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingType: 'sell',
        title: 'Tin test non-admin approve',
        description: 'Mô tả tin test non-admin approve',
        price: 600000000,
        area: 40,
        propertyType: 'land',
        province: 'Đồng Nai',
        district: 'Long Thành',
        address: 'Khu phố 7, Long Thành',
      })
      .expect(201);
    const listingId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/submit`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    // Other user (non-admin) tries to approve → 403.
    await request(app.getHttpServer())
      .post(`/marketplace/listings/${listingId}/approve`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    // Cleanup.
    await request(app.getHttpServer())
      .delete(`/marketplace/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
  });
});
