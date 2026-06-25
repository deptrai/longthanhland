import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import type { Env } from '../config/env.validation';

/** Kết quả một lần check monitoring (AC7). */
export interface MonitoringResult {
  checkedAt: string;
  db: { sizeBytes: number; sizeMb: number; thresholdMb: number; alert: boolean };
  storage: { sizeBytes: number; sizeMb: number; thresholdMb: number; alert: boolean };
}

const MB = 1024 * 1024;

/**
 * MonitoringService (AC7, NFR5) — Story 1.6.
 *
 * Cron hourly (@Cron('0 * * * *')) check DB + Storage size:
 *   - DB:      SELECT pg_database_size(current_database()) qua Drizzle.
 *   - Storage: Supabase Storage API — list buckets + sum object sizes.
 *
 * Threshold (NFR5): DB > 400MB, Storage > 800MB (80% Supabase Free 500MB/1GB).
 * Vượt threshold → log warn (pino structured) + Sentry.captureMessage.
 * KHÔNG throw (monitoring không phá app).
 *
 * E4/E5: threshold env configurable (DB_SIZE_ALERT_MB, STORAGE_SIZE_ALERT_MB).
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Cron hourly — check định kỳ (E10: @nestjs/schedule ScheduleModule.forRoot). */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyCheck(): Promise<void> {
    await this.checkSizes().catch((e) => {
      // Monitoring không phá app — log + capture, KHÔNG rethrow.
      this.logger.warn(`Monitoring check failed: ${this.safeMsg(e)}`);
      Sentry.captureMessage(`Monitoring check failed: ${this.safeMsg(e)}`, 'warning');
    });
  }

  /**
   * Check DB + Storage size, alert khi vượt threshold (AC7).
   * Public để test gọi trực tiếp (E10) + có thể expose endpoint debug.
   */
  async checkSizes(): Promise<MonitoringResult> {
    const dbThresholdMb = this.config.get('DB_SIZE_ALERT_MB', { infer: true });
    const storageThresholdMb = this.config.get('STORAGE_SIZE_ALERT_MB', { infer: true });

    const [dbSizeBytes, storageSizeBytes] = await Promise.all([
      this.checkDbSize(),
      this.checkStorageSize(),
    ]);

    const dbMb = Math.round(dbSizeBytes / MB);
    const storageMb = Math.round(storageSizeBytes / MB);
    const dbAlert = dbMb > dbThresholdMb;
    const storageAlert = storageMb > storageThresholdMb;

    if (dbAlert) {
      const msg = `DB size ${dbMb}MB > ${dbThresholdMb}MB threshold (NFR5 — cân nhắc nâng Supabase Pro)`;
      this.logger.warn(msg);
      Sentry.captureMessage(msg, 'warning');
    }
    if (storageAlert) {
      const msg = `Storage size ${storageMb}MB > ${storageThresholdMb}MB threshold (NFR5 — cân nhắc nâng Supabase Pro)`;
      this.logger.warn(msg);
      Sentry.captureMessage(msg, 'warning');
    }

    // Log info định kỳ (giám sát trend) — KHÔNG alert khi OK.
    this.logger.log(
      `Monitoring check: DB=${dbMb}MB (threshold ${dbThresholdMb}MB), Storage=${storageMb}MB (threshold ${storageThresholdMb}MB)`,
    );

    return {
      checkedAt: new Date().toISOString(),
      db: { sizeBytes: dbSizeBytes, sizeMb: dbMb, thresholdMb: dbThresholdMb, alert: dbAlert },
      storage: { sizeBytes: storageSizeBytes, sizeMb: storageMb, thresholdMb: storageThresholdMb, alert: storageAlert },
    };
  }

  /** Query pg_database_size(current_database()) — bytes. */
  private async checkDbSize(): Promise<number> {
    const rows = await this.db.execute<{ size: string }>(sql`SELECT pg_database_size(current_database()) AS size`);
    const row = rows[0];
    return row ? Number(row.size) : 0;
  }

  /**
   * Sum object sizes across all Supabase Storage buckets (AC7b).
   * Dev local Storage thường empty → 0 (no alert). E5.
   */
  private async checkStorageSize(): Promise<number> {
    try {
      const { data: buckets, error } = await this.supabase.storage.listBuckets();
      if (error || !buckets) {
        this.logger.warn(`Storage size check: listBuckets failed — ${this.safeMsg(error ?? 'no data')}`);
        return 0;
      }

      let total = 0;
      for (const bucket of buckets) {
        // list objects (paginate 1000) + sum metadata.size.
        const { data, error: listError } = await this.supabase.storage
          .from(bucket.name)
          .list(undefined, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
        if (listError || !data) {
          continue;
        }
        for (const obj of data) {
          // metadata.size có thể undefined (folder entries) — skip.
          total += typeof obj.metadata?.size === 'number' ? obj.metadata.size : 0;
        }
      }
      return total;
    } catch (e) {
      this.logger.warn(`Storage size check failed: ${this.safeMsg(e)}`);
      return 0;
    }
  }

  private safeMsg(e: unknown): string {
    const msg = e instanceof Error ? e.message : String(e);
    return msg.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[redacted-url]').slice(0, 200);
  }
}
