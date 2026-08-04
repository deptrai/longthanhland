/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NewsService, VALID_CATEGORIES } from './news.service';

// Story 5.8: NewsService tests — CRUD, pagination, category filter, validation.

function createDbMock(items: any[] = [], count = items.length): any {
  const chain = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(items),
  };
  const countChain = {
    where: jest.fn().mockReturnThis(),
  };
  return {
    select: jest.fn().mockImplementation(() => {
      const current = { ...chain };
      // Reset chain for each call
      chain.limit = jest.fn().mockReturnThis();
      chain.offset = jest.fn().mockResolvedValue(items);
      // For count queries (select({ count }))
      return current;
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'news-1', title: 'Test', ...items[0] }]),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'news-1', title: 'Updated' }]),
        }),
      }),
    }),
    _items: items,
    _count: count,
  };
}

describe('NewsService — Story 5.8', () => {
  describe('listPublished', () => {
    function createListDb(items: any[], count = 0): any {
      let callCount = 0;
      return {
        select: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Items query
            return {
              from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                      offset: jest.fn().mockResolvedValue(items),
                    }),
                  }),
                }),
              }),
            };
          }
          // Count query
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count }]),
            }),
          };
        }),
      };
    }

    it('returns published articles with pagination', async () => {
      const items = [{ id: '1', title: 'News 1', status: 'published' }];
      const svc = new NewsService(createListDb(items, 1) as any);
      const result = await svc.listPublished(1, 10);
      expect(result.items).toEqual(items);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(1);
    });

    it('clamps limit to MAX_LIMIT (50)', async () => {
      const svc = new NewsService(createListDb([], 0) as any);
      const result = await svc.listPublished(1, 100);
      expect(result.limit).toBe(50);
    });

    it('clamps page to min 1', async () => {
      const svc = new NewsService(createListDb([], 0) as any);
      const result = await svc.listPublished(-5, 10);
      expect(result.page).toBe(1);
    });
  });

  describe('create', () => {
    it('valid input → creates article', async () => {
      const db: any = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'news-1', title: 'Test' }]),
          }),
        }),
      };
      const svc = new NewsService(db);
      const result = await svc.create({
        title: 'Test',
        summary: 'Summary',
        sourceUrl: 'https://example.com/news',
        sourceName: 'Example',
        category: 'thi-truong',
      });
      expect(result.id).toBe('news-1');
    });

    it('invalid category → BadRequestException', async () => {
      const db: any = {};
      const svc = new NewsService(db);
      await expect(svc.create({
        title: 'Test', summary: 'S', sourceUrl: 'https://x.com', sourceName: 'X', category: 'invalid',
      })).rejects.toThrow(BadRequestException);
    });

    it('invalid sourceUrl → BadRequestException', async () => {
      const db: any = {};
      const svc = new NewsService(db);
      await expect(svc.create({
        title: 'Test', summary: 'S', sourceUrl: 'not-a-url', sourceName: 'X', category: 'thi-truong',
      })).rejects.toThrow(BadRequestException);
    });

    it('invalid imageUrl → BadRequestException', async () => {
      const db: any = {};
      const svc = new NewsService(db);
      await expect(svc.create({
        title: 'Test', summary: 'S', sourceUrl: 'https://x.com', sourceName: 'X',
        category: 'thi-truong', imageUrl: 'bad-url',
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('valid update → returns updated article', async () => {
      const db: any = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'news-1', title: 'Updated' }]),
            }),
          }),
        }),
      };
      const svc = new NewsService(db);
      const result = await svc.update('news-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('not found → NotFoundException', async () => {
      const db: any = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      const svc = new NewsService(db);
      await expect(svc.update('nonexistent', { title: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('invalid category in update → BadRequestException', async () => {
      const db: any = {};
      const svc = new NewsService(db);
      await expect(svc.update('news-1', { category: 'bad' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('archive', () => {
    it('existing article → archived', async () => {
      const db: any = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'news-1', status: 'archived' }]),
            }),
          }),
        }),
      };
      const svc = new NewsService(db);
      await expect(svc.archive('news-1')).resolves.toBeUndefined();
    });

    it('not found → NotFoundException', async () => {
      const db: any = {
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };
      const svc = new NewsService(db);
      await expect(svc.archive('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('VALID_CATEGORIES', () => {
    it('contains 4 categories', () => {
      expect(VALID_CATEGORIES).toHaveLength(4);
      expect(VALID_CATEGORIES).toContain('thi-truong');
      expect(VALID_CATEGORIES).toContain('phap-ly');
      expect(VALID_CATEGORIES).toContain('du-an');
      expect(VALID_CATEGORIES).toContain('tai-chinh');
    });
  });
});
