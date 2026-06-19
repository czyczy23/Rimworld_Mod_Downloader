import { describe, it, expect } from 'vitest'
import { validateConfigValue } from '../configSchema'

describe('configSchema', () => {
  describe('steamcmd validation', () => {
    it('should accept valid steamcmd config', () => {
      expect(() =>
        validateConfigValue('steamcmd', {
          executablePath: 'C:\\SteamCMD\\steamcmd.exe',
          downloadPath: 'C:\\SteamCMD\\steamapps'
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
          downloadPath: 'C:\\safe\\..\\..\\Windows\\evil'
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

    it('should reject non-boolean enabled', () => {
      expect(() =>
        validateConfigValue('git', { enabled: 'yes', autoCommit: true })
      ).toThrow()
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
