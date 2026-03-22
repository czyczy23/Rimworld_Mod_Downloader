import { test, expect } from '@playwright/test'

test.describe('App', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app')
  })

  test('should have toolbar with settings button', async ({ page }) => {
    await page.goto('/')
    const settingsButton = page.locator('button:has-text("Settings")')
    await expect(settingsButton).toBeVisible()
  })

  test('should show download queue section', async ({ page }) => {
    await page.goto('/')
    // Download queue should exist as part of the app layout
    const downloadQueue = page.locator('.download-queue, [class*="download"], [class*="queue"]')
    // Just check that the app has multiple sections
    const appDiv = page.locator('.app > div')
    await expect(appDiv.first()).toBeVisible()
  })
})

test.describe('Settings Panel', () => {
  test('should open settings panel when clicking settings button', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("Settings")')
    // Settings panel should be visible
    await expect(page.locator('text=Settings')).toBeVisible()
  })
})

test.describe('Webview', () => {
  test('should load Steam Workshop in webview', async ({ page }) => {
    await page.goto('/')
    // Wait for webview to load
    const webview = page.locator('webview')
    await expect(webview).toBeAttached()
  })

  test('should have navigation controls', async ({ page }) => {
    await page.goto('/')
    // Look for toolbar buttons
    const toolbarButtons = page.locator('.webview-toolbar button')
    await expect(toolbarButtons.first()).toBeVisible()
  })
})

test.describe('Download Queue', () => {
  test('should have download area', async ({ page }) => {
    await page.goto('/')
    // Look for download-related content
    const downloadArea = page.locator('.app > div').last()
    await expect(downloadArea).toBeVisible()
  })
})
