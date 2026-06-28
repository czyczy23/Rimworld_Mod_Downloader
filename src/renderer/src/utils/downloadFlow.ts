import type { AppConfig } from '../../../shared/types'

export type DownloadIntent = 'download' | 'queue'

export interface VersionGateInput {
  intent: DownloadIntent
  modId: string
  isCollection: boolean
  fallbackName: string
  gameVersion: string
  supportedVersions: string[]
  resolvedName?: string
  config: AppConfig | null
}

export type VersionGateDecision =
  | {
      status: 'continue'
      modName: string
      modVersions: string[]
    }
  | {
      status: 'skip'
      modName: string
      modVersions: string[]
    }
  | {
      status: 'ask'
      intent: DownloadIntent
      id: string
      name: string
      isCollection: boolean
      modVersions: string[]
    }

export function evaluateVersionGate(input: VersionGateInput): VersionGateDecision {
  const modVersions = input.supportedVersions
  const modName = input.resolvedName || input.fallbackName
  const skipVersionCheck = input.config?.download?.skipVersionCheck ?? false
  const onMismatch = input.config?.version?.onMismatch ?? 'ask'
  const isCompatible =
    skipVersionCheck ||
    !input.gameVersion ||
    modVersions.length === 0 ||
    modVersions.includes(input.gameVersion)

  if (isCompatible || onMismatch === 'force') {
    return { status: 'continue', modName, modVersions }
  }

  if (onMismatch === 'skip') {
    return { status: 'skip', modName, modVersions }
  }

  return {
    status: 'ask',
    intent: input.intent,
    id: input.modId,
    name: modName,
    isCollection: input.isCollection,
    modVersions
  }
}
