import { Controller, Get } from '@nestjs/common';
import type { Role } from '@bdsai/shared';
import { AppService } from './app.service';

/**
 * Controller gốc — health endpoint tối thiểu để verify api chạy (AC #1, #4).
 * Import `Role` từ @bdsai/shared chứng minh chia sẻ type BE ↔ shared.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): { status: string; service: string; defaultRole: Role } {
    const defaultRole: Role = 'user';
    return { ...this.appService.getHealth(), defaultRole };
  }
}
