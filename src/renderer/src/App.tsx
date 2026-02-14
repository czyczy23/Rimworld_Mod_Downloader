import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { WebviewContainer, type WebviewContainerRef, type CurrentPageInfo } from './components/WebviewContainer'
import { Toolbar } from './components/Toolbar'
import { DownloadQueue } from './components/DownloadQueue'
import { SettingsPanel } from './components/SettingsPanel'
import { DependencyDialog } from './components/DependencyDialog'

// Extend Window interface for our API
declare global {
  interface Window {
    api: {
      getConfig: (key?: string) => Promise<any>
      setConfig: (key: string, value: any) => Promise<void>
      downloadMod: (id: string, isCollection: boolean) => Promise<any>
      downloadBatch: (items: { id: string; name: string; isCollection: boolean }[]) => Promise<any[]>
      checkDependencies: (id: string) => Promise<any[]>
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

function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [batchInfo, setBatchInfo] = useState<BatchDownloadInfo | undefined>()
  const [, setConfig] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDependencyDialog, setShowDependencyDialog] = useState(false)
  const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
  const [pendingDependencies, setPendingDependencies] = useState<{ id: string; name: string; dependencies: any[] } | null>(null)
  const webviewRef = useRef<WebviewContainerRef>(null)

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        console.log('Config loaded:', cfg)
        setConfig(cfg)
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

  // Handle download request from Toolbar
  const handleDownloadClick = useCallback(async (modId: string, isCollection: boolean) => {
    console.log('Download clicked:', { modId, isCollection })

    // Check dependencies first
    try {
      if (window.api) {
        const dependencies = await window.api.checkDependencies(modId)
        console.log(`Found ${dependencies.length} dependencies`)

        if (dependencies.length > 0) {
          // Show dependency dialog
          setPendingDependencies({
            id: modId,
            name: currentPageInfo?.modName || `Mod ${modId}`,
            dependencies
          })
          setShowDependencyDialog(true)
        } else {
          // No dependencies, download directly
          startSingleDownload(modId, isCollection)
        }
      }
    } catch (error) {
      console.error('Error checking dependencies:', error)
      // Fallback to direct download if dependency check fails
      startSingleDownload(modId, isCollection)
    }
  }, [currentPageInfo?.modName])

  // Start single download
  const startSingleDownload = async (modId: string, isCollection: boolean) => {
    setDownloads(prev => {
      if (prev.find(d => d.id === modId)) return prev
      return [...prev, {
        id: modId,
        name: isCollection ? `Collection ${modId}` : `Mod ${modId}`,
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

  // Handle dependency dialog confirm
  const handleDependencyConfirm = useCallback(async (selectedIds: string[]) => {
    if (!pendingDependencies) return

    setShowDependencyDialog(false)
    setBatchInfo({
      isBatch: true,
      current: 1,
      total: selectedIds.length + 1, // Include main mod
      currentName: pendingDependencies.name,
      id: pendingDependencies.id
    })

    // Add all selected items to download queue
    const allItems = [
      { id: pendingDependencies.id, name: pendingDependencies.name, isCollection: currentPageInfo?.isCollection || false },
      ...selectedIds.map(id => ({ id, name: `Mod ${id}`, isCollection: false }))
    ]

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
  }, [pendingDependencies, currentPageInfo?.isCollection])

  // Handle dependency dialog cancel
  const handleDependencyCancel = useCallback(() => {
    setShowDependencyDialog(false)
    setPendingDependencies(null)
  }, [])

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1b2838' }}>
      {/* Debug indicator */}
      <div style={{ position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', padding: '4px 8px', zIndex: 99999, fontSize: '12px' }}>
        App Loaded v2
      </div>

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
