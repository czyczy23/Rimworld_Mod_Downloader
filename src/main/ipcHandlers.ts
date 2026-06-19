import { ipcMain, BrowserWindow, app } from 'electron'
import { configManager } from './utils/ConfigManager'
import logger from './utils/logger'
import { steamCMD, DownloadProgress } from './services/SteamCMD'
import { modProcessor } from './services/ModProcessor'
import { workshopScraper } from './services/WorkshopScraper'
import type { AppConfig, ModMetadata, Dependency } from '../shared/types'
import type { ModVersionInfo } from './services/WorkshopScraper'
import { validateConfigValue } from '../shared/configSchema'

const MOD_ID_PATTERN = /^\d+$/
const CONFIG_KEYS: Array<keyof AppConfig> = ['firstRunCompleted', 'app', 'steamcmd', 'rimworld', 'download', 'version', 'git']

export function assertValidModId(modId: string): void {
  if (!MOD_ID_PATTERN.test(modId)) {
    throw new Error(`Invalid mod ID: ${modId}`)
  }
}

export function assertValidConfigKey(key: string): asserts key is keyof AppConfig {
  if (!CONFIG_KEYS.includes(key as keyof AppConfig)) {
    throw new Error(`Invalid config key: ${key}`)
  }
}

/**
 * IPC Handler Setup
 * Registers all IPC handlers for main-renderer communication
 */
export function setupIpcHandlers(): void {
  // ===== Config Handlers =====
  // P1 FIX: Added try-catch for consistent error handling
  ipcMain.handle('config:get', (_, key?: string) => {
    try {
      if (key === undefined) {
        return configManager.get()
      }

      assertValidConfigKey(key)
      return configManager.get(key)
    } catch (error) {
      logger.error('[IPC] Failed to get config:', error)
      throw new Error(`Failed to get config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('config:set', (_, { key, value }) => {
    try {
      assertValidConfigKey(key)
      // SECURITY: validate value structure before persisting
      // Prevents renderer (or a compromised webview) from writing arbitrary paths
      validateConfigValue(key, value)
      configManager.set(key, value)
    } catch (error) {
      logger.error('[IPC] Failed to set config:', error)
      throw new Error(`Failed to set config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  ipcMain.handle('config:reset', async (event) => {
    const sender = event.sender
    const mainWindow = BrowserWindow.fromWebContents(sender)

    await configManager.reset()

    // Notify renderer to refresh config
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('config:reset')
    }

    return true
  })

  // ===== Version Detection Handler =====
  // P1 FIX: Added try-catch for consistent error handling
  ipcMain.handle('version:detect', async () => {
    try {
      return await configManager.detectGameVersion()
    } catch (error) {
      logger.error('[IPC] Failed to detect game version:', error)
      throw new Error(`Failed to detect game version: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // ===== Mod Download Handler =====
  ipcMain.handle('mod:download', async (event, { id, isCollection }): Promise<ModMetadata> => {
    logger.info(`[IPC] Download requested for mod ${id}, collection: ${isCollection}`)

    const sender = event.sender
    const mainWindow = BrowserWindow.fromWebContents(sender)

    try {
      assertValidModId(id)
      return await runDownloadPipeline(id, isCollection || false, mainWindow)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[IPC] Download failed for mod ${id}:`, error)

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:error', { id, error: errorMessage })
      }

      throw new Error(`Download failed: ${errorMessage}`)
    }
  })

  // ===== Mod Version Check Handler =====
  // P1 FIX: Added try-catch for consistent error handling
  ipcMain.handle('mod:checkVersion', async (_, modId: string): Promise<ModVersionInfo> => {
    logger.info(`[IPC] Check version for mod ${modId}`)
    try {
      assertValidModId(modId)
      return await workshopScraper.scrapeModVersion(modId)
    } catch (error) {
      logger.error(`[IPC] Failed to check version for mod ${modId}:`, error)
      throw new Error(`Failed to check mod version: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // ===== Dependency Check Handler =====
  // P1 FIX: Added try-catch for consistent error handling
  ipcMain.handle('mod:checkDependencies', async (_, modId: string): Promise<Dependency[]> => {
    logger.info(`[IPC] Check dependencies for mod ${modId}`)
    try {
      assertValidModId(modId)
      const versionInfo = await workshopScraper.scrapeModVersion(modId)
      // Convert WorkshopScraper.Dependency to shared.Dependency
      return versionInfo.dependencies.map(dep => ({
        id: dep.modId,
        name: dep.name,
        isOptional: !dep.required,
        willDownload: true
      }))
    } catch (error) {
      logger.error(`[IPC] Failed to check dependencies for mod ${modId}:`, error)
      throw new Error(`Failed to check mod dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  // ===== Batch Download Handler =====
  ipcMain.handle('mod:downloadBatch', async (event, { items }): Promise<ModMetadata[]> => {
    logger.info(`[IPC] Batch download requested for ${items.length} items`)

    const sender = event.sender
    const mainWindow = BrowserWindow.fromWebContents(sender)
    const results: ModMetadata[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      assertValidModId(item.id)

      // Send batch progress update
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('batch:progress', {
          isBatch: true,
          current: i + 1,
          total: items.length,
          currentName: item.name || `Mod ${item.id}`,
          id: item.id
        })
      }

      try {
        const metadata = await runDownloadPipeline(item.id, item.isCollection || false, mainWindow)
        results.push(metadata)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`[IPC] Download failed for ${item.id}:`, error)

        const metadata: ModMetadata = {
          id: item.id,
          name: item.name || `Mod ${item.id}`,
          author: 'Unknown',
          description: `Download failed: ${errorMessage}`,
          supportedVersions: [],
          dependencies: [],
          isCollection: item.isCollection || false,
          localPath: '',
          downloadStatus: 'error',
          errorMessage
        }
        results.push(metadata)
      }
    }

    return results
  })

  // Shared download pipeline used by both single and batch download handlers.
  async function runDownloadPipeline(id: string, isCollection: boolean, mainWindow: BrowserWindow | null): Promise<ModMetadata> {
    assertValidModId(id)

    // Step 1: Download using SteamCMD
    const progressHandler = (progress: DownloadProgress) => {
      if (progress.modId !== id) {
        return
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:progress', {
          id,
          status: progress.stage,
          progress: progress.percent,
          message: progress.message,
          current: progress.current,
          total: progress.total
        })
      }
    }

    steamCMD.on('progress', progressHandler)

    let downloadResult
    try {
      downloadResult = await steamCMD.downloadMod(id)
    } finally {
      steamCMD.off('progress', progressHandler)
    }

    if (!downloadResult.success) {
      throw new Error(downloadResult.error || 'Download failed')
    }

    // Step 2: Process the mod
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:progress', {
        id,
        status: 'moving',
        progress: 95,
        message: 'Moving files to Mods folder...'
      })
    }

    const processResult = await modProcessor.processMod(id)
    if (!processResult.success) {
      throw new Error(processResult.error || 'File processing failed')
    }

    // Validate the final mod
    const validation = await modProcessor.validateMod(id, processResult.targetPath)

    // Build metadata
    const metadata: ModMetadata = {
      id,
      name: validation.details?.modName || (isCollection ? `Collection ${id}` : `Mod ${id}`),
      author: 'Unknown',
      description: validation.valid ? 'Mod downloaded successfully' : (validation.error || 'Validation failed'),
      supportedVersions: validation.details?.supportedVersions || [],
      dependencies: [],
      isCollection: isCollection,
      collectionItems: isCollection ? [] : undefined,
      localPath: processResult.targetPath,
      downloadStatus: validation.valid ? 'completed' : 'error',
      errorMessage: validation.valid ? undefined : validation.error
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:complete', metadata)
    }

    return metadata
  }

  // ===== Version Resolver Handler ===== (Phase 3 - not yet implemented)
  ipcMain.handle('mod:resolveVersion', async (_, localPath: string): Promise<string[]> => {
    throw new Error(`Not implemented: mod:resolveVersion (requested for ${localPath})`)
  })

  // ===== Git Handlers ===== (Phase 4 - not yet implemented)
  ipcMain.handle('git:init', async (_, _params: { remoteUrl: string; token: string }) => {
    throw new Error('Not implemented: git:init')
  })

  ipcMain.handle('git:commit', async (_, _message: string) => {
    throw new Error('Not implemented: git:commit')
  })

  // ===== Dialog Handlers =====
  ipcMain.handle('dialog:selectFolder', async () => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:selectFile', async (_, options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string, extensions: string[] }[]
    properties?: ('openFile' | 'multiSelections')[]
  }) => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Select File',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
      properties: options?.properties || ['openFile']
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

  // ===== App Language Handlers =====
  ipcMain.handle('app:getLocale', () => {
    return app.getLocale()
  })

  ipcMain.handle('app:getLanguage', () => {
    try {
      return configManager.get('app').language
    } catch (error) {
      logger.error('[IPC] Failed to get language:', error)
      return 'zh-TW'
    }
  })

  ipcMain.handle('app:setLanguage', (_, lang: 'en' | 'zh-TW' | 'zh-CN' | 'system') => {
    try {
      configManager.set('app', { language: lang })
      logger.info(`[IPC] Language set to: ${lang}`)
      return true
    } catch (error) {
      logger.error('[IPC] Failed to set language:', error)
      return false
    }
  })

  logger.info('[IPC] All handlers registered successfully')
}
