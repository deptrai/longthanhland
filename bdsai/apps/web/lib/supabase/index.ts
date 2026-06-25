// Supabase client barrel (Story 1.2).
//
// AD-2: Supabase client ở frontend READ-ONLY (ngoại trừ Auth + Storage upload).
// KHÔNG ghi entity nghiệp vụ trực tiếp từ đây — mọi mutation đi qua NestJS API.
// AD-5: CHỈ anon key (NEXT_PUBLIC_*) ở FE — service-role key chỉ ở apps/api.
//
// 'server' phụ thuộc next/headers (chỉ chạy server-side) nên KHÔNG re-export chung;
// import trực tiếp từ './server' trong server component / route handler.
export { createClient as createBrowserSupabaseClient } from './client';
