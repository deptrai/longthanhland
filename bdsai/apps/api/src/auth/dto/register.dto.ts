import { registerSchema, VN_PHONE_REGEX, type RegisterInput } from '@bdsai/shared';
import { z } from 'zod';

import { normalizePhone } from '../phone-normalize';

/**
 * Register DTO (AC3) — Story 2.1.
 *
 * Validate input đăng ký: email + phone VN (sau normalize) + password ≥ 8.
 * Dùng registerSchema từ @bdsai/shared (AD-1 DRY — single source of truth).
 *
 * Phone được normalize TRƯỚC khi validate (AC5) — transform trong Zod.
 * API KHÔNG nhận confirmPassword (chỉ web form).
 */

/**
 * Schema API với phone transform: normalize trước, validate regex sau.
 * Dùng z.preprocess để normalize phone trước khi chạy registerSchema.
 */
export const registerApiSchema = z.preprocess((input) => {
  if (typeof input !== 'object' || input === null) return input;
  const obj = input as Record<string, unknown>;
  if (typeof obj['phone'] === 'string') {
    return { ...obj, phone: normalizePhone(obj['phone']) };
  }
  return obj;
}, registerSchema);

export type RegisterDto = RegisterInput;

export { VN_PHONE_REGEX };
