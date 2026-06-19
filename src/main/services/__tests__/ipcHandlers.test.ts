import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('../SteamCMD', () => {
  const { EventEmitter } = require('events')
  const emitter = new EventEmitter()
  return {
    steamCMD: Object.assign(emitter, { downloadMod: vi.fn() }),
    DownloadProgress: {}
  }
})

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

import { setupIpcHandlers, assertValidModId, assertValidConfigKey } from '../../ipcHandlers'
import { steamCMD } from '../SteamCMD'
import { modProcessor } from '../ModProcessor'
import { ipcMain, BrowserWindow } from 'electron'

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

describe('mod:downloadBatch error contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Defaults: full success path
    vi.mocked(steamCMD.downloadMod).mockResolvedValue({
      success: true,
      modId: '1',
      downloadPath: '/tmp/dl'
    })
    vi.mocked(modProcessor.processMod).mockResolvedValue({
      success: true,
      modId: '1',
      sourcePath: '/tmp/dl',
      targetPath: '/mods/1'
    })
    vi.mocked(modProcessor.validateMod).mockResolvedValue({
      valid: true,
      modId: '1',
      details: { hasAboutXml: true, modName: 'Test', supportedVersions: ['1.5'] }
    })
  })

  it('returns only successful items; failed items emit download:error and do not abort the batch', async () => {
    setupIpcHandlers()

    const batchHandler = vi.mocked(ipcMain.handle).mock.calls.find(
      (c) => c[0] === 'mod:downloadBatch'
    )?.[1] as
      | ((event: unknown, args: {
          items: Array<{ id: string; name?: string; isCollection?: boolean }>
        }) => Promise<unknown>)
      | undefined

    expect(batchHandler).toBeDefined()

    // Item 2 fails at the SteamCMD step; items 1 and 3 succeed.
    vi.mocked(steamCMD.downloadMod)
      .mockResolvedValueOnce({ success: true, modId: '1', downloadPath: '/tmp/dl' })
      .mockResolvedValueOnce({ success: false, modId: '2', error: 'SteamCMD error' })
      .mockResolvedValueOnce({ success: true, modId: '3', downloadPath: '/tmp/dl' })

    const webContentsSend = vi.fn()
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValueOnce({
      isDestroyed: () => false,
      webContents: { send: webContentsSend }
    } as unknown as Electron.BrowserWindow)

    const results = (await batchHandler!({ sender: {} }, {
      items: [
        { id: '1', name: 'Mod1', isCollection: false },
        { id: '2', name: 'Mod2', isCollection: false },
        { id: '3', name: 'Mod3', isCollection: false }
      ]
    })) as Array<{ id: string }>

    // Only successful items appear in the resolved array (no fabricated error metadata)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.id)).toEqual(['1', '3'])

    // download:error emitted exactly once, for the failed item only
    const errorCalls = webContentsSend.mock.calls.filter((c) => c[0] === 'download:error')
    expect(errorCalls).toHaveLength(1)
    expect(errorCalls[0][1]).toEqual({ id: '2', error: 'SteamCMD error' })
  })
})
