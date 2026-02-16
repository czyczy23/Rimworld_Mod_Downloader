import axios from 'axios'
import * as cheerio from 'cheerio'
import * as https from 'https'

export interface ModVersionInfo {
  supportedVersions: string[]
  modName: string
  dependencies: Dependency[]
}

export interface Dependency {
  modId: string
  name: string
  required: boolean
}

export class WorkshopScraperError extends Error {
  constructor(
    message: string,
    public modId: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'WorkshopScraperError'
  }
}

export class WorkshopScraper {
  private readonly baseUrl = 'https://steamcommunity.com/sharedfiles/filedetails/'
  private readonly agent = new https.Agent({ rejectUnauthorized: false })

  /**
   * Scrape mod version information from Steam Workshop page
   * @param modId The Steam Workshop item ID
   * @returns Promise resolving to version info
   * @throws WorkshopScraperError when scraping fails
   */
  async scrapeModVersion(modId: string): Promise<ModVersionInfo> {
    try {
      const url = `${this.baseUrl}?id=${modId}`
      console.log(`[WorkshopScraper] Fetching: ${url}`)

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        httpsAgent: this.agent
      })

      const html = response.data
      const $ = cheerio.load(html)

      // Extract mod name
      const modName = this.extractModName($, modId)

      // Extract supported versions using multiple strategies
      const supportedVersions = this.extractSupportedVersions($, html)

      // Extract dependencies
      const dependencies = this.extractDependencies($, html)

      console.log(`[WorkshopScraper] Found ${supportedVersions.length} versions for mod ${modId}`)
      console.log(`[WorkshopScraper] Found ${dependencies.length} dependencies for mod ${modId}`)

      return {
        supportedVersions,
        modName,
        dependencies
      }
    } catch (error) {
      console.error(`[WorkshopScraper] Failed to scrape mod ${modId}:`, error)
      // P0 FIX: Throw error instead of returning empty data
      throw new WorkshopScraperError(
        `Failed to fetch mod information for ${modId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        modId,
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Extract mod name from page
   */
  private extractModName($: cheerio.CheerioAPI, modId: string): string {
    // Try multiple selectors for mod name
    const selectors = [
      '.workshopItemTitle',
      '.apphub_AppName',
      '.workshopItemDetailsHeader h1',
      '[class*="title"]'
    ]

    for (const selector of selectors) {
      const element = $(selector).first()
      if (element.length && element.text().trim()) {
        return element.text().trim()
      }
    }

    // Fallback: use mod ID
    return `Mod ${modId}`
  }

  /**
   * Extract supported versions using multiple strategies
   */
  private extractSupportedVersions($: cheerio.CheerioAPI, html: string): string[] {
    const versions: Set<string> = new Set()

    // Strategy 1: Look in right details block
    const rightBlockSelectors = [
      '.rightDetailsBlock',
      '.detailsStatsContainerRight',
      '.workshopItemTags',
      '.workshopItemDetailsHeader'
    ]

    for (const selector of rightBlockSelectors) {
      const text = $(selector).text()
      const extracted = this.parseVersionsFromText(text)
      extracted.forEach(v => versions.add(v))
    }

    // Strategy 2: Look in description
    const description = $('.workshopItemDescription').text()
    const descVersions = this.parseVersionsFromText(description)
    descVersions.forEach(v => versions.add(v))

    // Strategy 3: Parse entire HTML for version patterns
    const htmlVersions = this.parseVersionsFromText(html)
    htmlVersions.forEach(v => versions.add(v))

    return Array.from(versions).sort()
  }

  /**
   * Parse version strings from text
   */
  private parseVersionsFromText(text: string): string[] {
    const versions: string[] = []

    // Look for "Mod X.X, X.X" pattern
    const modPattern = /Mod[\s,]+([\d.,\s]+)/gi
    let match
    while ((match = modPattern.exec(text)) !== null) {
      const versionPart = match[1]
      const versionMatches = versionPart.match(/\b(\d+\.\d+(?:\.\d+)?)\b/g)
      if (versionMatches) {
        versions.push(...versionMatches)
      }
    }

    // Also look for standalone version patterns near "version" keyword
    const versionPattern = /version[\s:]*([\d.]+)/gi
    while ((match = versionPattern.exec(text)) !== null) {
      if (match[1].match(/^\d+\.\d+/)) {
        versions.push(match[1])
      }
    }

    return versions
  }

  /**
   * Extract dependencies from page
   */
  private extractDependencies($: cheerio.CheerioAPI, html: string): Dependency[] {
    const dependencies: Dependency[] = []
    const seenIds = new Set<string>()

    // Strategy 1: Look in required items section
    const requiredSelectors = [
      '.workshopItemRequiredItems',
      '.requiredItems',
      '.dependencyList'
    ]

    for (const selector of requiredSelectors) {
      $(selector).find('a').each((_, element) => {
        const href = $(element).attr('href')
        if (href) {
          const match = href.match(/filedetails\/\?id=(\d+)/)
          if (match) {
            const depId = match[1]
            if (!seenIds.has(depId)) {
              seenIds.add(depId)
              dependencies.push({
                modId: depId,
                name: $(element).text().trim() || `Mod ${depId}`,
                required: true
              })
            }
          }
        }
      })
    }

    // Strategy 2: Parse HTML for Steam links
    const linkPattern = /filedetails\/\?id=(\d+)/g
    let linkMatch
    while ((linkMatch = linkPattern.exec(html)) !== null) {
      const depId = linkMatch[1]
      if (!seenIds.has(depId) && depId.length > 6) {
        seenIds.add(depId)
        dependencies.push({
          modId: depId,
          name: `Mod ${depId}`,
          required: true
        })
      }
    }

    return dependencies
  }
}

// Export singleton instance
export const workshopScraper = new WorkshopScraper()
export default workshopScraper