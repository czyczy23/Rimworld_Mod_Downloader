import { _electron as electron, expect, test } from '@playwright/test'
import { join } from 'path'

test.describe('Electron runtime smoke', () => {
  test('starts the packaged renderer with preload API and sandboxed main window', async () => {
    const electronApp = await electron.launch({
      args: [join(process.cwd(), 'out/main/index.js')]
    })

    try {
      const window = await electronApp.firstWindow()
      await expect(window.getByTestId('app-shell')).toBeVisible()
      await expect(window.getByTestId('webview-container')).toBeVisible()
      await expect(window.getByTestId('download-queue')).toBeVisible()

      await expect
        .poll(() =>
          window.evaluate(() => ({
            hasApi: typeof window.api === 'object',
            hasGetConfig: typeof window.api?.getConfig === 'function',
            hasDownloadBatch: typeof window.api?.downloadBatch === 'function',
            hasNodeRequire: typeof (window as typeof window & { require?: unknown }).require
          }))
        )
        .toEqual({
          hasApi: true,
          hasGetConfig: true,
          hasDownloadBatch: true,
          hasNodeRequire: 'undefined'
        })

      const mainWindowPreferences = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const [mainWindow] = BrowserWindow.getAllWindows()
        const preferences = mainWindow.webContents.getLastWebPreferences()
        return {
          sandbox: preferences.sandbox,
          contextIsolation: preferences.contextIsolation,
          nodeIntegration: preferences.nodeIntegration,
          webviewTag: preferences.webviewTag
        }
      })

      expect(mainWindowPreferences).toEqual({
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: true
      })
    } finally {
      await electronApp.close()
    }
  })
})
