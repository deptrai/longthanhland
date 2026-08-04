// e2e/buyer/auth.spec.ts — Buyer login + profile.
import { test, expect } from '../../support/fixtures';
import { LoginPage } from '../../support/page-objects/login.page';

test.describe('Buyer — Auth @smoke', () => {
  test('login thành công → redirect home + header hiện email', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(process.env.TEST_BUYER_EMAIL ?? 'buyer-e2e@bdsai.vn', process.env.TEST_BUYER_PASSWORD ?? 'E2eBuyer1234');

    // Wait cho redirect về home (router.push async).
    await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 15_000 });
    const header = page.locator('header');
    await expect(header).toContainText(process.env.TEST_BUYER_EMAIL ?? 'buyer-e2e@bdsai.vn', { timeout: 10_000 });
  });

  test('login sai password → 401 generic message (anti-enumeration)', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login('buyer-e2e@bdsai.vn', 'WrongPassword123');

    // API error trong div[role="alert"] — dùng getByText tránh strict mode.
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible({ timeout: 10_000 });
  });
});
