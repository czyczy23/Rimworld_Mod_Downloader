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
} from './types'

export interface RendererApi {
  getConfig(): Promise<AppConfig>
  getConfig<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]>
  setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]): Promise<void>
  resetConfig(): Promise<boolean>
  getSystemLocale(): Promise<string>
  getLanguage(): Promise<AppLanguage>
  setLanguage(lang: AppLanguage): Promise<boolean>
  detectGameVersion(): Promise<string>
  checkModVersion(modId: string): Promise<ModVersionInfo>
  downloadMod(id: string, isCollection: boolean): Promise<ModMetadata>
  downloadBatch(items: DownloadRequestItem[]): Promise<ModMetadata[]>
  checkDependencies(id: string): Promise<Dependency[]>
  selectFolder(): Promise<string | null>
  selectFile(options?: SelectFileOptions): Promise<string | null>
  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void
  onDownloadComplete(callback: (data: ModMetadata) => void): () => void
  onDownloadError(callback: (data: { id: string; error: string }) => void): () => void
  onBatchProgress(callback: (progress: BatchDownloadInfo) => void): () => void
  onConfigReset(callback: () => void): () => void
  checkForUpdates(): Promise<UpdateCheckResult>
  downloadUpdate(): Promise<UpdateActionResult>
  installUpdate(): Promise<void>
  getUpdateStatus(): Promise<AppUpdateStatus>
  onUpdateStatus(callback: (status: AppUpdateStatus) => void): () => void
  onUpdateProgress(callback: (progress: AppUpdateProgress) => void): () => void
}
