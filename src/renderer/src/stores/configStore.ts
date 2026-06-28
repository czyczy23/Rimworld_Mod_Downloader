import { create } from 'zustand'
import type { AppConfig } from '../../../shared/types'

interface ConfigState {
  config: AppConfig | null
  gameVersion: string
  setConfig: (config: AppConfig | null) => void
  loadConfig: () => Promise<AppConfig | null>
  saveConfigValue: <K extends keyof AppConfig>(
    key: K,
    value: AppConfig[K]
  ) => Promise<AppConfig | null>
  refreshGameVersion: () => Promise<string>
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  gameVersion: '',

  setConfig: (config) => set({ config }),

  loadConfig: async () => {
    if (!window.api) {
      set({ config: null })
      return null
    }

    const config = await window.api.getConfig()
    set({ config })
    return config
  },

  saveConfigValue: async (key, value) => {
    if (!window.api) {
      return get().config
    }

    await window.api.setConfig(key, value)

    const currentConfig = get().config
    if (!currentConfig) {
      return get().loadConfig()
    }

    const config = {
      ...currentConfig,
      [key]: value
    }
    set({ config })
    return config
  },

  refreshGameVersion: async () => {
    if (!window.api) {
      set({ gameVersion: '' })
      return ''
    }

    try {
      const gameVersion = await window.api.detectGameVersion()
      set({ gameVersion })
      return gameVersion
    } catch {
      set({ gameVersion: '' })
      return ''
    }
  }
}))
