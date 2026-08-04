import { defineConfig, devices } from '@playwright/test';

// Playwright config cho bdsai.vn E2E — fullstack (Next.js + NestJS).
// Timeouts: action 15s, navigation 30s, test 60s (per TEA guardrails).
// Artifacts: trace retain-on-failure-and-retries, screenshot only-on-failure, video retain-on-failure.
// Reporters: HTML + JUnit + console.
// Parallelism: enabled (CI tuned via shard).

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 90_000,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
    ['list'],
  ],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure-and-retries',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Chromium — primary browser cho dev + CI.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox — cross-browser smoke (CI only, subset).
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.smoke\.spec\.ts/,
    },
    // Mobile Safari — responsive a11y check.
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
});
