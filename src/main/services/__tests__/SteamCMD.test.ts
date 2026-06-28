import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Electron + electron-store before any imports that depend on them
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => 'C:\\Users\\test\\AppData'), getName: vi.fn(() => 'test') },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((t: string) => Buffer.from(t)),
    decryptString: vi.fn((b: Buffer) => b.toString())
  },
  dialog: { showErrorBox: vi.fn() }
}))

vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      store: Record<string, unknown> = {}
      get(key?: string) {
        return key ? this.store[key] : this.store
      }
      set(key: string | Record<string, unknown>, val?: unknown) {
        if (typeof key === 'object') Object.assign(this.store, key)
        else this.store[key] = val
      }
      clear() {
        this.store = {}
      }
    }
  }
})

// Mock the ConfigManager module that SteamCMD.ts imports
// Path must match SteamCMD.ts's import path exactly for vitest to intercept
vi.mock('../../utils/ConfigManager', () => ({
  configManager: {
    get: vi.fn(() => ({
      steamcmd: { executablePath: '', downloadPath: '' }
    })),
    getActiveModsPath: vi.fn()
  }
}))

import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { mkdirSync, rmSync } from 'fs'
import { buildArgs, parseProgressLine, determineResult, SteamCMD, SteamCMDError } from '../SteamCMD'

// ─── Pure function tests (no mocking needed) ─────────────────────────────

describe('buildArgs', () => {
  it('should produce correct SteamCMD arguments', () => {
    const args = buildArgs('12345')
    expect(args).toEqual([
      '+login',
      'anonymous',
      '+workshop_download_item',
      '294100',
      '12345',
      '+quit'
    ])
  })
})

describe('parseProgressLine', () => {
  it('should parse progress with current/total', () => {
    const result = parseProgressLine('Downloading update (50 of 100)')
    expect(result).toEqual({ type: 'progress', current: 50, total: 100, percent: 50 })
  })

  it('should parse progress at 0%', () => {
    const result = parseProgressLine('Downloading update (0 of 200)')
    expect(result).toEqual({ type: 'progress', current: 0, total: 200, percent: 0 })
  })

  it('should parse progress at 100%', () => {
    const result = parseProgressLine('Downloading update (100 of 100)')
    expect(result).toEqual({ type: 'progress', current: 100, total: 100, percent: 100 })
  })

  it('should detect success indicator', () => {
    expect(parseProgressLine('Success. Downloaded item 12345')).toEqual({ type: 'success' })
  })

  it('should detect zero-byte download as success', () => {
    expect(parseProgressLine('Downloading update (0 of 0)')).toEqual({ type: 'success' })
  })

  it('should return none for empty line', () => {
    expect(parseProgressLine('')).toEqual({ type: 'none' })
  })

  it('should return none for unrelated output', () => {
    expect(parseProgressLine('Connecting to Steam...')).toEqual({ type: 'none' })
  })

  it('should handle lines with leading/trailing whitespace', () => {
    const result = parseProgressLine('  Downloading update (10 of 50)  ')
    expect(result.type).toBe('progress')
    expect(result.percent).toBe(20)
  })
})

// ─── determineResult tests (uses real temp dirs for existsSync) ──────────

describe('determineResult', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `steamcmd-result-test-${randomUUID()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup for temporary test directories.
    }
  })

  it('should succeed when exit 0 and file exists', () => {
    mkdirSync(join(testDir, '123'), { recursive: true })
    const result = determineResult({
      exitCode: 0,
      stdout: 'Success',
      stderr: '',
      modId: '123',
      downloadPath: testDir
    })
    expect(result.success).toBe(true)
    expect(result.downloadPath).toContain('123')
  })

  it('should fail when file does not exist despite exit 0', () => {
    const result = determineResult({
      exitCode: 0,
      stdout: 'Success',
      stderr: '',
      modId: '999',
      downloadPath: testDir
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('should fail on non-zero exit code', () => {
    const result = determineResult({
      exitCode: 1,
      stdout: '',
      stderr: 'ERROR: login failed',
      modId: '123',
      downloadPath: testDir
    })
    expect(result.success).toBe(false)
    // ERROR indicator takes priority over exit code in message
    expect(result.error).toContain('login failed')
  })

  it('should fail when ERROR in stdout even with exit 0', () => {
    mkdirSync(join(testDir, '456'), { recursive: true })
    const result = determineResult({
      exitCode: 0,
      stdout: 'ERROR: App 294100 not found',
      stderr: '',
      modId: '456',
      downloadPath: testDir
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('ERROR')
  })

  it('should extract first ERROR line from stderr', () => {
    const result = determineResult({
      exitCode: 1,
      stdout: '',
      stderr: 'ERROR: specific failure\nmore stuff',
      modId: '789',
      downloadPath: testDir
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('specific failure')
  })
})

// ─── SteamCMD class tests ────────────────────────────────────────────────

describe('SteamCMD', () => {
  let steamCMD: InstanceType<typeof SteamCMD>

  beforeEach(() => {
    vi.clearAllMocks()
    steamCMD = new SteamCMD()
  })

  describe('modId validation', () => {
    it('should reject non-numeric modId', async () => {
      await expect(steamCMD.downloadMod('abc')).rejects.toThrow(SteamCMDError)
    })

    it('should reject modId with shell metacharacters', async () => {
      await expect(steamCMD.downloadMod('123;rm -rf /')).rejects.toThrow('Invalid mod ID')
    })

    it('should reject empty modId', async () => {
      await expect(steamCMD.downloadMod('')).rejects.toThrow('Invalid mod ID')
    })

    it('should accept numeric modId (fails at validate, not modId check)', async () => {
      // modId passes validation, then fails at SteamCMD validate() since exe path is empty
      const result = await steamCMD.downloadMod('12345')
      expect(result.modId).toBe('12345')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })
})
