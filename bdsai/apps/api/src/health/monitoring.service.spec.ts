import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { MonitoringService } from './monitoring.service';
import { DRIZZLE } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';

// Sentry 10 exports non-configurable props → jest.spyOn fail. Mock toàn module.
jest.mock('@sentry/node');

/**
 * Unit test MonitoringService (AC7, AC9) — Story 1.6.
 *
 * Mock Drizzle (pg_database_size) + Supabase Storage. Assert:
 *   - E4: DB size > 400MB → alert (Sentry.captureMessage + logger.warn).
 *   - E4: DB size < 400MB → no alert.
 *   - E5: Storage size > 800MB → alert.
 *   - Monitoring không throw khi query fail (KHÔNG phá app).
 */
describe('MonitoringService', () => {
  let service: MonitoringService;
  let dbExecute: jest.Mock;
  let listBuckets: jest.Mock;
  const captureMessage = jest.mocked(Sentry.captureMessage);
  let loggerWarn: jest.SpyInstance;

  const MB = 1024 * 1024;

  beforeEach(async () => {
    dbExecute = jest.fn();
    listBuckets = jest.fn();
    captureMessage.mockClear();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: DRIZZLE, useValue: { execute: dbExecute } },
        { provide: SupabaseService, useValue: { storage: { listBuckets, from: () => ({ list: jest.fn().mockResolvedValue({ data: [], error: null }) }) } } },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'DB_SIZE_ALERT_MB') return 400;
              if (k === 'STORAGE_SIZE_ALERT_MB') return 800;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get<MonitoringService>(MonitoringService);
    loggerWarn = jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    captureMessage.mockReset();
    loggerWarn.mockRestore();
  });

  it('E4: DB size 450MB > 400MB threshold → alert (AC7)', async () => {
    dbExecute.mockResolvedValue([{ size: String(450 * MB) }]);
    const result = await service.checkSizes();
    expect(result.db.alert).toBe(true);
    expect(result.db.sizeMb).toBe(450);
    expect(captureMessage).toHaveBeenCalledWith(expect.stringMatching(/DB size 450MB > 400MB/), 'warning');
    expect(loggerWarn).toHaveBeenCalled();
  });

  it('E4: DB size 350MB < 400MB threshold → no alert', async () => {
    dbExecute.mockResolvedValue([{ size: String(350 * MB) }]);
    const result = await service.checkSizes();
    expect(result.db.alert).toBe(false);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('E5: Storage size 850MB > 800MB threshold → alert (AC7)', async () => {
    dbExecute.mockResolvedValue([{ size: String(100 * MB) }]);
    listBuckets.mockResolvedValue({
      data: [{ name: 'listings' }],
      error: null,
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: DRIZZLE, useValue: { execute: dbExecute } },
        {
          provide: SupabaseService,
          useValue: {
            storage: {
              listBuckets,
              from: () => ({
                list: jest.fn().mockResolvedValue({
                  data: [{ name: 'img1.webp', metadata: { size: 850 * MB } }],
                  error: null,
                }),
              }),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'DB_SIZE_ALERT_MB' ? 400 : k === 'STORAGE_SIZE_ALERT_MB' ? 800 : undefined) },
        },
      ],
    }).compile();
    const svc = moduleRef.get<MonitoringService>(MonitoringService);
    jest.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);
    const result = await svc.checkSizes();
    expect(result.storage.alert).toBe(true);
    expect(result.storage.sizeMb).toBe(850);
  });

  it('monitoring không throw khi DB query fail (KHÔNG phá app)', async () => {
    dbExecute.mockRejectedValue(new Error('connect ECONNREFUSED'));
    // hourlyCheck bọc try/catch — KHÔNG throw.
    await expect(service.hourlyCheck()).resolves.toBeUndefined();
  });
});
