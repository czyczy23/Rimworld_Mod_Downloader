/**
 * Steam Workshop Injector Script
 * Injected into the Steam Workshop webview to add download button functionality
 */

(function () {
  'use strict'

  // Prevent duplicate injection
  if (window.__rimworldDownloaderInjected) {
    console.log('[RimWorld Downloader] Already injected, skipping...')
    return
  }
  window.__rimworldDownloaderInjected = true

  console.log('[RimWorld Downloader] Injector loaded')

  // Track current URL for SPA navigation detection
  let currentUrl = window.location.href

  // Check if current page is a mod detail page
  function isModDetailPage() {
    return window.location.pathname.includes('/filedetails/') && window.location.search.includes('id=')
  }

  // Extract mod ID from URL
  function getModId() {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('id')
  }

  // Check if this is a collection page
  function isCollection() {
    // Check for collection-specific elements
    return (
      document.querySelector('.collectionItem') !== null ||
      document.querySelector('.collectionHeader') !== null ||
      document.querySelector('[data-panel="\"collectionDetails\""]') !== null
    )
  }

  // Get mod name from page
  function getModName() {
    const titleElement =
      document.querySelector('.workshopItemTitle') ||
      document.querySelector('.apphub_ContentHeader .workshopItemTitle') ||
      document.querySelector('div[class*="workshopItemTitle"]')

    return titleElement ? titleElement.textContent.trim() : 'Unknown Mod'
  }

  // Find the subscribe button container
  function findSubscribeButton() {
    // Try multiple selectors to find the subscribe button
    // Support both English and Chinese Steam interfaces
    const selectors = [
      '.workshopItemSubscribeBtn',
      '[class*="workshopItemSubscribeBtn"]',
      '.workshopItemSubscriptionButtons',
      '.apphub_OtherSiteActions',
      '.apphub_HeaderBottomRight',
      '.workshopItemAuthorLine',
      // Chinese Steam interface selectors
      '[class*="subscribe"]',
      '[class*="订阅"]',
      '.btn_green',
      '.btn_blue'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        console.log('[RimWorld Downloader] Found element with selector:', selector)
        return element
      }
    }

    // Fallback: look for any button that contains "subscribe" or "订阅" text
    const buttons = document.querySelectorAll('button, a[class*="btn"], a[href*="subscribe"]')
    for (const button of buttons) {
      const text = button.textContent?.toLowerCase() || ''
      if (text.includes('subscribe') || text.includes('订阅') || text.includes('subscribed')) {
        console.log('[RimWorld Downloader] Found subscribe button by text:', button)
        return button
      }
    }

    // Last resort: find the action bar in the workshop item header
    const actionBar = document.querySelector('.workshopItemActions, .workshopItemHeader, .apphub_Header')
    if (actionBar) {
      console.log('[RimWorld Downloader] Found action bar:', actionBar)
      return actionBar
    }

    return null
  }

  // Create the download button
  function createDownloadButton() {
    const button = document.createElement('button')
    button.id = 'rw-downloader-btn'
    button.innerHTML = '📥 Download to Local'

    // Base styles
    button.style.cssText = `
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      margin-left: 10px;
      cursor: pointer;
      border-radius: 4px;
      font-family: 'Motiva Sans', Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    `

    // Hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)'
      button.style.transform = 'translateY(-1px)'
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.25)'
    })

    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
      button.style.transform = 'translateY(0)'
      button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
    })

    // Click handler
    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      const modId = getModId()
      if (!modId) {
        console.error('[RimWorld Downloader] Could not extract mod ID')
        return
      }

      const modName = getModName()
      const isColl = isCollection()

      console.log('[RimWorld Downloader] Download requested:', {
        id: modId,
        name: modName,
        isCollection: isColl
      })

      // Send message to the preload script
      window.postMessage(
        {
          type: 'DOWNLOAD_REQUEST',
          id: modId,
          name: modName,
          isCollection: isColl
        },
        '*'
      )
    })

    return button
  }

  // Inject download button into the page
  function injectDownloadButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('rw-downloader-btn')
    if (existingBtn) {
      existingBtn.remove()
    }

    // Check if this is a mod detail page
    if (!isModDetailPage()) {
      console.log('[RimWorld Downloader] Not a mod detail page, skipping injection')
      return
    }

    console.log('[RimWorld Downloader] Injecting download button...')

    // Wait a bit for the Steam page to fully render
    setTimeout(() => {
      // Find the subscribe button or its container
      const targetElement = findSubscribeButton()

      if (targetElement) {
        const button = createDownloadButton()

        // Insert AFTER the target element (not inside or before)
        if (targetElement.parentNode) {
          // If target has a next sibling, insert before it
          if (targetElement.nextSibling) {
            targetElement.parentNode.insertBefore(button, targetElement.nextSibling)
          } else {
            // Otherwise append to parent
            targetElement.parentNode.appendChild(button)
          }
          console.log('[RimWorld Downloader] Download button injected after target')
        } else {
          targetElement.insertAdjacentElement('afterend', button)
        }
      } else {
        console.warn('[RimWorld Downloader] Could not find subscribe button, trying fallback...')

        // Fallback: try to find any suitable container
        const fallbackSelectors = [
          '.workshopItemHeader',
          '.apphub_ContentHeader',
          '.workshopItemDetailsHeader',
          '.workshopItemActions'
        ]

        for (const selector of fallbackSelectors) {
          const container = document.querySelector(selector)
          if (container) {
            const button = createDownloadButton()
            container.appendChild(button)
            console.log('[RimWorld Downloader] Download button injected via fallback:', selector)
            break
          }
        }
      }
    }, 500) // Wait 500ms for page to render
  }

  // Monitor for SPA navigation changes
  function monitorNavigation() {
    // Check for URL changes
    setInterval(() => {
      const newUrl = window.location.href
      if (newUrl !== currentUrl) {
        console.log('[RimWorld Downloader] Navigation detected:', newUrl)
        currentUrl = newUrl

        // Wait for the new page to load before injecting
        setTimeout(() => {
          injectDownloadButton()
        }, 2000)
      }
    }, 500)
  }

  // Initial injection with a delay to let Steam's page load
  function init() {
    console.log('[RimWorld Downloader] Initializing injector...')

    // Wait for the page to be ready
    const startInjection = () => {
      injectDownloadButton()
      monitorNavigation()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startInjection)
    } else {
      // Page already loaded, but still wait a bit for Steam's JS
      setTimeout(startInjection, 2000)
    }
  }

  // Start the injector
  init()
})()
