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
  private connectTimeout: number = 30000 // 30 seconds for connection/initial response
  private activityTimeout: number = 120000 // 2 minutes without any output
  private currentProcess: ReturnType<typeof spawn> | null = null
  private currentModId: string | null = null
  private cancelRequested: boolean = false
  private cancelResolve: ((value: SteamCMDResult) => void) | null = null

  constructor() {
    super()
  }

  /**
   * Cancel the currently running download (if any)
   */
  cancelDownload(): boolean {
    if (!this.currentProcess || !this.currentModId) {
      console.log('[SteamCMD] No active download to cancel')
      return false
    }

    console.log(`[SteamCMD] Cancel requested for mod ${this.currentModId}`)
    this.cancelRequested = true

    // Try graceful kill first
    try {
      this.currentProcess.kill('SIGTERM')
    } catch (e) {
      console.error('[SteamCMD] SIGTERM failed, trying SIGKILL')
      try {
        this.currentProcess.kill('SIGKILL')
      } catch (e2) {
        console.error('[SteamCMD] SIGKILL also failed')
      }
    }

    return true
  }

  /**
   * Check if a download is currently running
   */
  isDownloading(): boolean {
    return this.currentProcess !== null && this.currentModId !== null
  }

  /**
   * Get the current downloading mod ID (if any)
   */
  getCurrentModId(): string | null {
    return this.currentModId
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

    // If cancel was requested before we even started, reset it
    this.cancelRequested = false
    this.cancelResolve = null
    this.currentModId = modId

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

      this.currentProcess = process

      let stdout = ''
      let stderr = ''
      let progressRegex = /Downloading update \((\d+) of (\d+)\)/
      let isDownloading = false
      let lastActivityTime = Date.now()
      let hasStartedOutput = false
      let forceKillTimeout: NodeJS.Timeout | null = null

      // Update activity timestamp on any output
      const updateActivity = () => {
        lastActivityTime = Date.now()
        hasStartedOutput = true
      }

      // Handle process exit
      const handleProcessExit = (code: number | null) => {
        if (forceKillTimeout) {
          clearTimeout(forceKillTimeout)
          forceKillTimeout = null
        }
        console.log(`[SteamCMD] Process exited with code ${code}`)

        // Clear current process references
        this.currentProcess = null
        this.currentModId = null

        // If cancel was requested, handle it specially
        if (this.cancelRequested) {
          this.cancelRequested = false
          this.emit('progress', {
            stage: 'error',
            percent: 0,
            message: 'Download cancelled by user'
          } as DownloadProgress)

          const result: SteamCMDResult = {
            success: false,
            modId,
            error: 'CANCELLED' // Special marker for user cancellation
          }

          if (this.cancelResolve) {
            this.cancelResolve(result)
            this.cancelResolve = null
          } else {
            resolve(result)
          }
          return
        }

        // Check if download was successful
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
          } else if (!hasStartedOutput) {
            errorMessage = 'SteamCMD failed to start - no output received. Please check if SteamCMD is up to date.'
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
      }

      // Handle stdout data
      process.stdout?.on('data', (data: Buffer) => {
        updateActivity()
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
        updateActivity()
        const text = data.toString()
        stderr += text
        console.error(`[SteamCMD stderr] ${text.trim()}`)
      })

      process.on('close', handleProcessExit)

      // Handle process errors (e.g., executable not found)
      process.on('error', (error: Error) => {
        if (forceKillTimeout) {
          clearTimeout(forceKillTimeout)
          forceKillTimeout = null
        }
        this.currentProcess = null
        this.currentModId = null

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

      // Connection/initial output timeout - fail fast if no output in first 30 seconds
      const connectTimeoutId = setTimeout(() => {
        if (!hasStartedOutput) {
          console.error('[SteamCMD] No output received after 30 seconds - process may be stuck')
          this.emit('progress', {
            stage: 'connecting',
            percent: 0,
            message: 'Still connecting... (checking if process is alive)'
          } as DownloadProgress)
        }
      }, this.connectTimeout)

      // Activity monitor - check for stuck process
      const activityCheckInterval = setInterval(() => {
        const elapsedSinceActivity = Date.now() - lastActivityTime
        if (hasStartedOutput && elapsedSinceActivity > this.activityTimeout) {
          console.error(`[SteamCMD] No activity for ${elapsedSinceActivity}ms - sending warning`)
          this.emit('progress', {
            stage: 'downloading',
            percent: -1, // Use negative to indicate "stuck" but still running
            message: `Process seems stuck - no activity for ${Math.round(elapsedSinceActivity / 1000)}s. Waiting...`
          } as DownloadProgress)
        }
      }, 30000) // Check every 30 seconds

      // Hard timeout - kill after 5 minutes
      const timeoutId = setTimeout(() => {
        console.error('[SteamCMD] Download timeout after 5 minutes - attempting to kill process')

        this.emit('progress', {
          stage: 'error',
          percent: 0,
          message: 'Download timeout after 5 minutes. Terminating process...'
        } as DownloadProgress)

        // Try graceful kill first
        try {
          process.kill('SIGTERM')
        } catch (e) {
          console.error('[SteamCMD] SIGTERM failed, trying SIGKILL')
        }

        // Force kill if still running after 5 seconds
        forceKillTimeout = setTimeout(() => {
          try {
            process.kill('SIGKILL')
          } catch (e) {
            console.error('[SteamCMD] SIGKILL also failed')
          }
        }, 5000)

        resolve({
          success: false,
          modId,
          error: 'Download timeout after 5 minutes. Please check your network connection or try again.'
        })
      }, this.timeout)

      // Cleanup all timeouts/intervals when process closes
      process.on('close', () => {
        clearTimeout(timeoutId)
        clearTimeout(connectTimeoutId)
        clearInterval(activityCheckInterval)
      })
    })
  }
}

// Export singleton instance
export const steamCMD = new SteamCMD()
export default steamCMD
