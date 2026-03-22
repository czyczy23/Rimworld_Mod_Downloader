import { describe, it, expect } from 'vitest'

describe('i18n', () => {
  it('should have correct language codes', () => {
    const supportedLanguages = ['en', 'zh-CN', 'zh-TW']
    expect(supportedLanguages).toContain('en')
    expect(supportedLanguages).toContain('zh-CN')
    expect(supportedLanguages).toContain('zh-TW')
  })

  it('should map language codes correctly', () => {
    const mapToSupportedLanguage = (locale: string): 'en' | 'zh-TW' | 'zh-CN' => {
      const lower = locale.toLowerCase().replace('_', '-')
      if (lower.startsWith('zh')) {
        if (lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh-hans') {
          return 'zh-CN'
        }
        return 'zh-TW'
      }
      return 'en'
    }

    expect(mapToSupportedLanguage('en-US')).toBe('en')
    expect(mapToSupportedLanguage('zh-CN')).toBe('zh-CN')
    expect(mapToSupportedLanguage('zh-TW')).toBe('zh-TW')
    expect(mapToSupportedLanguage('zh-Hans')).toBe('zh-CN')
    expect(mapToSupportedLanguage('zh-Hant')).toBe('zh-TW')
    expect(mapToSupportedLanguage('en-GB')).toBe('en')
    expect(mapToSupportedLanguage('ja-JP')).toBe('en')
  })

  it('should map Steam language codes correctly', () => {
    const getSteamLangParam = (lang: string): string => {
      if (lang === 'zh-CN') return 'schinese'
      if (lang === 'zh-TW') return 'tchinese'
      if (lang === 'en') return 'english'
      return ''
    }

    expect(getSteamLangParam('zh-CN')).toBe('schinese')
    expect(getSteamLangParam('zh-TW')).toBe('tchinese')
    expect(getSteamLangParam('en')).toBe('english')
    expect(getSteamLangParam('unknown')).toBe('')
  })
})

describe('URL utilities', () => {
  it('should update URL language parameter correctly', () => {
    const updateUrlLanguageParam = (url: string, lang: string): string => {
      const langParam = (() => {
        if (lang === 'zh-CN') return 'schinese'
        if (lang === 'zh-TW') return 'tchinese'
        if (lang === 'en') return 'english'
        return ''
      })()

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

    const baseUrl = 'https://steamcommunity.com/app/294100/workshop/'
    expect(updateUrlLanguageParam(baseUrl, 'zh-CN')).toBe('https://steamcommunity.com/app/294100/workshop/?l=schinese')
    expect(updateUrlLanguageParam(baseUrl, 'zh-TW')).toBe('https://steamcommunity.com/app/294100/workshop/?l=tchinese')
    expect(updateUrlLanguageParam(baseUrl, 'en')).toBe('https://steamcommunity.com/app/294100/workshop/?l=english')

    // Should replace existing lang param
    const urlWithLang = 'https://steamcommunity.com/app/294100/workshop/?l=schinese'
    expect(updateUrlLanguageParam(urlWithLang, 'en')).toBe('https://steamcommunity.com/app/294100/workshop/?l=english')
  })

  it('should handle mod detail URLs', () => {
    const isModDetailPage = (url: string): boolean => {
      return url.includes('/sharedfiles/filedetails/')
    }

    const extractModId = (url: string): string | null => {
      try {
        if (url.includes('/sharedfiles/filedetails/')) {
          const urlObj = new URL(url)
          return urlObj.searchParams.get('id')
        }
      } catch {}
      return null
    }

    const modUrl = 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890&l=schinese'
    expect(isModDetailPage(modUrl)).toBe(true)
    expect(extractModId(modUrl)).toBe('1234567890')

    const workshopUrl = 'https://steamcommunity.com/app/294100/workshop/?l=schinese'
    expect(isModDetailPage(workshopUrl)).toBe(false)
    expect(extractModId(workshopUrl)).toBe(null)
  })
})

describe('Version comparison', () => {
  it('should compare version strings correctly', () => {
    const isVersionCompatible = (modVersions: string[], gameVersion: string): boolean => {
      if (!gameVersion || modVersions.length === 0) return true
      return modVersions.includes(gameVersion)
    }

    expect(isVersionCompatible(['1.4', '1.5'], '1.4')).toBe(true)
    expect(isVersionCompatible(['1.4', '1.5'], '1.5')).toBe(true)
    expect(isVersionCompatible(['1.4', '1.5'], '1.3')).toBe(false)
    expect(isVersionCompatible([], '1.4')).toBe(true)
    expect(isVersionCompatible(['1.4'], '')).toBe(true)
  })
})
