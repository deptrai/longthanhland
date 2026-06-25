import * as Sentry from '@sentry/nextjs';

/**
 * Sentry server config (AC4 — Story 1.6) — Node.js server-side init.
 *
 * Load qua instrumentation.ts register() (Next.js 16 instrumentation hook).
 * DSN từ SENTRY_DSN (server-only — KHÔNG NEXT_PUBLIC prefix).
 * E2: DSN empty → skip init (dev), KHÔNG crash.
 *
 * AD-5/AD-8: beforeSend redact secret (DATABASE_URL password, service-role key,
 * REDIS_URL) khỏi server event trước khi gửi lên Sentry.
 */
const dsn = process.env['SENTRY_DSN'] ?? '';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // AD-5/AD-8: redact secret khỏi request headers + extra.
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers['authorization'];
        delete headers['cookie'];
        event.request.headers = headers;
      }
      if (event.extra) {
        const extra = { ...event.extra };
        for (const key of Object.keys(extra)) {
          if (/DATABASE_URL|REDIS_URL|SENTRY_DSN|SERVICE_ROLE|password|token|secret/i.test(key)) {
            extra[key] = '[Redacted]';
          }
        }
        event.extra = extra;
      }
      return event;
    },
  });
}
