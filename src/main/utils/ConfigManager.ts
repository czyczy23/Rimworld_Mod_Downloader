/**
 * Configuration Manager using electron-store
 * Handles all app settings with encryption for sensitive data
 */

import Store from 'electron-store'
import { app } from 'electron'
import { join, dirname } from 'path'
import { promises as fs, existsSync } from 'fs'
import { AppConfig, ModsPath } from '../../shared/types'
import { randomUUID } from 'crypto'

const defaultModsPath = join(
  process.env.USERPROFILE || process.env.HOME || '',
  'AppData',
  'LocalLow',
  'Ludeon Studios',
  'RimWorld by Ludeon Studios',
  'Mods'
)

const defaultSteamCmdPath = join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Documents',
  'steamcmd',
  'steamcmd.exe'
)

const defaultSteamDownloadPath = join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Documents',
  'steamcmd',
  'steamapps',
  'workshop',
  'content',
  '294100'
)

const defaults: AppConfig = {
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
    this.store = new Store<AppConfig>(
      {
        name: 'config',
        defaults,
        encryptionKey: 'rw-mod-downloader-v1',
        clearInvalidConfig: true
      }
    )
  }

  // Get all config or specific key
  get<K extends keyof AppConfig>(key?: K): K extends undefined ? AppConfig : AppConfig[K] {
    if (key === undefined) {
      return this.store.store as any
    }
    return this.store.get(key) as any
  }

  // Set config value
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.store.set(key, value)
  }

  // Reset config to defaults
  async reset(): Promise<void> {
    this.store.clear()
    this.store.set(defaults)
    console.log('[ConfigManager] Config has been reset to defaults')

    // Create default mods folder if it doesn't exist
    await this.ensureDefaultModsFolder()
  }

  // Ensure default mods folder exists
  private async ensureDefaultModsFolder(): Promise<void> {
    try {
      await fs.mkdir(defaultModsPath, { recursive: true })
      console.log(`[ConfigManager] Created default mods folder: ${defaultModsPath}`)
    } catch (error) {
      console.error('[ConfigManager] Failed to create default mods folder:', error)
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
      console.log('[ConfigManager] No active mods path found')
      return this.get('rimworld').currentVersion
    }

    try {
      // Get game root directory (parent of Mods folder)
      const gameRoot = dirname(activePath.path)
      const versionFile = join(gameRoot, 'Version.txt')

      console.log(`[ConfigManager] Looking for Version.txt at: ${versionFile}`)
      console.log(`[ConfigManager] Active mods path: ${activePath.path}`)
      console.log(`[ConfigManager] Game root: ${gameRoot}`)

      // Check if Version.txt exists
      try {
        await fs.access(versionFile)
      } catch {
        console.log(`[ConfigManager] Version.txt not found at ${versionFile}`)
        return this.get('rimworld').currentVersion
      }

      // Read and parse version file
      const content = await fs.readFile(versionFile, 'utf-8')
      console.log(`[ConfigManager] Version.txt content: ${content}`)

      // Match patterns like: 1.5.4063 rev1071 or version 1.5.4063 rev1071
      const match = content.match(/(?:version\s+)?(\d+\.\d+)\.\d+/)

      if (match && match[1]) {
        // Cache detected version
        const currentVersion = match[1]
        console.log(`[ConfigManager] Detected game version: ${currentVersion}`)
        this.set('rimworld', {
          ...this.get('rimworld'),
          currentVersion
        })
        return currentVersion
      }

      console.log(`[ConfigManager] Could not parse version from: ${content}`)
      return this.get('rimworld').currentVersion
    } catch (error) {
      console.error('Failed to detect game version:', error)
      return this.get('rimworld').currentVersion
    }
  }
}

// Export singleton instance
export const configManager = new ConfigManager()
export default configManager
