import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { Params } from 'nestjs-pino';

/**
 * LoggerModule (AC5, AD: NestJS Logger structured JSON) — Story 1.6.
 *
 * Thay default NestJS Logger bằng nestjs-pino (pino):
 *   - dev (NODE_ENV !== production): pino-pretty — log đọc được (color, indent).
 *   - prod (NODE_ENV = production): JSON compact — structured log cho log aggregator.
 *
 * AD-8 (PII/secret): pino redact secret fields — password/key/token/serviceRoleKey.
 * E9: redact paths dùng pino redact syntax (wildcard).
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: (): Params => {
        const isProd = process.env.NODE_ENV === 'production';
        return {
          pinoHttp: {
            // E6: prod JSON compact, dev pino-pretty.
            transport: isProd
              ? undefined
              : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
            // AD-8/E9: redact secret fields khỏi log.
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                '*.password',
                '*.key',
                '*.token',
                '*.serviceRoleKey',
                '*.SUPABASE_SERVICE_ROLE_KEY',
                '*.DATABASE_URL',
                '*.REDIS_URL',
                '*.SENTRY_DSN',
              ],
              censor: '[Redacted]',
            },
            // Auto-log mọi HTTP request (level info). AD-8: KHÔNG log body.
            autoLogging: {
              ignore: (req) => req.url === '/health/supabase' || req.url === '/health/redis',
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
