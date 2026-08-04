// support/page-objects/home.page.ts — home page object (data-testid selectors).
import type { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly navHome: Locator;
  readonly navListings: Locator;
  readonly navLogin: Locator;
  readonly navRegister: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.getByTestId('hero-title');
    this.navHome = page.getByRole('link', { name: 'Trang chủ' });
    this.navListings = page.getByRole('link', { name: 'Tìm kiếm' });
    this.navLogin = page.getByRole('link', { name: 'Đăng nhập' });
    this.navRegister = page.getByRole('link', { name: 'Đăng ký' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async clickListings(): Promise<void> {
    await this.navListings.click();
  }
}
