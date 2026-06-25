import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * SupabaseModule (AC3, AD-1) — Story 1.2.
 *
 * @Global: client Supabase là hạ tầng dùng chung (auth + storage).
 * Expose SupabaseService; module khác inject service, KHÔNG tạo client riêng.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
