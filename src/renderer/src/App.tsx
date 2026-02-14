import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { WebviewContainer, type WebviewContainerRef, type CurrentPageInfo } from './components/WebviewContainer'
import { Toolbar } from './components/Toolbar'
import { DownloadQueue } from './components/DownloadQueue'
import { SettingsPanel } from './components/SettingsPanel'
import { DependencyDialog } from './components/DependencyDialog'
import { VersionMismatchDialog } from './components/VersionMismatchDialog'

// Extend Window interface for our API
declare global {
  interface Window {
    api: {
      getConfig: (key?: string) => Promise<any>
      setConfig: (key: string, value: any) => Promise<void>
      downloadMod: (id: string, isCollection: boolean) => Promise<any>
      downloadBatch: (items: { id: string; name: string; isCollection: boolean }[]) => Promise<any[]>
      checkDependencies: (id: string) => Promise<any[]>
      checkModVersion: (modId: string) => Promise<{ supportedVersions: string[], modName: string, dependencies: any[] }>
      selectFolder: () => Promise<string | null>
      onDownloadProgress: (callback: (data: {
        id: string
        status: string
        progress: number
        message?: string
        current?: number
        total?: number
      }) => void) => () => void
      onDownloadComplete: (callback: (data: any) => void) => () => void
      onDownloadError: (callback: (data: { id: string; error: string }) => void) => () => void
      onBatchProgress: (callback: (data: any) => void) => () => void
      detectGameVersion: () => Promise<string>
    }
  }
}

interface DownloadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error'
  error?: string
  message?: string
}

interface BatchDownloadInfo {
  isBatch: boolean
  current: number
  total: number
  currentName: string
  id: string
}

interface AppConfig {
  download?: {
    dependencyMode?: 'ask' | 'auto' | 'ignore'
    autoDownloadDependencies?: boolean
    skipVersionCheck?: boolean
  }
  version?: {
    onMismatch?: 'ask' | 'force' | 'skip'
  }
  rimworld?: {
    currentVersion?: string
  }
}

function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [batchInfo, setBatchInfo] = useState<BatchDownloadInfo | undefined>()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDependencyDialog, setShowDependencyDialog] = useState(false)
  const [showVersionMismatchDialog, setShowVersionMismatchDialog] = useState(false)
  const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
  const [pendingDependencies, setPendingDependencies] = useState<{ id: string; name: string; dependencies: any[] } | null>(null)
  const [pendingVersionCheck, setPendingVersionCheck] = useState<{ id: string; name: string; isCollection: boolean; modVersions: string[] } | null>(null)
  const [gameVersion, setGameVersion] = useState<string>('')
  const webviewRef = useRef<WebviewContainerRef>(null)

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        console.log('Config loaded:', cfg)
        setConfig(cfg)
      })

      // Also load game version
      window.api.detectGameVersion().then((version) => {
        setGameVersion(version)
      }).catch(() => {
        setGameVersion('')
      })
    }
  }, [])

  // Set up download progress listeners
  useEffect(() => {
    if (!window.api) return

    // Listen for progress updates
    const unsubscribeProgress = window.api.onDownloadProgress((data) => {
      console.log(`[App] Download progress for ${data.id}: ${data.progress}%`)

      setDownloads(prev => {
        const existing = prev.find(d => d.id === data.id)
        if (existing) {
          // Update existing
          return prev.map(d => d.id === data.id ? {
            ...d,
            progress: data.progress,
            status: data.status as any,
            message: data.message
          } : d)
        } else {
          // Add new
          return [...prev, {
            id: data.id,
            name: `Mod ${data.id}`,
            progress: data.progress,
            status: data.status as any,
            message: data.message
          }]
        }
      })
    })

    // Listen for completion
    const unsubscribeComplete = window.api.onDownloadComplete((data) => {
      console.log(`[App] Download completed for ${data.id}`)

      setDownloads(prev => prev.map(d => d.id === data.id ? {
        ...d,
        progress: 100,
        status: 'completed',
        message: 'Download completed'
      } : d))
    })

    // Listen for errors
    const unsubscribeError = window.api.onDownloadError((data) => {
      console.error(`[App] Download error for ${data.id}:`, data.error)

      setDownloads(prev => prev.map(d => d.id === data.id ? {
        ...d,
        status: 'error',
        error: data.error,
        message: data.error
      } : d))
    })

    // Listen for batch progress
    const unsubscribeBatchProgress = window.api.onBatchProgress((data) => {
      console.log(`[App] Batch progress: ${data.current}/${data.total} - ${data.currentName}`)

      setBatchInfo({
        isBatch: data.isBatch,
        current: data.current,
        total: data.total,
        currentName: data.currentName,
        id: data.id
      })
    })

    // Cleanup
    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
      unsubscribeBatchProgress()
    }
  }, [])

  // Handle page change from WebviewContainer
  const handlePageChanged = useCallback((info: CurrentPageInfo) => {
    console.log('[App] Page changed:', info)
    setCurrentPageInfo(info)
  }, [])

  // Check if mod version is compatible
  const isVersionCompatible = (modVersions: string[]): boolean => {
    if (!gameVersion || modVersions.length === 0) return true
    return modVersions.includes(gameVersion)
  }

  // Start single download
  const startSingleDownload = async (modId: string, isCollection: boolean, name?: string) => {
    setDownloads(prev => {
      if (prev.find(d => d.id === modId)) return prev
      return [...prev, {
        id: modId,
        name: name || (isCollection ? `Collection ${modId}` : `Mod ${modId}`),
        progress: 0,
        status: 'downloading',
        message: 'Starting download...'
      }]
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

  // Start batch download with dependencies
  const startBatchDownload = async (modId: string, isCollection: boolean, modName: string, dependencies: any[]) => {
    const allItems = [
      { id: modId, name: modName, isCollection },
      ...dependencies.map((dep: any) => ({ id: dep.id, name: dep.name || `Mod ${dep.id}`, isCollection: false }))
    ]

    // Add all to queue
    allItems.forEach(item => {
      setDownloads(prev => {
        if (prev.find(d => d.id === item.id)) return prev
        return [...prev, {
          id: item.id,
          name: item.name,
          progress: 0,
          status: 'pending',
          message: 'Pending...'
        }]
      })
    })

    // Start batch download
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

  // Handle download after version check passes
  const proceedWithDownload = useCallback(async (modId: string, isCollection: boolean, modName: string) => {
    if (!window.api) return

    const dependencyMode = config?.download?.dependencyMode || 'ask'
    const autoDownloadDependencies = config?.download?.autoDownloadDependencies || false

    try {
      const dependencies = await window.api.checkDependencies(modId)
      console.log(`Found ${dependencies.length} dependencies`)

      if (dependencies.length > 0) {
        if (dependencyMode === 'ignore') {
          startSingleDownload(modId, isCollection, modName)
        } else if (dependencyMode === 'auto' || autoDownloadDependencies) {
          startBatchDownload(modId, isCollection, modName, dependencies)
        } else {
          setPendingDependencies({ id: modId, name: modName, dependencies })
          setShowDependencyDialog(true)
        }
      } else {
        startSingleDownload(modId, isCollection, modName)
      }
    } catch (error) {
      console.error('Error checking dependencies:', error)
      startSingleDownload(modId, isCollection, modName)
    }
  }, [config])

  // Handle download request from Toolbar
  const handleDownloadClick = useCallback(async (modId: string, isCollection: boolean) => {
    console.log('Download clicked:', { modId, isCollection })

    if (!window.api) return

    const onMismatch = config?.version?.onMismatch || 'ask'
    const skipVersionCheck = config?.download?.skipVersionCheck || false

    try {
      // Step 1: Check version compatibility first (unless skipped)
      let modVersions: string[] = []
      let modName = currentPageInfo?.modName || `Mod ${modId}`

      if (!skipVersionCheck) {
        try {
          const versionInfo = await window.api.checkModVersion(modId)
          modVersions = versionInfo.supportedVersions || []
          modName = versionInfo.modName || modName

          // Check version mismatch
          if (!isVersionCompatible(modVersions)) {
            if (onMismatch === 'skip') {
              console.log('[App] Skipping download due to version mismatch')
              return
            } else if (onMismatch === 'ask') {
              // Show version mismatch dialog
              setPendingVersionCheck({ id: modId, name: modName, isCollection, modVersions })
              setShowVersionMismatchDialog(true)
              return
            }
            // onMismatch === 'force' - continue without asking
          }
        } catch (error) {
          console.error('[App] Failed to check mod version, continuing anyway:', error)
        }
      }

      // Proceed with dependency check and download
      proceedWithDownload(modId, isCollection, modName)
    } catch (error) {
      console.error('Error in download flow:', error)
      // Fallback to direct download if anything fails
      startSingleDownload(modId, isCollection)
    }
  }, [config, currentPageInfo?.modName, gameVersion, proceedWithDownload])

  // Handle version mismatch dialog confirm
  const handleVersionMismatchConfirm = useCallback(() => {
    if (!pendingVersionCheck) return
    setShowVersionMismatchDialog(false)
    const { id, name, isCollection } = pendingVersionCheck
    setPendingVersionCheck(null)
    proceedWithDownload(id, isCollection, name)
  }, [pendingVersionCheck, proceedWithDownload])

  // Handle version mismatch dialog cancel
  const handleVersionMismatchCancel = useCallback(() => {
    setShowVersionMismatchDialog(false)
    setPendingVersionCheck(null)
  }, [])

  // Handle dependency dialog confirm
  const handleDependencyConfirm = useCallback(async (selectedIds: string[]) => {
    if (!pendingDependencies) return

    setShowDependencyDialog(false)

    const selectedDeps = pendingDependencies.dependencies.filter((d: any) => selectedIds.includes(d.id))
    startBatchDownload(
      pendingDependencies.id,
      currentPageInfo?.isCollection || false,
      pendingDependencies.name,
      selectedDeps
    )

    setPendingDependencies(null)
  }, [pendingDependencies, currentPageInfo?.isCollection])

  // Handle dependency dialog cancel
  const handleDependencyCancel = useCallback(() => {
    setShowDependencyDialog(false)
    setPendingDependencies(null)
  }, [])

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1b2838' }}>
      {/* Header / Toolbar with Download Button */}
      <Toolbar
        onSettingsClick={() => setShowSettings(!showSettings)}
        onDownloadClick={handleDownloadClick}
        currentPageInfo={currentPageInfo}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Webview - Steam Workshop */}
        <div style={{ flex: 1, display: 'flex', height: '100%' }}>
          <WebviewContainer
            ref={webviewRef}
            onDownloadRequest={handleDownloadClick}
            onPageChanged={handlePageChanged}
          />
        </div>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>

      {/* Version Mismatch Dialog */}
      {pendingVersionCheck && (
        <VersionMismatchDialog
          isOpen={showVersionMismatchDialog}
          modName={pendingVersionCheck.name}
          modVersions={pendingVersionCheck.modVersions}
          gameVersion={gameVersion}
          onConfirm={handleVersionMismatchConfirm}
          onCancel={handleVersionMismatchCancel}
        />
      )}

      {/* Dependency Dialog */}
      {pendingDependencies && (
        <DependencyDialog
          isOpen={showDependencyDialog}
          modName={pendingDependencies.name}
          dependencies={pendingDependencies.dependencies}
          onConfirm={handleDependencyConfirm}
          onCancel={handleDependencyCancel}
        />
      )}

      {/* Bottom Status Bar - Download Queue */}
      <DownloadQueue downloads={downloads} batchInfo={batchInfo} />
    </div>
  )
}

export default App
