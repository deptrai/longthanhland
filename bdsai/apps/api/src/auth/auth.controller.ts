import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AuthService, type RegisterResponse } from './auth.service';
import { registerApiSchema } from './dto/register.dto';

/**
 * AuthController (AC4) — Story 2.1.
 *
 * POST /auth/register — đăng ký user mới (email + phone + password).
 * Validation qua Zod (AC3) — throw ZodError → AllExceptionsFilter map 400.
 *
 * AD-2: mutation qua NestJS API → Service → Drizzle/Supabase (KHÔNG frontend
 * direct insert). AD-5: service-role createUser (KHÔNG anon signUp).
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
}
