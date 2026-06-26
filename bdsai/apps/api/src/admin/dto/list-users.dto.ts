import { z } from 'zod';

// listUsersApiSchema (AC1) — Story 2.4.
//
// Query params validation (Zod). Query params là string → z.coerce.number()
// coerce sang number. search optional + trim + max 100 (R5 — tránh query quá
// dài, Drizzle ilike parameterized KHÔNG string concat → SQL injection safe).
export const listUsersApiSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export type ListUsersDto = z.infer<typeof listUsersApiSchema>;
