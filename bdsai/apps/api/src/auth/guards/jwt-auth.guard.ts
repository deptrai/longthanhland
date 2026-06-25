import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { Env } from '../../config/env.validation';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * JwtAuthGuard (AC6) — Story 2.2.
 *
 * Verify Supabase JWT — hybrid approach:
 *   1. Try `jsonwebtoken.verify(token, SUPABASE_JWT_SECRET)` (HS256 — old Supabase).
 *      Local verify, ~0.1ms, KHÔNG network call (NFR2 < 200ms).
 *   2. If HS256 verify fails (new Supabase uses ES256 asymmetric keys),
 *      fall back to `supabase.auth.getUser(token)` — network call but correct
 *      for any signing algorithm. Local Supabase same machine → < 1ms.
 *
 * Flow:
 *   1. Extract Bearer token từ Authorization header.
 *   2. Verify JWT (local HS256 first, then Supabase getUser fallback).
 *   3. Extract sub (user id) → attach request.user = { id, email }.
 *   4. KHÔNG query public_users trong guard (role query trong service khi cần).
 *
 * E4/E10: expired/malformed/signature invalid → 401 generic.
 */
export interface JwtUser {
  id: string;
  email?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu token xác thực');
    }
    const token = authHeader.slice(7);

    // Step 1: Try local HS256 verify (old Supabase — fast path).
    const secret = this.config.get('SUPABASE_JWT_SECRET', { infer: true });
    const supabaseUrl = this.config.get('SUPABASE_URL', { infer: true });
    // AC6b: expected issuer = ${SUPABASE_URL}/auth/v1 (Supabase Auth issuer).
    const expectedIss = `${supabaseUrl}/auth/v1`;
    try {
      const payload = jwt.verify(token, secret) as {
        sub: string;
        email?: string;
        exp: number;
        iss: string;
      };
      // AC6b: validate iss (issuer) — defense-in-depth. Token signed với cùng
      // secret nhưng issuer khác (vd Supabase project khác) → reject 401.
      if (payload.iss !== expectedIss) {
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }
      (request as Request & { user: JwtUser }).user = {
        id: payload.sub,
        email: payload.email,
      };
      return true;
    } catch (e) {
      // iss mismatch → reject immediately (KHÔNG fallback ES256).
      if (e instanceof UnauthorizedException) throw e;
      // HS256 verify failed — might be ES256 (new Supabase). Try fallback.
    }

    // Step 2: Fallback — supabase.auth.getUser(token) (new Supabase ES256).
    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data.user) {
        throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
      }
      (request as Request & { user: JwtUser }).user = {
        id: data.user.id,
        email: data.user.email,
      };
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      // E4/E10: expired/malformed/signature invalid → 401 generic.
      throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
    }
  }
}
