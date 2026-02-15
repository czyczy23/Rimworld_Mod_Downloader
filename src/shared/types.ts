/**
 * Core type definitions for RimWorld Mod Downloader
 */

export interface ModMetadata {
  id: string;
  name: string;
  author: string;
  description?: string;
  supportedVersions: string[];
  dependencies: Dependency[];
  isCollection: boolean;
  collectionItems?: string[];
  localPath?: string;
  downloadStatus: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error';
  errorMessage?: string;
}

export interface Dependency {
  id: string;
  name: string;
  isOptional: boolean;
  willDownload: boolean;
}

export interface ModsPath {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
}

export interface AppConfig {
  steamcmd: {
    executablePath: string;
    downloadPath: string;
  };
  rimworld: {
    currentVersion: string;
    modsPaths: ModsPath[];
    autoCheckUpdates: boolean;
  };
  download: {
    autoDownloadDependencies: boolean;
    skipVersionCheck: boolean;
    extractCollectionToSubfolder: boolean;
    dependencyMode: 'ask' | 'auto' | 'ignore';
    maxConcurrentDownloads: number;
  };
  version: {
    autoDetect: boolean;
    manualVersion: string;
    onMismatch: 'ask' | 'force' | 'skip';
  };
  git: {
    enabled: boolean;
    autoCommit: boolean;
    githubToken?: string;
    remoteUrl?: string;
    lastCommit?: string;
  };
}

export interface DownloadProgress {
  id: string;
  status: string;
  progress: number;
  message?: string;
}

export interface GitStatus {
  ahead: number;
  dirty: boolean;
  lastCommit: string;
}

export interface VersionMismatchInfo {
  modId: string;
  modVersions: string[];
  gameVersion: string;
}

// IPC Channel Types
export type IpcChannel =
  | 'download:progress'
  | 'download:complete'
  | 'download:error'
  | 'git:status'
  | 'version:mismatch'
  | 'mod:download'
  | 'mod:downloadBatch'
  | 'mod:checkDependencies'
  | 'mod:resolveVersion'
  | 'batch:progress'
  | 'config:get'
  | 'config:set'
  | 'git:init'
  | 'git:commit'
  | 'dialog:selectFolder';
