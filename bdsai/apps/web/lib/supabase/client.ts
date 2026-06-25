import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase browser client (Story 1.2) — chạy phía client component.
 *
 * AD-2: FE READ-ONLY (+ Auth + Storage upload). KHÔNG ghi entity nghiệp vụ
 * trực tiếp — mọi mutation đi qua NestJS API. CHỈ dùng anon key (NEXT_PUBLIC_*),
 * KHÔNG bao giờ service-role key ở FE (AD-5).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (xem .env.example).',
  );
}

export function createClient(): SupabaseClient {
  return createBrowserClient(supabaseUrl as string, supabaseAnonKey as string);
}
