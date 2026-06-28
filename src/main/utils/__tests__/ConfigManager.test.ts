import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => 'C:\\Users\\test\\AppData\\Roaming\\test'),
    getName: vi.fn(() => 'test')
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((text: string) => Buffer.from(`enc:${text}`)),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString()
      if (str.startsWith('enc:')) return str.slice(4)
      throw new Error('Decryption failed')
    })
  }
}))

// Hoisted shared state so vi.mock factory can access it
const storeState = vi.hoisted(() => {
  let data: Record<string, unknown> = {}
  let defaults: Record<string, unknown> = {}
  return {
    get data() {
      return data
    },
    set data(v: Record<string, unknown>) {
      data = v
    },
    get defaults() {
      return defaults
    },
    set defaults(v: Record<string, unknown>) {
      defaults = v
    },
    reset() {
      data = {}
    }
  }
})

vi.mock('electron-store', () => ({
  default: class MockStore {
    constructor(opts?: { defaults?: Record<string, unknown> }) {
      storeState.defaults = opts?.defaults || {}
      for (const [key, value] of Object.entries(storeState.defaults)) {
        if (!(key in storeState.data)) {
          storeState.data[key] =
            typeof value === 'object' && value !== null ? JSON.parse(JSON.stringify(value)) : value
        }
      }
    }
    get(key?: string) {
      if (key === undefined) return { ...storeState.defaults, ...storeState.data }
      return key in storeState.data ? storeState.data[key] : storeState.defaults[key]
    }
    set(key: string | Record<string, unknown>, value?: unknown) {
      if (typeof key === 'object') Object.assign(storeState.data, key)
      else storeState.data[key] = value
    }
    clear() {
      storeState.data = {}
    }
    get store() {
      return { ...storeState.defaults, ...storeState.data }
    }
  }
}))

// Mock SecureStorage with enc:v1: prefix format
vi.mock('../SecureStorage', () => ({
  encryptSecret: vi.fn((text: string) => `enc:v1:${text}`),
  decryptSecret: vi.fn((encrypted: string) => {
    if (encrypted.startsWith('enc:v1:')) return encrypted.slice(7)
    return null
  }),
  isEncryptedBlob: vi.fn((value: string) => value.startsWith('enc:v1:'))
}))

import { configManager } from '../ConfigManager'
import type { AppConfig } from '../../../shared/types'

function storedGitConfig(): AppConfig['git'] {
  return storeState.data.git as AppConfig['git']
}

describe('ConfigManager', () => {
  beforeEach(() => {
    storeState.reset()
    vi.clearAllMocks()
  })

  describe('get / set', () => {
    it('should return the full config when no key given', () => {
      const config = configManager.get()
      expect(config).toBeDefined()
      expect(config.app).toBeDefined()
      expect(config.steamcmd).toBeDefined()
    })

    it('should return specific key value', () => {
      const app = configManager.get('app')
      expect(app).toBeDefined()
      expect(app.language).toBeDefined()
    })

    it('should set and get a value', () => {
      configManager.set('app', { language: 'en' })
      expect(configManager.get('app').language).toBe('en')
    })
  })

  describe('git token encryption', () => {
    it('should encrypt githubToken on set', () => {
      configManager.set('git', {
        enabled: true,
        autoCommit: true,
        githubToken: 'ghp_real_token_123'
      })

      // The raw store should have the encrypted version
      expect(storedGitConfig().githubToken).toBe('enc:v1:ghp_real_token_123')
    })

    it('should not expose decrypted githubToken in renderer config', () => {
      // Set encrypted value directly in store
      storeState.data.git = {
        enabled: true,
        autoCommit: true,
        githubToken: 'enc:v1:ghp_real_token_456'
      }

      const git = configManager.getForRenderer('git')
      expect(git.githubToken).toBeUndefined()
      expect(git.hasToken).toBe(true)
      expect(git.tokenPreview).toBe('ghp_****_456')
    })

    it('should decrypt githubToken only for main-process consumers', () => {
      storeState.data.git = {
        enabled: true,
        autoCommit: true,
        githubToken: 'enc:v1:ghp_real_token_456'
      }

      const git = configManager.getDecryptedGitConfig()
      expect(git.githubToken).toBe('ghp_real_token_456')
    })

    it('should not re-encrypt an already encrypted token', () => {
      // When isEncryptedBlob returns true, encryptGitToken skips encryption
      const token = 'enc:v1:already_encrypted'
      configManager.set('git', {
        enabled: true,
        autoCommit: true,
        githubToken: token
      })

      // isEncryptedBlob mock returns true for enc:v1: prefix, so no re-encryption
      expect(storedGitConfig().githubToken).toBe(token)
    })

    it('should handle missing githubToken gracefully', () => {
      configManager.set('git', {
        enabled: false,
        autoCommit: true
      })

      const git = configManager.get('git')
      expect(git.githubToken).toBeUndefined()
    })
  })

  describe('getActiveModsPath', () => {
    it('should return active mods path', () => {
      storeState.data.rimworld = {
        currentVersion: '1.6',
        modsPaths: [
          { id: '1', name: 'Default', path: 'C:\\Mods', isActive: false },
          { id: '2', name: 'Active', path: 'C:\\ActiveMods', isActive: true }
        ],
        autoCheckUpdates: false
      }

      const active = configManager.getActiveModsPath()
      expect(active).toBeDefined()
      expect(active?.path).toBe('C:\\ActiveMods')
      expect(active?.name).toBe('Active')
    })

    it('should return undefined when no active path', () => {
      storeState.data.rimworld = {
        currentVersion: '1.6',
        modsPaths: [{ id: '1', name: 'Default', path: 'C:\\Mods', isActive: false }],
        autoCheckUpdates: false
      }

      const active = configManager.getActiveModsPath()
      expect(active).toBeUndefined()
    })
  })
})
