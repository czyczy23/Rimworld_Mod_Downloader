import { describe, expect, it } from 'vitest'
import { evaluateVersionGate, type VersionGateInput } from '../downloadFlow'
import type { AppConfig } from '../../../../shared/types'

const baseConfig = {
  download: {
    skipVersionCheck: false
  },
  version: {
    onMismatch: 'ask'
  }
} as AppConfig

function makeInput(overrides: Partial<VersionGateInput> = {}): VersionGateInput {
  return {
    intent: 'download',
    modId: '123',
    isCollection: false,
    fallbackName: 'Fallback Mod',
    gameVersion: '1.6',
    supportedVersions: ['1.6'],
    resolvedName: undefined,
    config: baseConfig,
    ...overrides
  }
}

describe('evaluateVersionGate', () => {
  it('continues when the mod supports the current game version', () => {
    expect(evaluateVersionGate(makeInput())).toEqual({
      status: 'continue',
      modName: 'Fallback Mod',
      modVersions: ['1.6']
    })
  })

  it('uses the resolved workshop name when available', () => {
    expect(evaluateVersionGate(makeInput({ resolvedName: 'Workshop Name' }))).toMatchObject({
      status: 'continue',
      modName: 'Workshop Name'
    })
  })

  it('asks on version mismatch when configured to ask', () => {
    expect(
      evaluateVersionGate(
        makeInput({
          intent: 'queue',
          supportedVersions: ['1.5']
        })
      )
    ).toEqual({
      status: 'ask',
      intent: 'queue',
      id: '123',
      name: 'Fallback Mod',
      isCollection: false,
      modVersions: ['1.5']
    })
  })

  it('skips on version mismatch when configured to skip', () => {
    expect(
      evaluateVersionGate(
        makeInput({
          supportedVersions: ['1.5'],
          config: {
            ...baseConfig,
            version: {
              ...baseConfig.version,
              onMismatch: 'skip'
            }
          }
        })
      )
    ).toEqual({
      status: 'skip',
      modName: 'Fallback Mod',
      modVersions: ['1.5']
    })
  })

  it('continues on version mismatch when configured to force', () => {
    expect(
      evaluateVersionGate(
        makeInput({
          supportedVersions: ['1.5'],
          config: {
            ...baseConfig,
            version: {
              ...baseConfig.version,
              onMismatch: 'force'
            }
          }
        })
      )
    ).toEqual({
      status: 'continue',
      modName: 'Fallback Mod',
      modVersions: ['1.5']
    })
  })

  it('continues without supported versions or when version checks are disabled', () => {
    expect(evaluateVersionGate(makeInput({ supportedVersions: [] }))).toMatchObject({
      status: 'continue'
    })

    expect(
      evaluateVersionGate(
        makeInput({
          supportedVersions: ['1.5'],
          config: {
            ...baseConfig,
            download: {
              ...baseConfig.download,
              skipVersionCheck: true
            }
          }
        })
      )
    ).toMatchObject({
      status: 'continue'
    })
  })
})
