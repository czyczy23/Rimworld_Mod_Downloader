import { describe, it, expect } from 'vitest'
import { isAllowedSteamUrl } from '../urlGuard'

describe('urlGuard', () => {
  it('should allow steamcommunity.com URLs', () => {
    expect(isAllowedSteamUrl('https://steamcommunity.com/app/294100/workshop/')).toBe(true)
    expect(isAllowedSteamUrl('https://steamcommunity.com/sharedfiles/filedetails/?id=123')).toBe(true)
  })

  it('should allow subdomains of steamcommunity.com', () => {
    expect(isAllowedSteamUrl('https://cdn.steamcommunity.com/something')).toBe(true)
  })

  it('should allow store.steampowered.com', () => {
    expect(isAllowedSteamUrl('https://store.steampowered.com/app/294100')).toBe(true)
  })

  it('should block non-HTTPS URLs', () => {
    expect(isAllowedSteamUrl('http://steamcommunity.com/app/294100')).toBe(false)
    expect(isAllowedSteamUrl('file:///C:/evil.html')).toBe(false)
    expect(isAllowedSteamUrl('javascript:alert(1)')).toBe(false)
  })

  it('should block non-Steam domains', () => {
    expect(isAllowedSteamUrl('https://evil.com/steal-cookies')).toBe(false)
    expect(isAllowedSteamUrl('https://google.com')).toBe(false)
    expect(isAllowedSteamUrl('https://fake-steamcommunity.com/phish')).toBe(false)
  })

  it('should block invalid URLs', () => {
    expect(isAllowedSteamUrl('')).toBe(false)
    expect(isAllowedSteamUrl('not-a-url')).toBe(false)
  })
})
