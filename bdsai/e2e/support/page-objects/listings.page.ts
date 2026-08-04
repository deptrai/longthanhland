// support/page-objects/listings.page.ts — listings page object (search, filter, sort).
import { expect, type Page, type Locator } from '@playwright/test';

export class ListingsPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly provinceInput: Locator;
  readonly districtInput: Locator;
  readonly priceFromInput: Locator;
  readonly priceToInput: Locator;
  readonly submitButton: Locator;
  readonly listingLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByTestId('search-input');
    this.provinceInput = page.getByTestId('province-input');
    this.districtInput = page.getByTestId('district-input');
    this.priceFromInput = page.locator('input[placeholder*="Giá từ"]');
    this.priceToInput = page.locator('input[placeholder*="Giá đến"]');
    this.submitButton = page.getByRole('button', { name: 'Tìm kiếm' });
    this.listingLinks = page.locator('a[href*="/listings/"]').filter({ hasText: /.+/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/listings');
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.submitButton.click();
  }

  async getListingCount(): Promise<number> {
    await expect(this.listingLinks.first()).toBeVisible({ timeout: 10_000 });
    return this.listingLinks.count();
  }
}
