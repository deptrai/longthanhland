// support/fixtures/index.ts — merged fixtures (mergeTests pattern).
// Combine auth + listing fixtures vào single test object.
import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth.fixture';
import { test as listingTest } from './listing.fixture';

export const test = mergeTests(authTest, listingTest);
export { expect } from '@playwright/test';
