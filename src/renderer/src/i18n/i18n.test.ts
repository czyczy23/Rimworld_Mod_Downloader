import { describe, it, expect } from 'vitest'
import { mapToSupportedLanguage, getSteamLangParam } from '../utils/language'
import { updateUrlLanguageParam, isModDetailPage, extractModId } from '../utils/url'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, nextPrefix)
  })
}

describe('language utils', () => {
  it('should map language codes correctly', () => {
    expect(mapToSupportedLanguage('en-US')).toBe('en')
    expect(mapToSupportedLanguage('zh-CN')).toBe('zh-CN')
    expect(mapToSupportedLanguage('zh-TW')).toBe('zh-TW')
    expect(mapToSupportedLanguage('zh-Hans')).toBe('zh-CN')
    expect(mapToSupportedLanguage('zh-Hant')).toBe('zh-TW')
    expect(mapToSupportedLanguage('en-GB')).toBe('en')
    expect(mapToSupportedLanguage('ja-JP')).toBe('en')
  })

  it('should handle underscore-separated locales', () => {
    expect(mapToSupportedLanguage('zh_CN')).toBe('zh-CN')
    expect(mapToSupportedLanguage('zh_TW')).toBe('zh-TW')
  })

  it('should map Steam language codes correctly', () => {
    expect(getSteamLangParam('zh-CN')).toBe('schinese')
    expect(getSteamLangParam('zh-TW')).toBe('tchinese')
    expect(getSteamLangParam('en')).toBe('english')
    expect(getSteamLangParam('unknown')).toBe('')
  })
})

describe('locale resources', () => {
  it('keeps all supported locale key sets in sync', () => {
    const expectedKeys = flattenKeys(en).sort()

    expect(flattenKeys(zhCN).sort()).toEqual(expectedKeys)
    expect(flattenKeys(zhTW).sort()).toEqual(expectedKeys)
  })
})

describe('URL utils', () => {
  const baseUrl = 'https://steamcommunity.com/app/294100/workshop/'

  it('should add language parameter to URL', () => {
    expect(updateUrlLanguageParam(baseUrl, 'zh-CN')).toContain('l=schinese')
    expect(updateUrlLanguageParam(baseUrl, 'zh-TW')).toContain('l=tchinese')
    expect(updateUrlLanguageParam(baseUrl, 'en')).toContain('l=english')
  })

  it('should replace existing language parameter', () => {
    const urlWithLang = 'https://steamcommunity.com/app/294100/workshop/?l=schinese'
    expect(updateUrlLanguageParam(urlWithLang, 'en')).toContain('l=english')
  })

  it('should remove language parameter for unknown language', () => {
    const urlWithLang = 'https://steamcommunity.com/app/294100/workshop/?l=schinese'
    const result = updateUrlLanguageParam(urlWithLang, 'unknown')
    expect(result).not.toContain('l=')
  })

  it('should return original URL on parse failure', () => {
    expect(updateUrlLanguageParam('not-a-url', 'en')).toBe('not-a-url')
  })

  it('should detect mod detail pages', () => {
    const modUrl = 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890&l=schinese'
    expect(isModDetailPage(modUrl)).toBe(true)

    const workshopUrl = 'https://steamcommunity.com/app/294100/workshop/?l=schinese'
    expect(isModDetailPage(workshopUrl)).toBe(false)
  })

  it('should extract mod ID from detail page URL', () => {
    const modUrl = 'https://steamcommunity.com/sharedfiles/filedetails/?id=1234567890&l=schinese'
    expect(extractModId(modUrl)).toBe('1234567890')
  })

  it('should return undefined for non-detail URLs', () => {
    const workshopUrl = 'https://steamcommunity.com/app/294100/workshop/'
    expect(extractModId(workshopUrl)).toBeUndefined()
  })
})
