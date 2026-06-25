import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HealthService, type SupabaseHealth } from './health.service';

/**
 * HealthController (AC3, AC7) — Story 1.2.
 *
 * GET /health/supabase → trạng thái db/auth/storage.
 *   - Tất cả up   → 200 { status:'ok', db, auth, storage }.
 *   - Bất kỳ down → 503, error shape chuẩn { statusCode, message, error, details }
 *     trong đó details chứa trạng thái từng thành phần để debug.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('supabase')
  async supabase(): Promise<SupabaseHealth> {
    const result = await this.health.checkSupabase();

    if (result.status !== 'ok') {
      const down = (['db', 'auth', 'storage'] as const).filter(
        (k) => result[k].status === 'down',
      );
      // Error shape chuẩn: { statusCode, message, error?, details? } (Consistency conventions).
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: `Supabase healthcheck degraded: ${down.join(', ')} down`,
          error: 'Service Unavailable',
          details: { db: result.db, auth: result.auth, storage: result.storage },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return result;
  }
}
