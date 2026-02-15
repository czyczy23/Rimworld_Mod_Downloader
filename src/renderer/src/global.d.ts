import type { ModMetadata, Dependency } from '../../shared/types'
import type { DownloadProgressCallback, BatchProgressCallback } from '../../preload/index'

declare global {
  interface Window {
    api: {
      // Config operations
      getConfig: (key?: string) => Promise<any>
      setConfig: (key: string, value: any) => Promise<void>

      // Version detection
      detectGameVersion: () => Promise<string>

      // Mod version check
      checkModVersion: (modId: string) => Promise<{
        supportedVersions: string[]
        modName: string
        dependencies: any[]
      }>

      // Mod download
      downloadMod: (id: string, isCollection: boolean) => Promise<ModMetadata>

      // Batch download
      downloadBatch: (items: { id: string; name: string; isCollection: boolean }[]) => Promise<ModMetadata[]>

      // Dependency check
      checkDependencies: (id: string) => Promise<Dependency[]>

      // Dialog
      selectFolder: () => Promise<string | null>
      selectFile: (options?: {
        title?: string
        defaultPath?: string
        filters?: { name: string, extensions: string[] }[]
        properties?: ('openFile' | 'multiSelections')[]
      }) => Promise<string | null>

      // Cancel download
      cancelDownload: () => Promise<{ success: boolean }>

      // Download progress listener
      onDownloadProgress: (callback: DownloadProgressCallback) => () => void

      // Download complete listener
      onDownloadComplete: (callback: (data: ModMetadata) => void) => () => void

      // Download error listener
      onDownloadError: (callback: (data: { id: string; error: string }) => void) => () => void

      // Batch progress listener
      onBatchProgress: (callback: BatchProgressCallback) => () => void
    }
  }
}

export {}
