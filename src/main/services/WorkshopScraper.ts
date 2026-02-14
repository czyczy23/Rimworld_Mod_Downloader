import axios from 'axios'
import * as cheerio from 'cheerio'
import type { Dependency } from '../../shared/types'

export interface ModVersionInfo {
  supportedVersions: string[]
  modName: string
  dependencies: Dependency[]
}

export class WorkshopScraper {
  private readonly BASE_URL = 'https://steamcommunity.com/sharedfiles/filedetails/?id='

  /**
   * 主方法：抓取 Mod 版本信息
   * @param modId Steam Workshop Mod ID
   * @returns 包含支持版本、Mod名称和依赖的信息
   */
  async scrapeModVersion(modId: string): Promise<ModVersionInfo> {
    console.log(`[WorkshopScraper] Scraping version info for mod ${modId}`)

    try {
      const html = await this.fetchViaHttp(modId)
      const $ = cheerio.load(html)

      const supportedVersions = this.parseVersionFromPage($)
      const modName = this.parseModNameFromPage($)
      const dependencies = this.parseDependenciesFromPage($)

      console.log(`[WorkshopScraper] Found versions: ${supportedVersions.join(', ')} for mod "${modName}"`)
      console.log(`[WorkshopScraper] Found ${dependencies.length} dependencies`)

      return {
        supportedVersions,
        modName,
        dependencies
      }
    } catch (error) {
      console.error(`[WorkshopScraper] Failed to scrape mod ${modId}:`, error)
      return {
        supportedVersions: [],
        modName: `Mod ${modId}`,
        dependencies: []
      }
    }
  }

  /**
   * 通过 HTTP 抓取 Steam Workshop 页面
   */
  private async fetchViaHttp(modId: string): Promise<string> {
    const url = `${this.BASE_URL}${modId}`
    console.log(`[WorkshopScraper] Fetching page: ${url}`)

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000
    })

    return response.data
  }

  /**
   * 从页面解析支持的版本
   */
  private parseVersionFromPage($: cheerio.CheerioAPI): string[] {
    const versions: string[] = []
    const versionPattern = /Mod[,\s]+(\d+\.\d+)/g

    // 尝试多种可能的选择器
    const selectors = [
      '.rightDetailsBlock',
      '.detailsStatsContainerRight',
      '.workshopItemDetailsHeader',
      '.workshopItemTags',
      '.workshopItemDescription'
    ]

    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        const text = element.text().trim()
        let match
        while ((match = versionPattern.exec(text)) !== null) {
          const version = match[1]
          if (!versions.includes(version)) {
            versions.push(version)
          }
        }
      }
    }

    // 如果仍未找到版本信息，尝试更通用的搜索
    if (versions.length === 0) {
      const bodyText = $('body').text()
      let match
      while ((match = versionPattern.exec(bodyText)) !== null) {
        const version = match[1]
        if (!versions.includes(version)) {
          versions.push(version)
        }
      }
    }

    return versions
  }

  /**
   * 从页面解析 Mod 名称
   */
  private parseModNameFromPage($: cheerio.CheerioAPI): string {
    const selectors = [
      '.workshopItemTitle',
      'h1',
      '.workshopItemDetailsHeader .workshopItemTitle'
    ]

    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        const text = element.text().trim()
        if (text) {
          return text
        }
      }
    }

    return 'Unknown Mod'
  }

  /**
   * 从页面解析依赖
   */
  private parseDependenciesFromPage($: cheerio.CheerioAPI): Dependency[] {
    const dependencies: Dependency[] = []

    // 尝试找到 "Required Items" 或类似的依赖部分
    const requiredSections = $('.workshopItemRequiredItems, .requiredItems, .dependencyList')

    if (requiredSections.length > 0) {
      requiredSections.find('a').each((_, element) => {
        const href = $(element).attr('href')
        const name = $(element).text().trim()

        if (href && name) {
          // 从 href 中提取 mod ID
          const modIdMatch = href.match(/filedetails\/\?id=(\d+)/)
          if (modIdMatch) {
            const modId = modIdMatch[1]
            dependencies.push({
              id: modId,
              name: name,
              isOptional: false,
              willDownload: true
            })
          }
        }
      })
    }

    return dependencies
  }

  /**
   * 检查版本兼容性
   */
  checkCompatibility(gameVersion: string, modVersions: string[]): boolean {
    if (!gameVersion || modVersions.length === 0) {
      return true // 如果版本信息不完整，默认兼容
    }

    return modVersions.includes(gameVersion)
  }
}

// 单例实例
export const workshopScraper = new WorkshopScraper()
