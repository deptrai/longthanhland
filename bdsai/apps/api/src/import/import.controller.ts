import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ImportService, type ImportRow, type ImportResult } from './import.service';
import { AdminGuard } from '../admin/guards/admin.guard';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';

/**
 * ImportController — Story 5.7.
 *
 * Admin-only endpoint for importing listings from external sources (CSV/JSON).
 *   - POST /import/csv  — upload CSV text body
 *   - POST /import/json — JSON body with listings array
 *
 * AC9: AdminGuard — non-admin → 403.
 */
@Controller('admin/import')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(private readonly importService: ImportService) {}

  /**
   * POST /admin/import/csv — import from CSV text.
   * Body: { csv: string, sourceUrl?: string }
   */
  @Post('csv')
  @HttpCode(HttpStatus.OK)
  async importCsv(
    @Body() body: { csv?: string; sourceUrl?: string },
    @Req() req: Request,
  ): Promise<ImportResult> {
    if (!body.csv || typeof body.csv !== 'string') {
      throw new BadRequestException('Thiếu trường "csv" (string)');
    }
    const user = (req as Request & { user: JwtUser }).user;
    this.logger.log({ action: 'import-csv', adminId: user.id, csvLen: body.csv.length });
    const rows = this.importService.parseCsv(body.csv);
    return this.importService.importRows(rows, 'csv', body.sourceUrl);
  }

  /**
   * POST /admin/import/json — import from JSON.
   * Body: { listings: ImportRow[], sourceUrl?: string }
   */
  @Post('json')
  @HttpCode(HttpStatus.OK)
  async importJson(
    @Body() body: { listings?: ImportRow[]; sourceUrl?: string },
    @Req() req: Request,
  ): Promise<ImportResult> {
    const user = (req as Request & { user: JwtUser }).user;
    this.logger.log({ action: 'import-json', adminId: user.id, count: body.listings?.length ?? 0 });
    const rows = this.importService.parseJson(body);
    return this.importService.importRows(rows, 'json', body.sourceUrl);
  }
}
