import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ZodError } from 'zod';
import type { Request, Response } from 'express';
import {
  AuthService,
  type LoginResponse,
  type MeResponse,
  type RefreshResponse,
  type RegisterResponse,
} from './auth.service';
import { registerApiSchema } from './dto/register.dto';
import { loginApiSchema } from './dto/login.dto';
import { refreshApiSchema } from './dto/refresh.dto';
import { updateMeApiSchema } from './dto/update-me.dto';
import { JwtAuthGuard, type JwtUser } from './guards/jwt-auth.guard';
import { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie } from './cookie.helper';

/**
 * AuthController (AC1, AC2, AC4, AC5, AC6, AC7) — Story 2.1 + 2.2 + 2.3.
 *
 * Endpoints:
 *   - POST /auth/register — đăng ký user mới (Story 2.1).
 *   - POST /auth/login — đăng nhập (Story 2.2 AC1).
 *   - POST /auth/logout — đăng xuất + clear cookie (Story 2.2 AC2).
 *   - POST /auth/refresh — refresh access token (Story 2.2 AC5).
 *   - GET /auth/me — profile user, cần JwtAuthGuard (Story 2.2 AC7 + 2.3 AC2).
 *   - PATCH /auth/me — cập nhật profile (Story 2.3 AC3, AC4, AC9).
 *
 * AD-2: mutation qua NestJS API → Service → Drizzle/Supabase. AD-5: service-role.
 * AD-8: KHÔNG log email/password/token raw. AC3: generic error anti-enumeration.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown): Promise<RegisterResponse> {
    // AC3: validate qua Zod — throw ZodError → filter map 400 + details.
    const result = registerApiSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    return this.authService.register(result.data);
  }

  // --- Story 2.2: login / logout / refresh / me ---

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // E9: rate limit 5 login / 15 phút / IP (chỉ login, KHÔNG global).
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const result = loginApiSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    const response = await this.authService.login(result.data);
    // AC4: set refresh_token httpOnly cookie.
    setRefreshCookie(res, response.refreshToken);
    return response;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  // HIGH-1 fix: JwtAuthGuard verify JWT signature trước khi logout — ngăn
  // attacker sửa claim sub (jwt.decode không verify) → forced-logout DoS.
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    // Guard đã verify JWT + attach request.user = { id, email }.
    const user = (req as Request & { user: JwtUser }).user;
    const result = await this.authService.logout(user.id);
    // AC2b: clear refresh_token cookie.
    clearRefreshCookie(res);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponse> {
    // AC5: đọc refresh_token từ cookie (ưu tiên), body fallback (curl test).
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    let bodyToken: string | undefined;
    if (body && typeof body === 'object') {
      const parsed = refreshApiSchema.safeParse(body);
      if (parsed.success) {
        bodyToken = parsed.data.refresh_token;
      }
    }
    const refreshToken = cookieToken ?? bodyToken;
    const response = await this.authService.refresh(refreshToken);
    // AC5c: set new refresh_token cookie (rotated).
    setRefreshCookie(res, response.refreshToken);
    return response;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request): Promise<MeResponse> {
    // Guard đã verify JWT + attach request.user = { id, email }.
    const user = (req as Request & { user: JwtUser }).user;
    return this.authService.getMe(user.id);
  }

  // --- Story 2.3: PATCH /auth/me (cập nhật profile — AC3, AC4, AC9) ---

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  // AC9: rate limit 10 update / 15 phút / IP (tránh spam update).
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async updateMe(@Body() body: unknown, @Req() req: Request): Promise<MeResponse> {
    // AC3: validate qua Zod — whitelist strip field thừa + sanitize XSS.
    const result = updateMeApiSchema.safeParse(body);
    if (!result.success) {
      throw new ZodError(result.error.issues);
    }
    // Guard đã verify JWT + attach request.user = { id, email }.
    const user = (req as Request & { user: JwtUser }).user;
    return this.authService.updateMe(user.id, result.data);
  }
}
