/**
 * Shared constants used across main and renderer processes.
 * Eliminates magic numbers and hardcoded strings.
 */

/** RimWorld Steam App ID */
export const RIMWORLD_APP_ID = '294100'

/** SteamCMD anonymous login credential */
export const STEAM_LOGIN = 'anonymous'

/** SteamCMD download timeout in milliseconds (5 minutes) */
export const STEAMCMD_TIMEOUT_MS = 300_000

/** Graceful shutdown wait time in milliseconds (5 seconds) */
export const STEAMCMD_GRACE_MS = 5_000

/** Steam Workshop base URL for RimWorld */
export const STEAM_WORKSHOP_BASE_URL = `https://steamcommunity.com/app/${RIMWORLD_APP_ID}/workshop/`
