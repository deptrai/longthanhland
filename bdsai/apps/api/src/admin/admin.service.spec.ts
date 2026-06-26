import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/database.tokens';
import { AdminService } from './admin.service';

// Unit test AdminService (AC1, AC2, AC3, E4-E9) — Story 2.4.
//
// Mock DrizzleDB (select/update chainable). Verify:
//   - listUsers happy path → data + total + pagination.
//   - listUsers with search → filter ilike.
//   - listUsers pagination → offset correct (E9).
//   - banUser happy path → banned=true.
//   - banUser self-ban → 400 (E4).
//   - banUser ban admin → 400 (E5).
//   - banUser not exist → 404 (E6).
//   - banUser already banned → 200 idempotent (E7).
//   - unbanUser happy path → banned=false.
//   - unbanUser not exist → 404 (E6).
//   - DB fail → 500.
describe('AdminService (AC1, AC2, AC3, E4-E9)', () => {
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

  // --- listUsers (AC1) ---

  it('listUsers happy path → data + total + pagination', async () => {
    const dataRows = [
      {
        id: targetId,
        email: 'user@bdsai.vn',
        phone: '0901234567',
        role: 'user',
        banned: false,
        createdAt: new Date('2026-01-01'),
      },
    ];
    // select for data + select for count.
    let callCount = 0;
    db.select = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        // data query
        return {
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => ({
                  orderBy: jest.fn().mockResolvedValue(dataRows),
                })),
              })),
            })),
          })),
        };
      }
      // count query
      return {
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([{ value: 1 }]),
        })),
      };
    });

    const result = await service.listUsers({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.data[0]?.email).toBe('user@bdsai.vn');
  });

  it('listUsers with search → filter (searchProvided logged, KHÔNG raw)', async () => {
    let callCount = 0;
    db.select = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => ({
                  orderBy: jest.fn().mockResolvedValue([]),
                })),
              })),
            })),
          })),
        };
      }
      return {
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        })),
      };
    });

    const result = await service.listUsers({
      page: 1,
      limit: 20,
      search: 'test@',
    });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('listUsers pagination page=2, limit=10 → offset=10 (E9)', async () => {
    let capturedOffset: number | undefined;
    let callCount = 0;
    db.select = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn((off: number) => {
                  capturedOffset = off;
                  return { orderBy: jest.fn().mockResolvedValue([]) };
                }),
              })),
            })),
          })),
        };
      }
      return {
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([{ value: 15 }]),
        })),
      };
    });

    await service.listUsers({ page: 2, limit: 10 });
    expect(capturedOffset).toBe(10);
  });

  it('listUsers DB fail → InternalServerErrorException', async () => {
    // Data query rejects at orderBy; count query resolves (Promise.all rejects).
    let callCount = 0;
    db.select = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return {
          from: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: jest.fn(() => ({
                  orderBy: jest.fn().mockRejectedValue(new Error('DB down')),
                })),
              })),
            })),
          })),
        };
      }
      return {
        from: jest.fn(() => ({
          where: jest.fn().mockResolvedValue([{ value: 0 }]),
        })),
      };
    });
    await expect(
      service.listUsers({ page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
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

  // --- grantRole (AC1, AC3, AC4) — Story 2.5 ---

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
