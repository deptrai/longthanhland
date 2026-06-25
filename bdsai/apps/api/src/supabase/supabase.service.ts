import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.validation';

/**
 * SupabaseService (AC3, AD-1, AD-5) — Story 1.2.
 *
 * Khởi tạo server-side Supabase client dùng SERVICE_ROLE_KEY (chỉ backend — AD-5).
 * Expose `.auth` và `.storage` cho các module khác inject (KHÔNG dùng client thô
 * trực tiếp ngoài service — AD-1).
 *
 * AD-2 exception: Auth (`auth.*`) + Storage upload là service riêng, KHÔNG phải
 * business write qua Drizzle. Story này chỉ KHỞI TẠO client, chưa mutation.
 *
 * AD-8: KHÔNG log key/PII. Chỉ log host (không kèm credential).
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    const url = this.config.get('SUPABASE_URL', { infer: true });
    const serviceRoleKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true });
    this.bucket = this.config.get('SUPABASE_STORAGE_BUCKET', { infer: true });

    // Server-side client: tắt persist session (stateless backend).
    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // AD-8: chỉ log host, KHÔNG log key.
    this.logger.log(`Supabase client khởi tạo (host=${new URL(url).host}, bucket=${this.bucket})`);
  }

  /** Truy cập Supabase Auth API (admin/server-side). */
  get auth(): SupabaseClient['auth'] {
    return this.client.auth;
  }

  /** Truy cập Supabase Storage API. */
  get storage(): SupabaseClient['storage'] {
    return this.client.storage;
  }

  /** Tên bucket lưu ảnh (mặc định 'listings'). */
  get storageBucket(): string {
    return this.bucket;
  }

  /** Client thô — chỉ dùng nội bộ hạ tầng (vd healthcheck); module nghiệp vụ dùng getter trên. */
  get raw(): SupabaseClient {
    return this.client;
  }
}
