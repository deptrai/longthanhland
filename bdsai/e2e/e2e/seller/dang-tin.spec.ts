// e2e/seller/dang-tin.spec.ts — Seller đăng tin 4-step → PENDING.
import { test, expect } from '../../support/fixtures';

test.describe('Seller — Đăng tin @smoke', () => {
  test('4-step form → tạo listing PENDING', async ({ page, authAs }) => {
    // Given: seller đã login
    await authAs('seller');

    // When: vào dang-tin + fill 4 steps
    await page.goto('/dashboard/dang-tin');
    await expect(page.getByTestId('dang-tin-title')).toContainText('Đăng tin bất động sản');

    // Step 1: Thông tin cơ bản
    await page.locator('input[placeholder*="Đất nền Long Thành"]').fill('E2E test listing');
    await page.locator('textarea[placeholder*="Mô tả chi tiết"]').fill('E2E mô tả test.');
    await page.locator('input[placeholder="2000000000"]').fill('1000000000');
    await page.locator('input[placeholder="100"]').fill('100');
    const selects = page.locator('select');
    await selects.first().selectOption('sell');
    await selects.nth(1).selectOption('land');
    await page.getByTestId('next-step-button').click();

    // Step 2: Vị trí
    await expect(page.locator('h2')).toContainText('Vị trí');
    await page.locator('input[placeholder="VD: Đồng Nai"]').fill('Đồng Nai');
    await page.locator('input[placeholder="VD: Long Thành"]').fill('Long Thành');
    await page.locator('input[placeholder*="Khu phố 1"]').fill('KP3, Long Thành');
    await page.getByTestId('next-step-button').click();

    // Step 3: Hình ảnh (skip upload)
    await expect(page.locator('h2')).toContainText('Hình ảnh');
    await page.getByTestId('next-step-button').click();

    // Step 4: Xem lại + Đăng tin
    await expect(page.locator('h2')).toContainText('Xem lại thông tin');
    await page.getByRole('button', { name: 'Đăng tin' }).click();

    // Then: success message (h2 — không phải h1).
    await expect(page.locator('h2')).toContainText('Đăng tin thành công', { timeout: 15_000 });
  });
});
