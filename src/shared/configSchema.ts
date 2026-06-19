/**
 * Runtime validation for config values set by the renderer.
 * Prevents injection of arbitrary paths or malformed structures
 * through the IPC config:set channel.
 */

import type { AppConfig } from './types'

type ConfigKey = keyof AppConfig

/**
 * Validate a config value for a given key.
 * Throws with a descriptive message if validation fails.
 */
export function validateConfigValue(key: ConfigKey, value: unknown): void {
  if (value === null || value === undefined) {
    throw new Error(`Config value for '${key}' cannot be null/undefined`)
  }

  switch (key) {
    case 'firstRunCompleted':
      if (typeof value !== 'boolean') {
        throw new Error('firstRunCompleted must be a boolean')
      }
      break

    case 'app':
      validateAppConfig(value as AppConfig['app'])
      break

    case 'steamcmd':
      validateSteamcmdConfig(value as AppConfig['steamcmd'])
      break

    case 'rimworld':
      validateRimworldConfig(value as AppConfig['rimworld'])
      break

    case 'download':
      validateDownloadConfig(value as AppConfig['download'])
      break

    case 'version':
      validateVersionConfig(value as AppConfig['version'])
      break

    case 'git':
      validateGitConfig(value as AppConfig['git'])
      break

    default:
      throw new Error(`Unknown config key: ${key}`)
  }
}

function validateAppConfig(value: AppConfig['app']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('app must be an object')
  }
  const validLanguages = ['en', 'zh-TW', 'zh-CN', 'system']
  if (!validLanguages.includes(value.language)) {
    throw new Error(`app.language must be one of: ${validLanguages.join(', ')}`)
  }
}

function validateSteamcmdConfig(value: AppConfig['steamcmd']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('steamcmd must be an object')
  }

  // executablePath and downloadPath must be absolute paths if non-empty
  for (const field of ['executablePath', 'downloadPath'] as const) {
    const v = value[field]
    if (typeof v !== 'string') {
      throw new Error(`steamcmd.${field} must be a string`)
    }
    if (v !== '') {
      // Must be an absolute path (starts with drive letter on Windows, / on Unix)
      const { isAbsolute } = require('path')
      if (!isAbsolute(v)) {
        throw new Error(`steamcmd.${field} must be an absolute path`)
      }
      // Block path traversal
      if (v.includes('..')) {
        throw new Error(`steamcmd.${field} must not contain '..'`)
      }
    }
  }
}

function validateRimworldConfig(value: AppConfig['rimworld']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('rimworld must be an object')
  }
  if (typeof value.currentVersion !== 'string') {
    throw new Error('rimworld.currentVersion must be a string')
  }
  if (!Array.isArray(value.modsPaths)) {
    throw new Error('rimworld.modsPaths must be an array')
  }
  for (const p of value.modsPaths) {
    if (typeof p.path !== 'string' || typeof p.name !== 'string') {
      throw new Error('Each modsPath must have string path and name')
    }
    if (typeof p.isActive !== 'boolean') {
      throw new Error('Each modsPath.isActive must be a boolean')
    }
  }
  if (typeof value.autoCheckUpdates !== 'boolean') {
    throw new Error('rimworld.autoCheckUpdates must be a boolean')
  }
}

function validateDownloadConfig(value: AppConfig['download']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('download must be an object')
  }
  for (const field of ['autoDownloadDependencies', 'skipVersionCheck', 'extractCollectionToSubfolder'] as const) {
    if (typeof value[field] !== 'boolean') {
      throw new Error(`download.${field} must be a boolean`)
    }
  }
  const validModes = ['ask', 'auto', 'ignore']
  if (!validModes.includes(value.dependencyMode)) {
    throw new Error(`download.dependencyMode must be one of: ${validModes.join(', ')}`)
  }
}

function validateVersionConfig(value: AppConfig['version']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('version must be an object')
  }
  if (typeof value.autoDetect !== 'boolean') {
    throw new Error('version.autoDetect must be a boolean')
  }
  if (typeof value.manualVersion !== 'string') {
    throw new Error('version.manualVersion must be a string')
  }
  const validMismatch = ['ask', 'force', 'skip']
  if (!validMismatch.includes(value.onMismatch)) {
    throw new Error(`version.onMismatch must be one of: ${validMismatch.join(', ')}`)
  }
}

function validateGitConfig(value: AppConfig['git']): void {
  if (typeof value !== 'object' || value === null) {
    throw new Error('git must be an object')
  }
  if (typeof value.enabled !== 'boolean') {
    throw new Error('git.enabled must be a boolean')
  }
  if (typeof value.autoCommit !== 'boolean') {
    throw new Error('git.autoCommit must be a boolean')
  }
  // githubToken and remoteUrl are optional strings
  if (value.githubToken !== undefined && typeof value.githubToken !== 'string') {
    throw new Error('git.githubToken must be a string if provided')
  }
  if (value.remoteUrl !== undefined && typeof value.remoteUrl !== 'string') {
    throw new Error('git.remoteUrl must be a string if provided')
  }
}
