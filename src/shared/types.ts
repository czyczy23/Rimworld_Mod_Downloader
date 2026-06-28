/**
 * Core type definitions for RimWorld Mod Downloader
 */

export type AppLanguage = 'en' | 'zh-TW' | 'zh-CN' | 'system'
export type DownloadStatus =
  'pending' | 'connecting' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error'

export interface ModMetadata {
  id: string
  name: string
  author: string
  description?: string
  supportedVersions: string[]
  dependencies: Dependency[]
  isCollection: boolean
  collectionItems?: string[]
  localPath?: string
  downloadStatus: DownloadStatus
  errorMessage?: string
}

export interface Dependency {
  id: string
  name: string
  isOptional: boolean
  willDownload: boolean
}

export interface ModsPath {
  id: string
  name: string
  path: string
  isActive: boolean
}

export interface AppConfig {
  firstRunCompleted: boolean
  app: {
    language: AppLanguage
  }
  steamcmd: {
    executablePath: string
    downloadPath: string
  }
  rimworld: {
    currentVersion: string
    modsPaths: ModsPath[]
    autoCheckUpdates: boolean
  }
  download: {
    autoDownloadDependencies: boolean
    skipVersionCheck: boolean
    extractCollectionToSubfolder: boolean
    dependencyMode: 'ask' | 'auto' | 'ignore'
  }
  version: {
    autoDetect: boolean
    manualVersion: string
    onMismatch: 'ask' | 'force' | 'skip'
  }
  git: {
    enabled: boolean
    autoCommit: boolean
    githubToken?: string
    hasToken?: boolean
    tokenPreview?: string
    remoteUrl?: string
    lastCommit?: string
  }
}

export interface DownloadProgress {
  id: string
  status: DownloadStatus
  progress: number
  message?: string
  current?: number
  total?: number
}

export interface DownloadItem {
  id: string
  name: string
  progress: number
  status: DownloadStatus
  error?: string
  message?: string
}

export interface BatchDownloadInfo {
  isBatch: boolean
  current: number
  total: number
  currentName: string
  id: string
}

export interface PendingDownloadItem {
  id: string
  name: string
  isCollection: boolean
  modName?: string
}

export interface DownloadRequestItem {
  id: string
  name: string
  isCollection: boolean
}

export interface ModVersionInfo {
  supportedVersions: string[]
  modName: string
  dependencies: Dependency[]
}

export interface FileDialogFilter {
  name: string
  extensions: string[]
}

export interface SelectFileOptions {
  title?: string
  defaultPath?: string
  filters?: FileDialogFilter[]
  properties?: ('openFile' | 'multiSelections')[]
}

export interface AppUpdateInfo {
  version: string
  releaseNotes: string
}

export interface AppUpdateStatus {
  checking: boolean
  available: boolean
  notAvailable: boolean
  downloading: boolean
  downloaded: boolean
  error: string | null
  updateInfo: AppUpdateInfo | null
}

export interface AppUpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdateCheckResult {
  success: boolean
  updateInfo?: AppUpdateInfo
  error?: string
}

export interface UpdateActionResult {
  success: boolean
  error?: string
}
