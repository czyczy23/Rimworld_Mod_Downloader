import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  testMatch: /electron\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  outputDir: 'test-results/electron',
  reporter: isCI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report-electron' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-electron' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
