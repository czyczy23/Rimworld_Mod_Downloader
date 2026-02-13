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

    const handleDomReady = () => {
      console.log('Webview dom-ready, injecting script...')
      setIsLoading(false)
      webview.executeJavaScript(workshopInjector).catch((err: Error) => {
        console.error('Failed to inject script:', err)
      })
    }

    const handleLoadStart = () => {
      setIsLoading(true)
    }

    const handleDidNavigate = (e: any) => {
      console.log('Navigated to:', e.url)
      setCurrentUrl(e.url)
    }

    // Handle in-page navigation (SPA navigation like Steam Workshop)
    const handleDidNavigateInPage = (e: any) => {
      console.log('In-page navigated to:', e.url)
      setCurrentUrl(e.url)
      // Re-inject script when navigating to a new mod page
      if (e.url.includes('/filedetails/')) {
        console.log('Mod page detected, re-injecting script...')
        setTimeout(() => {
          webview.executeJavaScript(workshopInjector).catch((err: Error) => {
            console.error('Failed to re-inject script:', err)
          })
        }, 1000)
      }
    }

    const handleConsoleMessage = (e: any) => {
      console.log('[Webview Console]', e.message)
    }

    const handleIpcMessage = (e: any) => {
      console.log('Received IPC message from webview:', e.channel, e.args)
      if (e.channel === 'download-mod-request' && e.args && e.args[0]) {
        const data = e.args[0] as { id: string; isCollection: boolean }
        console.log('Download request received:', data)
        onDownloadRequest(data.id, data.isCollection)
      }
    }

    webview.addEventListener('dom-ready', handleDomReady)
    webview.addEventListener('load-start', handleLoadStart)
    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage)
    webview.addEventListener('console-message', handleConsoleMessage)
    webview.addEventListener('ipc-message', handleIpcMessage)

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady)
      webview.removeEventListener('load-start', handleLoadStart)
      webview.removeEventListener('did-navigate', handleDidNavigate)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage)
      webview.removeEventListener('console-message', handleConsoleMessage)
      webview.removeEventListener('ipc-message', handleIpcMessage)
    }
  }, [onDownloadRequest])

  const handleGoBack = () => {
    const webview = webviewRef.current
    if (webview && (webview as any).canGoBack()) {
      ;(webview as any).goBack()
    }
  }

  const handleGoForward = () => {
    const webview = webviewRef.current
    if (webview && (webview as any).canGoForward()) {
      ;(webview as any).goForward()
    }
  }

  const handleReload = () => {
    const webview = webviewRef.current
    if (webview) {
      ;(webview as any).reload()
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
        ;(webview as any).src = url
      }
    }
  }

  return (
    <div className="webview-container" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }}>
      <div className="webview-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        gap: '8px',
        background: '#171a21',
        borderBottom: '1px solid #2a475e'
      }}>
        <button onClick={handleGoBack} title="Back">&#9664;</button>
        <button onClick={handleGoForward} title="Forward">&#9654;</button>
        <button onClick={handleReload} title="Reload">&#8635;</button>

        <input
          type="text"
          value={currentUrl}
          onChange={(e) => setCurrentUrl(e.target.value)}
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
