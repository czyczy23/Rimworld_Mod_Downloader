/**
 * Language utility functions extracted for testability.
 */

/** Map any locale string to one of our supported languages */
export const mapToSupportedLanguage = (locale: string): 'en' | 'zh-TW' | 'zh-CN' => {
  const lower = locale.toLowerCase().replace('_', '-')
  if (lower.startsWith('zh')) {
    if (lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh-hans') {
      return 'zh-CN'
    }
    return 'zh-TW'
  }
  return 'en'
}

/** Get the Steam language parameter string for a given app language code */
export const getSteamLangParam = (lang: string): string => {
  if (lang === 'zh-CN') return 'schinese'
  if (lang === 'zh-TW') return 'tchinese'
  if (lang === 'en') return 'english'
  return ''
}
