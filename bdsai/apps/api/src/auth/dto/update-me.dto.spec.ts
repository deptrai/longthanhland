import { describe, it, expect } from '@jest/globals';
import { updateMeApiSchema, sanitizeText } from './update-me.dto';

/**
 * Unit test updateMeApiSchema + sanitizeText (AC3, E2, E3, E4, E13, E14) — Story 2.3.
 */
describe('sanitizeText (AC3c/E14)', () => {
  it('encode <script> tag → &lt;script&gt; (neutralize XSS, preserve content)', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('encode <img onerror> tag → rendered as text (KHÔNG execute)', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>hi')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;hi',
    );
  });

  it('encode bare < > &', () => {
    expect(sanitizeText('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });

  it('trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });
});

describe('updateMeApiSchema (AC3, E2, E3, E4, E13)', () => {
  it('happy path — displayName + bio valid', () => {
    const result = updateMeApiSchema.safeParse({
      displayName: 'Luis P',
      bio: 'Môi giới BĐS Long Thành',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Luis P');
      expect(result.data.bio).toBe('Môi giới BĐS Long Thành');
    }
  });

  it('E2: extra field (email/role) → silent strip (KHÔNG error)', () => {
    const result = updateMeApiSchema.safeParse({
      email: 'hacked@bdsai.vn',
      role: 'admin',
      banned: true,
      id: 'fake-id',
      bio: 'ok',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Chỉ bio giữ lại, field thừa bị strip.
      expect(result.data.bio).toBe('ok');
      expect((result.data as Record<string, unknown>).email).toBeUndefined();
      expect((result.data as Record<string, unknown>).role).toBeUndefined();
    }
  });

  it('E3: bio > 500 chars → reject', () => {
    const result = updateMeApiSchema.safeParse({ bio: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('E4: displayName > 100 chars → reject', () => {
    const result = updateMeApiSchema.safeParse({ displayName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('E14: XSS in bio → sanitize encoded', () => {
    const result = updateMeApiSchema.safeParse({
      bio: '<script>alert(1)</script>',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    }
  });

  it('E14: XSS in displayName → sanitize encoded', () => {
    const result = updateMeApiSchema.safeParse({
      displayName: '<img onerror=alert(1)>Name',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('&lt;img onerror=alert(1)&gt;Name');
    }
  });

  it('empty string → null (xóa field)', () => {
    const result = updateMeApiSchema.safeParse({
      displayName: '   ',
      bio: '',
      avatarUrl: '  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeNull();
      expect(result.data.bio).toBeNull();
      expect(result.data.avatarUrl).toBeNull();
    }
  });

  it('field absent → undefined (không update)', () => {
    const result = updateMeApiSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeUndefined();
      expect(result.data.bio).toBeUndefined();
      expect(result.data.avatarUrl).toBeUndefined();
    }
  });

  it('avatarUrl valid URL → giữ nguyên', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/avatars/u1/avatar.webp';
    const result = updateMeApiSchema.safeParse({ avatarUrl: url });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toBe(url);
    }
  });

  it('E13: avatarUrl không phải URL → reject', () => {
    const result = updateMeApiSchema.safeParse({ avatarUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('avatarUrl > 500 chars → reject', () => {
    const result = updateMeApiSchema.safeParse({
      avatarUrl: `https://example.supabase.co/${'a'.repeat(500)}`,
    });
    expect(result.success).toBe(false);
  });

  it('null values → null (xóa field)', () => {
    const result = updateMeApiSchema.safeParse({
      displayName: null,
      bio: null,
      avatarUrl: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBeNull();
      expect(result.data.bio).toBeNull();
      expect(result.data.avatarUrl).toBeNull();
    }
  });
});
