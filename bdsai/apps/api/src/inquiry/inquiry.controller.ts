import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import { InquiryService } from './inquiry.service';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { DevThrottle } from '../common/throttle/dev-throttle.decorator';

// Story 6.1 + 6.2 — Inquiry controller.
// Public POST (buyer chưa đăng nhập vẫn gửi được).
// Seller GET (JWT required — list own inquiries).

const createInquirySchema = z.object({
  listingId: z.string().uuid(),
  buyerName: z.string().min(2).max(100),
  buyerPhone: z.string().regex(/^0\d{9,10}$/),
  buyerEmail: z.string().email().optional(),
  message: z.string().min(10).max(2000),
});

@Controller('inquiries')
// Dev: x10 (100/min).
@DevThrottle({ prodLimit: 10, ttl: 60_000 }) // Anti-spam: 10 inquiries/min per IP
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  // Story 6.1: POST /inquiries — public (no auth required, buyer có thể là guest).
  @Post()
  async createInquiry(
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const result = createInquirySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dữ liệu không hợp lệ',
        details: result.error.issues,
      });
    }
    // Extract buyer ID if authenticated (optional).
    const user = (req as Request & { user?: JwtUser }).user;
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket.remoteAddress;
    return this.inquiryService.createInquiry({
      ...result.data,
      buyerId: user?.id,
      ipAddress: ip,
    });
  }

  // Story 6.2: GET /inquiries — seller list own inquiries (JWT required).
  @Get()
  @UseGuards(JwtAuthGuard)
  async listMyInquiries(@Req() req: Request) {
    const user = (req as Request & { user: JwtUser }).user;
    return this.inquiryService.listSellerInquiries(user.id);
  }
}
