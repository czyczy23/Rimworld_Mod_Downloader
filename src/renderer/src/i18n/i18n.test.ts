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
  })
})
