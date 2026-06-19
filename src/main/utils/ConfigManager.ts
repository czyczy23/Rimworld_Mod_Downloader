/**
 * Configuration Manager using electron-store
 * Handles all app settings with encryption for sensitive data
 */

import Store from 'electron-store'
import { app } from 'electron'
import { join, dirname } from 'path'
import { promises as fs, existsSync, copyFileSync, unlinkSync } from 'fs'
import { AppConfig, ModsPath } from '../../shared/types'
import { randomUUID } from 'crypto'
import { decryptSecret, encryptSecret, isEncryptedBlob } from './SecureStorage'
import logger from './logger'

// Legacy encryption key that was hardcoded in the source (insecure).
// Kept only for migrating existing user configs away from it.
const LEGACY_ENCRYPTION_KEY = 'rw-mod-downloader-v1'

const defaultModsPath = join(
  process.env.USERPROFILE || process.env.HOME || '',
  'AppData',
  'LocalLow',
  'Ludeon Studios',
  'RimWorld by Ludeon Studios',
  'Mods'
)

// SteamCMD paths are empty by default - user must configure them
const defaultSteamCmdPath = ''
const defaultSteamDownloadPath = ''

const defaults: AppConfig = {
  firstRunCompleted: false,
  app: {
    language: 'system'
  },
  steamcmd: {
    executablePath: defaultSteamCmdPath,
    downloadPath: defaultSteamDownloadPath
  },
  rimworld: {
    currentVersion: '1.6',
    modsPaths: [
      {
        id: randomUUID(),
        name: 'Default Mods Folder',
        path: defaultModsPath,
        isActive: true
      }
    ],
    autoCheckUpdates: false
  },
  download: {
    autoDownloadDependencies: false,
    skipVersionCheck: false,
    extractCollectionToSubfolder: true,
    dependencyMode: 'ask'
  },
  version: {
    autoDetect: true,
    manualVersion: '1.6',
    onMismatch: 'ask'
  },
  git: {
    enabled: false,
    autoCommit: true
  }
}

class ConfigManager {
  private store: Store<AppConfig>

  constructor() {
    // Migrate from the old fully-encrypted config (using the leaked hardcoded key)
    // BEFORE creating the new unencrypted store. This must happen synchronously
    // because electron-store writes to disk immediately on construction.
    this.migrateFromLegacy()

    this.store = new Store<AppConfig>({
      name: 'config',
      defaults,
      clearInvalidConfig: true
    })
  }

  /**
   * Migrate config from the old insecure hardcoded encryptionKey format.
   * - Backs up the old encrypted config file
   * - Reads it with a temporary Store using the legacy key
   * - Writes decrypted values to a fresh store
   * - Encrypts sensitive fields (githubToken) with OS safeStorage
   */
  private migrateFromLegacy(): void {
    const configPath = join(app.getPath('userData'), 'config.json')
    if (!existsSync(configPath)) return

    const backupPath = configPath + '.legacy-backup'
    try {
      // Back up the old encrypted file before it gets overwritten
      copyFileSync(configPath, backupPath)
    } catch (error) {
      logger.warn('[ConfigManager] Cannot back up legacy config, skipping migration:', error)
      return
    }

    try {
      // Read old config using the legacy encryption key
      const legacyStore = new Store<AppConfig>({
        name: 'config',
        encryptionKey: LEGACY_ENCRYPTION_KEY
      })
      const legacyConfig = legacyStore.store

      // Remove old encrypted file so the new store starts fresh
      try {
        unlinkSync(configPath)
      } catch (error) {
        logger.warn('[ConfigManager] Could not remove old config file (clearInvalidConfig will handle):', error)
      }

      // Write decrypted values to the new store (no encryption key)
      const newStore = new Store<AppConfig>({ name: 'config', defaults })
      newStore.set(legacyConfig)

      // Encrypt sensitive fields with safeStorage
      const gitConfig = legacyConfig.git
      if (gitConfig?.githubToken) {
        try {
          newStore.set('git', {
            ...gitConfig,
            githubToken: encryptSecret(gitConfig.githubToken)
          })
        } catch (error) {
          // safeStorage unavailable — keep token as-is rather than losing it
          logger.warn('[ConfigManager] safeStorage unavailable, GitHub token stored unencrypted:', error)
        }
      }

      logger.info('[ConfigManager] Migrated config from legacy encrypted format')
    } catch {
      // Migration failed — the backup file still exists for manual recovery
      logger.warn('[ConfigManager] Legacy config migration failed. Backup at:', backupPath)
      return
    }

    // Clean up backup on success
    try {
      unlinkSync(backupPath)
    } catch (error) {
      logger.debug('[ConfigManager] Could not remove legacy backup file, left in place:', error)
    }
  }

  // Get all config or specific key
  get(): AppConfig
  get<K extends keyof AppConfig>(key: K): AppConfig[K]
  get<K extends keyof AppConfig>(key?: K): AppConfig | AppConfig[K] {
    if (key === undefined) {
      const config = this.store.store
      return { ...config, git: this.decryptGitToken(config.git) }
    }

    const value = this.store.get(key)
    // Transparently decrypt sensitive fields
    if (key === 'git') {
      return this.decryptGitToken(value as AppConfig['git']) as AppConfig[K]
    }
    return value
  }

  // Set config value — encrypts sensitive fields before persisting
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    if (key === 'git') {
      const gitVal = value as AppConfig['git']
      this.store.set(key, this.encryptGitToken(gitVal) as AppConfig[K])
    } else {
      this.store.set(key, value)
    }
  }

  private decryptGitToken(gitConfig: AppConfig['git']): AppConfig['git'] {
    if (!gitConfig?.githubToken) return gitConfig
    if (isEncryptedBlob(gitConfig.githubToken)) {
      const decrypted = decryptSecret(gitConfig.githubToken)
      if (decrypted !== null) {
        return { ...gitConfig, githubToken: decrypted }
      }
      // Decryption failed — warn and return as-is rather than losing the reference
      logger.warn('[ConfigManager] Failed to decrypt githubToken — returning encrypted blob as-is')
    }
    return gitConfig
  }

  private encryptGitToken(gitConfig: AppConfig['git']): AppConfig['git'] {
    if (!gitConfig?.githubToken) return gitConfig
    // Don't re-encrypt if already encrypted
    if (isEncryptedBlob(gitConfig.githubToken)) return gitConfig
    try {
      return { ...gitConfig, githubToken: encryptSecret(gitConfig.githubToken) }
    } catch {
      // safeStorage unavailable — store as-is
      return gitConfig
    }
  }

  // Reset config to defaults
  async reset(): Promise<void> {
    this.store.clear()
    this.store.set(defaults)
    logger.info('[ConfigManager] Config has been reset to defaults')

    // Create default mods folder if it doesn't exist
    await this.ensureDefaultModsFolder()
  }

  // Ensure default mods folder exists
  private async ensureDefaultModsFolder(): Promise<void> {
    try {
      await fs.mkdir(defaultModsPath, { recursive: true })
      logger.info(`[ConfigManager] Created default mods folder: ${defaultModsPath}`)
    } catch (error) {
      logger.error('[ConfigManager] Failed to create default mods folder:', error)
    }
  }

  // Get current active mods path
  getActiveModsPath(): ModsPath | undefined {
    return this.store.get('rimworld').modsPaths.find((p) => p.isActive)
  }

  // Detect game version from Version.txt
  async detectGameVersion(): Promise<string> {
    const activePath = this.getActiveModsPath()
    if (!activePath) {
      logger.info('[ConfigManager] No active mods path found')
      return this.get('rimworld').currentVersion
    }

    try {
      // Get game root directory (parent of Mods folder)
      const gameRoot = dirname(activePath.path)
      const versionFile = join(gameRoot, 'Version.txt')

      logger.info(`[ConfigManager] Looking for Version.txt at: ${versionFile}`)
      logger.info(`[ConfigManager] Active mods path: ${activePath.path}`)
      logger.info(`[ConfigManager] Game root: ${gameRoot}`)

      // Check if Version.txt exists
      try {
        await fs.access(versionFile)
      } catch {
        logger.info(`[ConfigManager] Version.txt not found at ${versionFile}`)
        return this.get('rimworld').currentVersion
      }

      // Read and parse version file
      const content = await fs.readFile(versionFile, 'utf-8')
      logger.info(`[ConfigManager] Version.txt content: ${content}`)

      // Match patterns like: 1.5.4063 rev1071 or version 1.5.4063 rev1071
      const match = content.match(/(?:version\s+)?(\d+\.\d+)\.\d+/)

      if (match && match[1]) {
        // Cache detected version
        const currentVersion = match[1]
        logger.info(`[ConfigManager] Detected game version: ${currentVersion}`)
        this.set('rimworld', {
          ...this.get('rimworld'),
          currentVersion
        })
        return currentVersion
      }

      logger.info(`[ConfigManager] Could not parse version from: ${content}`)
      return this.get('rimworld').currentVersion
    } catch (error) {
      logger.error('Failed to detect game version:', error)
      return this.get('rimworld').currentVersion
    }
  }
}

// Export singleton instance
export const configManager = new ConfigManager()
export default configManager
