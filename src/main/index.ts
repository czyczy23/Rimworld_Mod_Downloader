import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { configManager } from './utils/ConfigManager'
import type { ModMetadata, Dependency } from '../shared/types'

class AppManager {
  private mainWindow: BrowserWindow | null = null

  async initialize(): Promise<void> {
    await app.whenReady()

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron')

    // Default open or close DevTools by F12 in development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Create main window
    this.createMainWindow()

    // Setup IPC handlers
    this.setupIpcHandlers()

    // App activation
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow()
      }
    })

    // Window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      show: false,
      autoHideMenuBar: true,
      title: 'RimWorld Mod Downloader',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        webviewTag: true,
        contextIsolation: true,
        nodeIntegration: false,
        allowRunningInsecureContent: false
      }
    })

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // Load the renderer
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  private setupIpcHandlers(): void {
    // Config handlers
    ipcMain.handle('config:get', (_, key?: string) => {
      return configManager.get(key as any)
    })

    ipcMain.handle('config:set', (_, { key, value }) => {
      configManager.set(key, value)
    })

    // Mod download handler (placeholder - full implementation in Phase 2)
    ipcMain.handle('mod:download', async (_, { id, isCollection }): Promise<ModMetadata> => {
      console.log(`[IPC] Download requested for mod ${id}, collection: ${isCollection}`)
      throw new Error('Download not yet implemented - Phase 2')
    })

    // Dependency check handler (placeholder)
    ipcMain.handle('mod:checkDependencies', async (_, modId: string): Promise<Dependency[]> => {
      console.log(`[IPC] Check dependencies for mod ${modId}`)
      return []
    })

    // Version resolver handler (placeholder)
    ipcMain.handle('mod:resolveVersion', async (_, localPath: string): Promise<string[]> => {
      console.log(`[IPC] Resolve version for path ${localPath}`)
      return []
    })

    // Git handlers (placeholder)
    ipcMain.handle('git:init', async (_, { remoteUrl, token }) => {
      console.log(`[IPC] Git init with remote: ${remoteUrl}`)
    })

    ipcMain.handle('git:commit', async (_, message: string) => {
      console.log(`[IPC] Git commit: ${message}`)
      return 'placeholder-commit-hash'
    })

    // Dialog handlers
    ipcMain.handle('dialog:selectFolder', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      return result.canceled ? null : result.filePaths[0]
    })
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }
}

// Initialize and start the application
const appManager = new AppManager()
appManager.initialize().catch(console.error)

export { appManager }
