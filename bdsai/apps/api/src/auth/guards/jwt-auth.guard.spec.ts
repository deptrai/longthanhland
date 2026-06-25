import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Unit test JwtAuthGuard (AC6, E4, E10) — Story 2.2.
 *
 * Hybrid verify: HS256 local (fast path) → ES256 fallback (supabase.auth.getUser).
 *
 * Cases:
 *   - Valid HS256 JWT → pass, request.user = { id, email }.
 *   - No Authorization header → 401 "Thiếu token xác thực".
 *   - Malformed header (no Bearer prefix) → 401.
 *   - Expired JWT → 401 "Token hết hạn hoặc không hợp lệ".
 *   - Malformed JWT → 401.
 *   - Wrong secret JWT → fallback to supabase.auth.getUser → 401 if fail.
 *   - ES256 JWT (HS256 fails) → fallback supabase.auth.getUser → pass.
 */
const TEST_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const TEST_SUPABASE_URL = 'http://127.0.0.1:54351';
const TEST_EXPECTED_ISS = `${TEST_SUPABASE_URL}/auth/v1`;

describe('JwtAuthGuard (AC6, E4, E10)', () => {
  let guard: JwtAuthGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseService: any;

  beforeEach(async () => {
    supabaseService = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        }),
      },
    };
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'SUPABASE_JWT_SECRET') return TEST_SECRET;
              if (key === 'SUPABASE_URL') return TEST_SUPABASE_URL;
              return undefined;
            },
          },
        },
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();
    guard = moduleRef.get(JwtAuthGuard);
  });

  function makeContext(headers: Record<string, string>): ExecutionContext {
    const request = { headers } as unknown as Request;
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  it('valid HS256 JWT → canActivate true, request.user = { id, email }', async () => {
    const token = jwt.sign(
      { sub: 'user-uuid-1', email: 'test@bdsai.vn', role: 'authenticated' },
      TEST_SECRET,
      { expiresIn: '1h', issuer: TEST_EXPECTED_ISS },
    );
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const req = ctx.switchToHttp().getRequest<Request>();
    expect((req as unknown as { user: { id: string; email?: string } }).user).toEqual({
      id: 'user-uuid-1',
      email: 'test@bdsai.vn',
    });
    // Supabase fallback NOT called (HS256 succeeded).
    expect(supabaseService.auth.getUser).not.toHaveBeenCalled();
  });

  it('AC6b: HS256 JWT iss sai → 401 (KHÔNG fallback ES256)', async () => {
    // Token signed với đúng secret nhưng issuer khác (vd Supabase project khác).
    const token = jwt.sign(
      { sub: 'user-uuid-1', email: 'test@bdsai.vn' },
      TEST_SECRET,
      { expiresIn: '1h', issuer: 'http://evil-supabase.example.com/auth/v1' },
    );
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Token hết hạn hoặc không hợp lệ');
    // Fallback NOT called — iss mismatch rejected immediately.
    expect(supabaseService.auth.getUser).not.toHaveBeenCalled();
  });

  it('ES256 JWT (HS256 fails) → fallback supabase.auth.getUser → pass', async () => {
    supabaseService.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-es256', email: 'es256@bdsai.vn' } },
      error: null,
    });
    // Token signed with wrong secret → HS256 fails → fallback.
    const token = jwt.sign({ sub: 'user-es256' }, 'wrong-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaa', {
      expiresIn: '1h',
    });
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(supabaseService.auth.getUser).toHaveBeenCalledWith(token);
    const req = ctx.switchToHttp().getRequest<Request>();
    expect((req as unknown as { user: { id: string } }).user.id).toBe('user-es256');
  });

  it('E10: no Authorization header → 401 "Thiếu token xác thực"', async () => {
    const ctx = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Thiếu token xác thực');
  });

  it('E10: malformed header (no Bearer prefix) → 401', async () => {
    const ctx = makeContext({ authorization: 'Token abc123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('E4: expired JWT → 401 "Token hết hạn hoặc không hợp lệ"', async () => {
    const token = jwt.sign({ sub: 'user-uuid-2' }, TEST_SECRET, { expiresIn: '-1s' });
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Token hết hạn hoặc không hợp lệ');
  });

  it('E10: malformed JWT → 401', async () => {
    const ctx = makeContext({ authorization: 'Bearer not-a-jwt' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('E10: wrong secret JWT + supabase fallback fail → 401', async () => {
    const token = jwt.sign({ sub: 'user-uuid-3' }, 'wrong-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaa', {
      expiresIn: '1h',
    });
    const ctx = makeContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(ctx)).rejects.toThrow('Token hết hạn hoặc không hợp lệ');
  });
});
