import type { ElectronAPI } from '@electron-toolkit/preload'
import type { RendererApi } from '../../shared/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererApi
  }
}

export {}
