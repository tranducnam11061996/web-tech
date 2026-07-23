import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const webServerURL = process.env.PLAYWRIGHT_SERVER_URL || baseURL;
const webServerCommand = process.env.PLAYWRIGHT_SERVER_COMMAND || 'npm run dev';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { outputFolder: 'artifacts/playwright' }], ['line']] : 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER === '1' ? undefined : {
    command: webServerCommand,
    url: webServerURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
