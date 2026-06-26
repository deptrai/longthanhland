import { describe, it, expect } from '@jest/globals';
import { roleGrantSchema } from './role-grant.dto';

// Unit test roleGrantSchema (AC1b, E6) — Story 2.5.
describe('roleGrantSchema (AC1b, E6)', () => {
  it('role="admin" → pass', () => {
    const result = roleGrantSchema.safeParse({ role: 'admin' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('admin');
    }
  });

  it('role="user" → pass', () => {
    const result = roleGrantSchema.safeParse({ role: 'user' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
    }
  });

  it('role="superadmin" → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({ role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('role="" → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({ role: '' });
    expect(result.success).toBe(false);
  });

  it('role missing → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('role="moderator" → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({ role: 'moderator' });
    expect(result.success).toBe(false);
  });

  it('extra fields → strip (Zod default)', () => {
    const result = roleGrantSchema.safeParse({ role: 'admin', extra: 'x' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ role: 'admin' });
    }
  });

  it('role=null → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({ role: null });
    expect(result.success).toBe(false);
  });

  it('role=number → reject (E6)', () => {
    const result = roleGrantSchema.safeParse({ role: 1 });
    expect(result.success).toBe(false);
  });
});
