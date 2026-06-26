import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError, z } from 'zod';
import type { Request } from 'express';
import { AdminService, type AdminUserItem, type ListUsersResponse } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { JwtAuthGuard, type JwtUser } from '../auth/guards/jwt-auth.guard';
import { listUsersApiSchema } from './dto/list-users.dto';
import { roleGrantSchema } from './dto/role-grant.dto';
import { DevThrottle } from '../common/throttle/dev-throttle.decorator';

// UUID validation via Zod (AC2a/AC3a) — validate :id param.

// AdminController (AC1-AC5, AC10) — Story 2.4.
//
// AC5: guard stack — JwtAuthGuard (verify JWT) trước, AdminGuard (check admin)
// sau. Controller-level @UseGuards apply cho tất cả /admin/* endpoints.
// AC10: rate limit 20 admin actions / 15 phút / IP.
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
// Dev: x10 (200/15min).
@DevThrottle({ prodLimit: 20, ttl: 15 * 60 * 1000 })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // AC1: GET /admin/users — paginated list + search.
  @Get('users')
  async listUsers(@Query() query: unknown): Promise<ListUsersResponse> {
    const result = listUsersApiSchema.safeParse(query);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    return this.adminService.listUsers(result.data);
  }

  // AC2: POST /admin/users/:id/ban — set banned=true.
  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AdminUserItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.banUser(id, user.id);
  }

  // AC3: POST /admin/users/:id/unban — set banned=false.
  @Post('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AdminUserItem> {
    this.assertUuid(id);
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.unbanUser(id, user.id);
  }

  // AC1: POST /admin/users/:id/role — grant/revoke admin role.
  // AC8: method-level @Throttle 10/15min (chặt hơn controller-level 20/15min
  // — role grant nhạy cảm hơn ban/unban). Override controller-level cho
  // endpoint này cụ thể. KHÔNG đăng ký ThrottlerModule mới (reuse global).
  @Post('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  // Dev: x10 (100/15min).
  @DevThrottle({ prodLimit: 10, ttl: 15 * 60 * 1000 })
  async grantRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ): Promise<AdminUserItem> {
    this.assertUuid(id);
    const result = roleGrantSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    const user = (req as Request & { user: JwtUser }).user;
    return this.adminService.grantRole(id, result.data.role, user.id);
  }

  // AC2a/AC3a: validate UUID format → 400 if invalid.
  private assertUuid(id: string): void {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }
  }
}
