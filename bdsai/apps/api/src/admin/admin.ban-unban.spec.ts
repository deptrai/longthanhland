import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/database.tokens';
import { AdminService } from './admin.service';

// Unit test AdminService.banUser + unbanUser (AC2, AC3, E4-E7) — Story 2.4.
//
// Mock DrizzleDB (select/update chainable). Verify:
//   - banUser happy path → banned=true.
//   - banUser self-ban → 400 (E4).
//   - banUser ban admin → 400 (E5).
//   - banUser not exist → 404 (E6).
//   - banUser already banned → 200 idempotent (E7).
//   - unbanUser happy path → banned=false.
//   - unbanUser not exist → 404 (E6).
//   - DB fail → 500.
describe('AdminService banUser + unbanUser (AC2, AC3, E4-E7)', () => {
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

  // --- banUser (AC2) ---

  const targetUser = {
    id: targetId,
    email: 'user@bdsai.vn',
    phone: '0901234567',
    role: 'user',
    banned: false,
    createdAt: new Date('2026-01-01'),
  };

  it('banUser happy path → banned=true', async () => {
    db.select = findUserSelect(targetUser);

    const result = await service.banUser(targetId, adminId);
    expect(result.banned).toBe(true);
    expect(result.id).toBe(targetId);
    expect(db.update).toHaveBeenCalled();
  });

  it('banUser self-ban → 400 (E4)', async () => {
    await expect(service.banUser(adminId, adminId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.update).not.toHaveBeenCalled();
  });

  it('banUser ban admin → 400 (E5)', async () => {
    db.select = findUserSelect({
      id: 'admin-2',
      email: 'admin2@bdsai.vn',
      phone: '0902222222',
      role: 'admin',
      banned: false,
      createdAt: new Date('2026-01-01'),
    });
    await expect(service.banUser('admin-2', adminId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.update).not.toHaveBeenCalled();
  });

  it('banUser not exist → 404 (E6)', async () => {
    db.select = findUserSelect(null);
    await expect(service.banUser('nonexistent', adminId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('banUser already banned → 200 idempotent (E7)', async () => {
    db.select = findUserSelect({ ...targetUser, banned: true });
    const result = await service.banUser(targetId, adminId);
    expect(result.banned).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it('banUser DB update fail → InternalServerErrorException', async () => {
    db.select = findUserSelect(targetUser);
    db.update = jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockRejectedValue(new Error('update fail')),
      })),
    }));
    await expect(service.banUser(targetId, adminId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  // --- unbanUser (AC3) ---

  it('unbanUser happy path → banned=false', async () => {
    db.select = findUserSelect({ ...targetUser, banned: true });
    const result = await service.unbanUser(targetId, adminId);
    expect(result.banned).toBe(false);
    expect(db.update).toHaveBeenCalled();
  });

  it('unbanUser not exist → 404 (E6)', async () => {
    db.select = findUserSelect(null);
    await expect(service.unbanUser('nonexistent', adminId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('unbanUser already not banned → 200 idempotent (E7)', async () => {
    db.select = findUserSelect(targetUser);
    const result = await service.unbanUser(targetId, adminId);
    expect(result.banned).toBe(false);
  });
});
