import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './App.css'
import {
  WebviewContainer,
  type WebviewContainerRef,
  type CurrentPageInfo
} from './components/WebviewContainer'
import { Toolbar } from './components/Toolbar'
import { DownloadQueue } from './components/DownloadQueue'
import { SettingsPanel } from './components/SettingsPanel'
import { DependencyDialog } from './components/DependencyDialog'
import { VersionMismatchDialog } from './components/VersionMismatchDialog'
import { PendingQueueDialog } from './components/PendingQueueDialog'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'
import { UpdateDialog } from './components/UpdateDialog'
import { WelcomeWizard } from './components/WelcomeWizard'
import { useConfigStore } from './stores/configStore'
import { useDownloadStore } from './stores/downloadStore'
import { evaluateVersionGate, type DownloadIntent } from './utils/downloadFlow'
import type {
  AppConfig,
  AppUpdateProgress,
  AppUpdateStatus,
  BatchDownloadInfo,
  Dependency,
  DownloadProgress,
  ModMetadata,
  PendingDownloadItem
} from '../../shared/types'

interface PendingDependencyState {
  intent: DownloadIntent
  id: string
  name: string
  isCollection: boolean
  dependencies: Dependency[]
}

interface PendingVersionCheckState {
  intent: DownloadIntent
  id: string
  name: string
  isCollection: boolean
  modVersions: string[]
}

function App() {
  const { t } = useTranslation()
  const downloads = useDownloadStore((state) => state.downloads)
  const setDownloads = useDownloadStore((state) => state.setDownloads)
  const batchInfo = useDownloadStore((state) => state.batchInfo)
  const setBatchInfo = useDownloadStore((state) => state.setBatchInfo)
  const pendingQueue = useDownloadStore((state) => state.pendingQueue)
  const setPendingQueue = useDownloadStore((state) => state.setPendingQueue)
  const selectedForDelete = useDownloadStore((state) => state.selectedForDelete)
  const setSelectedForDelete = useDownloadStore((state) => state.setSelectedForDelete)
  const config = useConfigStore((state) => state.config)
  const gameVersion = useConfigStore((state) => state.gameVersion)
  const setConfig = useConfigStore((state) => state.setConfig)
  const loadConfig = useConfigStore((state) => state.loadConfig)
  const saveConfigValue = useConfigStore((state) => state.saveConfigValue)
  const refreshGameVersionFromStore = useConfigStore((state) => state.refreshGameVersion)
  const [showSettings, setShowSettings] = useState(false)
  const [showDependencyDialog, setShowDependencyDialog] = useState(false)
  const [showVersionMismatchDialog, setShowVersionMismatchDialog] = useState(false)
  const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
  const [pendingDependencies, setPendingDependencies] = useState<PendingDependencyState | null>(
    null
  )
  const [pendingVersionCheck, setPendingVersionCheck] = useState<PendingVersionCheckState | null>(
    null
  )
  const webviewRef = useRef<WebviewContainerRef>(null)

  const [showPendingQueueDialog, setShowPendingQueueDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  const [updateStatus, setUpdateStatus] = useState({
    available: false,
    downloading: false,
    downloaded: false,
    version: '',
    releaseNotes: '',
    downloadProgress: 0
  })

  useEffect(() => {
    if (!window.api) return

    const unsubscribeStatus = window.api.onUpdateStatus((status: AppUpdateStatus) => {
      console.log('[App] Update status:', status)
      setUpdateStatus((prev) => ({
        ...prev,
        available: status.available,
        downloading: status.downloading,
        downloaded: status.downloaded,
        version: status.updateInfo?.version || '',
        releaseNotes: status.updateInfo?.releaseNotes || ''
      }))
    })

    const unsubscribeProgress = window.api.onUpdateProgress((progress: AppUpdateProgress) => {
      setUpdateStatus((prev) => ({
        ...prev,
        downloadProgress: progress.percent
      }))
    })

    return () => {
      unsubscribeStatus()
      unsubscribeProgress()
    }
  }, [])

  const handleDownloadUpdate = useCallback(() => {
    if (window.api) {
      void window.api.downloadUpdate()
    }
  }, [])

  const handleInstallUpdate = useCallback(() => {
    if (window.api) {
      void window.api.installUpdate()
    }
  }, [])

  useEffect(() => {
    if (!window.api) return

    loadConfig().then((cfg) => {
      if (!cfg) return
      console.log('Config loaded:', cfg)

      const hasNoSteamCmd = !cfg.steamcmd?.executablePath || !cfg.steamcmd?.downloadPath
      const hasNoModsPaths = !cfg.rimworld?.modsPaths || cfg.rimworld.modsPaths.length === 0
      const firstRunNotCompleted = cfg.firstRunCompleted !== true

      if ((hasNoSteamCmd && hasNoModsPaths) || firstRunNotCompleted) {
        console.log('[App] First run detected, showing welcome wizard')
        setShowWelcome(true)
      }
    })

    void refreshGameVersionFromStore()
  }, [loadConfig, refreshGameVersionFromStore])

  useEffect(() => {
    if (!window.api) return

    const unsubscribe = window.api.onConfigReset(() => {
      console.log('[App] Config reset received, reloading...')
      void loadConfig()
      void refreshGameVersionFromStore()
    })

    return unsubscribe
  }, [loadConfig, refreshGameVersionFromStore])

  useEffect(() => {
    if (!window.api) return

    const unsubscribeProgress = window.api.onDownloadProgress((data: DownloadProgress) => {
      console.log(`[App] Download progress for ${data.id}: ${data.progress}%`)

      setDownloads((prev) => {
        const existing = prev.find((download) => download.id === data.id)
        if (existing) {
          return prev.map((download) =>
            download.id === data.id
              ? {
                  ...download,
                  progress: data.progress,
                  status: data.status,
                  message: data.message
                }
              : download
          )
        }

        return [
          ...prev,
          {
            id: data.id,
            name: `Mod ${data.id}`,
            progress: data.progress,
            status: data.status,
            message: data.message
          }
        ]
      })
    })

    const unsubscribeComplete = window.api.onDownloadComplete((data: ModMetadata) => {
      console.log(`[App] Download completed for ${data.id}`)

      setDownloads((prev) =>
        prev.map((download) =>
          download.id === data.id
            ? {
                ...download,
                progress: 100,
                status: 'completed',
                message: 'Download completed'
              }
            : download
        )
      )
    })

    const unsubscribeError = window.api.onDownloadError((data) => {
      console.error(`[App] Download error for ${data.id}:`, data.error)

      setDownloads((prev) =>
        prev.map((download) =>
          download.id === data.id
            ? {
                ...download,
                status: 'error',
                error: data.error,
                message: data.error
              }
            : download
        )
      )
    })

    const unsubscribeBatchProgress = window.api.onBatchProgress((data: BatchDownloadInfo) => {
      console.log(`[App] Batch progress: ${data.current}/${data.total} - ${data.currentName}`)

      setBatchInfo({
        isBatch: data.isBatch,
        current: data.current,
        total: data.total,
        currentName: data.currentName,
        id: data.id
      })
    })

    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
      unsubscribeBatchProgress()
    }
  }, [setBatchInfo, setDownloads])

  const handlePageChanged = useCallback((info: CurrentPageInfo) => {
    console.log('[App] Page changed:', info)
    setCurrentPageInfo(info)
  }, [])

  const startSingleDownload = async (modId: string, isCollection: boolean, name?: string) => {
    setDownloads((prev) => {
      if (prev.find((download) => download.id === modId)) return prev
      return [
        ...prev,
        {
          id: modId,
          name: name || (isCollection ? `Collection ${modId}` : `Mod ${modId}`),
          progress: 0,
          status: 'downloading',
          message: 'Starting download...'
        }
      ]
    })

    try {
      if (window.api) {
        const result = await window.api.downloadMod(modId, isCollection)
        console.log('Download complete:', result)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const startBatchDownload = async (
    modId: string,
    isCollection: boolean,
    modName: string,
    dependencies: Dependency[]
  ) => {
    const allItems = [
      { id: modId, name: modName, isCollection },
      ...dependencies.map((dependency) => ({
        id: dependency.id,
        name: dependency.name || `Mod ${dependency.id}`,
        isCollection: false
      }))
    ]

    allItems.forEach((item) => {
      setDownloads((prev) => {
        if (prev.find((download) => download.id === item.id)) return prev
        return [
          ...prev,
          {
            id: item.id,
            name: item.name,
            progress: 0,
            status: 'pending',
            message: 'Pending...'
          }
        ]
      })
    })

    setBatchInfo({
      isBatch: true,
      current: 1,
      total: allItems.length,
      currentName: modName,
      id: modId
    })

    try {
      if (window.api) {
        const results = await window.api.downloadBatch(allItems)
        console.log('Batch download complete:', results)
        setBatchInfo(undefined)
      }
    } catch (error) {
      console.error('Batch download failed:', error)
      setBatchInfo(undefined)
    }
  }

  const addMainModToQueue = useCallback(
    (modId: string, isCollection: boolean, modName: string) => {
      setPendingQueue((prev) => {
        if (prev.some((item) => item.id === modId)) return prev
        return [...prev, { id: modId, name: modName, isCollection, modName }]
      })
    },
    [setPendingQueue]
  )

  const proceedWithDownload = useCallback(
    async (modId: string, isCollection: boolean, modName: string) => {
      if (!window.api) return

      const dependencyMode = config?.download?.dependencyMode || 'ask'
      const autoDownloadDependencies = config?.download?.autoDownloadDependencies || false

      try {
        const dependencies = await window.api.checkDependencies(modId)
        console.log(`Found ${dependencies.length} dependencies`)

        if (dependencies.length > 0) {
          if (dependencyMode === 'ignore') {
            await startSingleDownload(modId, isCollection, modName)
          } else if (dependencyMode === 'auto' || autoDownloadDependencies) {
            await startBatchDownload(modId, isCollection, modName, dependencies)
          } else {
            setPendingDependencies({
              intent: 'download',
              id: modId,
              name: modName,
              isCollection,
              dependencies
            })
            setShowDependencyDialog(true)
          }
        } else {
          await startSingleDownload(modId, isCollection, modName)
        }
      } catch (error) {
        console.error('Error checking dependencies:', error)
        await startSingleDownload(modId, isCollection, modName)
      }
    },
    [config]
  )

  const proceedWithAddToQueue = useCallback(
    async (modId: string, isCollection: boolean, modName: string) => {
      if (!window.api) return

      const dependencyMode = config?.download?.dependencyMode || 'ask'
      const autoDownloadDependencies = config?.download?.autoDownloadDependencies || false

      try {
        const currentQueue = useDownloadStore.getState().pendingQueue
        if (currentQueue.some((item) => item.id === modId)) {
          console.log('[App] Mod already in queue')
          return
        }

        const dependencies = await window.api.checkDependencies(modId)
        console.log(`[App] Found ${dependencies.length} dependencies for queue`)

        const itemsToAdd: PendingDownloadItem[] = [
          { id: modId, name: modName, isCollection, modName }
        ]

        if (dependencies.length > 0) {
          if (dependencyMode === 'auto' || autoDownloadDependencies) {
            for (const dependency of dependencies) {
              const alreadyQueued =
                currentQueue.some((item) => item.id === dependency.id) ||
                itemsToAdd.some((item) => item.id === dependency.id)
              if (!alreadyQueued) {
                itemsToAdd.push({
                  id: dependency.id,
                  name: dependency.name || `Mod ${dependency.id}`,
                  isCollection: false,
                  modName: dependency.name
                })
              }
            }
            console.log(`[App] Auto-added ${dependencies.length} dependencies to queue`)
          } else if (dependencyMode !== 'ignore') {
            setPendingDependencies({
              intent: 'queue',
              id: modId,
              name: modName,
              isCollection,
              dependencies
            })
            setPendingQueue((prev) => {
              if (prev.some((item) => item.id === modId)) return prev
              return [...prev, ...itemsToAdd]
            })
            setShowDependencyDialog(true)
            return
          }
        }

        setPendingQueue((prev) => {
          const nextQueue = [...prev]
          for (const item of itemsToAdd) {
            if (!nextQueue.some((queuedItem) => queuedItem.id === item.id)) {
              nextQueue.push(item)
            }
          }
          return nextQueue
        })
        console.log(`[App] Added ${itemsToAdd.length} items to queue`)
      } catch (error) {
        console.error('[App] Error adding to queue:', error)
        addMainModToQueue(modId, isCollection, modName)
      }
    },
    [addMainModToQueue, config, setPendingQueue]
  )

  const resolveAndDispatchDownload = useCallback(
    async (modId: string, isCollection: boolean, intent: DownloadIntent) => {
      if (!window.api) return

      console.log('[App] Download action requested:', { modId, isCollection, intent })

      try {
        const fallbackName = currentPageInfo?.modName || `Mod ${modId}`
        let modVersions: string[] = []
        let resolvedName: string | undefined

        if (!config?.download?.skipVersionCheck) {
          try {
            const versionInfo = await window.api.checkModVersion(modId)
            modVersions = versionInfo.supportedVersions || []
            resolvedName = versionInfo.modName
          } catch (error) {
            console.error('[App] Failed to check mod version, continuing anyway:', error)
          }
        }

        const decision = evaluateVersionGate({
          intent,
          modId,
          isCollection,
          fallbackName,
          gameVersion,
          supportedVersions: modVersions,
          resolvedName,
          config
        })

        if (decision.status === 'skip') {
          console.log(`[App] Skipping ${intent} due to version mismatch`)
          return
        }

        if (decision.status === 'ask') {
          setPendingVersionCheck(decision)
          setShowVersionMismatchDialog(true)
          return
        }

        if (intent === 'queue') {
          await proceedWithAddToQueue(modId, isCollection, decision.modName)
        } else {
          await proceedWithDownload(modId, isCollection, decision.modName)
        }
      } catch (error) {
        console.error(`[App] Error in ${intent} flow:`, error)
        const modName = currentPageInfo?.modName || `Mod ${modId}`
        if (intent === 'queue') {
          addMainModToQueue(modId, isCollection, modName)
        } else {
          await startSingleDownload(modId, isCollection, modName)
        }
      }
    },
    [
      addMainModToQueue,
      config,
      currentPageInfo?.modName,
      gameVersion,
      proceedWithAddToQueue,
      proceedWithDownload
    ]
  )

  const assertSteamCmdConfigured = useCallback(async (): Promise<boolean> => {
    if (!window.api) return false

    const cfg = await window.api.getConfig()
    if (cfg.steamcmd?.executablePath && cfg.steamcmd?.downloadPath) {
      return true
    }

    alert(t('alerts.pleaseConfigSteamcmd'))
    setShowSettings(true)
    return false
  }, [t])

  const handleDownloadClick = useCallback(
    async (modId: string, isCollection: boolean) => {
      if (!(await assertSteamCmdConfigured())) return

      if (useDownloadStore.getState().pendingQueue.length > 0) {
        setShowPendingQueueDialog(true)
        return
      }

      await resolveAndDispatchDownload(modId, isCollection, 'download')
    },
    [assertSteamCmdConfigured, resolveAndDispatchDownload]
  )

  const handleAddToQueue = useCallback(
    async (modId: string, isCollection: boolean) => {
      if (!(await assertSteamCmdConfigured())) return
      await resolveAndDispatchDownload(modId, isCollection, 'queue')
    },
    [assertSteamCmdConfigured, resolveAndDispatchDownload]
  )

  const handleToggleSelectForDelete = useCallback(
    (modId: string) => {
      setSelectedForDelete((prev) => {
        if (prev.includes(modId)) {
          return prev.filter((id) => id !== modId)
        }
        return [...prev, modId]
      })
    },
    [setSelectedForDelete]
  )

  const handleSelectAllForDelete = useCallback(() => {
    if (selectedForDelete.length === pendingQueue.length) {
      setSelectedForDelete([])
    } else {
      setSelectedForDelete(pendingQueue.map((item) => item.id))
    }
  }, [pendingQueue, selectedForDelete, setSelectedForDelete])

  const handleRequestDelete = useCallback(
    (modId?: string) => {
      if (modId) {
        setSelectedForDelete([modId])
      }
      setShowDeleteConfirm(true)
    },
    [setSelectedForDelete]
  )

  const handleConfirmDelete = useCallback(() => {
    setPendingQueue((prev) => prev.filter((item) => !selectedForDelete.includes(item.id)))
    setSelectedForDelete([])
    setShowDeleteConfirm(false)
  }, [selectedForDelete, setPendingQueue, setSelectedForDelete])

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
    setSelectedForDelete([])
  }, [setSelectedForDelete])

  const handleConfigSaved = useCallback(
    (newConfig: AppConfig) => {
      setConfig(newConfig)
    },
    [setConfig]
  )

  const handleClearCompleted = useCallback(() => {
    setDownloads((prev) => prev.filter((download) => download.status !== 'completed'))
  }, [setDownloads])

  const handleClearAll = useCallback(() => {
    setDownloads([])
  }, [setDownloads])

  const refreshGameVersion = useCallback(async (): Promise<string> => {
    return refreshGameVersionFromStore()
  }, [refreshGameVersionFromStore])

  const handleStartQueueDownload = useCallback(async () => {
    if (pendingQueue.length === 0) return

    if (!(await assertSteamCmdConfigured())) {
      setShowPendingQueueDialog(false)
      return
    }

    console.log('[App] Starting queue download:', pendingQueue)

    const queueToDownload = [...pendingQueue]
    setPendingQueue([])
    setShowPendingQueueDialog(false)

    try {
      if (window.api) {
        queueToDownload.forEach((item) => {
          setDownloads((prev) => {
            if (prev.find((download) => download.id === item.id)) return prev
            return [
              ...prev,
              {
                id: item.id,
                name: item.modName || item.name,
                progress: 0,
                status: 'pending',
                message: 'Pending...'
              }
            ]
          })
        })

        setBatchInfo({
          isBatch: true,
          current: 1,
          total: queueToDownload.length,
          currentName: queueToDownload[0].modName || queueToDownload[0].name,
          id: queueToDownload[0].id
        })

        const results = await window.api.downloadBatch(
          queueToDownload.map((item) => ({
            id: item.id,
            name: item.modName || item.name,
            isCollection: item.isCollection
          }))
        )
        console.log('[App] Queue download complete:', results)
        setBatchInfo(undefined)
      }
    } catch (error) {
      console.error('[App] Queue download failed:', error)
      setBatchInfo(undefined)
    }
  }, [assertSteamCmdConfigured, pendingQueue, setBatchInfo, setDownloads, setPendingQueue])

  const handleVersionMismatchConfirm = useCallback(
    async (rememberChoice: boolean, action: 'force' | 'skip') => {
      if (!pendingVersionCheck) return

      setShowVersionMismatchDialog(false)
      setPendingVersionCheck(null)

      const { id, name, isCollection, intent } = pendingVersionCheck

      if (rememberChoice && window.api) {
        try {
          const currentConfig = config ?? (await loadConfig())
          if (!currentConfig) return

          const newOnMismatch = action === 'force' ? 'force' : 'skip'
          await saveConfigValue('version', {
            ...currentConfig.version,
            onMismatch: newOnMismatch
          })
          console.log(`[App] Saved version mismatch behavior: ${newOnMismatch}`)
        } catch (error) {
          console.error('[App] Failed to save config:', error)
        }
      }

      if (action !== 'force') return

      if (intent === 'queue') {
        await proceedWithAddToQueue(id, isCollection, name)
      } else {
        await proceedWithDownload(id, isCollection, name)
      }
    },
    [
      config,
      loadConfig,
      pendingVersionCheck,
      proceedWithAddToQueue,
      proceedWithDownload,
      saveConfigValue
    ]
  )

  const handleDependencyConfirm = useCallback(
    (selectedIds: string[]) => {
      if (!pendingDependencies) return

      setShowDependencyDialog(false)

      const selectedDependencies = pendingDependencies.dependencies.filter((dependency) =>
        selectedIds.includes(dependency.id)
      )

      if (pendingDependencies.intent === 'queue') {
        const itemsToAdd: PendingDownloadItem[] = selectedDependencies.map((dependency) => ({
          id: dependency.id,
          name: dependency.name || `Mod ${dependency.id}`,
          isCollection: false,
          modName: dependency.name
        }))

        setPendingQueue((prev) => {
          const nextQueue = [...prev]
          itemsToAdd.forEach((item) => {
            if (!nextQueue.some((queuedItem) => queuedItem.id === item.id)) {
              nextQueue.push(item)
            }
          })
          return nextQueue
        })
      } else {
        void startBatchDownload(
          pendingDependencies.id,
          pendingDependencies.isCollection,
          pendingDependencies.name,
          selectedDependencies
        )
      }

      setPendingDependencies(null)
    },
    [pendingDependencies, setPendingQueue]
  )

  const handleDependencyCancel = useCallback(() => {
    setShowDependencyDialog(false)
    setPendingDependencies(null)
  }, [])

  return (
    <div
      className="app"
      data-testid="app-shell"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1b2838' }}
    >
      <WelcomeWizard
        isOpen={showWelcome}
        onComplete={() => {
          setShowWelcome(false)
          if (window.api) {
            void loadConfig()
            void refreshGameVersionFromStore()
          }
        }}
      />

      <Toolbar
        onSettingsClick={() => setShowSettings(!showSettings)}
        onDownloadClick={handleDownloadClick}
        onAddToQueue={handleAddToQueue}
        currentPageInfo={currentPageInfo}
        gameVersion={gameVersion}
        onRefreshGameVersion={refreshGameVersion}
        modsPaths={config?.rimworld.modsPaths}
        onConfigSaved={handleConfigSaved}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', height: '100%' }}>
          <WebviewContainer
            ref={webviewRef}
            onDownloadRequest={handleDownloadClick}
            onPageChanged={handlePageChanged}
          />
        </div>

        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          gameVersion={gameVersion}
          onRefreshGameVersion={refreshGameVersion}
          onConfigSaved={handleConfigSaved}
        />
      </div>

      {pendingVersionCheck && (
        <VersionMismatchDialog
          isOpen={showVersionMismatchDialog}
          modName={pendingVersionCheck.name}
          modVersions={pendingVersionCheck.modVersions}
          gameVersion={gameVersion}
          onConfirm={handleVersionMismatchConfirm}
          actionType={pendingVersionCheck.intent === 'queue' ? 'add' : 'download'}
        />
      )}

      {pendingDependencies && (
        <DependencyDialog
          isOpen={showDependencyDialog}
          modName={pendingDependencies.name}
          dependencies={pendingDependencies.dependencies}
          onConfirm={handleDependencyConfirm}
          onCancel={handleDependencyCancel}
        />
      )}

      <DownloadQueue
        downloads={downloads}
        batchInfo={batchInfo}
        pendingQueue={pendingQueue}
        selectedForDelete={selectedForDelete}
        onToggleSelectForDelete={handleToggleSelectForDelete}
        onSelectAllForDelete={handleSelectAllForDelete}
        onRequestDelete={handleRequestDelete}
        onClearCompleted={handleClearCompleted}
        onClearAll={handleClearAll}
      />

      <PendingQueueDialog
        isOpen={showPendingQueueDialog}
        queue={pendingQueue}
        onConfirm={handleStartQueueDownload}
        onCancel={() => setShowPendingQueueDialog(false)}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        selectedCount={selectedForDelete.length}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <UpdateDialog
        isOpen={updateStatus.available}
        newVersion={updateStatus.version}
        releaseNotes={updateStatus.releaseNotes}
        isDownloading={updateStatus.downloading}
        isDownloaded={updateStatus.downloaded}
        downloadProgress={updateStatus.downloadProgress}
        onDownload={handleDownloadUpdate}
        onInstall={handleInstallUpdate}
        onClose={() => setUpdateStatus((prev) => ({ ...prev, available: false }))}
      />
    </div>
  )
}

export default App
