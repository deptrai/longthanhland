import { loginSchema, type LoginInput } from '@bdsai/shared';

/**
 * Login DTO (AC1) — Story 2.2.
 *
 * Validate input đăng nhập: email + password (non-empty).
 * Dùng loginSchema từ @bdsai/shared (AD-1 DRY — single source of truth).
 *
 * Login KHÔNG require password ≥ 8 (user có thể nhập sai password ngắn —
 * generic error). Password strength validation chỉ cho register (Story 2.1).
 */
export const loginApiSchema = loginSchema;

export type LoginDto = LoginInput;
