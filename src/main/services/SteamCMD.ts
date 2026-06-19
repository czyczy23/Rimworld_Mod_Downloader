import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { join } from 'path'
import { configManager } from '../utils/ConfigManager'
import logger from '../utils/logger'
import { RIMWORLD_APP_ID, STEAM_LOGIN, STEAMCMD_TIMEOUT_MS, STEAMCMD_GRACE_MS } from '../../shared/constants'

const MOD_ID_PATTERN = /^\d+$/
const PROGRESS_REGEX = /Downloading update \((\d+) of (\d+)\)/

export interface DownloadProgress {
  modId: string
  stage: 'connecting' | 'downloading' | 'completed' | 'error'
  percent: number
  current?: number
  total?: number
  message?: string
}

export interface SteamCMDResult {
  success: boolean
  modId: string
  downloadPath?: string
  error?: string
}

export class SteamCMDError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message)
    this.name = 'SteamCMDError'
  }
}

// ─── Pure helper functions (easily testable without mocking) ───────────────

/**
 * Build SteamCMD command-line arguments for downloading a workshop item.
 */
export function buildArgs(modId: string): string[] {
  return [
    '+login', STEAM_LOGIN,
    '+workshop_download_item', RIMWORLD_APP_ID, modId,
    '+quit'
  ]
}

export interface ParsedLine {
  type: 'progress' | 'success' | 'none'
  current?: number
  total?: number
  percent?: number
}

/**
 * Parse a single line of SteamCMD stdout for progress or success indicators.
 * Pure function — no side effects, no I/O.
 */
export function parseProgressLine(line: string): ParsedLine {
  const trimmed = line.trim()
  if (!trimmed) return { type: 'none' }

  // Check success indicators BEFORE progress regex
  // (0 of 0) would match progress regex but actually means "already up to date"
  if (trimmed.includes('Success. Downloaded item') ||
      trimmed.includes('Downloading update (0 of 0)')) {
    return { type: 'success' }
  }

  const match = PROGRESS_REGEX.exec(trimmed)
  if (match) {
    const current = parseInt(match[1], 10)
    const total = parseInt(match[2], 10)
    const percent = Math.round((current / total) * 100)
    return { type: 'progress', current, total, percent }
  }

  return { type: 'none' }
}

export interface DetermineResultInput {
  exitCode: number | null
  stdout: string
  stderr: string
  modId: string
  downloadPath: string
}

/**
 * Determine whether a SteamCMD download succeeded.
 * Primary check: exit code 0 + file exists on disk.
 * Pure function (except existsSync call) — easy to test with real dirs.
 */
export function determineResult(input: DetermineResultInput): SteamCMDResult {
  const { exitCode, stdout, stderr, modId, downloadPath } = input
  const modPath = join(downloadPath, modId)
  const fileExists = existsSync(modPath)

  const hasErrorIndicator = stdout.includes('ERROR') ||
                             stdout.includes('Failure') ||
                             stderr.includes('ERROR')

  if (exitCode === 0 && fileExists && !hasErrorIndicator) {
    return { success: true, modId, downloadPath: modPath }
  }

  // Determine error message
  let errorMessage = 'Download failed'
  if (hasErrorIndicator) {
    const errorMatch = stdout.match(/ERROR[^\n]*/) || stderr.match(/ERROR[^\n]*/)
    if (errorMatch) errorMessage = errorMatch[0]
  } else if (exitCode !== 0) {
    errorMessage = `Process exited with code ${exitCode}`
  } else if (!fileExists) {
    errorMessage = `Download folder not found at ${modPath} after process exited successfully`
  }

  return { success: false, modId, error: errorMessage }
}

// ─── SteamCMD class ───────────────────────────────────────────────────────

export class SteamCMD extends EventEmitter {
  private timeout: number = STEAMCMD_TIMEOUT_MS

  constructor() {
    super()
  }

  private getPaths() {
    const config = configManager.get()
    return {
      executablePath: config.steamcmd.executablePath,
      downloadPath: config.steamcmd.downloadPath
    }
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    const { executablePath } = this.getPaths()
    if (!existsSync(executablePath)) {
      return { valid: false, error: `SteamCMD not found at: ${executablePath}` }
    }
    return { valid: true }
  }

  async downloadMod(modId: string): Promise<SteamCMDResult> {
    // SECURITY: validate modId at execution point (defense-in-depth)
    if (!MOD_ID_PATTERN.test(modId)) {
      throw new SteamCMDError(
        `Invalid mod ID: ${modId}`,
        'E_INVALID_MOD_ID',
        'Mod ID must be a numeric string'
      )
    }

    const { executablePath, downloadPath } = this.getPaths()

    const validation = await this.validate()
    if (!validation.valid) {
      return { success: false, modId, error: validation.error }
    }

    this.emit('progress', {
      modId, stage: 'connecting', percent: 0, message: 'Connecting to Steam...'
    } as DownloadProgress)

    return new Promise((resolve) => {
      const args = buildArgs(modId)
      logger.info(`[SteamCMD] Starting download for mod ${modId}`)

      // Remove spawn's built-in timeout — we handle it ourselves
      const proc = spawn(executablePath, args, { windowsHide: true })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        stdout += text
        for (const line of text.split('\n')) {
          const parsed = parseProgressLine(line)
          if (parsed.type === 'progress' && parsed.percent != null) {
            this.emit('progress', {
              modId, stage: 'downloading',
              percent: parsed.percent,
              current: parsed.current,
              total: parsed.total,
              message: `Downloading: ${parsed.percent}% (${parsed.current} of ${parsed.total} MB)`
            } as DownloadProgress)
          }
        }
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      const onDone = () => {
        clearTimeout(timeoutId)
        const result = determineResult({ exitCode: proc.exitCode, stdout, stderr, modId, downloadPath })

        this.emit('progress', {
          modId,
          stage: result.success ? 'completed' : 'error',
          percent: result.success ? 100 : 0,
          message: result.success ? 'Download completed successfully' : result.error
        } as DownloadProgress)

        resolve(result)
      }

      proc.on('close', onDone)

      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId)
        const msg = `Failed to start SteamCMD: ${error.message}`
        this.emit('progress', { modId, stage: 'error', percent: 0, message: msg } as DownloadProgress)
        resolve({ success: false, modId, error: msg })
      })

      // Timeout with graceful shutdown
      const timeoutId = setTimeout(() => {
        logger.error('[SteamCMD] Download timeout')
        gracefulKill(proc)

        const msg = 'Download timeout after 5 minutes'
        this.emit('progress', { modId, stage: 'error', percent: 0, message: msg } as DownloadProgress)
        resolve({ success: false, modId, error: msg })
      }, this.timeout)
    })
  }
}

/**
 * Attempt graceful SIGTERM, then force SIGKILL after grace period.
 */
function gracefulKill(proc: ChildProcess): void {
  let exited = false
  proc.once('exit', () => { exited = true })

  try { proc.kill('SIGTERM') } catch {}

  setTimeout(() => {
    if (!exited && !proc.killed) {
      try { proc.kill('SIGKILL') } catch {}
    }
  }, STEAMCMD_GRACE_MS)
}

// Export singleton instance
export const steamCMD = new SteamCMD()
export default steamCMD
