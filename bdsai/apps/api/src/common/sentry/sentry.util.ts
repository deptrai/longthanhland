import type { ErrorEvent, EventHint } from '@sentry/node';

/**
 * Sentry helpers (AC4, AD-5, AD-8) — Story 1.6.
 *
 * beforeSend redact secret khỏi Sentry event trước khi gửi (AD-5/AD-8).
 * Strip fields chứa secret: SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL password,
 * REDIS_URL, SENTRY_DSN, JWT/token/password.
 */

const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /SERVICE_ROLE/i,
  /DATABASE_URL/i,
  /REDIS_URL/i,
  /SENTRY_DSN/i,
  /password/i,
  /confirmPassword/i,
  /serviceRoleKey/i,
  /token/i,
  /secret/i,
  /jwt/i,
  // Story 2.1 AC8: PII fields — redact khỏi Sentry event.
  /email/i,
  /phone/i,
];

// Story 2.1 AC8: regex redact PII raw value khỏi string (email + phone VN).
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_VN_REGEX = /(\+84|0084|0)\d{9,10}/g;

/** Redact string value chứa secret pattern → [Redacted]. */
function redactString(value: string): string {
  // Story 2.1 AC8: redact PII (email + phone VN) raw value khỏi string.
  let piiOut = value.replace(EMAIL_REGEX, '[email-redacted]');
  piiOut = piiOut.replace(PHONE_VN_REGEX, '[phone-redacted]');
  // Connection string: postgres://user:pass@host → postgres://[Redacted]@host
  let out = piiOut.replace(/postgres(ql)?:\/\/[^@]+@/gi, 'postgres$1://[Redacted]@');
  out = out.replace(/redis:\/\/[^@]*@?/gi, 'redis://[Redacted]');
  // Bare secret values (key-like, long base64/JWT).
  if (SECRET_PATTERNS.some((p) => p.test(out)) || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(out)) {
    return '[Redacted]';
  }
  return out;
}

/** Đệ quy redact object/string chứa secret. */
function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Key name match secret → redact whole value.
      if (SECRET_PATTERNS.some((p) => p.test(key))) {
        out[key] = '[Redacted]';
      } else {
        out[key] = redactDeep(val);
      }
    }
    return out;
  }
  return value;
}

/**
 * beforeSend hook — redact secret khỏi Sentry event (AD-5/AD-8/E9).
 * Trả event đã redact (hoặc null nếu drop).
 */
export function redactSecrets(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  void _hint;
  if (!event) return event;
  // AD-5/AD-8: strip Authorization + Cookie headers (luôn redact, không phải pattern).
  if (event.request?.headers) {
    const headers = { ...event.request.headers };
    delete headers['authorization'];
    delete headers['cookie'];
    event.request.headers = headers;
  }
  // Redact extra, tags, contexts (secret keys + connection strings).
  if (event.extra) {
    event.extra = redactDeep(event.extra) as Record<string, unknown>;
  }
  if (event.tags) {
    event.tags = redactDeep(event.tags) as Record<string, string>;
  }
  if (event.contexts) {
    event.contexts = redactDeep(event.contexts) as ErrorEvent['contexts'];
  }
  // Breadcrumbs messages.
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? redactString(b.message) : b.message,
      data: b.data ? (redactDeep(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  return event;
}
