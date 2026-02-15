import axios from 'axios'
import * as cheerio from 'cheerio'
import https from 'https'
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
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })

    return response.data
  }

  /**
   * 从页面解析支持的版本
   */
  private parseVersionFromPage($: cheerio.CheerioAPI): string[] {
    const versions: string[] = []
    const addedVersions = new Set<string>()

    // 首先找到包含 "Mod" 开头的行，然后提取其中所有版本号
    const modLinePattern = /Mod[,\s]+([\d\.,\s]+)/gi
    const versionExtractPattern = /\b(\d+\.\d+(?:\.\d+)?)\b/g

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
        console.log(`[WorkshopScraper] Checking selector ${selector}, text:`, text.substring(0, 200))

        // 首先查找包含 "Mod" 的行，然后提取其中所有版本号
        let lineMatch
        modLinePattern.lastIndex = 0
        while ((lineMatch = modLinePattern.exec(text)) !== null) {
          const versionString = lineMatch[1]
          console.log(`[WorkshopScraper] Found mod line with versions:`, versionString)
          // 在版本字符串中提取所有版本号
          let verMatch
          versionExtractPattern.lastIndex = 0
          while ((verMatch = versionExtractPattern.exec(versionString)) !== null) {
            const fullVersion = verMatch[1]
            // 只提取主版本和次版本（1.5, 1.6），忽略补丁号
            const mainVersion = fullVersion.match(/^(\d+\.\d+)/)?.[1]
            if (mainVersion && !addedVersions.has(mainVersion)) {
              addedVersions.add(mainVersion)
              versions.push(mainVersion)
            }
          }
        }

        // 如果找到了版本，就不用继续找其他选择器了
        if (versions.length > 0) {
          console.log(`[WorkshopScraper] Found versions from ${selector}:`, versions)
          break
        }

        // 备用：如果文本中包含 "mod"，查找所有版本号
        if (text.toLowerCase().includes('mod')) {
          let verMatch
          versionExtractPattern.lastIndex = 0
          while ((verMatch = versionExtractPattern.exec(text)) !== null) {
            const fullVersion = verMatch[1]
            const mainVersion = fullVersion.match(/^(\d+\.\d+)/)?.[1]
            if (mainVersion && !addedVersions.has(mainVersion)) {
              addedVersions.add(mainVersion)
              versions.push(mainVersion)
            }
          }
        }

        // 如果找到了版本，就不用继续找其他选择器了
        if (versions.length > 0) {
          console.log(`[WorkshopScraper] Found versions from ${selector} (fallback):`, versions)
          break
        }
      }
    }

    // 如果仍未找到版本信息，尝试更通用的搜索
    if (versions.length === 0) {
      const bodyText = $('body').text()
      // 先找包含 "Mod" 的行
      let lineMatch
      modLinePattern.lastIndex = 0
      while ((lineMatch = modLinePattern.exec(bodyText)) !== null) {
        const versionString = lineMatch[1]
        let verMatch
        const versionExtractPattern2 = /\b(\d+\.\d+(?:\.\d+)?)\b/g
        while ((verMatch = versionExtractPattern2.exec(versionString)) !== null) {
          const fullVersion = verMatch[1]
          const mainVersion = fullVersion.match(/^(\d+\.\d+)/)?.[1]
          if (mainVersion && !addedVersions.has(mainVersion)) {
            addedVersions.add(mainVersion)
            versions.push(mainVersion)
          }
        }
      }
    }

    console.log(`[WorkshopScraper] Final versions found:`, versions)
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
    const addedIds = new Set<string>()

    // 尝试多种选择器来找到"必需物品"区域
    const selectors = [
      '.workshopItemRequiredItems',
      '.requiredItems',
      '.dependencyList',
      '[class*="requiredItems"]',
      '[class*="RequiredItems"]'
    ]

    let requiredSection: cheerio.Cheerio<any> | null = null

    // 尝试各个选择器
    for (const selector of selectors) {
      const element = $(selector)
      if (element.length > 0) {
        requiredSection = element
        console.log(`[WorkshopScraper] Found required items section with selector: ${selector}`)
        break
      }
    }

    // 备用方案：查找包含"Required Items"或"必需物品"文本的区域
    if (!requiredSection || requiredSection.length === 0) {
      console.log('[WorkshopScraper] Trying fallback search for required items')
      $('div').each((_, element) => {
        const text = $(element).text()
        if (text.includes('Required Items') || text.includes('必需物品')) {
          // 找到这个区域后，查找附近的链接
          const parent = $(element).parent()
          const links = parent.find('a')
          if (links.length > 0) {
            requiredSection = parent
            console.log('[WorkshopScraper] Found required items via text search')
            return false // 跳出 each 循环
          }
        }
      })
    }

    // 如果找到了依赖区域，解析其中的链接
    if (requiredSection && requiredSection.length > 0) {
      // 查找该区域内的所有链接
      requiredSection.find('a').each((_, element) => {
        const href = $(element).attr('href')
        const name = $(element).text().trim()

        if (href && name) {
          // 从 href 中提取 mod ID
          const modIdMatch = href.match(/filedetails\/\?id=(\d+)/)
          if (modIdMatch) {
            const modId = modIdMatch[1]
            // 避免重复添加同一个依赖
            if (!addedIds.has(modId)) {
              addedIds.add(modId)
              dependencies.push({
                id: modId,
                name: name,
                isOptional: false,
                willDownload: true
              })
              console.log(`[WorkshopScraper] Found dependency: ${name} (${modId})`)
            }
          }
        }
      })
    }

    console.log(`[WorkshopScraper] Total dependencies found: ${dependencies.length}`)
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
