// e2e/guest/home.spec.ts — Guest home page smoke test.
// Pattern: Given/When/Then, data-testid, factory usage.
import { test, expect } from '@playwright/test';
import { HomePage } from '../../support/page-objects/home.page';

test.describe('Guest — Home page @smoke', () => {
  test('hiển thị hero title + nav links', async ({ page }) => {
    // Given: guest truy cập home
    const home = new HomePage(page);
    await home.goto();

    // When: page load xong
    // Then: hero title + nav hiện
    await expect(home.heroTitle).toBeVisible();
    await expect(home.navHome).toBeVisible();
    await expect(home.navListings).toBeVisible();
    await expect(home.navLogin).toBeVisible();
    await expect(home.navRegister).toBeVisible();
  });

  test('click Tìm kiếm → navigate /listings', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.clickListings();
    await expect(page).toHaveURL(/\/listings/);
  });
});
