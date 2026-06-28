const SIGNING_MODE = {
  disabled: 'disabled',
  signtool: 'signtool',
  azure: 'azure'
}

function readBooleanEnv(name, defaultValue = false) {
  const raw = process.env[name]
  if (raw == null || raw === '') return defaultValue

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase())
}

function getSigningMode() {
  const mode = process.env.WINDOWS_CODE_SIGNING || SIGNING_MODE.disabled
  if (!Object.values(SIGNING_MODE).includes(mode)) {
    throw new Error(
      `WINDOWS_CODE_SIGNING must be one of: ${Object.values(SIGNING_MODE).join(', ')}`
    )
  }

  return mode
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required when WINDOWS_CODE_SIGNING=${getSigningMode()}`)
  }
  return value
}

function buildWindowsSigningConfig() {
  const mode = getSigningMode()

  if (mode === SIGNING_MODE.disabled) {
    return {
      enabled: false,
      env: {
        CSC_IDENTITY_AUTO_DISCOVERY: 'false',
        WIN_CSC_LINK: '',
        WIN_CSC_KEY_PASSWORD: ''
      },
      win: {
        signExecutable: false
      }
    }
  }

  if (mode === SIGNING_MODE.signtool) {
    requireEnv('WIN_CSC_LINK')
    requireEnv('WIN_CSC_KEY_PASSWORD')

    return {
      enabled: true,
      env: {
        CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY || 'false'
      },
      win: {
        signExecutable: true,
        verifyUpdateCodeSignature: true,
        signtoolOptions: {
          publisherName: process.env.WINDOWS_SIGN_PUBLISHER_NAME || undefined,
          rfc3161TimeStampServer:
            process.env.WINDOWS_SIGN_TIMESTAMP_SERVER || 'http://timestamp.digicert.com'
        }
      }
    }
  }

  requireEnv('AZURE_TENANT_ID')
  requireEnv('AZURE_CLIENT_ID')
  requireEnv('AZURE_CLIENT_SECRET')
  requireEnv('AZURE_TRUSTED_SIGNING_ENDPOINT')
  requireEnv('AZURE_TRUSTED_SIGNING_ACCOUNT')
  requireEnv('AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE')
  requireEnv('WINDOWS_SIGN_PUBLISHER_NAME')

  return {
    enabled: true,
    env: {},
    win: {
      signExecutable: true,
      verifyUpdateCodeSignature: true,
      azureSignOptions: {
        endpoint: process.env.AZURE_TRUSTED_SIGNING_ENDPOINT,
        codeSigningAccountName: process.env.AZURE_TRUSTED_SIGNING_ACCOUNT,
        certificateProfileName: process.env.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE,
        publisherName: process.env.WINDOWS_SIGN_PUBLISHER_NAME
      }
    }
  }
}

function buildSigningEnv(baseEnv = process.env) {
  return {
    ...baseEnv,
    ...buildWindowsSigningConfig().env
  }
}

function signingSummary() {
  const mode = getSigningMode()
  return {
    mode,
    enabled: mode !== SIGNING_MODE.disabled,
    publisherName: process.env.WINDOWS_SIGN_PUBLISHER_NAME || null
  }
}

module.exports = {
  SIGNING_MODE,
  buildSigningEnv,
  buildWindowsSigningConfig,
  getSigningMode,
  readBooleanEnv,
  signingSummary
}
