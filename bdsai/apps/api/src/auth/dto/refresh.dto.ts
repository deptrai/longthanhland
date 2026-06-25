import { z } from 'zod';

/**
 * Refresh DTO (AC5) — Story 2.2.
 *
 * Body optional — refresh_token đọc từ httpOnly cookie (ưu tiên).
 * Body { refresh_token } dùng làm fallback (cho curl test, non-browser client).
 */
export const refreshApiSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token là bắt buộc').optional(),
});

export type RefreshDto = z.infer<typeof refreshApiSchema>;
