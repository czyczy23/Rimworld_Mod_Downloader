import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { log } from 'electron-updater'

export interface UpdateInfo {
  version: string
  releaseNotes: string
  releaseUrl: string
}

export interface UpdateStatus {
  checking: boolean
  available: boolean
  notAvailable: boolean
  downloading: boolean
  downloaded: boolean
  error: string | null
  updateInfo: UpdateInfo | null
}

class AutoUpdaterManager {
  private mainWindow: BrowserWindow | null = null
  private status: UpdateStatus = {
    checking: false,
    available: false,
    notAvailable: false,
    downloading: false,
    downloaded: false,
    error: null,
    updateInfo: null
  }

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow

    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Set up logging
    autoUpdater.logger = log
    log.transports.file.level = 'info'

    // Set up event handlers
    this.setupEventHandlers()

    // Set up IPC handlers
    this.setupIpcHandlers()
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      this.updateStatus({ checking: true, error: null })
      this.sendToRenderer('update-status', this.status)
    })

    autoUpdater.on('update-available', (info) => {
      this.updateStatus({
        checking: false,
        available: true,
        notAvailable: false,
        updateInfo: {
          version: info.version,
          releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes?.map(r => r.note).join('\n') || '',
          releaseUrl: info.releaseUrl || ''
        }
      })
      this.sendToRenderer('update-status', this.status)
    })

    autoUpdater.on('update-not-available', () => {
      this.updateStatus({
        checking: false,
        available: false,
        notAvailable: true
      })
      this.sendToRenderer('update-status', this.status)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.updateStatus({ downloading: true })
      this.sendToRenderer('update-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.updateStatus({
        downloading: false,
        downloaded: true,
        updateInfo: {
          version: info.version,
          releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : info.releaseNotes?.map(r => r.note).join('\n') || '',
          releaseUrl: info.releaseUrl || ''
        }
      })
      this.sendToRenderer('update-status', this.status)
    })

    autoUpdater.on('error', (error) => {
      this.updateStatus({
        checking: false,
        downloading: false,
        error: error.message || 'Unknown error'
      })
      this.sendToRenderer('update-status', this.status)
    })
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateInfo: this.status.updateInfo }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('download-update', async () => {
      try {
        await autoUpdater.downloadUpdate()
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('install-update', () => {
      autoUpdater.quitAndInstall()
    })

    ipcMain.handle('get-update-status', () => {
      return this.status
    })
  }

  private updateStatus(partial: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...partial }
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch((error) => {
      log.error('Failed to check for updates:', error)
    })
  }
}

export const autoUpdaterManager = new AutoUpdaterManager()
