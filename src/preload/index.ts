import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { RendererApi } from '../shared/api'
import type {
  AppConfig,
  AppLanguage,
  AppUpdateProgress,
  AppUpdateStatus,
  BatchDownloadInfo,
  Dependency,
  DownloadProgress,
  DownloadRequestItem,
  ModMetadata,
  ModVersionInfo,
  SelectFileOptions,
  UpdateActionResult,
  UpdateCheckResult
} from '../shared/types'

function getConfig(): Promise<AppConfig>
function getConfig<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]>
function getConfig<K extends keyof AppConfig>(key?: K): Promise<AppConfig | AppConfig[K]> {
  return ipcRenderer.invoke('config:get', key)
}

const setConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void> =>
  ipcRenderer.invoke('config:set', { key, value })

function subscribe<T>(channel: string, callback: (data: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, data: T): void => callback(data)
  ipcRenderer.on(channel, handler)

  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: RendererApi = {
  getConfig,
  setConfig,
  resetConfig: () => ipcRenderer.invoke('config:reset'),
  getSystemLocale: () => ipcRenderer.invoke('app:getLocale'),
  getLanguage: () => ipcRenderer.invoke('app:getLanguage'),
  setLanguage: (lang: AppLanguage) => ipcRenderer.invoke('app:setLanguage', lang),
  detectGameVersion: () => ipcRenderer.invoke('version:detect'),
  checkModVersion: (modId: string): Promise<ModVersionInfo> =>
    ipcRenderer.invoke('mod:checkVersion', modId),
  downloadMod: (id: string, isCollection: boolean): Promise<ModMetadata> =>
    ipcRenderer.invoke('mod:download', { id, isCollection }),
  downloadBatch: (items: DownloadRequestItem[]): Promise<ModMetadata[]> =>
    ipcRenderer.invoke('mod:downloadBatch', { items }),
  checkDependencies: (id: string): Promise<Dependency[]> =>
    ipcRenderer.invoke('mod:checkDependencies', id),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: (options?: SelectFileOptions): Promise<string | null> =>
    ipcRenderer.invoke('dialog:selectFile', options),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) =>
    subscribe<DownloadProgress>('download:progress', callback),
  onDownloadComplete: (callback: (data: ModMetadata) => void) =>
    subscribe<ModMetadata>('download:complete', callback),
  onDownloadError: (callback: (data: { id: string; error: string }) => void) =>
    subscribe<{ id: string; error: string }>('download:error', callback),
  onBatchProgress: (callback: (progress: BatchDownloadInfo) => void) =>
    subscribe<BatchDownloadInfo>('batch:progress', callback),
  onConfigReset: (callback: () => void) => subscribe<void>('config:reset', callback),
  checkForUpdates: (): Promise<UpdateCheckResult> => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (): Promise<UpdateActionResult> => ipcRenderer.invoke('download-update'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('install-update'),
  getUpdateStatus: (): Promise<AppUpdateStatus> => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback: (status: AppUpdateStatus) => void) =>
    subscribe<AppUpdateStatus>('update-status', callback),
  onUpdateProgress: (callback: (progress: AppUpdateProgress) => void) =>
    subscribe<AppUpdateProgress>('update-progress', callback)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  const unsafeWindow = globalThis as typeof globalThis & {
    api: RendererApi
  }

  unsafeWindow.api = api
}
