import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npm run dev:api',
      url: 'http://127.0.0.1:8787/api/health',
      reuseExistingServer: true,
      timeout: 20_000,
    },
    {
      command: 'npm run dev:web -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
