// e2e/admin/users.spec.ts — Admin users table + super-admin badge disabled.
import { test, expect } from '../../support/fixtures';

test.describe('Admin — Users management @smoke', () => {
  test('admin vào /admin/users → hiển thị table 20 rows', async ({ page, authAs }) => {
    await authAs('admin');
    await page.goto('/admin/users');

    // Admin layout shows spinner while auth restores — wait for it to disappear.
    await expect(page.getByTestId('users-title')).toContainText('Quản lý người dùng', { timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const rowCount = await page.locator('tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('super-admin row → badge "Super admin" + button disabled', async ({ page, authAs }) => {
    await authAs('admin');
    await page.goto('/admin/users');

    await expect(page.getByTestId('users-title')).toContainText('Quản lý người dùng', { timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const superRow = page.locator('tbody tr').filter({ hasText: 'super-e2e@bdsai.vn' }).first();
    await expect(superRow).toBeVisible();
    await expect(superRow.locator('td').nth(3)).toContainText(/super/i);
    // Button "Super admin" (role badge) là disabled — không phải button "Khóa".
    const roleBtn = superRow.locator('button', { hasText: /super admin/i });
    await expect(roleBtn).toBeDisabled();
  });
});
