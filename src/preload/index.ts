import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ModMetadata, Dependency, DownloadProgress, GitStatus, VersionMismatchInfo } from '../shared/types'

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
