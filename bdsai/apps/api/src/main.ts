import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import type { Env } from './config/env.validation';
import { AppModule } from './app.module';
import { redactSecrets } from './common/sentry/sentry.util';

/**
 * Bootstrap bdsai.vn API — Story 1.1 + 1.2 + 1.6.
 *
 * Cổng dev mặc định 3101 (tránh trùng web 3100). Override qua API_PORT.
 *
 * Story 1.6:
 *   - AC4: Sentry.init TRƯỚC NestFactory (DSN optional — E2 skip khi empty).
 *   - AC5: nestjs-pino Logger (structured JSON) — app.useLogger.
 *   - AC6: global exception filter qua APP_FILTER (app.module) — DI Logger.
 *
 * Port đọc qua ConfigService (AC2 — KHÔNG dùng process.env rải rác trong runtime).
 * Sentry init đọc env trực tiếp (trước DI) — chỉ DSN + environment, KHÔNG log key.
 */
async function bootstrap(): Promise<void> {
  // AC4: Sentry init trước NestFactory. E2: DSN empty → skip (graceful).
  const dsn = process.env['SENTRY_DSN'] ?? '';
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env['NODE_ENV'] ?? 'development',
      tracesSampleRate: 0.1,
      // AD-5/AD-8/E9: redact secret trước khi gửi lên Sentry.
      beforeSend: redactSecrets,
    });
  }

  // bufferLogs: true — log buffer cho đến khi pino logger ready (AC5).
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // AC5: thay default NestJS Logger bằng nestjs-pino (pino structured JSON).
  app.useLogger(app.get(Logger));

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);

  // Bootstrap console.log OK (Consistency conventions — chỉ main.ts được dùng console).
  console.log(`[bdsai-api] listening on http://localhost:${port}`);
  if (!dsn) {
    console.log('[bdsai-api] SENTRY_DSN empty — Sentry disabled (dev, E2 graceful).');
  }
}

void bootstrap();
