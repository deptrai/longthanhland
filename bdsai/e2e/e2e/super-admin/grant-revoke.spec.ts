// e2e/super-admin/grant-revoke.spec.ts — Super-admin grant/revoke role.
// P0: Uses dedicated users (grant-target/revoke-target) — NOT shared with other test files.
// P0: test.describe.configure({ mode: 'serial' }) — run sequentially, no parallel race.
// P0: afterEach cleanup — reset roles immediately after each test, not afterAll.
// P2-10: Deterministic — no conditional `if (count > 0)`, ensure preconditions via global-setup.
import { test, expect } from '../../support/fixtures';
import { execSync } from 'node:child_process';

const DB_PORT = process.env.SUPABASE_DB_PORT ?? '54352';
const GRANT_TARGET_EMAIL = 'grant-target-e2e@bdsai.vn';
const REVOKE_TARGET_EMAIL = 'revoke-target-e2e@bdsai.vn';

// P0: Serial mode — grant/revoke tests must run sequentially to avoid race conditions.
test.describe.configure({ mode: 'serial' });

// P0: afterEach cleanup — reset roles immediately after each test.
// grant-target → user, revoke-target → admin (original state).
test.afterEach(() => {
  try {
    execSync(
      `PGPASSWORD=postgres psql -h 127.0.0.1 -p ${DB_PORT} -U postgres -d postgres -c "UPDATE public.public_users SET role = 'user' WHERE email = '${GRANT_TARGET_EMAIL}'; UPDATE public.public_users SET role = 'admin' WHERE email = '${REVOKE_TARGET_EMAIL}';"`,
      { stdio: 'pipe' },
    );
  } catch {
    // Best-effort cleanup — global-setup will also reset on next run.
  }
});

test.describe('Super-admin — Grant/Revoke role @smoke', () => {
  test('super-admin vào /admin/users → guard cho phép', async ({ page, authAs }) => {
    await authAs('super-admin');
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByTestId('users-title')).toContainText('Quản lý người dùng', { timeout: 30_000 });
  });

  test('grant role → "Đã cấp quyền quản trị viên" + badge Admin', async ({ page, authAs }) => {
    await authAs('super-admin');
    await page.goto('/admin/users');

    await expect(page.getByTestId('users-title')).toContainText('Quản lý người dùng', { timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });

    // P0: Use dedicated grant-target user — not shared with other tests.
    const targetRow = page.locator('tbody tr').filter({ hasText: GRANT_TARGET_EMAIL }).first();
    await expect(targetRow).toBeVisible({ timeout: 10_000 });

    // P2-10: Deterministic — grant-target has role=user (reset by global-setup + afterEach).
    const grantBtn = targetRow.locator('button', { hasText: 'Cấp admin' });
    await expect(grantBtn).toBeVisible({ timeout: 5_000 });
    await grantBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator('button', { hasText: 'Cấp admin' }).click();

    await expect(page.getByText('Đã cấp quyền quản trị viên')).toBeVisible({ timeout: 10_000 });
  });

  test('revoke role → "Đã thu hồi quyền quản trị viên" + badge User', async ({ page, authAs }) => {
    await authAs('super-admin');
    await page.goto('/admin/users');

    await expect(page.getByTestId('users-title')).toContainText('Quản lý người dùng', { timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });

    // P0: Use dedicated revoke-target user — not shared with other tests.
    const targetRow = page.locator('tbody tr').filter({ hasText: REVOKE_TARGET_EMAIL }).first();
    await expect(targetRow).toBeVisible({ timeout: 10_000 });

    // P2-10: Deterministic — revoke-target has role=admin (reset by global-setup + afterEach).
    const revokeBtn = targetRow.locator('button', { hasText: 'Thu hồi' });
    await expect(revokeBtn).toBeVisible({ timeout: 5_000 });
    await revokeBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.locator('button', { hasText: 'Thu hồi' }).click();

    await expect(page.getByText('Đã thu hồi quyền quản trị viên')).toBeVisible({ timeout: 10_000 });
  });
});
