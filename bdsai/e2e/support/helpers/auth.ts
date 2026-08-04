// support/helpers/auth.ts — auth helpers: login, get token from global setup, set browser auth.
// Pattern: auth-session (token persistence, multi-user, API + browser auth).
//
// bdsai app dùng accessToken in memory (React state) + refresh_token httpOnly cookie.
// Restore session: POST /api/auth/refresh (cookie tự gửi) → new accessToken + /api/auth/me.
// → Để auth browser, cần set refresh_token cookie vào context.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { request, type Page, type APIRequestContext, type BrowserContext } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3101';
const WEB_URL = process.env.BASE_URL ?? 'http://localhost:3100';
const AUTH_FILE = join(process.cwd(), '.auth', 'tokens.json');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type UserRole = 'buyer' | 'seller' | 'admin' | 'super-admin';

// Đọc token persisted bởi global-setup.
export function getStoredToken(role: UserRole): AuthTokens | null {
  if (!existsSync(AUTH_FILE)) return null;
  const tokens = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
  return tokens[role] ?? null;
}

// Login trực tiếp (cho user mới tạo trong test).
export async function login(email: string, password: string): Promise<AuthTokens> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  const setCookie = res.headers()['set-cookie'] ?? '';
  const refreshTokenMatch = setCookie.match(/refresh_token=([^;]+)/);
  await ctx.dispose();

  if (!body.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  return { accessToken: body.accessToken, refreshToken: refreshTokenMatch?.[1] ?? '' };
}

// Set auth state cho browser context — set refresh_token cookie.
// App restore session qua POST /api/auth/refresh (httpOnly cookie tự gửi).
// Cookie path phải khớp với server (/api/auth) — nếu path=/, server rotation
// tạo cookie thứ hai → cookie-parser pick stale cookie → auth restore fail.
export async function setBrowserAuth(context: BrowserContext, refreshToken: string): Promise<void> {
  await context.addCookies([
    {
      name: 'refresh_token',
      value: refreshToken,
      domain: 'localhost',
      path: '/api/auth',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

// Set auth state cho page — set refresh_token cookie (cho page-based tests).
export async function setPageAuth(page: Page, refreshToken: string): Promise<void> {
  const context = page.context();
  await setBrowserAuth(context, refreshToken);
}

// Tạo authenticated APIRequestContext.
export async function createAuthContext(accessToken: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}
