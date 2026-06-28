/**
 * URL guard for the Steam Workshop webview.
 * Shared by the renderer UX layer and main-process security checks.
 */

const ALLOWED_HOSTNAMES = ['steamcommunity.com', 'store.steampowered.com', 'help.steampowered.com']

/**
 * Check if a URL is allowed for navigation in the Steam webview.
 * Only permits HTTPS URLs on allowed Steam hostnames.
 */
export function isAllowedSteamUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      return false
    }

    return ALLOWED_HOSTNAMES.some(
      (allowed) => parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`)
    )
  } catch {
    return false
  }
}
