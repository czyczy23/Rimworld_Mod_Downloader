import { describe, it, expect, vi } from 'vitest'

// Mock electron and dependencies before importing
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => 'C:\\test'), getLocale: vi.fn(() => 'en-US'), getName: vi.fn(() => 'test') },
  ipcMain: { handle: vi.fn() },
  BrowserWindow: { fromWebContents: vi.fn(() => null), getFocusedWindow: vi.fn(() => null) },
  dialog: { showOpenDialog: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((t: string) => Buffer.from(t)),
    decryptString: vi.fn((b: Buffer) => b.toString())
  }
}))

vi.mock('electron-store', () => ({
  default: class MockStore {
    store: any = {}
    get(key?: any) { return key ? this.store[key] : this.store }
    set(key: any, val?: any) { if (typeof key === 'object') Object.assign(this.store, key); else this.store[key] = val }
    clear() { this.store = {} }
  }
}))

vi.mock('../../utils/ConfigManager', () => ({
  configManager: { get: vi.fn(), set: vi.fn(), getActiveModsPath: vi.fn() }
}))

vi.mock('../SteamCMD', () => ({
  steamCMD: new (require('events').EventEmitter)(),
  DownloadProgress: {}
}))

vi.mock('../ModProcessor', () => ({
  modProcessor: { processMod: vi.fn(), validateMod: vi.fn() }
}))

vi.mock('../WorkshopScraper', () => ({
  workshopScraper: { scrapeModVersion: vi.fn() }
}))

vi.mock('../../utils/AutoUpdater', () => ({
  autoUpdaterManager: { init: vi.fn(), checkForUpdates: vi.fn() }
}))

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}))

import { assertValidModId, assertValidConfigKey } from '../../ipcHandlers'

describe('assertValidModId', () => {
  it('should accept numeric modId', () => {
    expect(() => assertValidModId('12345')).not.toThrow()
    expect(() => assertValidModId('0')).not.toThrow()
  })

  it('should reject non-numeric modId', () => {
    expect(() => assertValidModId('abc')).toThrow('Invalid mod ID')
    expect(() => assertValidModId('')).toThrow('Invalid mod ID')
  })

  it('should reject modId with shell metacharacters', () => {
    expect(() => assertValidModId('123;rm -rf /')).toThrow('Invalid mod ID')
    expect(() => assertValidModId('123 && evil')).toThrow('Invalid mod ID')
  })

  it('should reject modId with spaces', () => {
    expect(() => assertValidModId('123 456')).toThrow('Invalid mod ID')
  })
})

describe('assertValidConfigKey', () => {
  it('should accept valid config keys', () => {
    const validKeys = ['firstRunCompleted', 'app', 'steamcmd', 'rimworld', 'download', 'version', 'git']
    for (const key of validKeys) {
      expect(() => assertValidConfigKey(key)).not.toThrow()
    }
  })

  it('should reject invalid config keys', () => {
    expect(() => assertValidConfigKey('evil')).toThrow('Invalid config key')
    expect(() => assertValidConfigKey('__proto__')).toThrow('Invalid config key')
    expect(() => assertValidConfigKey('')).toThrow('Invalid config key')
  })

  it('should reject prototype pollution attempts', () => {
    expect(() => assertValidConfigKey('constructor')).toThrow('Invalid config key')
    expect(() => assertValidConfigKey('prototype')).toThrow('Invalid config key')
  })
})
