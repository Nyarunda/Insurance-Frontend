/**
 * Real-browser tests against the real backend (FI1-Q4). They need a running disposable
 * environment, described by environment variables:
 *
 *   FI1_FRONTEND_PORT   the backend-mode Vite dev server's port (`npm run dev:backend`)
 *   FI1_ACCOUNTS        JSON file: { email: { host, temporary_password } } from the operator setup
 *   FI1_FACTS           JSON file: tenants, domains, branch and user identifiers (no secrets)
 *
 * The tenants' domains are `*.localhost`: browsers resolve them to the loopback address and treat
 * them as secure contexts over plain HTTP, as tenant domains are behind TLS in production. That is
 * what makes the cross-tab refresh lock (Web Locks) available; see docs/fi1-a-foundation.md, FI1-A-F3.
 *
 * No trace or video is recorded: they would capture what is typed into password fields.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
});
