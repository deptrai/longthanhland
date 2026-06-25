import type { Response } from 'express';

/**
 * Cookie helper (AC4, AC5) — Story 2.2.
 *
 * Set/clear refresh_token httpOnly cookie.
 *   - HttpOnly: KHÔNG accessible JavaScript (XSS protection).
 *   - SameSite=Lax: CSRF protection (block cross-site POST).
 *   - Path=/api/auth: cookie chỉ gửi cho route /api/auth/* (giảm exposure).
 *   - Secure: chỉ set khi NODE_ENV=production (dev HTTP → browser block Secure).
 *   - Max-Age=604800 (7 ngày — khớp Supabase refresh token expiry).
 */

export const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 ngày (giây)

export function setRefreshCookie(res: Response, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE * 1000, // ms
  });
}

export function clearRefreshCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}
