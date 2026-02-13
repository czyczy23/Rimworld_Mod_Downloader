// Test injector script
(function () {
  'use strict'

  if (window.__rimworldDownloaderInjected) {
    console.log('[RimWorld Downloader] Already injected, skipping...')
    return
  }
  window.__rimworldDownloaderInjected = true

  console.log('[RimWorld Downloader] Injector loaded')

  function findSubscribeButton() {
    const selectors = [
      '.workshopItemSubscribeBtn',
      '[class*="workshopItemSubscribeBtn"]',
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

    return null
  }

  function createDownloadButton() {
    const button = document.createElement('button')
    button.id = 'rw-downloader-btn'
    button.innerHTML = '📥 Download to Local'

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

    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      alert('Download requested!')
    })

    return button
  }

  function injectDownloadButton() {
    const existingBtn = document.getElementById('rw-downloader-btn')
    if (existingBtn) {
      existingBtn.remove()
    }

    console.log('[RimWorld Downloader] Injecting download button...')

    const targetElement = findSubscribeButton()

    if (targetElement) {
      if (document.getElementById('rw-downloader-btn')) {
        console.log('[RimWorld Downloader] Button already exists, skipping injection')
        return
      }

      const button = createDownloadButton()
      targetElement.insertAdjacentElement('afterend', button)

      console.log('[RimWorld Downloader] Download button injected after target:', targetElement)
      console.log('[RimWorld Downloader] Button parent:', button.parentElement)
    } else {
      console.warn('[RimWorld Downloader] Could not find subscribe button')
    }
  }

  function init() {
    console.log('[RimWorld Downloader] Initializing injector...')
    setTimeout(() => {
      injectDownloadButton()
    }, 1000)
  }

  init()
})()
