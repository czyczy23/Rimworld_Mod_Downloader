import { create } from 'zustand'
import type { BatchDownloadInfo, DownloadItem, PendingDownloadItem } from '../../../shared/types'

type StateUpdate<T> = T | ((current: T) => T)

interface DownloadState {
  downloads: DownloadItem[]
  batchInfo: BatchDownloadInfo | undefined
  pendingQueue: PendingDownloadItem[]
  selectedForDelete: string[]
  setDownloads: (update: StateUpdate<DownloadItem[]>) => void
  setBatchInfo: (update: StateUpdate<BatchDownloadInfo | undefined>) => void
  setPendingQueue: (update: StateUpdate<PendingDownloadItem[]>) => void
  setSelectedForDelete: (update: StateUpdate<string[]>) => void
}

function resolveUpdate<T>(current: T, update: StateUpdate<T>): T {
  return typeof update === 'function' ? (update as (current: T) => T)(current) : update
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  batchInfo: undefined,
  pendingQueue: [],
  selectedForDelete: [],

  setDownloads: (update) =>
    set((state) => ({
      downloads: resolveUpdate(state.downloads, update)
    })),

  setBatchInfo: (update) =>
    set((state) => ({
      batchInfo: resolveUpdate(state.batchInfo, update)
    })),

  setPendingQueue: (update) =>
    set((state) => ({
      pendingQueue: resolveUpdate(state.pendingQueue, update)
    })),

  setSelectedForDelete: (update) =>
    set((state) => ({
      selectedForDelete: resolveUpdate(state.selectedForDelete, update)
    }))
}))
