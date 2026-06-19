/**
 * Secure storage for sensitive credentials using Electron safeStorage.
 * Uses OS-level encryption (DPAPI on Windows, Keychain on macOS).
 */

import { safeStorage } from 'electron'

export class SecureStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecureStorageError'
  }
}

/**
 * Encrypt a plaintext string using the OS keychain/DPAPI.
 * Throws if encryption is not available on this platform.
 */
export function encryptSecret(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new SecureStorageError(
      'OS-level encryption is not available. ' +
        'Cannot securely store credentials on this system.'
    )
  }
  const encrypted = safeStorage.encryptString(plaintext)
  return encrypted.toString('base64')
}

/**
 * Decrypt a base64-encoded encrypted string.
 * Returns null if decryption fails or input is invalid.
 */
export function decryptSecret(encryptedBase64: string): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new SecureStorageError(
        'OS-level decryption is not available.'
      )
    }
    const buffer = Buffer.from(encryptedBase64, 'base64')
    return safeStorage.decryptString(buffer)
  } catch {
    return null
  }
}

/**
 * Check if a string looks like a safeStorage-encrypted base64 blob
 * (as opposed to a plaintext token).
 * This is a heuristic: base64 strings are longer and contain only base64 chars.
 */
export function isEncryptedBlob(value: string): boolean {
  // GitHub tokens start with 'ghp_' or 'github_pat_' (plaintext)
  // Encrypted blobs are pure base64 (no underscores at specific positions)
  if (value.startsWith('ghp_') || value.startsWith('github_pat_')) {
    return false
  }
  // Base64 regex: only A-Z, a-z, 0-9, +, /, = and at least 32 chars
  return /^[A-Za-z0-9+/=]{32,}$/.test(value)
}
