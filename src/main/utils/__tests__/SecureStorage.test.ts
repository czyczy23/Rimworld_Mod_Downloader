import { describe, it, expect, vi } from 'vitest'

// Mock electron safeStorage before importing
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((text: string) => Buffer.from(`encrypted:${text}`)),
    decryptString: vi.fn((buffer: Buffer) => {
      const str = buffer.toString()
      if (str.startsWith('encrypted:')) {
        return str.slice('encrypted:'.length)
      }
      throw new Error('Decryption failed')
    })
  }
}))

import { encryptSecret, decryptSecret, isEncryptedBlob, SecureStorageError } from '../SecureStorage'
import { safeStorage } from 'electron'

describe('SecureStorage', () => {
  describe('encryptSecret', () => {
    it('should encrypt and return base64 string', () => {
      const result = encryptSecret('my-secret-token')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      // Should be valid base64
      expect(() => Buffer.from(result, 'base64')).not.toThrow()
    })

    it('should throw when encryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)
      expect(() => encryptSecret('secret')).toThrow(SecureStorageError)
    })
  })

  describe('decryptSecret', () => {
    it('should decrypt a previously encrypted value', () => {
      const encrypted = encryptSecret('test-token')
      const decrypted = decryptSecret(encrypted)
      expect(decrypted).toBe('test-token')
    })

    it('should return null for invalid input', () => {
      const result = decryptSecret('not-valid-base64-encrypted-data!!!')
      expect(result).toBeNull()
    })

    it('should return null when decryption is not available', () => {
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValueOnce(false)
      const result = decryptSecret('some-data')
      expect(result).toBeNull()
    })
  })

  describe('isEncryptedBlob', () => {
    it('should return false for GitHub personal access tokens', () => {
      expect(isEncryptedBlob('ghp_abc123def456')).toBe(false)
      expect(isEncryptedBlob('github_pat_abc123')).toBe(false)
    })

    it('should return true for base64-like strings', () => {
      expect(isEncryptedBlob('SGVsbG8gV29ybGQhISEhISEhISEhISEh')).toBe(true)
    })

    it('should return false for short strings', () => {
      expect(isEncryptedBlob('abc')).toBe(false)
    })
  })
})
