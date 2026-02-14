/**
 * Configuration Manager using electron-store
 * Handles all app settings with encryption for sensitive data
 */

import Store from 'electron-store'
import { app } from 'electron'
import { join } from 'path'
import { AppConfig, ModsPath } from '../../shared/types'
import { randomUUID } from 'crypto'

const defaultModsPath = join(
  process.env.USERPROFILE || process.env.HOME || '',
  'Documents',
  'RimWorld',
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

  // Get current active mods path
  getActiveModsPath(): ModsPath | undefined {
    return this.store.get('rimworld').modsPaths.find((p) => p.isActive)
  }

  // Detect game version from Version.txt
  async detectGameVersion(): Promise<string> {
    const activePath = this.getActiveModsPath()
    if (!activePath) {
      return this.get('rimworld').currentVersion
    }

    try {
      const path = require('path')
      const fs = require('fs').promises

      // Get game root directory (parent of Mods folder)
      const gameRoot = path.dirname(activePath.path)
      const versionFile = path.join(gameRoot, 'Version.txt')

      // Check if Version.txt exists
      try {
        await fs.access(versionFile)
      } catch {
        return this.get('rimworld').currentVersion
      }

      // Read and parse version file
      const content = await fs.readFile(versionFile, 'utf-8')
      const match = content.match(/^version (\d+\.\d+)/m)

      if (match && match[1]) {
        // Cache detected version
        const currentVersion = match[1]
        this.set('rimworld', {
          ...this.get('rimworld'),
          currentVersion
        })
        return currentVersion
      }

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
