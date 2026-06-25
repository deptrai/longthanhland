import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HealthService, type SupabaseHealth, type RedisHealth } from './health.service';
import { MonitoringService, type MonitoringResult } from './monitoring.service';
import { QueueService } from '../queue/queue.service';
import type { EchoJobData } from '../queue/queue.tokens';

/**
 * HealthController (AC3, AC7, AC1, AC2) — Story 1.2 + 1.6.
 *
 * GET /health/supabase → trạng thái db/auth/storage.
 *   - Tất cả up   → 200 { status:'ok', db, auth, storage }.
 *   - Bất kỳ down → 503, error shape chuẩn { statusCode, message, error, details }
 *     trong đó details chứa trạng thái từng thành phần để debug.
 *
 * GET /health/redis (Story 1.6 AC1) → trạng thái Redis.
 *   - up   → 200 { status:'ok', redis: { status:'up' } }.
 *   - down → 503 (error shape chuẩn).
 *
 * POST /queue/test (Story 1.6 AC2, dev only) → enqueue echo job (AD-6 async).
 *
 * GET /monitoring (Story 1.6 AC7) → trigger check DB/Storage size thủ công.
 */
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly monitoring: MonitoringService,
    private readonly queue: QueueService,
  ) {}

  @Get('health/supabase')
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

  @Get('health/redis')
  async redis(): Promise<RedisHealth> {
    const result = await this.health.checkRedis();

    if (result.status !== 'ok') {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Redis healthcheck degraded: redis down',
          error: 'Service Unavailable',
          details: { redis: result.redis },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return result;
  }

  /**
   * POST /queue/test — enqueue echo job (AC2, AD-6).
   * Trả { jobId } ngay — KHÔNG await job hoàn thành (background).
   */
  @Post('queue/test')
  async enqueueTest(@Body() body: EchoJobData): Promise<{ jobId: string; queued: true }> {
    const jobId = await this.queue.addEchoJob(body);
    return { jobId, queued: true };
  }

  /**
   * GET /monitoring — trigger check DB/Storage size thủ công (AC7).
   * Cron hourly tự chạy; endpoint này để debug/verify.
   */
  @Get('monitoring')
  async checkMonitoring(): Promise<MonitoringResult> {
    return this.monitoring.checkSizes();
  }
}
