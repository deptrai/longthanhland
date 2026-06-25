/**
 * normalizePhone (AC5) — Story 2.1.
 *
 * Chuẩn hóa số điện thoại VN về format `0xxxxxxxxx` (10-11 digit):
 *   (a) Strip spaces, dashes, parentheses, dots.
 *   (b) Strip leading `00` (0084 → 84).
 *   (c) `+84` → `0`.
 *   (d) `84` (không có +) → `0`.
 *
 * Validate SAU normalize bằng VN_PHONE_REGEX (xem register.dto.ts).
 * KHÔNG accept international (non-VN) — story này VN only (R4).
 */
export function normalizePhone(input: string): string {
  let phone = input.replace(/[\s\-().]/g, '');
  phone = phone.replace(/^00/, '');
  phone = phone.replace(/^\+84/, '0');
  phone = phone.replace(/^84/, '0');
  return phone;
}

/**
 * Convert phone VN normalized (0xxxxxxxxx) → E.164 (+84xxxxxxxxx) cho Supabase Auth.
 * Supabase Auth admin.createUser yêu cầu phone format E.164.
 * AC5: public_users lưu 0xxxxxxxxx, Supabase Auth lưu +84xxxxxxxxx.
 */
export function toE164(normalizedPhone: string): string {
  // normalizedPhone = 0xxxxxxxxx → +84 + xxxxxxxxx (bỏ số 0 đầu).
  if (normalizedPhone.startsWith('0')) {
    return `+84${normalizedPhone.slice(1)}`;
  }
  return normalizedPhone;
}
