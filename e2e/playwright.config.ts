import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './utils/helpers';

/**
 * No `webServer` block: the full stack needs two processes.
 * Start `npm start` (root, :3000) and then `cd client && npm start` (:4200)
 * before running the tests. See README.md.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
