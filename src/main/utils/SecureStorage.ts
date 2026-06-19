/**
 * Secure storage for sensitive credentials using Electron safeStorage.
 * Uses OS-level encryption (DPAPI on Windows, Keychain on macOS).
 */

import { safeStorage } from 'electron'

/** Prefix marking a value as encrypted by our SecureStorage (v1 format). */
const ENCRYPTED_PREFIX = 'enc:v1:'

export class SecureStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecureStorageError'
  }
}

/**
 * Encrypt a plaintext string using the OS keychain/DPAPI.
 * Returns a string prefixed with ENCRYPTED_PREFIX for identification.
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
  return ENCRYPTED_PREFIX + encrypted.toString('base64')
}

/**
 * Decrypt a prefixed encrypted string.
 * Returns null if the input lacks the prefix or decryption fails.
 */
export function decryptSecret(encryptedValue: string): string | null {
  // Only attempt decryption on values we encrypted
  if (!encryptedValue.startsWith(ENCRYPTED_PREFIX)) {
    return null
  }
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new SecureStorageError('OS-level decryption is not available.')
    }
    const base64 = encryptedValue.slice(ENCRYPTED_PREFIX.length)
    const buffer = Buffer.from(base64, 'base64')
    return safeStorage.decryptString(buffer)
  } catch {
    return null
  }
}

/**
 * Check if a string was encrypted by our SecureStorage.
 * Reliable prefix check — no heuristics.
 */
export function isEncryptedBlob(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX)
}
