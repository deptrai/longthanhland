import { z } from 'zod';

/**
 * Zod schema đăng ký — dùng chung apps/api + apps/web (AC3, AD-1 DRY).
 *
 * Email: RFC 5322 đơn giản (z.string().email()).
 * Phone: regex VN sau normalize — chấp nhận 0xxx (10-11 digit).
 *   Regex: ^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$
 *   Phone PHẢI được normalize trước khi validate (xem normalizePhone api).
 * Password: tối thiểu 8 ký tự + ít nhất 1 chữ + 1 số (AC3c).
 *
 * Confirm password: KHÔNG nằm trong schema API (chỉ web form — refine ở web).
 */

// Regex phone VN (sau normalize — format 0xxxxxxxxx).
export const VN_PHONE_REGEX = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export const registerSchema = z.object({
  email: z.string().min(1, 'Email là bắt buộc').email('Email không hợp lệ'),
  phone: z
    .string()
    .min(1, 'Số điện thoại là bắt buộc')
    .regex(VN_PHONE_REGEX, 'Số điện thoại không hợp lệ (phải là số VN 10-11 chữ số)'),
  password: z
    .string()
    .min(8, 'Mật khẩu tối thiểu 8 ký tự')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
    .regex(/[a-zA-Z]/, 'Mật khẩu phải có ít nhất 1 chữ cái'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema web form (có confirmPassword + refine khớp password).
 * API KHÔNG nhận confirmPassword — chỉ validate registerSchema.
 */
export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp',
    path: ['confirmPassword'],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;
