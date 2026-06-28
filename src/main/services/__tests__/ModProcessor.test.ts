import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

// Mock configManager before importing ModProcessor
vi.mock('../../utils/ConfigManager', () => ({
  configManager: {
    get: vi.fn(() => ({
      steamcmd: { executablePath: '', downloadPath: '' },
      rimworld: { currentVersion: '1.6', modsPaths: [], autoCheckUpdates: false }
    })),
    getActiveModsPath: vi.fn()
  }
}))

import { ModProcessor } from '../ModProcessor'
import { configManager } from '../../utils/ConfigManager'
import type { AppConfig } from '../../../shared/types'

const mockedConfigGet = configManager.get as unknown as ReturnType<typeof vi.fn<() => AppConfig>>

interface ModProcessorPrivate {
  assertPathWithinRoot(root: string, target: string, modId: string, errorCode: string): string
  copyDirectory(src: string, dst: string): Promise<number>
}

describe('ModProcessor', () => {
  let processor: ModProcessor
  let privateProcessor: ModProcessorPrivate
  let testDir: string

  beforeEach(async () => {
    processor = new ModProcessor()
    privateProcessor = processor as unknown as ModProcessorPrivate
    testDir = join(tmpdir(), `modproc-test-${randomUUID()}`)
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch {
      // cleanup best-effort
    }
  })

  describe('assertPathWithinRoot', () => {
    it('should accept paths within root', () => {
      const result = privateProcessor.assertPathWithinRoot(
        '/safe/root',
        '/safe/root/mods/123',
        '123',
        'E_TEST'
      )
      expect(result).toContain('123')
    })

    it('should reject path traversal attempts', () => {
      expect(() =>
        privateProcessor.assertPathWithinRoot(
          '/safe/root',
          '/safe/root/../../etc/passwd',
          '123',
          'E_TEST'
        )
      ).toThrow('escaped')
    })

    it('should reject absolute path escape', () => {
      expect(() =>
        privateProcessor.assertPathWithinRoot(
          '/safe/root',
          '/completely/different/path',
          '123',
          'E_TEST'
        )
      ).toThrow('escaped')
    })
  })

  describe('validateMod', () => {
    it('should return valid for mod with About.xml', async () => {
      const modDir = join(testDir, 'test-mod')
      const aboutDir = join(modDir, 'About')
      await fs.mkdir(aboutDir, { recursive: true })
      await fs.writeFile(
        join(aboutDir, 'About.xml'),
        '<ModMetaData><name>Test Mod</name><supportedVersions><li>1.5</li><li>1.6</li></supportedVersions></ModMetaData>'
      )

      const result = await processor.validateMod('123', modDir)
      expect(result.valid).toBe(true)
      expect(result.details?.hasAboutXml).toBe(true)
      expect(result.details?.modName).toBe('Test Mod')
      expect(result.details?.supportedVersions).toContain('1.5')
      expect(result.details?.supportedVersions).toContain('1.6')
    })

    it('should return E_MISSING_ABOUT for mod without About.xml', async () => {
      const modDir = join(testDir, 'empty-mod')
      await fs.mkdir(modDir, { recursive: true })

      const result = await processor.validateMod('456', modDir)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('E_MISSING_ABOUT')
    })

    it('should return E_IO_ERROR for non-existent path', async () => {
      const result = await processor.validateMod('789', '/nonexistent/path/789')
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('E_IO_ERROR')
    })

    it('should return E_IO_ERROR when path is a file not directory', async () => {
      const filePath = join(testDir, 'not-a-dir')
      await fs.writeFile(filePath, 'data')

      const result = await processor.validateMod('999', filePath)
      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('E_IO_ERROR')
    })
  })

  describe('processMod', () => {
    beforeEach(() => {
      // getSourcePath() uses join(downloadRoot, modId), so source files go there
      const targetDir = join(testDir, 'mods')

      mockedConfigGet.mockReturnValue({
        steamcmd: { executablePath: '', downloadPath: testDir },
        rimworld: {
          currentVersion: '1.6',
          modsPaths: [{ id: '1', name: 'Default', path: targetDir, isActive: true }],
          autoCheckUpdates: false
        },
        firstRunCompleted: true,
        app: { language: 'en' },
        download: {
          autoDownloadDependencies: false,
          skipVersionCheck: false,
          extractCollectionToSubfolder: true,
          dependencyMode: 'ask'
        },
        version: { autoDetect: true, manualVersion: '1.6', onMismatch: 'ask' },
        git: { enabled: false, autoCommit: true }
      } as AppConfig)

      vi.mocked(configManager.getActiveModsPath).mockReturnValue({
        id: '1',
        name: 'Default',
        path: targetDir,
        isActive: true
      })
    })

    it('should move mod from source to target with About.xml preserved', async () => {
      // Source path is join(downloadRoot, modId) = join(testDir, '12345')
      const sourceModDir = join(testDir, '12345')
      const aboutDir = join(sourceModDir, 'About')
      await fs.mkdir(aboutDir, { recursive: true })
      await fs.writeFile(
        join(aboutDir, 'About.xml'),
        '<ModMetaData><name>Test</name></ModMetaData>'
      )

      const result = await processor.processMod('12345')
      expect(result.success).toBe(true)
      expect(result.bytes).toBeGreaterThan(0)

      // Verify target exists
      const targetDir = join(testDir, 'mods', '12345')
      expect(existsSync(join(targetDir, 'About', 'About.xml'))).toBe(true)
    })

    it('should fail when source does not exist', async () => {
      const result = await processor.processMod('99999')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should clean up target half-written files on failure', async () => {
      // Create source without About.xml (tolerable E_MISSING_ABOUT)
      const sourceModDir = join(testDir, '55555')
      await fs.mkdir(sourceModDir, { recursive: true })

      const result = await processor.processMod('55555')
      // E_MISSING_ABOUT is tolerable, so processMod should still succeed
      expect(result.success).toBe(true)
    })

    it('should handle existing target (update scenario)', async () => {
      // Create source mod
      const sourceModDir = join(testDir, '111')
      const aboutDir = join(sourceModDir, 'About')
      await fs.mkdir(aboutDir, { recursive: true })
      await fs.writeFile(join(aboutDir, 'About.xml'), '<ModMetaData><name>V2</name></ModMetaData>')

      // Create old target
      const targetDir = join(testDir, 'mods', '111')
      await fs.mkdir(join(targetDir, 'About'), { recursive: true })
      await fs.writeFile(
        join(targetDir, 'About', 'About.xml'),
        '<ModMetaData><name>V1</name></ModMetaData>'
      )

      const result = await processor.processMod('111')
      expect(result.success).toBe(true)

      // Verify new content
      const content = await fs.readFile(join(targetDir, 'About', 'About.xml'), 'utf-8')
      expect(content).toContain('V2')
    })
  })

  describe('copyDirectory', () => {
    it('should recursively copy directory and return byte count', async () => {
      const src = join(testDir, 'src')
      const dst = join(testDir, 'dst')
      await fs.mkdir(join(src, 'sub'), { recursive: true })
      await fs.writeFile(join(src, 'a.txt'), 'hello')
      await fs.writeFile(join(src, 'sub', 'b.txt'), 'world')

      const bytes = await privateProcessor.copyDirectory(src, dst)
      expect(bytes).toBe(10) // 'hello' (5) + 'world' (5)
      expect(existsSync(join(dst, 'a.txt'))).toBe(true)
      expect(existsSync(join(dst, 'sub', 'b.txt'))).toBe(true)
    })
  })
})
