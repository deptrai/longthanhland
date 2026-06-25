import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Bootstrap bdsai.vn API.
 * Cổng dev mặc định 3101 (tránh trùng web 3100). Override qua API_PORT.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? 3101);
  await app.listen(port);
  console.log(`[bdsai-api] listening on http://localhost:${port}`);
}

void bootstrap();
