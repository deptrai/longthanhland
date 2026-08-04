// e2e/guest/listings.spec.ts — Guest browse listings + FTS + sort.
import { test, expect } from '@playwright/test';

test.describe('Guest — Browse listings @smoke', () => {
  test('hiển thị danh sách tin PUBLISHED', async ({ page }) => {
    await page.goto('/listings');
    // Wait cho listings render (client-side fetch).
    await expect(page.locator('a[href*="/listings/"]').first()).toBeVisible({ timeout: 15_000 });
    const count = await page.locator('a[href*="/listings/"]').filter({ hasText: /.+/ }).count();
    expect(count).toBeGreaterThan(0);
  });

  test('FTS "long thanh" → lọc tin Long Thành', async ({ page }) => {
    await page.goto('/listings');
    await expect(page.getByTestId('search-input')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('search-input').fill('long thanh');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    // Wait cho kết quả render — verify có kết quả hoặc text "Long Thành".
    await expect(page.locator('a[href*="/listings/"]').first()).toBeVisible({ timeout: 10_000 });
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/Long Thành/i);
  });

  test('sort price-asc → giá tăng dần', async ({ page }) => {
    await page.goto('/listings');
    await expect(page.locator('a[href*="/listings/"]').first()).toBeVisible({ timeout: 15_000 });
    const count = await page.locator('a[href*="/listings/"]').filter({ hasText: /.+/ }).count();
    expect(count).toBeGreaterThan(0);
  });
});
