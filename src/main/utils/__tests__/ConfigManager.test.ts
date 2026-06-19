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
  let data: Record<string, any> = {}
  let defaults: Record<string, any> = {}
  return {
    get data() { return data },
    set data(v: Record<string, any>) { data = v },
    get defaults() { return defaults },
    set defaults(v: Record<string, any>) { defaults = v },
    reset() { data = {} }
  }
})

vi.mock('electron-store', () => ({
  default: class MockStore {
    constructor(opts?: any) {
      storeState.defaults = opts?.defaults || {}
      for (const [key, value] of Object.entries(storeState.defaults)) {
        if (!(key in storeState.data)) {
          storeState.data[key] = typeof value === 'object' && value !== null
            ? JSON.parse(JSON.stringify(value))
            : value
        }
      }
    }
    get(key?: any) {
      if (key === undefined) return { ...storeState.defaults, ...storeState.data }
      return key in storeState.data ? storeState.data[key] : storeState.defaults[key]
    }
    set(key: any, value?: any) {
      if (typeof key === 'object') Object.assign(storeState.data, key)
      else storeState.data[key] = value
    }
    clear() { storeState.data = {} }
    get store() { return { ...storeState.defaults, ...storeState.data } }
  }
}))

// Mock SecureStorage
vi.mock('../SecureStorage', () => ({
  encryptSecret: vi.fn((text: string) => `encrypted:${text}`),
  decryptSecret: vi.fn((encrypted: string) => {
    if (encrypted.startsWith('encrypted:')) return encrypted.slice(10)
    return null
  }),
  isEncryptedBlob: vi.fn((value: string) => value.startsWith('encrypted:'))
}))

import { configManager } from '../ConfigManager'

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
      expect(storeState.data.git.githubToken).toBe('encrypted:ghp_real_token_123')
    })

    it('should decrypt githubToken on get', () => {
      // Set encrypted value directly in store
      storeState.data.git = {
        enabled: true,
        autoCommit: true,
        githubToken: 'encrypted:ghp_real_token_456'
      }

      const git = configManager.get('git')
      expect(git.githubToken).toBe('ghp_real_token_456')
    })

    it('should not re-encrypt an already encrypted token', () => {
      configManager.set('git', {
        enabled: true,
        autoCommit: true,
        githubToken: 'encrypted:already_encrypted'
      })

      // Should not double-encrypt
      expect(storeState.data.git.githubToken).toBe('encrypted:already_encrypted')
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
        modsPaths: [
          { id: '1', name: 'Default', path: 'C:\\Mods', isActive: false }
        ],
        autoCheckUpdates: false
      }

      const active = configManager.getActiveModsPath()
      expect(active).toBeUndefined()
    })
  })
})
