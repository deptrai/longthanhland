import { Throttle } from '@nestjs/throttler';

/**
 * Dev-friendly Throttle decorator.
 *
 * Production: giữ nguyên limit chặt theo AC.
 * Dev (NODE_ENV !== 'production'): nới limit x10 để test local không bị 429.
 *
 * Cách dùng: thay `@Throttle({ default: { limit: 5, ttl: 900_000 } })`
 * bằng `@DevThrottle({ prodLimit: 5, ttl: 900_000 })`.
 */
export function DevThrottle(opts: {
  prodLimit: number;
  ttl: number;
  devMultiplier?: number;
}): MethodDecorator & ClassDecorator {
  const isProd = process.env.NODE_ENV === 'production';
  const multiplier = opts.devMultiplier ?? 10;
  const limit = isProd ? opts.prodLimit : opts.prodLimit * multiplier;
  return Throttle({ default: { limit, ttl: opts.ttl } });
}
