import { z } from 'zod';

/**
 * Update profile DTO (AC3) — Story 2.3.
 *
 * Whitelist field: chỉ accept avatarUrl, bio, displayName.
 * Field khác (email, phone, role, banned, id, createdAt) trong body → Zod
 * ignore mặc định (z.object KHÔNG .strict() → silent strip — AC3a/E2).
 *
 * Validation (AC3b):
 *   - displayName: string, max 100, optional, nullable. Empty → null (xóa).
 *   - bio: string, max 500, optional, nullable. Empty → null.
 *   - avatarUrl: string URL, max 500, optional, nullable. Empty → null.
 *     Host validation (match Supabase host) làm trong service (đọc ConfigService).
 *
 * Sanitize XSS (AC3c/E14): bio + displayName strip HTML tag + encode < > &.
 * Plain text field (hiển thị text-only, KHÔNG render HTML) → simple regex đủ
 * (KHÔNG cần sanitize-html dep — quyết định dev #8).
 */

// AC3c/E14: encode < > & (neutralize XSS — browser renders as text, KHÔNG execute).
// Encode-only (KHÔNG strip tags) để bảo toàn nội dung user + khớp E14 expected
// (`<script>alert(1)</script>` → `&lt;script&gt;alert(1)&lt;/script&gt;`).
// Encode & TRƯỚC < > để tránh double-encode (vd "&lt;" → "&amp;lt;").
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

// Helper: sanitize text field, empty → null (xóa field). undefined → undefined (không update).
function sanitizeOptionalText(max: number, message: string) {
  return z
    .string()
    .max(max, message)
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined || v === null) return v;
      const sanitized = sanitizeText(v);
      return sanitized === '' ? null : sanitized;
    });
}

export const updateMeApiSchema = z.object({
  displayName: sanitizeOptionalText(100, 'Tên hiển thị tối đa 100 ký tự'),
  bio: sanitizeOptionalText(500, 'Giới thiệu tối đa 500 ký tự'),
  avatarUrl: z
    .string()
    .max(500, 'URL quá dài')
    .optional()
    .nullable()
    .transform((v) => {
      if (v === undefined || v === null) return v;
      return v.trim() === '' ? null : v.trim();
    })
    .refine(
      (v) => {
        if (v === null || v === undefined) return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'URL ảnh không hợp lệ' },
    ),
});

export type UpdateMeDto = {
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};
