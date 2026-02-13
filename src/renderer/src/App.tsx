import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { WebviewContainer } from './components/WebviewContainer'
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
    }
  }
}

interface DownloadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error'
  error?: string
}

function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [config, setConfig] = useState<any>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        console.log('Config loaded:', cfg)
        setConfig(cfg)
      })
    }
  }, [])

  // Handle download request from webview
  const handleDownloadRequest = useCallback(async (id: string, isCollection: boolean) => {
    console.log('Download requested:', { id, isCollection })

    // Add to downloads list
    setDownloads(prev => {
      if (prev.find(d => d.id === id)) return prev
      return [...prev, {
        id,
        name: isCollection ? `Collection ${id}` : `Mod ${id}`,
        progress: 0,
        status: 'downloading'
      }]
    })

    // Call main process to download
    try {
      if (window.api) {
        const result = await window.api.downloadMod(id, isCollection)
        console.log('Download complete:', result)

        setDownloads(prev => prev.map(d =>
          d.id === id
            ? { ...d, status: 'completed', progress: 100, name: result.name || d.name }
            : d
        ))
      }
    } catch (error) {
      console.error('Download failed:', error)
      setDownloads(prev => prev.map(d =>
        d.id === id
          ? { ...d, status: 'error', error: String(error) }
          : d
      ))
    }
  }, [])

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Toolbar */}
      <Toolbar onSettingsClick={() => setShowSettings(!showSettings)} />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Webview - Steam Workshop */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WebviewContainer onDownloadRequest={handleDownloadRequest} />
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
      <DownloadQueue />
    </div>
  )
}

export default App
