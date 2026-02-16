import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { configManager } from '../utils/ConfigManager'

export interface DownloadProgress {
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

export class SteamCMD extends EventEmitter {
  private timeout: number = 300000 // 5 minutes

  constructor() {
    super()
  }

  /**
   * Get current config paths (read fresh from config each time)
   */
  private getPaths() {
    const config = configManager.get() as any
    return {
      executablePath: config.steamcmd?.executablePath || '',
      downloadPath: config.steamcmd?.downloadPath || ''
    }
  }

  /**
   * Validate SteamCMD setup
   */
  async validate(): Promise<{ valid: boolean; error?: string }> {
    const { executablePath } = this.getPaths()
    if (!existsSync(executablePath)) {
      return {
        valid: false,
        error: `SteamCMD not found at: ${executablePath}`
      }
    }

    return { valid: true }
  }

  /**
   * Download a mod from Steam Workshop
   * @param modId The Steam Workshop item ID
   * @returns Promise resolving to download result
   */
  async downloadMod(modId: string): Promise<SteamCMDResult> {
    const { executablePath, downloadPath } = this.getPaths()

    // Validate first
    const validation = await this.validate()
    if (!validation.valid) {
      return {
        success: false,
        modId,
        error: validation.error
      }
    }

    this.emit('progress', {
      stage: 'connecting',
      percent: 0,
      message: 'Connecting to Steam...'
    } as DownloadProgress)

    return new Promise((resolve) => {
      const args = [
        '+login', 'anonymous',
        '+workshop_download_item', '294100', modId,
        '+quit'
      ]

      console.log(`[SteamCMD] Starting download for mod ${modId}`)
      console.log(`[SteamCMD] Command: ${executablePath} ${args.join(' ')}`)

      const process = spawn(executablePath, args, {
        windowsHide: true, // Hide console window
        timeout: this.timeout
      })

      let stdout = ''
      let stderr = ''
      let progressRegex = /Downloading update \((\d+) of (\d+)\)/
      let isDownloading = false

      // Handle stdout data
      process.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        stdout += text

        // Parse progress
        const lines = text.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          console.log(`[SteamCMD stdout] ${trimmed}`)

          // Check for progress indicator
          const match = progressRegex.exec(trimmed)
          if (match) {
            isDownloading = true
            const current = parseInt(match[1], 10)
            const total = parseInt(match[2], 10)
            const percent = Math.round((current / total) * 100)

            this.emit('progress', {
              stage: 'downloading',
              percent,
              current,
              total,
              message: `Downloading: ${percent}% (${current} of ${total} MB)`
            } as DownloadProgress)
          }

          // Check for success indicator
          if (trimmed.includes('Success. Downloaded item') ||
              trimmed.includes('Downloading update (0 of 0)')) {
            isDownloading = true
          }
        }
      })

      // Handle stderr data
      process.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        stderr += text
        console.error(`[SteamCMD stderr] ${text.trim()}`)
      })

      // Handle process exit
      process.on('close', (code: number | null) => {
        console.log(`[SteamCMD] Process exited with code ${code}`)

        // Check if download was successful
        // SteamCMD returns 0 on success, but may also return 0 even on some failures
        // We need to check the output for success indicators

        const hasSuccessIndicator = stdout.includes('Success. Downloaded item') ||
                                    stdout.includes('Downloaded item') ||
                                    isDownloading

        const hasErrorIndicator = stdout.includes('ERROR') ||
                                   stdout.includes('Failure') ||
                                   stderr.includes('ERROR')

        if (code === 0 && hasSuccessIndicator && !hasErrorIndicator) {
          // Download successful
          const modPath = `${downloadPath}/${modId}`

          this.emit('progress', {
            stage: 'completed',
            percent: 100,
            message: 'Download completed successfully'
          } as DownloadProgress)

          resolve({
            success: true,
            modId,
            downloadPath: modPath
          })
        } else {
          // Download failed
          let errorMessage = 'Download failed'

          if (hasErrorIndicator) {
            // Extract error from output
            const errorMatch = stdout.match(/ERROR[^\n]*/) || stderr.match(/ERROR[^\n]*/)
            if (errorMatch) {
              errorMessage = errorMatch[0]
            }
          } else if (code !== 0) {
            errorMessage = `Process exited with code ${code}`
          } else {
            errorMessage = 'Download may have failed. Check SteamCMD output.'
          }

          this.emit('progress', {
            stage: 'error',
            percent: 0,
            message: errorMessage
          } as DownloadProgress)

          resolve({
            success: false,
            modId,
            error: errorMessage
          })
        }
      })

      // Handle process errors (e.g., executable not found)
      process.on('error', (error: Error) => {
        console.error(`[SteamCMD] Process error: ${error.message}`)

        this.emit('progress', {
          stage: 'error',
          percent: 0,
          message: `Failed to start SteamCMD: ${error.message}`
        } as DownloadProgress)

        resolve({
          success: false,
          modId,
          error: `Failed to start SteamCMD: ${error.message}`
        })
      })

      // Timeout handling - P1 FIX: Improved timeout handling with graceful shutdown
      const timeoutId = setTimeout(() => {
        console.error('[SteamCMD] Download timeout after 5 minutes')

        // Track if process has exited
        let processExited = false

        // Set up a one-time listener to detect process exit
        process.once('exit', () => {
          processExited = true
        })

        // Try graceful termination first (SIGTERM)
        try {
          process.kill('SIGTERM')
          console.log('[SteamCMD] Sent SIGTERM to process')
        } catch (killError) {
          console.error('[SteamCMD] Failed to send SIGTERM:', killError)
        }

        // Wait for process to exit gracefully, then force kill if necessary
        setTimeout(() => {
          if (!processExited && !process.killed) {
            console.error('[SteamCMD] Process did not exit gracefully, forcing SIGKILL')
            try {
              process.kill('SIGKILL')
            } catch (forceKillError) {
              console.error('[SteamCMD] Failed to force kill process:', forceKillError)
            }
          }
        }, 5000) // Give 5 seconds for graceful shutdown

        this.emit('progress', {
          stage: 'error',
          percent: 0,
          message: 'Download timeout after 5 minutes'
        } as DownloadProgress)

        resolve({
          success: false,
          modId,
          error: 'Download timeout after 5 minutes'
        })
      }, this.timeout)

      // Clear timeout when process closes
      process.on('close', () => {
        clearTimeout(timeoutId)
      })
    })
  }
}

// Export singleton instance
export const steamCMD = new SteamCMD()
export default steamCMD
