import { Injectable } from '@nestjs/common';

/**
 * Service cấp app — placeholder health/info cho Story 1.1.
 */
@Injectable()
export class AppService {
  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'bdsai-api' };
  }
}
