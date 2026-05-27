import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Each spec file runs its own tests serially (most tests reuse the same page
  // and we want predictable ordering for tab clicks etc.).
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Live tests need outbound HTTPS — fine on a normal laptop, may need
    // --ignore-certificate-errors behind a corporate proxy.
    ignoreHTTPSErrors: true,
  },
  // Auto-start the Vite dev server before tests, reuse if already running.
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
  ],
});
