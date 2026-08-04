// e2e/guest/detail.spec.ts — Guest listing detail + SSR + JSON-LD + inquiry.
import { test, expect } from '@playwright/test';

test.describe('Guest — Listing detail @smoke', () => {
  test('detail page SSR + JSON-LD + meta tags', async ({ page }) => {
    await page.goto('/listings');
    const firstLink = page.locator('a[href*="/listings/"]').filter({ hasText: /.+/ }).first();
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);

    await expect(page.locator('h1')).toBeVisible();
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('RealEstateListing');
  });

  test('inquiry form submit → thành công', async ({ page }) => {
    await page.goto('/listings');
    const firstLink = page.locator('a[href*="/listings/"]').filter({ hasText: /.+/ }).first();
    await firstLink.click();

    // Mở inquiry form — click "Liên hệ người bán".
    await page.getByRole('button', { name: 'Liên hệ người bán' }).click();

    // Wait cho form hiện.
    await expect(page.getByTestId('inquiry-name-input')).toBeVisible({ timeout: 10_000 });

    // Fill + submit
    await page.getByTestId('inquiry-name-input').fill('E2E Guest');
    await page.locator('input[type="tel"]').fill('0901234567');
    await page.locator('textarea').fill('E2E test inquiry.');
    await page.locator('form button[type="submit"]').click();

    // Success message hiện.
    await expect(page.getByText('Đã gửi liên hệ thành công')).toBeVisible({ timeout: 10_000 });
  });
});
