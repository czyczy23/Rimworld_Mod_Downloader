/**
 * URL utility functions extracted for testability.
 */

import { getSteamLangParam } from './language'

/**
 * Update (or add/remove) the `l` language query parameter in a URL.
 * Returns the original URL unchanged if parsing fails.
 */
export const updateUrlLanguageParam = (url: string, lang: string): string => {
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

/**
 * Check if a URL is a Steam Workshop mod detail page.
 */
export const isModDetailPage = (url: string): boolean => {
  return url.includes('/sharedfiles/filedetails/')
}

/**
 * Extract the mod ID from a Steam Workshop mod detail page URL.
 * Returns undefined if the URL is not a mod detail page or has no `id` param.
 */
export const extractModId = (url: string): string | undefined => {
  if (!isModDetailPage(url)) return undefined
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('id') || undefined
  } catch {
    return undefined
  }
}
