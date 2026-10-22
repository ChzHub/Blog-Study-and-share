import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4321', trace: 'retain-on-failure', channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: { command: 'npm run preview -- --port 4321', url: 'http://127.0.0.1:4321', reuseExistingServer: !process.env.CI },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
