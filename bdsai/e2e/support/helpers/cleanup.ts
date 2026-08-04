// support/helpers/cleanup.ts — test cleanup helpers (DB reset, listing delete).
// Pattern: data-factories cleanup discipline (API seeding + cleanup after test).
import { execSync } from 'node:child_process';
import { ApiClient } from './api-client';

const DB_PORT = process.env.SUPABASE_DB_PORT ?? '54352';

// Xóa listing qua API (owner only).
export async function deleteListing(accessToken: string, listingId: string): Promise<void> {
  const client = await ApiClient.create(accessToken);
  try {
    await client.delete(`/marketplace/listings/${listingId}`);
  } finally {
    await client.dispose();
  }
}

// P3-15: Confirm email trực tiếp qua DB (Supabase local — bypass email flow).
// Chỉ dùng cho local/CI test env, KHÔNG dùng production.
// Supabase local lưu auth.users trong schema auth, public.public_users trong schema public.
export function confirmEmailViaDb(email: string): void {
  try {
    execSync(
      `PGPASSWORD=postgres psql -h 127.0.0.1 -p ${DB_PORT} -U postgres -d postgres -c "UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${email}';"`,
      { stdio: 'pipe' },
    );
  } catch (e) {
    console.warn(`[cleanup] confirmEmailViaDb(${email}) failed: ${(e as Error).message}`);
  }
}
