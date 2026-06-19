/**
 * URL guard for the Steam Workshop webview.
 * Restricts navigation to allowed Steam domains to prevent loading
 * arbitrary (potentially malicious) URLs in the steam session context.
 */

const ALLOWED_HOSTNAMES = [
  'steamcommunity.com',
  'store.steampowered.com',
  'help.steampowered.com'
]

/**
 * Check if a URL is allowed for navigation in the Steam webview.
 * Only permits HTTPS URLs on allowed Steam hostnames.
 */
export function isAllowedSteamUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Only allow HTTPS (block http, file, javascript, data, etc.)
    if (parsed.protocol !== 'https:') {
      return false
    }
    // Check hostname (allow subdomains like *.steamcommunity.com)
    return ALLOWED_HOSTNAMES.some(
      (allowed) =>
        parsed.hostname === allowed || parsed.hostname.endsWith(`.${allowed}`)
    )
  } catch {
    // Invalid URL
    return false
  }
}
