import { promises as fs, existsSync } from 'fs'
import { join, dirname, resolve, relative, isAbsolute } from 'path'
import { configManager } from '../utils/ConfigManager'
import logger from '../utils/logger'

export interface ProcessResult {
  success: boolean
  modId: string
  sourcePath: string
  targetPath: string
  bytes?: number
  error?: string
}

export interface ValidationResult {
  valid: boolean
  modId: string
  error?: string
  errorCode?: 'E_MISSING_ABOUT' | 'E_IO_ERROR' | 'E_PARSE_ERROR'
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
  private resolveConfiguredRoot(rootPath: string, modId: string, code: string): string {
    if (!rootPath.trim()) {
      throw new ModProcessorError('Required root path is not configured', code, modId)
    }

    return resolve(rootPath)
  }

  private assertPathWithinRoot(
    rootPath: string,
    candidatePath: string,
    modId: string,
    code: string
  ): string {
    const resolvedRoot = this.resolveConfiguredRoot(rootPath, modId, code)
    const resolvedCandidate = resolve(candidatePath)
    const relativePath = relative(resolvedRoot, resolvedCandidate)

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new ModProcessorError(
        `Resolved path escaped the expected root: ${resolvedCandidate}`,
        code,
        modId
      )
    }

    return resolvedCandidate
  }

  private getDownloadRoot(modId: string): string {
    const config = configManager.get()
    return this.resolveConfiguredRoot(
      config.steamcmd.downloadPath,
      modId,
      'E_INVALID_DOWNLOAD_ROOT'
    )
  }

  private getActiveModsRoot(modId: string): string {
    const activePath = configManager.getActiveModsPath()
    if (!activePath) {
      throw new ModProcessorError('No active mods path configured', 'E_NO_MODS_PATH', modId)
    }

    return this.resolveConfiguredRoot(activePath.path, modId, 'E_INVALID_MODS_ROOT')
  }

  /**
   * Get the SteamCMD download path for a specific mod
   */
  private getSourcePath(modId: string): string {
    const downloadRoot = this.getDownloadRoot(modId)
    return this.assertPathWithinRoot(
      downloadRoot,
      join(downloadRoot, modId),
      modId,
      'E_INVALID_SOURCE_PATH'
    )
  }

  /**
   * Get the target Mods folder path
   */
  private getTargetPath(modId: string): string {
    const modsRoot = this.getActiveModsRoot(modId)
    return this.assertPathWithinRoot(
      modsRoot,
      join(modsRoot, modId),
      modId,
      'E_INVALID_TARGET_PATH'
    )
  }

  /**
   * Get a temporary path for atomic operations
   */
  private getTempPath(modId: string): string {
    const modsRoot = this.getActiveModsRoot(modId)
    return this.assertPathWithinRoot(
      modsRoot,
      join(modsRoot, `.temp_${modId}_${Date.now()}`),
      modId,
      'E_INVALID_TEMP_PATH'
    )
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
          errorCode: 'E_IO_ERROR',
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
            supportedVersions = versionMatches.map((v) => v.replace(/<\/?li>/g, ''))
          }
        } catch (e) {
          logger.warn(`[ModProcessor] Failed to parse About.xml for ${modId}:`, e)
        }
      }

      // Mod is valid if it has About.xml
      // Some mods might not have it during partial downloads (tolerable)
      if (!hasAboutXml) {
        return {
          valid: false,
          modId,
          errorCode: 'E_MISSING_ABOUT',
          error: `Missing About/About.xml in ${sourcePath}`,
          details: { hasAboutXml, modName, supportedVersions }
        }
      }

      return {
        valid: true,
        modId,
        details: { hasAboutXml, modName, supportedVersions }
      }
    } catch (error) {
      // IO/permission errors are NOT tolerable; caller should abort
      return {
        valid: false,
        modId,
        errorCode: 'E_IO_ERROR',
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

    logger.info(`[ModProcessor] Processing mod ${modId}`)
    logger.info(`[ModProcessor] Source: ${sourcePath}`)
    logger.info(`[ModProcessor] Target: ${targetPath}`)

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
        // IO errors should abort the pipeline; the mod is unreadable
        if (validation.errorCode === 'E_IO_ERROR') {
          throw new ModProcessorError(
            validation.error || 'Mod validation failed with IO error',
            'E_VALIDATION_IO_ERROR',
            modId
          )
        }
        // Missing About.xml is tolerable (some mods have non-standard structure)
        logger.warn(`[ModProcessor] Mod ${modId} validation warning: ${validation.error}`)
      }

      // Create target directory if it doesn't exist
      const targetDir = dirname(targetPath)
      await fs.mkdir(targetDir, { recursive: true })

      // If target already exists, remove it (update scenario)
      if (existsSync(targetPath)) {
        logger.info(`[ModProcessor] Removing existing mod at ${targetPath}`)
        await fs.rm(targetPath, { recursive: true, force: true })
      }

      // Atomic move: move to temp first, then rename to target
      // This ensures we don't end up with a partially copied mod
      logger.info(`[ModProcessor] Moving mod to temp location: ${tempPath}`)
      await fs.mkdir(dirname(tempPath), { recursive: true })

      // Copy instead of move to preserve source in case of failure
      const bytes = await this.copyDirectory(sourcePath, tempPath)

      // Then rename to target (atomic on most filesystems)
      // If rename fails with EXDEV (cross-volume), fall back to copy + delete
      logger.info(`[ModProcessor] Renaming to target: ${targetPath}`)
      try {
        await fs.rename(tempPath, targetPath)
      } catch (renameError: unknown) {
        if (
          renameError instanceof Error &&
          (renameError as NodeJS.ErrnoException).code === 'EXDEV'
        ) {
          // Cross-volume: copy from temp to target, then delete temp
          logger.info(`[ModProcessor] Cross-volume rename, falling back to copy`)
          await this.copyDirectory(tempPath, targetPath)
          await fs.rm(tempPath, { recursive: true, force: true })
        } else {
          throw renameError
        }
      }

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
        logger.warn(`[ModProcessor] Final validation warning: ${finalValidation.error}`)
      }

      logger.info(`[ModProcessor] Successfully processed mod ${modId} to ${targetPath}`)

      return {
        success: true,
        modId,
        sourcePath,
        targetPath,
        bytes
      }
    } catch (error) {
      // Clean up temp directory AND target half-written files
      for (const cleanupPath of [tempPath, targetPath]) {
        try {
          if (existsSync(cleanupPath)) {
            await fs.rm(cleanupPath, { recursive: true, force: true })
          }
        } catch (cleanupError) {
          logger.error(`[ModProcessor] Failed to cleanup ${cleanupPath}:`, cleanupError)
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[ModProcessor] Failed to process mod ${modId}:`, error)

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
   * Recursively copy a directory, returning total bytes copied.
   */
  private async copyDirectory(source: string, target: string): Promise<number> {
    await fs.mkdir(target, { recursive: true })
    const entries = await fs.readdir(source, { withFileTypes: true })
    let totalBytes = 0

    for (const entry of entries) {
      const sourcePath = join(source, entry.name)
      const targetPath = join(target, entry.name)

      if (entry.isDirectory()) {
        totalBytes += await this.copyDirectory(sourcePath, targetPath)
      } else {
        await fs.copyFile(sourcePath, targetPath)
        const stats = await fs.stat(sourcePath)
        totalBytes += stats.size
      }
    }
    return totalBytes
  }
}

// Export singleton instance
export const modProcessor = new ModProcessor()
export default modProcessor
