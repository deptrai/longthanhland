import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/database.tokens';
import { AdminService } from './admin.service';

// Unit test AdminService.grantRole (AC1, AC3, AC4) — Story 2.5.
//
// Mock DrizzleDB (select/update chainable). Verify:
//   - grantRole happy path (user → admin) → role=admin.
//   - grantRole happy path (admin → user) → role=user.
//   - grantRole self-revoke → 400 (E4).
//   - grantRole target là super-admin → 400 (R2).
//   - grantRole self-grant → 200 idempotent (E5).
//   - grantRole not exist → 404 (E3).
//   - grantRole idempotent (admin → admin) → 200 (E5).
//   - DB update fail → 500.
describe('AdminService grantRole (AC1, AC3, AC4)', () => {
  let service: AdminService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

  const adminId = 'admin-uuid-1';
  const targetId = 'user-uuid-1';

  // Helper: build chainable mock for list query (data: select→from→where→limit→offset→orderBy).
  function chainableSelect(result: unknown[]) {
    return jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => ({
            offset: jest.fn(() => ({
              orderBy: jest.fn().mockResolvedValue(result),
            })),
          })),
        })),
      })),
    }));
  }

  // Helper: mock select for findUserOrThrow (select→from→where → Promise<rows>).
  function findUserSelect(row: unknown | null) {
    return jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(row ? [row] : []),
      })),
    }));
  }

  beforeEach(async () => {
    db = {
      select: chainableSelect([]),
      update: jest.fn(() => ({
        set: jest.fn(() => ({
          where: jest.fn().mockResolvedValue(undefined),
        })),
      })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: DRIZZLE, useValue: db }],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  // --- grantRole (AC1, AC3, AC4) — Story 2.5 ---

  const targetUser = {
    id: targetId,
    email: 'user@bdsai.vn',
    phone: '0901234567',
    role: 'user',
    banned: false,
    createdAt: new Date('2026-01-01'),
  };

  it('grantRole happy path (user → admin) → role=admin', async () => {
    db.select = findUserSelect(targetUser);
    const result = await service.grantRole(targetId, 'admin', adminId);
    expect(result.role).toBe('admin');
    expect(result.id).toBe(targetId);
    expect(db.update).toHaveBeenCalled();
  });

  it('grantRole happy path (admin → user) → role=user', async () => {
    db.select = findUserSelect({ ...targetUser, role: 'admin' });
    const result = await service.grantRole(targetId, 'user', adminId);
    expect(result.role).toBe('user');
    expect(db.update).toHaveBeenCalled();
  });

  it('grantRole self-revoke → 400 (E4)', async () => {
    await expect(
      service.grantRole(adminId, 'user', adminId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('grantRole target là super-admin → 400 (R2 — defense-in-depth)', async () => {
    db.select = findUserSelect({ ...targetUser, role: 'super-admin' });
    await expect(
      service.grantRole(targetId, 'user', adminId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it('grantRole self-grant → 200 idempotent (E5)', async () => {
    db.select = findUserSelect({
      id: adminId,
      email: 'admin@bdsai.vn',
      phone: '0901111111',
      role: 'admin',
      banned: false,
      createdAt: new Date('2026-01-01'),
    });
    const result = await service.grantRole(adminId, 'admin', adminId);
    expect(result.role).toBe('admin');
    expect(db.update).toHaveBeenCalled();
  });

  it('grantRole not exist → 404 (E3)', async () => {
    db.select = findUserSelect(null);
    await expect(
      service.grantRole('nonexistent', 'admin', adminId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grantRole idempotent (admin → admin) → 200 (E5)', async () => {
    db.select = findUserSelect({ ...targetUser, role: 'admin' });
    const result = await service.grantRole(targetId, 'admin', adminId);
    expect(result.role).toBe('admin');
    expect(db.update).toHaveBeenCalled();
  });

  it('grantRole DB update fail → InternalServerErrorException', async () => {
    db.select = findUserSelect(targetUser);
    db.update = jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockRejectedValue(new Error('update fail')),
      })),
    }));
    await expect(
      service.grantRole(targetId, 'admin', adminId),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
