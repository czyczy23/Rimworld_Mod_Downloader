import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('app-shell')).toBeVisible()
})

test.describe('App Shell', () => {
  test('renders the main application layout', async ({ page }) => {
    await expect(page.getByTestId('webview-container')).toBeVisible()
    await expect(page.getByTestId('download-queue')).toBeVisible()
  })

  test('shows a stable settings trigger in the toolbar', async ({ page }) => {
    await expect(page.getByTestId('toolbar-settings-button')).toBeVisible()
  })
})

test.describe('Workshop Webview', () => {
  test('renders the embedded Steam workshop surface', async ({ page }) => {
    await expect(page.getByTestId('steam-webview')).toBeAttached()
  })

  test('shows navigation controls above the embedded webview', async ({ page }) => {
    const toolbar = page.getByTestId('webview-toolbar')
    await expect(toolbar).toBeVisible()
    await expect(toolbar.locator('button')).toHaveCount(3)
  })
})

test.describe('Download Queue', () => {
  test('renders the queue shell even before downloads start', async ({ page }) => {
    await expect(page.getByTestId('download-queue')).toBeVisible()
  })
})

test.describe('Toolbar Interactions', () => {
  test('keeps the app shell responsive after clicking the settings trigger', async ({ page }) => {
    await page.getByTestId('toolbar-settings-button').click()
    await expect(page.getByTestId('app-shell')).toBeVisible()
  })
})
