import { normalizePhone } from './phone-normalize';

/**
 * Unit test normalizePhone (AC5) — Story 2.1.
 * Cover các format VN: 0xxx, +84xxx, 0084xxx, spaces/dashes/parens/dots.
 */
describe('normalizePhone (AC5)', () => {
  it('giữ nguyên format 0xxxxxxxxx', () => {
    expect(normalizePhone('0901234567')).toBe('0901234567');
  });

  it('strip spaces', () => {
    expect(normalizePhone('0901 234 567')).toBe('0901234567');
  });

  it('strip dashes', () => {
    expect(normalizePhone('0901-234-567')).toBe('0901234567');
  });

  it('strip parentheses + dots', () => {
    expect(normalizePhone('(090)123.4567')).toBe('0901234567');
  });

  it('+84 → 0', () => {
    expect(normalizePhone('+84901234567')).toBe('0901234567');
  });

  it('+84 với spaces → 0', () => {
    expect(normalizePhone('+84 901 234 567')).toBe('0901234567');
  });

  it('0084 → strip 00 → 84 → 0', () => {
    expect(normalizePhone('0084901234567')).toBe('0901234567');
  });

  it('84 (không +) → 0', () => {
    expect(normalizePhone('84901234567')).toBe('0901234567');
  });

  it('format lạ spaces + dashes + +84', () => {
    expect(normalizePhone('+84-901-234-567')).toBe('0901234567');
  });

  it('empty string → empty', () => {
    expect(normalizePhone('')).toBe('');
  });
});
