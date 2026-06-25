/**
 * Next.js 16 instrumentation hook (AC4 — Story 1.6).
 *
 * register() chạy khi Next.js server khởi động. Load Sentry server config
 * cho Node.js runtime (client config auto-wired qua withSentryConfig).
 *
 * E2: SENTRY_DSN empty → sentry.server.config skip init (graceful).
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export async function register(): Promise<void> {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    await import('./sentry.server.config');
  }
  // Edge runtime cũng dùng server config (cùng DSN, cùng redact).
  if (process.env['NEXT_RUNTIME'] === 'edge') {
    await import('./sentry.server.config');
  }
}
