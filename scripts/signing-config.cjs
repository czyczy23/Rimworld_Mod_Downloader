const SIGNING_MODE = {
  disabled: 'disabled',
  signtool: 'signtool',
  azure: 'azure'
}

const REQUIRED_SIGNING_ENV = {
  [SIGNING_MODE.disabled]: [],
  [SIGNING_MODE.signtool]: ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD', 'WINDOWS_SIGN_PUBLISHER_NAME'],
  [SIGNING_MODE.azure]: [
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TRUSTED_SIGNING_ENDPOINT',
    'AZURE_TRUSTED_SIGNING_ACCOUNT',
    'AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE',
    'WINDOWS_SIGN_PUBLISHER_NAME'
  ]
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

function requiredSigningEnv(mode = getSigningMode()) {
  if (!Object.values(SIGNING_MODE).includes(mode)) {
    throw new Error(
      `WINDOWS_CODE_SIGNING must be one of: ${Object.values(SIGNING_MODE).join(', ')}`
    )
  }

  return REQUIRED_SIGNING_ENV[mode]
}

function requireEnv(name, mode = getSigningMode()) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required when WINDOWS_CODE_SIGNING=${mode}`)
  }
  return value
}

function assertRequiredSigningEnv(mode = getSigningMode()) {
  for (const name of requiredSigningEnv(mode)) {
    requireEnv(name, mode)
  }
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
    assertRequiredSigningEnv(mode)

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

  assertRequiredSigningEnv(mode)

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
  assertRequiredSigningEnv,
  buildSigningEnv,
  buildWindowsSigningConfig,
  getSigningMode,
  readBooleanEnv,
  requiredSigningEnv,
  signingSummary
}
