import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkshopScraper } from '../WorkshopScraper'

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

import axios from 'axios'

const mockedAxios = vi.mocked(axios, true)

function makeHtml(options: {
  title?: string
  versions?: string
  requiredItems?: string
  description?: string
} = {}): string {
  const {
    title = 'Test Mod',
    versions = '',
    requiredItems = '',
    description = ''
  } = options

  return `<!DOCTYPE html><html><body>
    <div class="workshopItemTitle">${title}</div>
    <div class="rightDetailsBlock">${versions}</div>
    <div class="workshopItemDescription">${description}</div>
    ${requiredItems}
  </body></html>`
}

describe('WorkshopScraper', () => {
  let scraper: WorkshopScraper

  beforeEach(() => {
    vi.clearAllMocks()
    scraper = new WorkshopScraper()
  })

  it('should extract mod name from .workshopItemTitle', async () => {
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ title: 'My Awesome Mod' })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.modName).toBe('My Awesome Mod')
  })

  it('should extract supported versions from rightDetailsBlock', async () => {
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ versions: 'Mod 1.4, 1.5' })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.supportedVersions).toContain('1.4')
    expect(result.supportedVersions).toContain('1.5')
  })

  it('should extract dependencies from required items section', async () => {
    const requiredItems = `
      <div class="workshopItemRequiredItems">
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=111">Dependency A</a>
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=222">Dependency B</a>
      </div>`
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ requiredItems })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.dependencies).toHaveLength(2)
    expect(result.dependencies[0]).toMatchObject({ modId: '111', name: 'Dependency A', required: true })
    expect(result.dependencies[1]).toMatchObject({ modId: '222', name: 'Dependency B', required: true })
  })

  it('should deduplicate dependencies', async () => {
    const requiredItems = `
      <div class="workshopItemRequiredItems">
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=111">Dep A</a>
        <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=111">Dep A Again</a>
      </div>`
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ requiredItems })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.dependencies).toHaveLength(1)
  })

  it('should return empty arrays when no info found', async () => {
    mockedAxios.get.mockResolvedValue({
      data: '<html><body><div>No info here</div></body></html>'
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.supportedVersions).toEqual([])
    expect(result.dependencies).toEqual([])
    expect(result.modName).toBe('Mod 12345') // fallback
  })

  it('should throw WorkshopScraperError on network failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network timeout'))

    await expect(scraper.scrapeModVersion('12345')).rejects.toThrow('Failed to fetch mod information')
  })

  it('should extract versions from description text', async () => {
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ description: 'This mod supports version 1.5 and version 1.6' })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.supportedVersions).toContain('1.5')
    expect(result.supportedVersions).toContain('1.6')
  })

  it('should extract versions with multiple dots (e.g. 1.5.4063)', async () => {
    mockedAxios.get.mockResolvedValue({
      data: makeHtml({ versions: 'Mod 1.5.4063, 1.6' })
    })

    const result = await scraper.scrapeModVersion('12345')
    expect(result.supportedVersions).toContain('1.5.4063')
    expect(result.supportedVersions).toContain('1.6')
  })
})
