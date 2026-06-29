const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { version } = require('../package.json')
const {
  assertRequiredSigningEnv,
  getSigningMode,
  requiredSigningEnv
} = require('./signing-config.cjs')

const ARTIFACTS = [
  `RimWorld-Mod-Downloader-${version}-setup.exe`,
  `RimWorld-Mod-Downloader-${version}.msi`
]

function parseArgs(argv) {
  const args = new Set()
  for (let i = 2; i < argv.length; i += 1) {
    args.add(argv[i])
  }
  return args
}

function checkEnvironment() {
  const mode = getSigningMode()
  const required = requiredSigningEnv(mode)

  assertRequiredSigningEnv(mode)

  if (mode === 'disabled') {
    console.log('[ok] Windows code signing is disabled for this build.')
  } else {
    console.log(`[ok] Windows code signing mode: ${mode}`)
    console.log(`[ok] Required signing variables are configured: ${required.join(', ')}`)
  }
}

function powershell(command) {
  return execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { encoding: 'utf8' }
  ).trim()
}

function authenticodeStatus(file) {
  const command = [
    'Import-Module Microsoft.PowerShell.Security -ErrorAction Stop',
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:SIGNING_FILE',
    '[pscustomobject]@{Status=$signature.Status.ToString();Subject=$signature.SignerCertificate.Subject;Issuer=$signature.SignerCertificate.Issuer} | ConvertTo-Json -Compress'
  ].join('; ')

  return JSON.parse(
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      encoding: 'utf8',
      env: {
        ...process.env,
        SIGNING_FILE: file
      }
    }).trim()
  )
}

function checkArtifacts({ requireValid }) {
  if (process.platform !== 'win32') {
    throw new Error('Authenticode verification requires Windows.')
  }

  powershell('$PSVersionTable.PSVersion.ToString()')

  const releaseDir = path.join(process.cwd(), 'release', version)
  for (const artifact of ARTIFACTS) {
    const file = path.join(releaseDir, artifact)
    if (!fs.existsSync(file)) {
      throw new Error(`Missing installer: ${file}`)
    }

    const signature = authenticodeStatus(file)
    console.log(`[ok] ${artifact}: ${signature.Status}`)

    if (signature.Subject) {
      console.log(`     Subject: ${signature.Subject}`)
    }
    if (signature.Issuer) {
      console.log(`     Issuer: ${signature.Issuer}`)
    }

    if (requireValid && signature.Status !== 'Valid') {
      throw new Error(
        `Expected a valid Authenticode signature for ${artifact}, got ${signature.Status}.`
      )
    }
  }
}

function main() {
  const args = parseArgs(process.argv)
  const verifyArtifacts = args.has('--verify-artifacts')
  const requireValid = args.has('--require-valid')

  checkEnvironment()

  if (verifyArtifacts || requireValid) {
    checkArtifacts({ requireValid })
  }
}

main()
