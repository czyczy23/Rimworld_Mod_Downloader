import { describe, it, expect } from 'vitest'
import { validateConfig, validateConfigValue } from '../configSchema'
import { resolve } from 'path'
import type { AppConfig } from '../types'

// Platform-appropriate absolute paths (resolve() produces Windows or Linux paths).
const VALID_EXE = resolve('steamcmd', 'steamcmd.exe')
const VALID_DL = resolve('steamcmd', 'steamapps')

// Build a path that is absolute AND contains '..'; use string concat because
// path.join() would resolve the '..' away and the assertion would never match.
const SEP = process.platform === 'win32' ? '\\' : '/'
const TRAVERSAL = resolve('safe') + SEP + '..' + SEP + '..' + SEP + 'evil'

const VALID_CONFIG: AppConfig = {
  firstRunCompleted: true,
  app: {
    language: 'system'
  },
  steamcmd: {
    executablePath: VALID_EXE,
    downloadPath: VALID_DL
  },
  rimworld: {
    currentVersion: '1.5',
    modsPaths: [],
    autoCheckUpdates: true
  },
  download: {
    autoDownloadDependencies: false,
    skipVersionCheck: false,
    extractCollectionToSubfolder: true,
    dependencyMode: 'ask'
  },
  version: {
    autoDetect: true,
    manualVersion: '',
    onMismatch: 'ask'
  },
  git: {
    enabled: false,
    autoCommit: false
  }
}

describe('configSchema', () => {
  describe('full config validation', () => {
    it('should accept a valid full config', () => {
      expect(() => validateConfig(VALID_CONFIG)).not.toThrow()
    })

    it('should reject invalid nested sections before persistence begins', () => {
      expect(() =>
        validateConfig({
          ...VALID_CONFIG,
          version: {
            ...VALID_CONFIG.version,
            onMismatch: 'invalid' as AppConfig['version']['onMismatch']
          }
        })
      ).toThrow('version.onMismatch')
    })
  })

  describe('steamcmd validation', () => {
    it('should accept valid steamcmd config', () => {
      expect(() =>
        validateConfigValue('steamcmd', {
          executablePath: VALID_EXE,
          downloadPath: VALID_DL
        })
      ).not.toThrow()
    })

    it('should accept empty paths (not yet configured)', () => {
      expect(() =>
        validateConfigValue('steamcmd', {
          executablePath: '',
          downloadPath: ''
        })
      ).not.toThrow()
    })

    it('should reject relative executablePath', () => {
      expect(() =>
        validateConfigValue('steamcmd', {
          executablePath: 'steamcmd.exe',
          downloadPath: ''
        })
      ).toThrow('absolute path')
    })

    it('should reject path traversal in downloadPath', () => {
      expect(() =>
        validateConfigValue('steamcmd', {
          executablePath: '',
          downloadPath: TRAVERSAL
        })
      ).toThrow('..')
    })

    it('should reject non-object steamcmd', () => {
      expect(() => validateConfigValue('steamcmd', 'not-an-object')).toThrow()
      expect(() => validateConfigValue('steamcmd', null)).toThrow()
    })
  })

  describe('app validation', () => {
    it('should accept valid app config', () => {
      expect(() => validateConfigValue('app', { language: 'zh-CN' })).not.toThrow()
      expect(() => validateConfigValue('app', { language: 'system' })).not.toThrow()
    })

    it('should reject invalid language', () => {
      expect(() => validateConfigValue('app', { language: 'fr' })).toThrow()
    })
  })

  describe('git validation', () => {
    it('should accept valid git config', () => {
      expect(() =>
        validateConfigValue('git', {
          enabled: false,
          autoCommit: true,
          githubToken: 'ghp_abc123'
        })
      ).not.toThrow()
    })

    it('should accept renderer-safe git token metadata', () => {
      expect(() =>
        validateConfigValue('git', {
          enabled: true,
          autoCommit: false,
          hasToken: true,
          tokenPreview: 'ghp_****c123',
          remoteUrl: 'https://github.com/example/repo.git'
        })
      ).not.toThrow()
    })

    it('should reject non-boolean enabled', () => {
      expect(() => validateConfigValue('git', { enabled: 'yes', autoCommit: true })).toThrow()
    })

    it('should reject malformed renderer-safe git token metadata', () => {
      expect(() =>
        validateConfigValue('git', {
          enabled: true,
          autoCommit: false,
          hasToken: 'yes'
        })
      ).toThrow('git.hasToken')
    })
  })

  describe('download validation', () => {
    it('should accept valid download config', () => {
      expect(() =>
        validateConfigValue('download', {
          autoDownloadDependencies: false,
          skipVersionCheck: false,
          extractCollectionToSubfolder: true,
          dependencyMode: 'ask'
        })
      ).not.toThrow()
    })

    it('should reject invalid dependencyMode', () => {
      expect(() =>
        validateConfigValue('download', {
          autoDownloadDependencies: false,
          skipVersionCheck: false,
          extractCollectionToSubfolder: true,
          dependencyMode: 'invalid'
        })
      ).toThrow('dependencyMode')
    })
  })

  describe('null/undefined rejection', () => {
    it('should reject null values for any key', () => {
      expect(() => validateConfigValue('firstRunCompleted', null)).toThrow()
      expect(() => validateConfigValue('app', undefined)).toThrow()
    })
  })
})
