import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ModMetadata } from '../shared/types'

// Type for download progress callback
export type DownloadProgressCallback = (progress: {
  id: string
  status: string
  progress: number
  message?: string
  current?: number
  total?: number
}) => void

// Custom APIs for renderer
const api = {
  // Config operations
  getConfig: (key?: string) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('config:set', { key, value }),

  // Mod download
  downloadMod: (id: string, isCollection: boolean): Promise<ModMetadata> =>
    ipcRenderer.invoke('mod:download', { id, isCollection }),

  // Dialog
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // Download progress listener
  onDownloadProgress: (callback: DownloadProgressCallback) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('download:progress', handler)
    return () => {
      ipcRenderer.removeListener('download:progress', handler)
    }
  },

  // Download complete listener
  onDownloadComplete: (callback: (data: ModMetadata) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('download:complete', handler)
    return () => {
      ipcRenderer.removeListener('download:complete', handler)
    }
  },

  // Download error listener
  onDownloadError: (callback: (data: { id: string; error: string }) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('download:error', handler)
    return () => {
      ipcRenderer.removeListener('download:error', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
