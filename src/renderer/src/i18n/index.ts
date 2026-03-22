import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import zhCN from './locales/zh-CN.json'

const resources = {
  en: { translation: en },
  'zh-TW': { translation: zhTW },
  'zh-CN': { translation: zhCN }
}

// Map any language code to our supported languages
const mapToSupportedLanguage = (locale: string): 'en' | 'zh-TW' | 'zh-CN' => {
  const lower = locale.toLowerCase().replace('_', '-')
  if (lower.startsWith('zh')) {
    // Distinguish between Simplified and Traditional Chinese
    // zh-CN, zh-SG -> Simplified Chinese
    // zh-TW, zh-HK, zh-MO -> Traditional Chinese
    if (lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh-hans') {
      return 'zh-CN'
    }
    return 'zh-TW'
  }
  return 'en'
}

// Detect system language
const detectSystemLanguage = async (): Promise<'en' | 'zh-TW' | 'zh-CN'> => {
  try {
    const systemLocale = await window.api?.getSystemLocale()
    if (systemLocale) {
      return mapToSupportedLanguage(systemLocale)
    }
  } catch (error) {
    console.error('[i18n] Failed to get system locale:', error)
  }
  // Default to Traditional Chinese
  return 'zh-TW'
}

// Resolve effective language from stored preference
const resolveEffectiveLanguage = async (): Promise<'en' | 'zh-TW' | 'zh-CN'> => {
  try {
    const storedLang = await window.api?.getLanguage()
    console.log('[i18n] Stored language:', storedLang)

    if (storedLang === 'system' || storedLang === undefined || storedLang === null) {
      // Detect system language
      return await detectSystemLanguage()
    }

    if (storedLang === 'en' || storedLang === 'zh-TW' || storedLang === 'zh-CN') {
      return storedLang
    }

    // If stored language is something unexpected, detect from system
    return await detectSystemLanguage()
  } catch (error) {
    console.error('[i18n] Failed to get stored language:', error)
    return await detectSystemLanguage()
  }
}

// Initialize i18n
i18n.use(initReactI18next).init({
  resources,
  lng: 'zh-TW', // Default language while loading
  fallbackLng: 'zh-TW',
  interpolation: {
    escapeValue: false
  }
})

// Update language - call this after app config is loaded
export const initLanguage = async () => {
  const lang = await resolveEffectiveLanguage()
  await i18n.changeLanguage(lang)
  console.log(`[i18n] Language initialized to: ${lang}`)
  return lang
}

// Change language and save to config
export const changeLanguage = async (lang: 'en' | 'zh-TW' | 'zh-CN' | 'system') => {
  let effectiveLang: 'en' | 'zh-TW' | 'zh-CN'

  if (lang === 'system') {
    effectiveLang = await detectSystemLanguage()
  } else {
    effectiveLang = lang
  }

  await i18n.changeLanguage(effectiveLang)

  // Save to config
  if (window.api) {
    await window.api.setLanguage(lang)
  }

  console.log(`[i18n] Language changed to: ${effectiveLang} (stored as: ${lang})`)
  return effectiveLang
}

export default i18n
