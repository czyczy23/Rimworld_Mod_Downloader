import { createRequire } from 'module'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const signingConfig = require('../../../scripts/signing-config.cjs') as {
  SIGNING_MODE: {
    disabled: 'disabled'
    signtool: 'signtool'
    azure: 'azure'
  }
  assertRequiredSigningEnv: (mode?: string) => void
  requiredSigningEnv: (mode?: string) => string[]
  getSigningMode: () => string
}

const SIGNING_ENV = [
  'WINDOWS_CODE_SIGNING',
  'WIN_CSC_LINK',
  'WIN_CSC_KEY_PASSWORD',
  'WINDOWS_SIGN_PUBLISHER_NAME',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_TRUSTED_SIGNING_ENDPOINT',
  'AZURE_TRUSTED_SIGNING_ACCOUNT',
  'AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE'
]

function withEnv(values: Record<string, string | undefined>, action: () => void) {
  const previous = Object.fromEntries(SIGNING_ENV.map((name) => [name, process.env[name]]))
  for (const name of SIGNING_ENV) {
    delete process.env[name]
  }
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined) {
      process.env[name] = value
    }
  }

  try {
    action()
  } finally {
    for (const name of SIGNING_ENV) {
      const value = previous[name]
      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  }
}

describe('signing-config', () => {
  afterEach(() => {
    for (const name of SIGNING_ENV) {
      delete process.env[name]
    }
  })

  it('defaults to disabled signing without required secrets', () => {
    withEnv({}, () => {
      expect(signingConfig.getSigningMode()).toBe(signingConfig.SIGNING_MODE.disabled)
      expect(signingConfig.requiredSigningEnv()).toEqual([])
      expect(() => signingConfig.assertRequiredSigningEnv()).not.toThrow()
    })
  })

  it('requires certificate and publisher metadata for signtool signing', () => {
    withEnv({ WINDOWS_CODE_SIGNING: 'signtool' }, () => {
      expect(signingConfig.requiredSigningEnv()).toEqual([
        'WIN_CSC_LINK',
        'WIN_CSC_KEY_PASSWORD',
        'WINDOWS_SIGN_PUBLISHER_NAME'
      ])
      expect(() => signingConfig.assertRequiredSigningEnv()).toThrow(
        'WIN_CSC_LINK is required when WINDOWS_CODE_SIGNING=signtool'
      )
    })
  })

  it('accepts complete signtool signing metadata', () => {
    withEnv(
      {
        WINDOWS_CODE_SIGNING: 'signtool',
        WIN_CSC_LINK: 'base64-or-file',
        WIN_CSC_KEY_PASSWORD: 'password',
        WINDOWS_SIGN_PUBLISHER_NAME: 'Example Publisher'
      },
      () => {
        expect(() => signingConfig.assertRequiredSigningEnv()).not.toThrow()
      }
    )
  })

  it('requires Azure Trusted Signing metadata', () => {
    withEnv({ WINDOWS_CODE_SIGNING: 'azure' }, () => {
      expect(signingConfig.requiredSigningEnv()).toContain('AZURE_TRUSTED_SIGNING_ACCOUNT')
      expect(signingConfig.requiredSigningEnv()).toContain('WINDOWS_SIGN_PUBLISHER_NAME')
      expect(() => signingConfig.assertRequiredSigningEnv()).toThrow(
        'AZURE_TENANT_ID is required when WINDOWS_CODE_SIGNING=azure'
      )
    })
  })

  it('rejects unknown signing modes', () => {
    withEnv({ WINDOWS_CODE_SIGNING: 'mystery' }, () => {
      expect(() => signingConfig.getSigningMode()).toThrow(
        'WINDOWS_CODE_SIGNING must be one of: disabled, signtool, azure'
      )
    })
  })
})
