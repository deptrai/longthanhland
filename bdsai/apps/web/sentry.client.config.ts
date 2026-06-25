import * as Sentry from '@sentry/nextjs';

/**
 * Sentry client config (AC4 — Story 1.6) — browser-side init.
 *
 * @sentry/nextjs auto-import file này qua withSentryConfig (next.config.ts).
 * DSN từ NEXT_PUBLIC_SENTRY_DSN (public — DSN không nhạy cảm, safe expose client).
 * E2: DSN empty → skip init (dev), KHÔNG crash.
 *
 * AD-5/AD-8: beforeSend redact secret (reuse redactSecrets logic — client-side
 * strip headers/extra chứa token/password).
 */
const dsn = process.env['NEXT_PUBLIC_SENTRY_DSN'] ?? '';

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: 0.1,
    // Auto-session replay (disabled in dev để tiết kiệm).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // AD-8: strip Authorization header + secret-ish fields khỏi client event.
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        delete headers['authorization'];
        delete headers['cookie'];
        event.request.headers = headers;
      }
      return event;
    },
  });
}
