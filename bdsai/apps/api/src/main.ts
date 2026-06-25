import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Env } from './config/env.validation';
import { AppModule } from './app.module';

/**
 * Bootstrap bdsai.vn API.
 * Cổng dev mặc định 3101 (tránh trùng web 3100). Override qua API_PORT.
 *
 * Port đọc qua ConfigService (AC2 — KHÔNG dùng process.env rải rác trong runtime).
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService<Env, true>);
  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
  console.log(`[bdsai-api] listening on http://localhost:${port}`);
}

void bootstrap();
