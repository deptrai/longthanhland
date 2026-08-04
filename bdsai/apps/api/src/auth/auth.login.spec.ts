import { Test, type TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { AuthService } from './auth.service';

/**
 * Unit test AuthService.login/logout (AC1, AC2, AC3, E1-E3, E6, E7) — Story 2.2.
 *
 * Mock SupabaseService.auth (signInWithPassword, admin.signOut) + Drizzle select.
 */
describe('AuthService.login/logout (AC1, AC3, E1-E3, E7)', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  const mockUserRow = {
    id: 'user-uuid-1',
    email: 'test-2-2@bdsai.vn',
    phone: '0901234567',
    phoneVerified: false,
    role: 'user',
    banned: false,
    avatarUrl: null,
    bio: null,
    displayName: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    supabaseService = {
      auth: {
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn(),
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        refreshSession: jest.fn(),
      },
    };
    db = {
      insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })),
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([mockUserRow]),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    };
    const queueService = { addEmailVerificationJob: jest.fn().mockResolvedValue('job-1') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: DRIZZLE, useValue: db },
        { provide: QueueService, useValue: queueService },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'SUPABASE_URL' ? 'http://127.0.0.1:54351' : undefined) },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  const loginDto = { email: 'test-2-2@bdsai.vn', password: 'Abc12345' };

  it('AC1: login happy path → 200 + tokens + user', async () => {
    supabaseService.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-jwt-1',
          refresh_token: 'refresh-jwt-1',
          user: { id: 'user-uuid-1', email: 'test-2-2@bdsai.vn' },
        },
        user: { id: 'user-uuid-1', email: 'test-2-2@bdsai.vn' },
      },
      error: null,
    });

    const result = await service.login(loginDto);

    expect(result.accessToken).toBe('access-jwt-1');
    expect(result.refreshToken).toBe('refresh-jwt-1');
    expect(result.user).toEqual({
      id: 'user-uuid-1',
      email: 'test-2-2@bdsai.vn',
      role: 'user',
      phoneVerified: false,
    });
  });

  it('AC3/E1: sai password → 401 "Email hoặc mật khẩu không đúng"', async () => {
    supabaseService.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });

    await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    await expect(service.login(loginDto)).rejects.toThrow('Email hoặc mật khẩu không đúng');
  });

  it('AC3/E2: email không tồn tại → 401 same message (anti-enumeration)', async () => {
    supabaseService.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });

    await expect(
      service.login({ email: 'nonexist@bdsai.vn', password: 'Test1234!' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('E3: email chưa verify → 403 "Vui lòng xác thực email trước khi đăng nhập"', async () => {
    supabaseService.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Email not confirmed' },
    });

    await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    await expect(service.login(loginDto)).rejects.toThrow(
      'Vui lòng xác thực email trước khi đăng nhập',
    );
  });

  it('E7: banned user → 403 "Tài khoản đã bị khóa"', async () => {
    supabaseService.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: 'x',
          refresh_token: 'y',
          user: { id: 'user-banned', email: 'banned@bdsai.vn' },
        },
        user: { id: 'user-banned', email: 'banned@bdsai.vn' },
      },
      error: null,
    });
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ ...mockUserRow, id: 'user-banned', banned: true }]),
      })),
    }));

    await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    await expect(service.login(loginDto)).rejects.toThrow('Tài khoản đã bị khóa');
  });

  it('AC2: logout với userId (guard đã verify) → admin.signOut called', async () => {
    const result = await service.logout('user-uuid-1');

    expect(result.message).toBe('Đăng xuất thành công');
    expect(supabaseService.auth.admin.signOut).toHaveBeenCalledWith('user-uuid-1', 'global');
  });

  it('E6: logout signOut fail (đã logout) → vẫn 200 idempotent', async () => {
    supabaseService.auth.admin.signOut.mockRejectedValue(new Error('already signed out'));

    const result = await service.logout('user-uuid-1');

    expect(result.message).toBe('Đăng xuất thành công');
    expect(supabaseService.auth.admin.signOut).toHaveBeenCalledWith('user-uuid-1', 'global');
  });
});
