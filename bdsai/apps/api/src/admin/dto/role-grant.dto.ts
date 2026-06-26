import { z } from 'zod';

// roleGrantSchema (AC1b) — Story 2.5.
//
// Body validation: role phải là 'admin' hoặc 'user' (E6 — invalid → 400).
// Super-admin role KHÔNG grant qua API — chỉ seed qua SQL (migration 0010).
// z.enum reject empty string, missing field, và bất kỳ giá trị nào khác.
export const roleGrantSchema = z.object({
  role: z.enum(['admin', 'user']),
});
export type RoleGrantDto = z.infer<typeof roleGrantSchema>;
