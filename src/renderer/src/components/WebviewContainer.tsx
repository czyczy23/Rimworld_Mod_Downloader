import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'

export interface CurrentPageInfo {
  url: string
  isModDetailPage: boolean
  modId?: string
  modName?: string
  isCollection?: boolean
}

export interface WebviewContainerRef {
  getCurrentPageInfo: () => CurrentPageInfo
}

interface WebviewContainerProps {
  onDownloadRequest?: (id: string, isCollection: boolean) => void
  onPageChanged?: (info: CurrentPageInfo) => void
}

export const WebviewContainer = forwardRef<WebviewContainerRef, WebviewContainerProps>(
  ({ onPageChanged }, ref) => {
    const webviewRef = useRef<HTMLWebViewElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUrl, setCurrentUrl] = useState('https://steamcommunity.com/app/294100/workshop/')
    const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo>({
      url: 'https://steamcommunity.com/app/294100/workshop/',
      isModDetailPage: false
    })

    // Expose getCurrentPageInfo to parent via ref
    useImperativeHandle(ref, () => ({
      getCurrentPageInfo: () => currentPageInfo
    }), [currentPageInfo])

    // Parse URL to extract page info
    const parsePageInfo = (url: string): CurrentPageInfo => {
      const info: CurrentPageInfo = {
        url,
        isModDetailPage: false
      }

      // Check if this is a mod detail page
      if (url.includes('/sharedfiles/filedetails/')) {
        const urlObj = new URL(url)
        const modId = urlObj.searchParams.get('id')

        if (modId) {
          info.isModDetailPage = true
          info.modId = modId
          // We'll try to get the mod name from the page title later
        }
      }

      return info
    }

    // Update page info and notify parent
    const updatePageInfo = (url: string) => {
      const info = parsePageInfo(url)
      setCurrentPageInfo(info)
      setCurrentUrl(url)

      // Notify parent component via callback
      if (onPageChanged) {
        onPageChanged(info)
      }
    }

    useEffect(() => {
      const webview = webviewRef.current
      if (!webview) return

      const handleDomReady = () => {
        console.log('Webview dom-ready')
        setIsLoading(false)
      }

      const handleLoadStart = () => {
        setIsLoading(true)
      }

      const handleDidNavigate = (e: any) => {
        console.log('Navigated to:', e.url)
        updatePageInfo(e.url)
      }

      // Handle in-page navigation (SPA navigation like Steam Workshop)
      const handleDidNavigateInPage = (e: any) => {
        console.log('In-page navigated to:', e.url)
        updatePageInfo(e.url)
      }

      const handleConsoleMessage = (e: any) => {
        console.log('[Webview Console]', e.message)
      }

      webview.addEventListener('dom-ready', handleDomReady)
      webview.addEventListener('load-start', handleLoadStart)
      webview.addEventListener('did-navigate', handleDidNavigate)
      webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage)
      webview.addEventListener('console-message', handleConsoleMessage)

      return () => {
        webview.removeEventListener('dom-ready', handleDomReady)
        webview.removeEventListener('load-start', handleLoadStart)
        webview.removeEventListener('did-navigate', handleDidNavigate)
        webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage)
        webview.removeEventListener('console-message', handleConsoleMessage)
      }
    }, [])

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
      <div className="webview-container" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
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
)

WebviewContainer.displayName = 'WebviewContainer'
