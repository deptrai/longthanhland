import { registerApiSchema } from './register.dto';
import { normalizePhone } from '../phone-normalize';

/**
 * Unit test registerApiSchema validation (AC3, E2, E3, E10) — Story 2.1.
 *
 * registerApiSchema = z.preprocess(normalizePhone, registerSchema).
 * Cover: email sai, phone sai format, password yếu, SQL injection reject,
 *        valid input pass, phone normalize trước validate (AC5).
 */
describe('registerApiSchema (AC3, AC5)', () => {
  const valid = {
    email: 'test-2-1@bdsai.vn',
    phone: '0901234567',
    password: 'Abc12345',
  };

  it('valid input → pass', () => {
    const result = registerApiSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('AC5: phone +84 normalize trước validate → pass', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      phone: '+84901234567',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('0901234567');
    }
  });

  it('AC5: phone với spaces + dashes normalize → pass', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      phone: '0901 234-567',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('0901234567');
    }
  });

  // --- Email validation (E10) ---
  it('E10: email sai format → reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('E10: SQL injection trong email → reject (không phải email format)', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      email: "' OR 1=1 --",
    });
    expect(result.success).toBe(false);
  });

  it('email empty → reject', () => {
    const result = registerApiSchema.safeParse({ ...valid, email: '' });
    expect(result.success).toBe(false);
  });

  // --- Phone validation (E2) ---
  it('E2: phone quá ngắn (5 digit) → reject', () => {
    const result = registerApiSchema.safeParse({ ...valid, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('E2: phone 9 digit thiếu → reject', () => {
    const result = registerApiSchema.safeParse({ ...valid, phone: '090123456' });
    expect(result.success).toBe(false);
  });

  it('E2: phone sai đầu số (190...) → reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      phone: '1901234567',
    });
    expect(result.success).toBe(false);
  });

  it('E2: SQL injection trong phone → normalize + regex reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      phone: "'; DROP TABLE--",
    });
    expect(result.success).toBe(false);
  });

  it('phone empty → reject', () => {
    const result = registerApiSchema.safeParse({ ...valid, phone: '' });
    expect(result.success).toBe(false);
  });

  // --- Password validation (E3) ---
  it('E3: password < 8 ký tự → reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      password: 'Abc123',
    });
    expect(result.success).toBe(false);
  });

  it('E3: password chỉ chữ (no số) → reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      password: 'abcdefgh',
    });
    expect(result.success).toBe(false);
  });

  it('E3: password chỉ số (no chữ) → reject', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      password: '12345678',
    });
    expect(result.success).toBe(false);
  });

  it('password = 8 ký tự có chữ + số → pass (boundary)', () => {
    const result = registerApiSchema.safeParse({
      ...valid,
      password: 'Abcd1234',
    });
    expect(result.success).toBe(true);
  });

  // --- Body structure ---
  it('body không phải object → reject', () => {
    const result = registerApiSchema.safeParse('not-object');
    expect(result.success).toBe(false);
  });

  it('thiếu field phone → reject', () => {
    const result = registerApiSchema.safeParse({
      email: valid.email,
      password: valid.password,
    });
    expect(result.success).toBe(false);
  });
});

// Verify normalizePhone độc lập (AC5 helper).
describe('normalizePhone integration với registerApiSchema', () => {
  it('normalizePhone + regex khớp các format VN phổ biến', () => {
    const formats = [
      '0901234567',
      '+84901234567',
      '0084901234567',
      '84901234567',
      '0901 234 567',
      '0901-234-567',
    ];
    for (const f of formats) {
      expect(normalizePhone(f)).toBe('0901234567');
    }
  });
});
