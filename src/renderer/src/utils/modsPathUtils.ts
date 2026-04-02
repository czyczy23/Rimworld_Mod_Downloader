/**
 * Shared utilities for Mods path management
 */

// Re-export ModsPath from shared types
export type { ModsPath } from '../../../shared/types'

/**
 * Get the default RimWorld Mods folder path
 */
export const getDefaultModsPath = (): string => {
  if (typeof window !== 'undefined' && (window as any).electron?.process?.env) {
    const env = (window as any).electron.process.env
    const userProfile = env.USERPROFILE || env.HOME || ''
    return `${userProfile}\\AppData\\LocalLow\\Ludeon Studios\\RimWorld by Ludeon Studios\\Mods`
  }

  return 'C:\\Users\\[USERNAME]\\AppData\\LocalLow\\Ludeon Studios\\RimWorld by Ludeon Studios\\Mods'
}
