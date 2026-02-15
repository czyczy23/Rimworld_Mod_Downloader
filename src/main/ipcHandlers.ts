import { ipcMain, BrowserWindow } from 'electron'
import { configManager } from './utils/ConfigManager'
import { steamCMD, DownloadProgress } from './services/SteamCMD'
import { modProcessor } from './services/ModProcessor'
import { workshopScraper } from './services/WorkshopScraper'
import type { ModMetadata, Dependency } from '../shared/types'
import type { ModVersionInfo } from './services/WorkshopScraper'

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

  // ===== Version Detection Handler =====
  ipcMain.handle('version:detect', async () => {
    return await configManager.detectGameVersion()
  })

  // ===== Mod Download Handler =====
  ipcMain.handle('mod:download', async (event, { id, isCollection }): Promise<ModMetadata> => {
    console.log(`[IPC] Download requested for mod ${id}, collection: ${isCollection}`)

    const sender = event.sender
    const mainWindow = BrowserWindow.fromWebContents(sender)

    try {
      // Step 1: Download using SteamCMD
      console.log(`[IPC] Starting SteamCMD download for mod ${id}`)

      // Set up progress listener
      const progressHandler = (progress: DownloadProgress) => {
        console.log(`[SteamCMD] Progress: ${progress.percent}% - ${progress.message}`)

        // Send progress to renderer
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
        // Execute download
        downloadResult = await steamCMD.downloadMod(id)
      } finally {
        // Always remove progress listener, even if download throws
        steamCMD.off('progress', progressHandler)
      }

      // Check if was cancelled by user
      if (!downloadResult.success && downloadResult.error === 'CANCELLED') {
        console.log(`[IPC] Download cancelled for mod ${id}`)
        return {
          id,
          name: isCollection ? `Collection ${id}` : `Mod ${id}`,
          author: 'Unknown',
          description: 'Download cancelled by user',
          supportedVersions: [],
          dependencies: [],
          isCollection: isCollection || false,
          localPath: '',
          downloadStatus: 'cancelled' as any,
          errorMessage: 'CANCELLED'
        }
      }

      if (!downloadResult.success) {
        throw new Error(downloadResult.error || 'Download failed')
      }

      console.log(`[IPC] SteamCMD download completed: ${downloadResult.downloadPath}`)

      // Step 2: Process the mod (move to target location)
      console.log(`[IPC] Starting file processing for mod ${id}`)

      // Send processing status
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

      console.log(`[IPC] File processing completed: ${processResult.targetPath}`)

      // Validate the final mod
      const validation = await modProcessor.validateMod(id, processResult.targetPath)

      // Build the final metadata
      const metadata: ModMetadata = {
        id,
        name: validation.details?.modName || (isCollection ? `Collection ${id}` : `Mod ${id}`),
        author: 'Unknown', // Could be extracted from About.xml
        description: validation.valid ? 'Mod downloaded successfully' : (validation.error || 'Validation failed'),
        supportedVersions: validation.details?.supportedVersions || [],
        dependencies: [], // TODO: Extract from About.xml
        isCollection: isCollection || false,
        collectionItems: isCollection ? [] : undefined,
        localPath: processResult.targetPath,
        downloadStatus: validation.valid ? 'completed' : 'error',
        errorMessage: validation.valid ? undefined : validation.error
      }

      // Send completion notification
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:complete', metadata)
      }

      console.log(`[IPC] Download workflow completed for mod ${id}`)
      return metadata

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[IPC] Download failed for mod ${id}:`, error)

      // Send error notification
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:error', {
          id,
          error: errorMessage
        })
      }

      // Return error metadata
      return {
        id,
        name: isCollection ? `Collection ${id}` : `Mod ${id}`,
        author: 'Unknown',
        description: `Download failed: ${errorMessage}`,
        supportedVersions: [],
        dependencies: [],
        isCollection: isCollection || false,
        localPath: '',
        downloadStatus: 'error',
        errorMessage
      }
    }
  })

  // ===== Cancel Download Handler =====
  ipcMain.handle('mod:cancelDownload', async () => {
    console.log('[IPC] Cancel download requested')
    const success = steamCMD.cancelDownload()
    return { success }
  })

  // ===== Mod Version Check Handler =====
  ipcMain.handle('mod:checkVersion', async (_, modId: string): Promise<ModVersionInfo> => {
    console.log(`[IPC] Check version for mod ${modId}`)
    return await workshopScraper.scrapeModVersion(modId)
  })

  // ===== Dependency Check Handler =====
  ipcMain.handle('mod:checkDependencies', async (_, modId: string): Promise<Dependency[]> => {
    console.log(`[IPC] Check dependencies for mod ${modId}`)
    const versionInfo = await workshopScraper.scrapeModVersion(modId)
    return versionInfo.dependencies
  })

  // ===== Batch Download Handler =====
  ipcMain.handle('mod:downloadBatch', async (event, { items }): Promise<ModMetadata[]> => {
    console.log(`[IPC] Batch download requested for ${items.length} items`)

    const sender = event.sender
    const mainWindow = BrowserWindow.fromWebContents(sender)
    const results: ModMetadata[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

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
        // Reuse single download logic
        const metadata = await downloadSingleMod(item.id, item.isCollection || false, mainWindow)
        results.push(metadata)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[IPC] Download failed for ${item.id}:`, error)

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

  // Helper function to download single mod
  async function downloadSingleMod(id: string, isCollection: boolean, mainWindow: BrowserWindow | null): Promise<ModMetadata> {
    console.log(`[IPC] Starting download for mod ${id}, collection: ${isCollection}`)

    // Step 1: Download using SteamCMD
    const progressHandler = (progress: DownloadProgress) => {
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

  // ===== Version Resolver Handler ===== (Phase 3 - 尚未实现)
  ipcMain.handle('mod:resolveVersion', async (_, localPath: string): Promise<string[]> => {
    console.log(`[IPC] Resolve version for path ${localPath}`)
    // Phase 3: Implement About.xml parsing
    return []
  })

  // ===== Git Handlers ===== (Phase 4 - 尚未实现)
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
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:selectFile', async (_, options?: {
    title?: string,
    defaultPath?: string,
    filters?: { name: string, extensions: string[] }[],
    properties?: ('openFile' | 'multiSelections')[]
  }) => {
    const { dialog } = await import('electron')
    const result = await dialog.showOpenDialog({
      title: options?.title || '选择文件',
      defaultPath: options?.defaultPath,
      filters: options?.filters,
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

  console.log('[IPC] All handlers registered successfully')
}
