import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke test config.
 *
 * The backend must already be running (see README). Playwright starts the Vite
 * dev server itself and reuses an existing one if the port is already taken, so
 * `npm run test:e2e` works whether or not you already have `npm run dev` open.
 */
const PORT = process.env.E2E_PORT || 5173
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    // Use the full Chromium build rather than the separate headless-shell
    // download, so `npx playwright install chromium` is all that is needed.
    channel: 'chromium',
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { VITE_API_TARGET: API_TARGET },
  },
})
