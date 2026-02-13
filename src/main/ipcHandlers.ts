import { ipcMain, BrowserWindow } from 'electron'
import { configManager } from './utils/ConfigManager'
import type { ModMetadata, Dependency } from '../shared/types'

/**
 * IPC Handler Setup
 * Registers all IPC handlers for main-renderer communication
 */
export function setupIpcHandlers(): void {
  // ===== Config Handlers =====
  ipcMain.handle('config:get', (_, key?: string) => {
    return configManager.get(key as any)
  })

  ipcMain.handle('config:set', (_, { key, value }) => {
    configManager.set(key, value)
  })

  // ===== Mod Download Handler =====
  ipcMain.handle('mod:download', async (_, { id, isCollection }): Promise<ModMetadata> => {
    console.log(`[IPC] Download requested for mod ${id}, collection: ${isCollection}`)
    console.log(`[IPC] 收到下载请求: ${id}`)

    // Phase 2: Return mock response to test the flow
    // In Phase 3, this will call SteamCMD to actually download

    // Simulate a delay to test the UI flow
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Return mock metadata (for testing)
    const mockMetadata: ModMetadata = {
      id,
      name: isCollection ? `Test Collection ${id}` : `Test Mod ${id}`,
      author: 'Test Author',
      description: 'Test description',
      supportedVersions: ['1.5'],
      dependencies: [],
      isCollection: isCollection || false,
      collectionItems: isCollection ? [] : undefined,
      localPath: '',
      downloadStatus: 'completed'
    }

    console.log(`[IPC] Mock download completed for ${id}`)
    return mockMetadata
  })

  // ===== Dependency Check Handler =====
  ipcMain.handle('mod:checkDependencies', async (_, modId: string): Promise<Dependency[]> => {
    console.log(`[IPC] Check dependencies for mod ${modId}`)
    // Phase 3: Implement Steam Workshop scraping
    return []
  })

  // ===== Version Resolver Handler =====
  ipcMain.handle('mod:resolveVersion', async (_, localPath: string): Promise<string[]> => {
    console.log(`[IPC] Resolve version for path ${localPath}`)
    // Phase 3: Implement About.xml parsing
    return []
  })

  // ===== Git Handlers =====
  ipcMain.handle('git:init', async (_, { remoteUrl, token }) => {
    console.log(`[IPC] Git init with remote: ${remoteUrl}`)
    // Phase 4: Implement Git integration
  })

  ipcMain.handle('git:commit', async (_, message: string) => {
    console.log(`[IPC] Git commit: ${message}`)
    // Phase 4: Implement Git integration
    return 'placeholder-commit-hash'
  })

  // ===== Dialog Handlers =====
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ===== Dialog Handlers =====
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ===== Window Control Handlers =====
  ipcMain.handle('window:minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.handle('window:close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  console.log('[IPC] All handlers registered successfully')
}
