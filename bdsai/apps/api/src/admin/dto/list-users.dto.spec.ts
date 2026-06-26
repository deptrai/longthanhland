import { describe, it, expect } from '@jest/globals';
import { listUsersApiSchema } from './list-users.dto';

// Unit test listUsersApiSchema (AC1 — page, limit, search validation) — Story 2.4.
describe('listUsersApiSchema (AC1)', () => {
  it('default values khi empty query', () => {
    const result = listUsersApiSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.search).toBeUndefined();
  });

  it('coerce string page/limit sang number', () => {
    const result = listUsersApiSchema.parse({ page: '2', limit: '50' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('page < 1 → reject', () => {
    const result = listUsersApiSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('page không phải số → reject', () => {
    const result = listUsersApiSchema.safeParse({ page: 'abc' });
    expect(result.success).toBe(false);
  });

  it('limit > 100 → reject', () => {
    const result = listUsersApiSchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('limit < 1 → reject', () => {
    const result = listUsersApiSchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('search > 100 chars → reject', () => {
    const result = listUsersApiSchema.safeParse({ search: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('search trim whitespace', () => {
    const result = listUsersApiSchema.parse({ search: '  test@  ' });
    expect(result.search).toBe('test@');
  });

  it('search empty string → undefined (optional)', () => {
    const result = listUsersApiSchema.parse({ search: '' });
    expect(result.search).toBe('');
  });

  it('happy path — page=2, limit=10, search=test@', () => {
    const result = listUsersApiSchema.parse({
      page: '2',
      limit: '10',
      search: 'test@',
    });
    expect(result).toEqual({ page: 2, limit: 10, search: 'test@' });
  });
});
