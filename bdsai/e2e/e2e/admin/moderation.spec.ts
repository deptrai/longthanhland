// e2e/admin/moderation.spec.ts — Admin moderation queue + approve.
// P2-10: Deterministic — use test.skip when no PENDING listing, not silent if.
import { test, expect } from '../../support/fixtures';

test.describe('Admin — Moderation queue @smoke', () => {
  test('admin vào /admin/listings → hàng đợi duyệt tin', async ({ page, authAs }) => {
    await authAs('admin');
    await page.goto('/admin/listings');

    await expect(page.getByTestId('moderation-title')).toContainText('Hàng đợi duyệt tin', { timeout: 30_000 });
  });

  test('approve PENDING listing → PUBLISHED + "Đã duyệt tin"', async ({ page, authAs }) => {
    await authAs('admin');
    await page.goto('/admin/listings');

    await expect(page.getByTestId('moderation-title')).toContainText('Hàng đợi duyệt tin', { timeout: 30_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
    const firstRow = page.locator('tbody tr').first();
    const approveBtn = firstRow.locator('button', { hasText: 'Duyệt' });

    // P2-10: Explicit skip when no PENDING listing — not silent conditional pass.
    const hasApproveBtn = await approveBtn.count();
    test.skip(hasApproveBtn === 0, 'No PENDING listing to approve — seed test data first');

    await approveBtn.click();
    await expect(page.getByText('Đã duyệt tin')).toBeVisible({ timeout: 10_000 });
  });
});
