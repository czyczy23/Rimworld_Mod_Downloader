import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { WebviewContainer, type WebviewContainerRef, type CurrentPageInfo } from './components/WebviewContainer'
import { Toolbar } from './components/Toolbar'
import { DownloadQueue } from './components/DownloadQueue'

// Extend Window interface for our API
declare global {
  interface Window {
    api: {
      getConfig: (key?: string) => Promise<any>
      setConfig: (key: string, value: any) => Promise<void>
      downloadMod: (id: string, isCollection: boolean) => Promise<any>
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

function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [, setConfig] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
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

    // Cleanup
    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
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

    // Add to downloads list
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

    // Call main process to download
    try {
      if (window.api) {
        const result = await window.api.downloadMod(modId, isCollection)
        console.log('Download complete:', result)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
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

        {/* Settings Panel (conditionally shown) */}
        {showSettings && (
          <div style={{
            width: '350px',
            background: '#1b2838',
            borderLeft: '1px solid #2a475e',
            padding: '20px',
            overflow: 'auto'
          }}>
            <h3 style={{ color: '#c6d4df', marginTop: 0 }}>Settings</h3>
            <p style={{ color: '#8f98a0', fontSize: '14px' }}>
              Settings panel will be implemented in Phase 4.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Status Bar - Download Queue */}
      <DownloadQueue downloads={downloads} />
    </div>
  )
}

export default App
