import { promises as fs, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { configManager } from '../utils/ConfigManager'

export interface ProcessResult {
  success: boolean
  modId: string
  sourcePath: string
  targetPath: string
  error?: string
}

export interface ValidationResult {
  valid: boolean
  modId: string
  error?: string
  details?: {
    hasAboutXml: boolean
    modName?: string
    supportedVersions?: string[]
  }
}

export class ModProcessorError extends Error {
  constructor(
    message: string,
    public code: string,
    public modId: string,
    public details?: string
  ) {
    super(message)
    this.name = 'ModProcessorError'
  }
}

export class ModProcessor {
  /**
   * Get the SteamCMD download path for a specific mod
   */
  private getSourcePath(modId: string): string {
    const config = configManager.get() as any
    return join(config.steamcmd?.downloadPath || '', modId)
  }

  /**
   * Get the target Mods folder path
   */
  private getTargetPath(modId: string): string {
    const activePath = configManager.getActiveModsPath()
    if (!activePath) {
      throw new ModProcessorError(
        'No active mods path configured',
        'E_NO_MODS_PATH',
        modId
      )
    }
    return join(activePath.path, modId)
  }

  /**
   * Get a temporary path for atomic operations
   */
  private getTempPath(modId: string): string {
    const activePath = configManager.getActiveModsPath()
    if (!activePath) {
      throw new ModProcessorError(
        'No active mods path configured',
        'E_NO_MODS_PATH',
        modId
      )
    }
    return join(activePath.path, `.temp_${modId}_${Date.now()}`)
  }

  /**
   * Validate that a mod folder contains required files
   */
  async validateMod(modId: string, modPath?: string): Promise<ValidationResult> {
    const sourcePath = modPath || this.getSourcePath(modId)

    try {
      // Check if mod folder exists
      const stats = await fs.stat(sourcePath)
      if (!stats.isDirectory()) {
        return {
          valid: false,
          modId,
          error: `Path is not a directory: ${sourcePath}`
        }
      }

      // Check for About/About.xml
      const aboutXmlPath = join(sourcePath, 'About', 'About.xml')
      const hasAboutXml = existsSync(aboutXmlPath)

      let modName: string | undefined
      let supportedVersions: string[] | undefined

      if (hasAboutXml) {
        try {
          const content = await fs.readFile(aboutXmlPath, 'utf-8')
          // Simple regex extraction for mod name
          const nameMatch = content.match(/<name>([^<]+)<\/name>/)
          if (nameMatch) {
            modName = nameMatch[1].trim()
          }

          // Extract supported versions
          const versionMatches = content.match(/<li>([\d.]+)<\/li>/g)
          if (versionMatches) {
            supportedVersions = versionMatches.map(v =>
              v.replace(/<\/?li>/g, '')
            )
          }
        } catch (e) {
          console.warn(`[ModProcessor] Failed to parse About.xml for ${modId}:`, e)
        }
      }

      // Mod is valid if it has About.xml
      // Some mods might not have it during partial downloads
      return {
        valid: hasAboutXml,
        modId,
        error: hasAboutXml ? undefined : `Missing About/About.xml in ${sourcePath}`,
        details: {
          hasAboutXml,
          modName,
          supportedVersions
        }
      }

    } catch (error) {
      return {
        valid: false,
        modId,
        error: `Failed to validate mod: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * Process a mod: move from source to target with validation
   */
  async processMod(modId: string): Promise<ProcessResult> {
    const sourcePath = this.getSourcePath(modId)
    const targetPath = this.getTargetPath(modId)
    const tempPath = this.getTempPath(modId)

    console.log(`[ModProcessor] Processing mod ${modId}`)
    console.log(`[ModProcessor] Source: ${sourcePath}`)
    console.log(`[ModProcessor] Target: ${targetPath}`)

    try {
      // Check if source exists
      if (!existsSync(sourcePath)) {
        throw new ModProcessorError(
          `Source mod folder not found: ${sourcePath}`,
          'E_SOURCE_NOT_FOUND',
          modId
        )
      }

      // Validate the mod before moving
      const validation = await this.validateMod(modId, sourcePath)
      if (!validation.valid) {
        console.warn(`[ModProcessor] Mod ${modId} validation warning: ${validation.error}`)
        // Don't throw here - some mods might not have About.xml during partial downloads
        // SteamCMD might still be downloading
      }

      // Create target directory if it doesn't exist
      const targetDir = dirname(targetPath)
      await fs.mkdir(targetDir, { recursive: true })

      // If target already exists, remove it (update scenario)
      if (existsSync(targetPath)) {
        console.log(`[ModProcessor] Removing existing mod at ${targetPath}`)
        await fs.rm(targetPath, { recursive: true, force: true })
      }

      // Atomic move: move to temp first, then rename to target
      // This ensures we don't end up with a partially copied mod
      console.log(`[ModProcessor] Moving mod to temp location: ${tempPath}`)
      await fs.mkdir(dirname(tempPath), { recursive: true })

      // Copy instead of move to preserve source in case of failure
      await this.copyDirectory(sourcePath, tempPath)

      // Then rename to target (atomic on most filesystems)
      console.log(`[ModProcessor] Renaming to target: ${targetPath}`)
      await fs.rename(tempPath, targetPath)

      // Verify the move was successful
      if (!existsSync(targetPath)) {
        throw new ModProcessorError(
          'Failed to verify mod at target location after move',
          'E_MOVE_FAILED',
          modId
        )
      }

      // Validate the moved mod
      const finalValidation = await this.validateMod(modId, targetPath)
      if (!finalValidation.valid) {
        console.warn(`[ModProcessor] Final validation warning: ${finalValidation.error}`)
      }

      console.log(`[ModProcessor] Successfully processed mod ${modId} to ${targetPath}`)

      return {
        success: true,
        modId,
        sourcePath,
        targetPath
      }

    } catch (error) {
      // Clean up temp directory if it exists
      try {
        if (existsSync(tempPath)) {
          await fs.rm(tempPath, { recursive: true, force: true })
        }
      } catch (cleanupError) {
        console.error(`[ModProcessor] Failed to cleanup temp directory:`, cleanupError)
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`[ModProcessor] Failed to process mod ${modId}:`, error)

      return {
        success: false,
        modId,
        sourcePath,
        targetPath,
        error: errorMessage
      }
    }
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    await fs.mkdir(target, { recursive: true })
    const entries = await fs.readdir(source, { withFileTypes: true })

    for (const entry of entries) {
      const sourcePath = join(source, entry.name)
      const targetPath = join(target, entry.name)

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath)
      } else {
        await fs.copyFile(sourcePath, targetPath)
      }
    }
  }
}

// Export singleton instance
export const modProcessor = new ModProcessor()
export default modProcessor
