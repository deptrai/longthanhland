// support/fixtures/auth.fixture.ts — Playwright fixture cho auth roles.
// Pattern: fixtures-composition (mergeTests) + route interception (auth restore).
//
// bdsai app: accessToken in memory (React state) + refresh_token httpOnly cookie.
// Cookie-based auth restore fails on full navigation (path restriction + timing).
// Solution: intercept /api/auth/refresh + /api/auth/me → return stored tokens.
//
// P2-12: Use tokens from global-setup (persisted in .auth/tokens.json) — avoid
// redundant login API calls that trigger 429 rate limiting across parallel workers.
// Fallback to login() only if stored token is missing.
import { test as base, expect, request, type Page, type Route } from '@playwright/test';
import { login, getStoredToken, type UserRole } from '../helpers/auth';

const ROLE_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  buyer: {
    email: process.env.TEST_BUYER_EMAIL ?? 'buyer-e2e@bdsai.vn',
    password: process.env.TEST_BUYER_PASSWORD ?? 'E2eBuyer1234',
  },
  seller: {
    email: process.env.TEST_SELLER_EMAIL ?? 'seller-e2e@bdsai.vn',
    password: process.env.TEST_SELLER_PASSWORD ?? 'E2eSeller1234',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin-e2e@bdsai.vn',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'E2eAdmin1234',
  },
  'super-admin': {
    email: process.env.TEST_SUPER_ADMIN_EMAIL ?? 'super-e2e@bdsai.vn',
    password: process.env.TEST_SUPER_ADMIN_PASSWORD ?? 'E2eSuper1234',
  },
};

type AuthFixture = {
  authAs: (role: UserRole) => Promise<{ accessToken: string; page: Page }>;
};

// P2-12: Cache { accessToken, meData } per role per worker — avoid redundant API calls.
const roleCache = new Map<UserRole, { accessToken: string; meData: unknown }>();

async function getRoleAuth(role: UserRole): Promise<{ accessToken: string; meData: unknown }> {
  const cached = roleCache.get(role);
  if (cached) return cached;

  // P2-12: Try stored tokens from global-setup first — avoids login API call + 429.
  const stored = getStoredToken(role);
  let accessToken: string;

  if (stored?.accessToken) {
    accessToken = stored.accessToken;
  } else {
    // Fallback: login directly if global-setup didn't persist this role.
    const creds = ROLE_CREDENTIALS[role];
    const tokens = await login(creds.email, creds.password);
    accessToken = tokens.accessToken;
  }

  // Fetch user profile for /api/auth/me response.
  const meCtx = await request.newContext({
    baseURL: process.env.API_URL ?? 'http://localhost:3101',
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
  const meRes = await meCtx.get('/auth/me');
  const meData = await meRes.json();
  await meCtx.dispose();

  const auth = { accessToken, meData };
  roleCache.set(role, auth);
  return auth;
}

export const test = base.extend<AuthFixture>({
  authAs: async ({ page }, use) => {
    const authAs = async (role: UserRole) => {
      // P2-12: Reuse cached tokens + meData across tests in same worker.
      const { accessToken, meData } = await getRoleAuth(role);

      // Intercept /api/auth/refresh → return stored access token.
      // This ensures auth restore always succeeds on full navigation.
      await page.route('**/api/auth/refresh', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ accessToken }),
        });
      });

      // Intercept /api/auth/me → return stored user profile.
      await page.route('**/api/auth/me', async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(meData),
        });
      });

      return { accessToken, page };
    };
    await use(authAs);
  },
});

export { expect };
