import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase server client (Story 1.2) — chạy phía server component / route handler.
 *
 * AD-2: READ-ONLY (+ Auth). Đọc/ghi cookie phiên auth qua next/headers cookies().
 * CHỈ anon key (AD-5) — service-role key chỉ ở apps/api.
 *
 * AD-10: nếu dùng trong app/api route, route chỉ proxy mỏng — ZERO business logic.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (xem .env.example).',
  );
}

export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll gọi từ Server Component → bỏ qua (middleware sẽ refresh session).
        }
      },
    },
  });
}
