import { z } from 'zod';

/**
 * Zod schema đăng nhập — dùng chung apps/api + apps/web (AC1, AD-1 DRY).
 *
 * Email: RFC 5322 đơn giản (z.string().email()).
 * Password: chỉ non-empty (KHÔNG require ≥ 8 — user có thể nhập sai password
 * ngắn, generic error). Password strength validation chỉ cho register (2.1).
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
});

export type LoginInput = z.infer<typeof loginSchema>;
