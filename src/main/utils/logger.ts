/**
 * Centralized logger for the main process.
 * Uses electron-log when available (after npm install), falls back to console.
 * File logging: %APPDATA%/rimworld-mod-downloader/logs/main.log
 *
 * Usage:
 *   import logger from './utils/logger'
 *   logger.info('[MyModule] Something happened')
 *   logger.error('[MyModule] Something failed:', error)
 */

interface Logger {
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  debug(...args: unknown[]): void
}

function createLogger(): Logger {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const log = require('electron-log')

    // Configure file transport
    log.transports.file.level = 'info'
    log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB rotation

    // Console transport: show in dev, silent in production
    log.transports.console.level =
      process.env.NODE_ENV === 'development' ? 'debug' : false

    return log as Logger
  } catch {
    // electron-log not installed — fall back to console with prefix
    const prefix = '[Main]'
    return {
      info: (...args: unknown[]) => console.log(prefix, ...args),
      warn: (...args: unknown[]) => console.warn(prefix, ...args),
      error: (...args: unknown[]) => console.error(prefix, ...args),
      debug: (...args: unknown[]) => console.debug(prefix, ...args)
    }
  }
}

const logger = createLogger()
export default logger
