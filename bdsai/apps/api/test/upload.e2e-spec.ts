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

/**
 * Integration test POST /upload/avatar (AC5, E1, E5, E6, E15) — Story 2.3.
 *
 * Yêu cầu Supabase local chạy + migration 0002 đã apply (bucket avatars) +
 * Redis chạy. Nếu Supabase không reach → SKIP toàn suite (env guard).
 */

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

// Minimal valid 1x1 PNG (67 bytes) — hợp lệ cho sharp decode/convert.
function makePngBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64',
  );
}

suite('POST /upload/avatar (e2e — AC5, E1, E5, E6, E15)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  let accessToken: string;
  let userId: string;

  jest.setTimeout(60_000);

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
    const email = `e2e-upload-${uniqueSuffix}@bdsai.vn`;
    const regRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, phone: '0907776666', password: 'Abc12345' })
      .expect(201);
    userId = regRes.body.userId;
    await supabase.auth.admin.updateUserById(userId, { email_confirm: true });

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Abc12345' })
      .expect(200);
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    try {
      if (userId) await supabase.auth.admin.deleteUser(userId);
    } catch {
      // ignore
    }
    try {
      await db.delete(publicUsers).where(eq(publicUsers.id, userId));
    } catch {
      // ignore
    }
    await app?.close();
  });

  it('AC5: upload PNG hợp lệ → 200 { avatarUrl }', async () => {
    const pngBuffer = makePngBuffer();
    const res = await request(app.getHttpServer())
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
      .expect(200);

    expect(res.body.avatarUrl).toBeDefined();
    expect(typeof res.body.avatarUrl).toBe('string');
    expect(res.body.avatarUrl).toContain('avatars');
    expect(res.body.avatarUrl).toContain('.webp');
  });

  it('E1: upload không JWT → 401', async () => {
    const pngBuffer = makePngBuffer();
    const res = await request(app.getHttpServer())
      .post('/upload/avatar')
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' })
      .expect(401);

    expect(res.body.statusCode).toBe(401);
  });

  it('E6: upload non-image (text/plain) → 400', async () => {
    const textBuffer = Buffer.from('this is not an image');
    const res = await request(app.getHttpServer())
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', textBuffer, { filename: 'test.txt', contentType: 'text/plain' })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toContain('ảnh');
  });

  it('E15: upload file rename .jpg nhưng thực là text → 400 (sharp fail)', async () => {
    const textBuffer = Buffer.from('not really an image');
    const res = await request(app.getHttpServer())
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', textBuffer, { filename: 'fake.jpg', contentType: 'image/jpeg' })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
  });

  it('AC5: upload thiếu file → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(res.body.statusCode).toBe(400);
  });
});
