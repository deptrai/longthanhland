// support/fixtures/listing.fixture.ts — Playwright fixture cho listing CRUD.
// Pattern: data-factories (API seeding, cleanup after test).
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';
import { createListing, type TestListing } from '../factories/listing.factory';
import { getStoredToken } from '../helpers/auth';

type ListingFixture = {
  createTestListing: (overrides?: Partial<TestListing>) => Promise<{ listing: TestListing; cleanup: () => Promise<void> }>;
};

export const test = base.extend<ListingFixture>({
  createTestListing: async ({}, use) => {
    const created: { id: string; sellerToken: string }[] = [];

    const createTestListing = async (overrides: Partial<TestListing> = {}) => {
      const sellerToken = getStoredToken('seller')?.accessToken;
      if (!sellerToken) throw new Error('No seller token — check global-setup');

      const listingData = createListing(overrides);
      const client = await ApiClient.create(sellerToken);
      const res = await client.post<{ id?: string }>('/marketplace/listings', listingData);
      await client.dispose();

      expect(res.status, 'Create listing phải 201/200').toBeLessThan(300);
      const createdListing = { ...listingData, id: res.body.id ?? listingData.id };
      created.push({ id: createdListing.id, sellerToken });

      const cleanup = async () => {
        const c = await ApiClient.create(sellerToken);
        await c.delete(`/marketplace/listings/${createdListing.id}`);
        await c.dispose();
      };

      return { listing: createdListing, cleanup };
    };

    await use(createTestListing);

    // Auto-cleanup sau test.
    for (const { id, sellerToken } of created) {
      try {
        const c = await ApiClient.create(sellerToken);
        await c.delete(`/marketplace/listings/${id}`);
        await c.dispose();
      } catch {
        // Best-effort cleanup.
      }
    }
  },
});

export { expect };
