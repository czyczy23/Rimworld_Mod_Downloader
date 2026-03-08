/**
 * Shared utilities for Mods path management
 */

// Re-export ModsPath from shared types
export type { ModsPath } from '../../../shared/types'

/**
 * Get the default RimWorld Mods folder path
 */
export const getDefaultModsPath = (): string => {
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    const userProfile = (window as any).process.env.USERPROFILE || (window as any).process.env.HOME || ''
    return `${userProfile}\\AppData\\LocalLow\\Ludeon Studios\\RimWorld by Ludeon Studios\\Mods`
  }
  return 'C:\\Users\\[用户名]\\AppData\\LocalLow\\Ludeon Studios\\RimWorld by Ludeon Studios\\Mods'
}
