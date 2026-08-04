import { Test, type TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { DRIZZLE } from '../db/database.tokens';
import { AdminService } from './admin.service';

// Unit test AdminService.listUsers (AC1, E9) — Story 2.4.
//
// Mock DrizzleDB (select chainable). Verify:
//   - listUsers happy path → data + total + pagination.
//   - listUsers with search → filter ilike.
//   - listUsers pagination → offset correct (E9).
//   - DB fail → 500.
describe('AdminService listUsers (AC1, E9)', () => {
  let service: AdminService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;

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
});
