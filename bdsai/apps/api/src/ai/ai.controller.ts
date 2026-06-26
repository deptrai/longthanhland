import { Controller, Get, Param } from '@nestjs/common';
import { AiService } from './ai.service';

// Story 4.1 + 4.4 — AI controller.
// Public GET for AI results on PUBLISHED listings (SSR page needs this).
// Admin POST to trigger regeneration.

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // Story 4.4: GET /ai/listings/:id — public AI results for SSR detail page.
  @Get('listings/:id')
  async getAiResults(@Param('id') id: string) {
    return this.aiService.getAiResults(id);
  }
}
