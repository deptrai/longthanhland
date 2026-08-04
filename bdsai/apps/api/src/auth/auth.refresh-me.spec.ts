import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { AuthService } from './auth.service';

/**
 * Unit test AuthService.refresh/getMe (AC5, AC7, E5) — Story 2.2.
 *
 * Mock SupabaseService.auth.refreshSession + Drizzle select.
 */
describe('AuthService.refresh/getMe (AC5, AC7, E5)', () => {
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
