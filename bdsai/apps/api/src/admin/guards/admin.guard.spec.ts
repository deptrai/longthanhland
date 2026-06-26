import { Test, type TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { DRIZZLE } from '../../db/database.tokens';
import { AdminGuard } from './admin.guard';

// Unit test AdminGuard (AC4, AC5, AD-5) — Story 2.4.
//
// Mock DrizzleDB. Verify:
//   - role='admin' → pass (true).
//   - role='user' → ForbiddenException (E2/E3).
//   - orphan (no row) → ForbiddenException (KHÔNG 404 — không leak).
//   - DB query fail → InternalServerErrorException.
//   - no req.user.id → ForbiddenException.
describe('AdminGuard (AC4, AC5, AD-5)', () => {
  let guard: AdminGuard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  function mockContext(userId?: string): ExecutionContext {
    const request = { user: userId ? { id: userId } : undefined };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    db = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([]),
        })),
      })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AdminGuard, { provide: DRIZZLE, useValue: db }],
    }).compile();

    guard = moduleRef.get(AdminGuard);
  });

  it('role=admin → canActivate true', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ role: 'admin' }]),
      })),
    }));
    await expect(guard.canActivate(mockContext('admin-1'))).resolves.toBe(true);
  });

  it('role=user → ForbiddenException (E2/E3)', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([{ role: 'user' }]),
      })),
    }));
    await expect(guard.canActivate(mockContext('user-1'))).rejects.toThrow(
      'Không có quyền truy cập',
    );
  });

  it('orphan (no row) → ForbiddenException (KHÔNG 404 — không leak)', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([]),
      })),
    }));
    await expect(guard.canActivate(mockContext('orphan-1'))).rejects.toThrow(
      'Không có quyền truy cập',
    );
  });

  it('DB query fail → InternalServerErrorException', async () => {
    db.select = jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockRejectedValue(new Error('DB down')),
      })),
    }));
    await expect(guard.canActivate(mockContext('admin-1'))).rejects.toThrow(
      'Lỗi xác thực quyền',
    );
  });

  it('no req.user.id → ForbiddenException', async () => {
    await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(
      'Không có quyền truy cập',
    );
  });
});
