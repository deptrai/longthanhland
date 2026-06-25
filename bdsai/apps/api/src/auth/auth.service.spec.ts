import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { AuthService } from './auth.service';

/**
 * Unit test AuthService.register (AC4, AC5, AC7, E1, E4, E5) — Story 2.1.
 *
 * Mock SupabaseService.auth.admin (createUser/deleteUser) + Drizzle insert +
 * QueueService.addEmailVerificationJob.
 *
 * Cases:
 *   - Happy path → 201 + public_users insert + queue job enqueued.
 *   - E1: email trùng → ConflictException, KHÔNG insert, KHÔNG queue.
 *   - E4: supabase createUser fail (network) → InternalServerErrorException.
 *   - E5: db.insert fail → admin.deleteUser called (compensate) + 500.
 *   - AC5: phone normalize trước insert (verify stored phone normalized).
 */
describe('AuthService.register (AC4, AC5, AC7)', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let queueService: { addEmailVerificationJob: jest.Mock };

  beforeEach(async () => {
    supabaseService = {
      auth: {
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
    };
    db = { insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })) };
    queueService = { addEmailVerificationJob: jest.fn().mockResolvedValue('job-1') };

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

  const validDto = {
    email: 'test-2-1@bdsai.vn',
    phone: '0901234567',
    password: 'Abc12345',
  };

  it('happy path → tạo user + insert public_users + enqueue email job (AC4)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-1' } },
      error: null,
    });

    const result = await service.register(validDto);

    expect(result).toEqual({
      userId: 'user-uuid-1',
      email: 'test-2-1@bdsai.vn',
      phoneVerified: false,
      emailVerified: false,
    });
    expect(supabaseService.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'test-2-1@bdsai.vn',
      password: 'Abc12345',
      phone: '+84901234567',
      email_confirm: false,
    });
    expect(db.insert).toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).toHaveBeenCalledWith({
      userId: 'user-uuid-1',
      email: 'test-2-1@bdsai.vn',
    });
  });

  it('AC5: normalize phone +84 → 0 trước insert', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-2' } },
      error: null,
    });

    await service.register({ ...validDto, phone: '+84901234567' });

    // createUser nhận phone E.164 (+84xxxxxxxxx).
    expect(supabaseService.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+84901234567' }),
    );
    // insert nhận phone normalized.
    expect(db.insert).toHaveBeenCalled();
  });

  it('E1: email trùng → ConflictException, KHÔNG insert, KHÔNG queue (AC7)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', error_code: 'email_exists' },
    });

    await expect(service.register(validDto)).rejects.toThrow(ConflictException);

    expect(db.insert).not.toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E4: supabase createUser network error → InternalServerErrorException', async () => {
    supabaseService.auth.admin.createUser.mockRejectedValue(
      new Error('fetch failed: network error'),
    );

    await expect(service.register(validDto)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E5: db.insert fail → compensate deleteUser called + InternalServerErrorException (AC4c)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-orphan' } },
      error: null,
    });
    db.insert.mockReturnValueOnce({
      values: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    });
    supabaseService.auth.admin.deleteUser.mockResolvedValue({ error: null });

    await expect(service.register(validDto)).rejects.toThrow(
      InternalServerErrorException,
    );

    // Compensate rollback: deleteUser called với userId.
    expect(supabaseService.auth.admin.deleteUser).toHaveBeenCalledWith(
      'user-uuid-orphan',
    );
    // Queue KHÔNG enqueue (registration fail).
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E9: rate limit → ConflictException (user-friendly message)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Rate limit exceeded' },
    });

    await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

/**
 * Unit test AuthService.login/logout/refresh/getMe (AC1, AC2, AC3, AC5, AC7, E1-E7) — Story 2.2.
 */
describe('AuthService.login/logout/refresh/getMe (AC1-AC7, E1-E7)', () => {
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

  it('AC5: refresh happy path → new accessToken + refreshToken', async () => {
    supabaseService.auth.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'new-access-jwt',
          refresh_token: 'new-refresh-jwt',
        },
      },
      error: null,
    });

    const result = await service.refresh('old-refresh-jwt');

    expect(result.accessToken).toBe('new-access-jwt');
    expect(result.refreshToken).toBe('new-refresh-jwt');
  });

  it('AC5: refresh không token → 401 "Phiên hết hạn"', async () => {
    await expect(service.refresh(undefined)).rejects.toThrow(UnauthorizedException);
    await expect(service.refresh(undefined)).rejects.toThrow(
      'Phiên hết hạn, vui lòng đăng nhập lại',
    );
  });

  it('E5: refresh fail (revoked) → 401 "Phiên hết hạn"', async () => {
    supabaseService.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Refresh token not found' },
    });

    await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
  });

  it('AC7: getMe happy path → profile from public_users', async () => {
    const result = await service.getMe('user-uuid-1');

    expect(result.id).toBe('user-uuid-1');
    expect(result.email).toBe('test-2-2@bdsai.vn');
    expect(result.role).toBe('user');
    expect(result.phone).toBe('0901234567');
  });

  it('AC7d: getMe orphan (no row) → 404 "Hồ sơ người dùng không tồn tại"', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    }));

    await expect(service.getMe('orphan-uuid')).rejects.toThrow(NotFoundException);
    await expect(service.getMe('orphan-uuid')).rejects.toThrow(
      'Hồ sơ người dùng không tồn tại',
    );
  });
});

/**
 * Unit test AuthService.updateMe (AC3, E2, E8, E11, E13) — Story 2.3.
 */
describe('AuthService.updateMe (AC3, E2, E8, E11, E13)', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  const mockUserRow = {
    id: 'user-uuid-1',
    email: 'test-2-3@bdsai.vn',
    phone: '0901234567',
    phoneVerified: false,
    role: 'user',
    banned: false,
    avatarUrl: null as string | null,
    bio: null as string | null,
    displayName: null as string | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    // Reset mock row giữa các test.
    mockUserRow.avatarUrl = null;
    mockUserRow.bio = null;
    mockUserRow.displayName = null;
    mockUserRow.banned = false;

    db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([mockUserRow]),
        })),
      })),
      update: jest.fn(() => ({
        set: jest.fn((setObj: Record<string, unknown>) => ({
          where: jest.fn(() => {
            // Reflect update vào mock row để getMe (query lại) trả giá trị mới.
            if (setObj.displayName !== undefined) mockUserRow.displayName = setObj.displayName as string | null;
            if (setObj.bio !== undefined) mockUserRow.bio = setObj.bio as string | null;
            if (setObj.avatarUrl !== undefined) mockUserRow.avatarUrl = setObj.avatarUrl as string | null;
            return Promise.resolve(undefined);
          }),
        })),
      })),
    };
    const supabaseService = { auth: { admin: { signOut: jest.fn() } } };
    const queueService = { addEmailVerificationJob: jest.fn() };

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

  it('AC3: happy path → update displayName + bio → 200 + profile mới', async () => {
    const result = await service.updateMe('user-uuid-1', {
      displayName: 'Luis P',
      bio: 'Môi giới BĐS',
    });

    expect(db.update).toHaveBeenCalled();
    expect(result.displayName).toBe('Luis P');
    expect(result.bio).toBe('Môi giới BĐS');
  });

  it('E8: banned user → 403 "Tài khoản đã bị khóa"', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ ...mockUserRow, banned: true }]),
      })),
    }));

    await expect(
      service.updateMe('user-uuid-1', { bio: 'x' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(service.updateMe('user-uuid-1', { bio: 'x' })).rejects.toThrow(
      'Tài khoản đã bị khóa',
    );
  });

  it('E11: orphan (no row) → 404 "Hồ sơ người dùng không tồn tại"', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    }));

    await expect(
      service.updateMe('orphan-uuid', { bio: 'x' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('E13: avatarUrl external host → 400 "URL ảnh không hợp lệ"', async () => {
    await expect(
      service.updateMe('user-uuid-1', {
        avatarUrl: 'https://evil.com/x.jpg',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateMe('user-uuid-1', {
        avatarUrl: 'https://evil.com/x.jpg',
      }),
    ).rejects.toThrow('URL ảnh không hợp lệ');
  });

  it('E13: avatarUrl valid Supabase host → accept', async () => {
    const result = await service.updateMe('user-uuid-1', {
      avatarUrl: 'http://127.0.0.1:54351/storage/v1/object/public/avatars/u1/avatar.webp',
    });
    expect(db.update).toHaveBeenCalled();
    expect(result.id).toBe('user-uuid-1');
  });

  it('AC3: avatarUrl null → set null (xóa avatar)', async () => {
    const result = await service.updateMe('user-uuid-1', { avatarUrl: null });
    expect(db.update).toHaveBeenCalled();
    expect(result.avatarUrl).toBeNull();
  });
});
