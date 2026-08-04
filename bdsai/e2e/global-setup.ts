// global-setup.ts — authenticate test users once, persist tokens cho parallel workers.
// Pattern: auth-session (token persistence) + API-first (login via API, không qua UI).
// Also resets test user roles in DB (grant/revoke tests may swap roles).
// P2-11: Parallelize logins + batch DB updates into single SQL.
import { request, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const API_URL = process.env.API_URL ?? 'http://localhost:3101';
const AUTH_DIR = join(process.cwd(), '.auth');
const DB_PORT = process.env.SUPABASE_DB_PORT ?? '54352';

interface TestUser {
  key: string;
  email: string;
  password: string;
  role: string;
}

// Core test users — used by multiple test files (MUST NOT be modified by tests).
const USERS: TestUser[] = [
  { key: 'buyer', email: process.env.TEST_BUYER_EMAIL ?? 'buyer-e2e@bdsai.vn', password: process.env.TEST_BUYER_PASSWORD ?? 'E2eBuyer1234', role: 'user' },
  { key: 'seller', email: process.env.TEST_SELLER_EMAIL ?? 'seller-e2e@bdsai.vn', password: process.env.TEST_SELLER_PASSWORD ?? 'E2eSeller1234', role: 'user' },
  { key: 'admin', email: process.env.TEST_ADMIN_EMAIL ?? 'admin-e2e@bdsai.vn', password: process.env.TEST_ADMIN_PASSWORD ?? 'E2eAdmin1234', role: 'admin' },
  { key: 'super-admin', email: process.env.TEST_SUPER_ADMIN_EMAIL ?? 'super-e2e@bdsai.vn', password: process.env.TEST_SUPER_ADMIN_PASSWORD ?? 'E2eSuper1234', role: 'super-admin' },
];

// Dedicated users cho grant-revoke tests — NOT shared with other test files.
// grant-target: role=user (test grant → admin)
// revoke-target: role=admin (test revoke → user)
const GRANT_REVOKE_USERS: TestUser[] = [
  { key: 'grant-target', email: 'grant-target-e2e@bdsai.vn', password: 'E2eTarget1234', role: 'user' },
  { key: 'revoke-target', email: 'revoke-target-e2e@bdsai.vn', password: 'E2eTarget1234', role: 'admin' },
];

const ALL_USERS = [...USERS, ...GRANT_REVOKE_USERS];

// Reset test user roles in DB — batch into single SQL statement (P2-11).
function resetUserRoles(): void {
  try {
    const updates = ALL_USERS
      .map((u) => `UPDATE public.public_users SET role = '${u.role}' WHERE email = '${u.email}';`)
      .join('\n');
    execSync(
      `PGPASSWORD=postgres psql -h 127.0.0.1 -p ${DB_PORT} -U postgres -d postgres -c "${updates}"`,
      { stdio: 'pipe' },
    );
    console.log('[global-setup] ✓ test user roles reset');
  } catch (e) {
    console.warn(`[global-setup] ⚠ role reset failed — grant/revoke tests may break. Error: ${(e as Error).message}`);
  }
}

async function loginAndGetToken(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const res = await ctx.post('/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  const setCookie = res.headers()['set-cookie'] ?? '';
  const refreshTokenMatch = setCookie.match(/refresh_token=([^;]+)/);

  expect(body.accessToken, `Login ${email} phải trả accessToken`).toBeTruthy();
  await ctx.dispose();

  return {
    accessToken: body.accessToken,
    refreshToken: refreshTokenMatch?.[1] ?? '',
  };
}

export default async function globalSetup() {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  // Reset test user roles before each run.
  resetUserRoles();

  const tokens: Record<string, { accessToken: string; refreshToken: string }> = {};

  // P2-11: Parallelize login requests with Promise.all.
  const loginResults = await Promise.allSettled(
    ALL_USERS.map((user) => loginAndGetToken(user.email, user.password)),
  );

  ALL_USERS.forEach((user, i) => {
    const result = loginResults[i];
    if (result.status === 'fulfilled') {
      tokens[user.key] = result.value;
      console.log(`[global-setup] ✓ ${user.key} authenticated`);
    } else {
      console.warn(`[global-setup] ⚠ ${user.key} login failed — tests needing this role will fail. Error: ${result.reason?.message ?? result.reason}`);
    }
  });

  // Persist tokens to disk cho fixtures đọc.
  writeFileSync(join(AUTH_DIR, 'tokens.json'), JSON.stringify(tokens, null, 2));
  console.log('[global-setup] Tokens persisted to .auth/tokens.json');
}
