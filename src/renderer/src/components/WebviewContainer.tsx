import { useRef, useEffect, useState } from 'react'
import workshopInjector from '../inject/workshopInjector?raw'

interface WebviewContainerProps {
  onDownloadRequest: (id: string, isCollection: boolean) => void
}

export function WebviewContainer({ onDownloadRequest }: WebviewContainerProps) {
  const webviewRef = useRef<HTMLWebViewElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState('https://steamcommunity.com/app/294100/workshop/')

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    // Handle dom-ready event
    const handleDomReady = () => {
      console.log('Webview dom-ready, injecting script...')
      setIsLoading(false)

      // Inject the workshop injector script
      webview.executeJavaScript(workshopInjector).catch((err: Error) => {
        console.error('Failed to inject script:', err)
      })
    }

    // Handle load start
    const handleLoadStart = () => {
      setIsLoading(true)
    }

    // Handle navigation events
    const handleDidNavigate = (e: Electron.DidNavigateEvent) => {
      console.log('Navigated to:', e.url)
      setCurrentUrl(e.url)
    }

    // Handle console messages from webview
    const handleConsoleMessage = (e: Electron.ConsoleMessageEvent) => {
      console.log('[Webview Console]', e.message)
    }

    // Listen for messages from the injected script
    const handleIpcMessage = (e: Electron.IpcMessageEvent) => {
      console.log('Received IPC message from webview:', e.channel, e.args)

      // Handle the download request message
      if (e.channel === 'download-mod-request' && e.args && e.args[0]) {
        const data = e.args[0] as { id: string; isCollection: boolean }
        console.log('Download request received:', data)
        onDownloadRequest(data.id, data.isCollection)
      }
    }

    // Add event listeners
    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('load-start', handleLoadStart)
    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('console-message', handleConsoleMessage)
    webview.addEventListener('ipc-message', handleIpcMessage)

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('load-start', handleLoadStart)
      webview.removeEventListener('did-navigate', handleDidNavigate)
      webview.removeEventListener('console-message', handleConsoleMessage)
      webview.removeEventListener('ipc-message', handleIpcMessage)
    }
  }, [onDownloadRequest])

  // Navigation handlers
  const handleGoBack = () => {
    const webview = webviewRef.current
    if (webview && webview.canGoBack()) {
      webview.goBack()
    }
  }

  const handleGoForward = () => {
    const webview = webviewRef.current
    if (webview && webview.canGoForward()) {
      webview.goForward()
    }
  }

  const handleReload = () => {
    const webview = webviewRef.current
    if (webview) {
      webview.reload()
    }
  }

  const handleNavigate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const webview = webviewRef.current
      if (webview) {
        let url = e.currentTarget.value
        if (!url.startsWith('http')) {
          url = 'https://' + url
        }
        webview.src = url
      }
    }
  }

  return (
    <div className="webview-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div className="webview-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        gap: '8px',
        background: '#171a21',
        borderBottom: '1px solid #2a475e'
      }}>
        <button onClick={handleGoBack} title="Back">◀</button>
        <button onClick={handleGoForward} title="Forward">▶</button>
        <button onClick={handleReload} title="Reload">↻</button>

        <input
          type="text"
          defaultValue={currentUrl}
          onKeyDown={handleNavigate}
          placeholder="Enter URL..."
          style={{
            flex: 1,
            background: '#2a475e',
            color: '#c6d4df',
            border: '1px solid #3d6c8d',
            padding: '6px 10px',
            borderRadius: '3px',
            fontSize: '13px'
          }}
        />

        {isLoading && (
          <span style={{ color: '#8f98a0', fontSize: '12px' }}>Loading...</span>
        )}
      </div>

      {/* Webview */}
      <div style={{ flex: 1, position: 'relative' }}>
        <webview
          ref={webviewRef}
          src="https://steamcommunity.com/app/294100/workshop/"
          partition="persist:steam"
          allowpopups
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />

        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#16202d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #2a475e',
              borderTopColor: '#66c0f4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ color: '#8f98a0', fontSize: '14px' }}>
              Loading Steam Workshop...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
