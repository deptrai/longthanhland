import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DRIZZLE } from '../src/db/database.tokens';
import { publicUsers } from '../src/db/schema/public-users';
import { SupabaseService } from '../src/supabase/supabase.service';
import { eq } from 'drizzle-orm';

// Integration test admin endpoints (AC1-AC10, E1-E9) — Story 2.4.
//
// Yêu cầu Supabase local chạy (supabase start, dải 5435x) + migration 0001
// đã apply + Redis chạy. Nếu Supabase không reach → SKIP toàn suite (env guard).
//
// Setup: register admin user + regular user, set admin role qua DB,
// confirm email, login cả 2 → access tokens.
//
// Verify:
//   - AC1: GET /admin/users → 200 { data, total, page, limit }.
//   - AC2: POST /admin/users/:id/ban → 200 + banned=true.
//   - AC3: POST /admin/users/:id/unban → 200 + banned=false.
//   - AC4/AC5: AdminGuard — user thường → 403, no token → 401.
//   - E4: self-ban → 400. E5: ban admin → 400. E6: not exist → 404.
//   - E7: idempotent ban → 200. E8: search filter. E9: pagination offset.
//   - AC10: rate limit 21 requests → 429.

function isSupabaseReachable(): boolean {
  try {
    const out = execSync(
      'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:54351/auth/v1/health',
      { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .toString()
      .trim();
    return out === '200';
  } catch {
    return false;
  }
}

const supabaseAvailable = isSupabaseReachable();
const suite = supabaseAvailable ? describe : describe.skip;

suite('Admin endpoints (e2e — AC1-AC10, E1-E9)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;

  const uniqueSuffix = randomUUID();
  const adminEmail = `e2e-2-4-admin-${uniqueSuffix}@bdsai.vn`;
  const userEmail = `e2e-2-4-user-${uniqueSuffix}@bdsai.vn`;
  const testPassword = 'Abc12345';
  let adminId: string;
  let userId: string;
  let adminToken: string;
  let userToken: string;

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

    // Register admin user.
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, phone: '0901111111', password: testPassword })
      .expect(201);
    adminId = adminReg.body.userId;
    await supabase.auth.admin.updateUserById(adminId, { email_confirm: true });
    // Set role='admin' qua DB (Story 2.4 — KHÔNG có role grant API).
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, adminId));

    // Register regular user.
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userEmail, phone: '0902222222', password: testPassword })
      .expect(201);
    userId = userReg.body.userId;
    await supabase.auth.admin.updateUserById(userId, { email_confirm: true });

    // Login both.
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: testPassword })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userEmail, password: testPassword })
      .expect(200);
    userToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    try {
      if (adminId) await supabase.auth.admin.deleteUser(adminId);
    } catch {
      // ignore
    }
    try {
      if (userId) await supabase.auth.admin.deleteUser(userId);
    } catch {
      // ignore
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, adminId));
      await db.delete(publicUsers).where(eq(publicUsers.id, userId));
    } catch {
      // ignore
    }
    await app?.close();
  });

  // AC1: GET /admin/users — paginated list.
  it('AC1: admin GET /admin/users → 200 { data, total, page, limit }', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    // Admin + user đều có trong list (total >= 2).
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    // Data item shape: { id, email, phone, role, banned, createdAt }.
    const item = res.body.data[0];
    expect(item.id).toBeDefined();
    expect(item.email).toBeDefined();
    expect(item.phone).toBeDefined();
    expect(item.role).toBeDefined();
    expect(typeof item.banned).toBe('boolean');
    expect(item.createdAt).toBeDefined();
  });

  // E1: no token → 401.
  it('E1: GET /admin/users không Authorization → 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .expect(401);
    expect(res.body.statusCode).toBe(401);
  });

  // AC4/E2: user thường → 403.
  it('AC4/E2: user thường GET /admin/users → 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    expect(res.body.statusCode).toBe(403);
    expect(res.body.message).toBe('Không có quyền truy cập');
  });

  // AC4/E3: user thường POST ban → 403.
  it('AC4/E3: user thường POST /admin/users/:id/ban → 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/ban`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
    expect(res.body.statusCode).toBe(403);
  });

  // E8: search filter.
  it('E8: GET /admin/users?search=<email-substring> → filter', async () => {
    const searchSubstr = userEmail.slice(0, 10);
    const res = await request(app.getHttpServer())
      .get(`/admin/users?search=${encodeURIComponent(searchSubstr)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    // Mọi item phải chứa search substr trong email hoặc phone.
    for (const item of res.body.data) {
      const matches =
        item.email.includes(searchSubstr) || item.phone.includes(searchSubstr);
      expect(matches).toBe(true);
    }
  });

  // E9: pagination offset.
  it('E9: GET /admin/users?page=2&limit=2 → offset correct', async () => {
    const page1 = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const page2 = await request(app.getHttpServer())
      .get('/admin/users?page=2&limit=2')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // Page 2 items khác page 1 items (offset = 2).
    if (page2.body.data.length > 0 && page1.body.data.length > 0) {
      const page1Ids = page1.body.data.map((d: { id: string }) => d.id);
      for (const item of page2.body.data) {
        expect(page1Ids).not.toContain(item.id);
      }
    }
  });

  // AC2: POST ban → 200 + banned=true.
  it('AC2: admin POST /admin/users/:id/ban → 200 + banned=true', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.banned).toBe(true);
    expect(res.body.id).toBe(userId);

    // Verify DB.
    const rows = await db.select().from(publicUsers).where(eq(publicUsers.id, userId));
    expect(rows[0]?.banned).toBe(true);
  });

  // E7: idempotent ban → 200.
  it('E7: ban user đã banned → 200 (idempotent)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.banned).toBe(true);
  });

  // AC3: POST unban → 200 + banned=false.
  it('AC3: admin POST /admin/users/:id/unban → 200 + banned=false', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/unban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.banned).toBe(false);

    const rows = await db.select().from(publicUsers).where(eq(publicUsers.id, userId));
    expect(rows[0]?.banned).toBe(false);
  });

  // E4: self-ban → 400.
  it('E4: admin tự ban mình → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${adminId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBe('Không thể khóa chính mình');
  });

  // E5: ban admin → 400.
  it('E5: ban admin khác → 400', async () => {
    // Tạo admin thứ 2.
    const admin2Email = `e2e-2-4-admin2-${uniqueSuffix}@bdsai.vn`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: admin2Email, phone: '0903333333', password: testPassword })
      .expect(201);
    const admin2Id = reg.body.userId;
    await supabase.auth.admin.updateUserById(admin2Id, { email_confirm: true });
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, admin2Id));

    try {
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${admin2Id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBe('Không thể khóa quản trị viên');
    } finally {
      try {
        await supabase.auth.admin.deleteUser(admin2Id);
      } catch {
        // ignore
      }
      try {
        await db.delete(publicUsers).where(eq(publicUsers.id, admin2Id));
      } catch {
        // ignore
      }
    }
  });

  // E6: not exist → 404.
  it('E6: ban user không tồn tại → 404', async () => {
    const randomId = randomUUID();
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${randomId}/ban`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.message).toBe('Người dùng không tồn tại');
  });

  // Invalid UUID → 400.
  it('AC2a: ban với id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users/not-a-uuid/ban')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });

  // --- Story 2.5: role grant (AC1-AC4, E1-E6, AC8) ---

  // AC1: POST /admin/users/:id/role { role: 'admin' } → 200 + role='admin'.
  it('AC1: admin POST /admin/users/:id/role { role: admin } → 200 + role=admin', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.id).toBe(userId);

    // Verify DB.
    const rows = await db
      .select({ role: publicUsers.role })
      .from(publicUsers)
      .where(eq(publicUsers.id, userId));
    expect(rows[0]?.role).toBe('admin');
  });

  // E5: grant admin cho admin → 200 (idempotent).
  it('E5: grant admin cho user đã role=admin → 200 (idempotent)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(res.body.role).toBe('admin');
  });

  // AC1: revoke (role='user') → 200 + role='user'.
  it('AC1: admin POST /admin/users/:id/role { role: user } → 200 + role=user', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' })
      .expect(200);
    expect(res.body.role).toBe('user');

    const rows = await db
      .select({ role: publicUsers.role })
      .from(publicUsers)
      .where(eq(publicUsers.id, userId));
    expect(rows[0]?.role).toBe('user');
  });

  // AC4: revoke admin khác → 200 + admin B GET /admin/users → 403 (role changed).
  // NOTE: Chạy TRƯỚC E1-E6 để tránh hit rate limit 10/15min (AC4 cần 1 role grant
  // request thành công — nếu chạy sau 10 test E1-E6b+AC2a thì sẽ 429).
  it('AC4: revoke admin khác → 200 + admin B mất quyền ngay (AD-5)', async () => {
    // Tạo admin B.
    const adminBEmail = `e2e-2-5-adminB-${uniqueSuffix}@bdsai.vn`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminBEmail, phone: '0905555555', password: testPassword })
      .expect(201);
    const adminBId = reg.body.userId;
    await supabase.auth.admin.updateUserById(adminBId, { email_confirm: true });
    await db
      .update(publicUsers)
      .set({ role: 'admin' })
      .where(eq(publicUsers.id, adminBId));

    // Login admin B.
    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminBEmail, password: testPassword })
      .expect(200);
    const adminBToken = loginB.body.accessToken;

    try {
      // Admin B có quyền trước khi revoke.
      await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200);

      // Admin A revoke admin B.
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${adminBId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' })
        .expect(200);
      expect(res.body.role).toBe('user');

      // Admin B mất quyền ngay (AdminGuard query DB — KHÔNG cần re-login).
      const resAfter = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(403);
      expect(resAfter.body.statusCode).toBe(403);
    } finally {
      try {
        await supabase.auth.admin.deleteUser(adminBId);
      } catch {
        // ignore
      }
      try {
        await db.delete(publicUsers).where(eq(publicUsers.id, adminBId));
      } catch {
        // ignore
      }
    }
  });

  // E1: no token → 401.
  it('E1: POST /admin/users/:id/role không Authorization → 401', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .send({ role: 'admin' })
      .expect(401);
    expect(res.body.statusCode).toBe(401);
  });

  // E2: user thường → 403.
  it('E2: user thường POST /admin/users/:id/role → 403', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: 'admin' })
      .expect(403);
    expect(res.body.statusCode).toBe(403);
    expect(res.body.message).toBe('Không có quyền truy cập');
  });

  // E3: user không tồn tại → 404.
  it('E3: POST /admin/users/<random-uuid>/role → 404', async () => {
    const randomId = randomUUID();
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${randomId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.message).toBe('Người dùng không tồn tại');
  });

  // E4: self-revoke → 400.
  it('E4: admin tự thu hồi role mình → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${adminId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toBe('Không thể thu hồi vai trò của chính mình');
  });

  // E6: role invalid → 400. (missing role case covered by unit test
  // role-grant.dto.spec.ts — e2e chỉ test superadmin để tiết kiệm rate limit
  // quota 10/15min).
  it('E6: POST role { role: superadmin } → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/admin/users/${userId}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'superadmin' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });

  // AC2a: invalid UUID → 400.
  it('AC2a: POST role với id không phải UUID → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/users/not-a-uuid/role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});

// Rate limit test (AC10) — separate app instance with fresh ThrottlerModule storage.
const rateLimitSuite = supabaseAvailable ? describe : describe.skip;

rateLimitSuite('Rate limit /admin/* (AC10 — 20/15 phút/IP)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  let adminToken: string;
  let adminId: string;

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

    const uniqueSuffix = randomUUID();
    const email = `e2e-2-4-rate-${uniqueSuffix}@bdsai.vn`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, phone: '0904444444', password: 'Abc12345' })
      .expect(201);
    adminId = reg.body.userId;
    await supabase.auth.admin.updateUserById(adminId, { email_confirm: true });
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, adminId));

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Abc12345' })
      .expect(200);
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    try {
      if (adminId) await supabase.auth.admin.deleteUser(adminId);
    } catch {
      // ignore
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, adminId));
    } catch {
      // ignore
    }
    await app?.close();
  });

  it('AC10: 21 admin requests liên tiếp → lần 21 trả 429', async () => {
    let got429 = false;
    for (let i = 0; i < 21; i++) {
      const res = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });
});

// Rate limit test role grant (AC8 — 10/15 phút/IP) — Story 2.5.
// Method-level @Throttle 10/15min override controller-level 20/15min.
const roleRateSuite = supabaseAvailable ? describe : describe.skip;

roleRateSuite('Rate limit /admin/users/:id/role (AC8 — 10/15 phút/IP)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  let adminToken: string;
  let adminId: string;
  let targetId: string;

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

    const uniqueSuffix = randomUUID();
    // Admin.
    const adminEmail = `e2e-2-5-rate-admin-${uniqueSuffix}@bdsai.vn`;
    const adminReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, phone: '0906666666', password: 'Abc12345' })
      .expect(201);
    adminId = adminReg.body.userId;
    await supabase.auth.admin.updateUserById(adminId, { email_confirm: true });
    await db.update(publicUsers).set({ role: 'admin' }).where(eq(publicUsers.id, adminId));

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'Abc12345' })
      .expect(200);
    adminToken = login.body.accessToken;

    // Target user (role grant recipient).
    const targetEmail = `e2e-2-5-rate-target-${uniqueSuffix}@bdsai.vn`;
    const targetReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: targetEmail, phone: '0907777777', password: 'Abc12345' })
      .expect(201);
    targetId = targetReg.body.userId;
    await supabase.auth.admin.updateUserById(targetId, { email_confirm: true });
  });

  afterAll(async () => {
    try {
      if (adminId) await supabase.auth.admin.deleteUser(adminId);
    } catch {
      // ignore
    }
    try {
      if (targetId) await supabase.auth.admin.deleteUser(targetId);
    } catch {
      // ignore
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, adminId));
      await db.delete(publicUsers).where(eq(publicUsers.id, targetId));
    } catch {
      // ignore
    }
    await app?.close();
  });

  it('AC8: 11 role grant requests liên tiếp → lần 11 trả 429', async () => {
    let got429 = false;
    for (let i = 0; i < 11; i++) {
      const res = await request(app.getHttpServer())
        .post(`/admin/users/${targetId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });
});
