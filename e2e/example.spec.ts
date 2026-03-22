import { test, expect } from '@playwright/test'

test.describe('App', () => {
  test('should load the main page', async ({ page }) => {
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('.app')
  })

  test('should have toolbar', async ({ page }) => {
    await page.goto('/')
    // Check for settings button
    const settingsButton = page.locator('button:has-text("Settings")')
    await expect(settingsButton).toBeVisible()
  })
})
