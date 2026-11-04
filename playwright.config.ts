import { defineConfig, devices } from '@playwright/test';

// Keeps the seed credentials in step with `pnpm db:seed:dev`. Optional; absent in CI.
try {
  process.loadEnvFile('.env.local');
} catch {
  // Rely on the real environment.
}

/**
 * End-to-end suite. Expects the apps to be running (CI starts the production
 * builds) and Mailpit on MAILPIT_URL for reading verification emails.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...(process.env.E2E_CHROME_CHANNEL ? { channel: process.env.E2E_CHROME_CHANNEL } : {}),
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
});
