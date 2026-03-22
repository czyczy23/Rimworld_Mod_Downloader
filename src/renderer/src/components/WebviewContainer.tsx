import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import i18n from '../i18n'

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

// Get language parameter string for Steam URL
const getSteamLangParam = (lang: string): string => {
  if (lang === 'zh-CN') return 'schinese'
  if (lang === 'zh-TW') return 'tchinese'
  if (lang === 'en') return 'english'
  return ''
}

// Get Steam Workshop URL with language parameter based on current i18n language
const getSteamWorkshopUrl = (): string => {
  const lang = i18n.language
  const langParam = getSteamLangParam(lang)

  if (langParam) {
    return `https://steamcommunity.com/app/294100/workshop/?l=${langParam}`
  }
  return `https://steamcommunity.com/app/294100/workshop/`
}

// Update language parameter in a URL
const updateUrlLanguageParam = (url: string, lang: string): string => {
  const langParam = getSteamLangParam(lang)

  try {
    const urlObj = new URL(url)
    if (langParam) {
      urlObj.searchParams.set('l', langParam)
    } else {
      urlObj.searchParams.delete('l')
    }
    return urlObj.toString()
  } catch {
    return url
  }
}

export const WebviewContainer = forwardRef<WebviewContainerRef, WebviewContainerProps>(
  ({ onPageChanged }, ref) => {
    const webviewRef = useRef<HTMLWebViewElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUrl, setCurrentUrl] = useState(getSteamWorkshopUrl())
    const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo>({
      url: getSteamWorkshopUrl(),
      isModDetailPage: false
    })

    // Expose getCurrentPageInfo to parent via ref
    useImperativeHandle(ref, () => ({
      getCurrentPageInfo: () => currentPageInfo
    }), [currentPageInfo])

    // Inject navigation interceptor script into webview
    const injectNavigationScript = () => {
      const webview = webviewRef.current
      if (!webview) return

      const lang = i18n.language
      const script = `
        (function() {
          let langCode = '';
          if ('${lang}' === 'zh-CN') langCode = 'schinese';
          else if ('${lang}' === 'zh-TW') langCode = 'tchinese';
          else if ('${lang}' === 'en') langCode = 'english';
          if (!langCode) return;

          function addLangParam(url) {
            try {
              const urlObj = new URL(url, window.location.href);
              if (urlObj.hostname.includes('steamcommunity.com')) {
                urlObj.searchParams.set('l', langCode);
                return urlObj.toString();
              }
            } catch(e) {}
            return url;
          }

          // Intercept history API
          const originalPushState = history.pushState;
          const originalReplaceState = history.replaceState;

          history.pushState = function(state, title, url) {
            const newUrl = url ? addLangParam(url) : window.location.href;
            return originalPushState.call(this, state, title, newUrl);
          };

          history.replaceState = function(state, title, url) {
            const newUrl = url ? addLangParam(url) : window.location.href;
            return originalReplaceState.call(this, state, title, newUrl);
          };

          // Intercept link clicks
          document.addEventListener('click', function(e) {
            const anchor = e.target.closest('a');
            if (anchor && anchor.href) {
              const newHref = addLangParam(anchor.href);
              if (newHref !== anchor.href) {
                anchor.href = newHref;
              }
            }
          }, true);
        })();
      `
      ;(webview as any).executeJavaScript(script).catch(() => {})
    }

    // Listen for i18n language changes and reload webview with new URL
    useEffect(() => {
      const handleLanguageChange = () => {
        const webview = webviewRef.current
        if (webview) {
          // Re-inject script with new language
          injectNavigationScript()
          // Also reload to apply new language
          const currentPageUrl = currentPageInfo.url
          const newUrl = updateUrlLanguageParam(currentPageUrl, i18n.language)
          console.log('[WebviewContainer] Language changed -> reloading with URL:', newUrl)
          setCurrentUrl(newUrl)
          setCurrentPageInfo(prev => ({ ...prev, url: newUrl }))
          ;(webview as any).loadURL(newUrl)
        }
      }

      i18n.on('languageChanged', handleLanguageChange)
      return () => {
        i18n.off('languageChanged', handleLanguageChange)
      }
    }, [currentPageInfo.url])

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
        // Inject script to intercept SPA navigation
        injectNavigationScript()
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

      // Intercept navigation to add language parameter
      const handleWillNavigate = (e: any) => {
        console.log('[WebviewContainer] will-navigate:', e.url)
        const url = e.url
        // Only process Steam Workshop URLs
        if (url.includes('steamcommunity.com/app/294100')) {
          const newUrl = updateUrlLanguageParam(url, i18n.language)
          if (newUrl !== url) {
            console.log('[WebviewContainer] Redirecting to:', newUrl)
            e.preventDefault()
            ;(webview as any).loadURL(newUrl)
          }
        }
      }

      const handleConsoleMessage = (e: any) => {
        console.log('[Webview Console]', e.message)
      }

      webview.addEventListener('dom-ready', handleDomReady)
      webview.addEventListener('load-start', handleLoadStart)
      webview.addEventListener('did-navigate', handleDidNavigate)
      webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage)
      webview.addEventListener('will-navigate', handleWillNavigate)
      webview.addEventListener('console-message', handleConsoleMessage)

      return () => {
        webview.removeEventListener('dom-ready', handleDomReady)
        webview.removeEventListener('load-start', handleLoadStart)
        webview.removeEventListener('did-navigate', handleDidNavigate)
        webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage)
        webview.removeEventListener('will-navigate', handleWillNavigate)
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
            src={currentUrl}
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
