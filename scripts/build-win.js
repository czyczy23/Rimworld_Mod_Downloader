const { execSync } = require('child_process')
const { version } = require('../package.json')
const {
  assertRequiredSigningEnv,
  buildSigningEnv,
  signingSummary
} = require('./signing-config.cjs')

const outputDir = `release/${version}`
const signing = signingSummary()
let env = process.env

console.log('========================================')
console.log('RimWorld Mod Downloader Build Script')
console.log('========================================')
console.log()
console.log(`Windows code signing: ${signing.enabled ? signing.mode : 'disabled'}`)
if (signing.publisherName) {
  console.log(`Signing publisher: ${signing.publisherName}`)
}
console.log()

console.log('[1/4] Checking signing configuration...')
try {
  assertRequiredSigningEnv(signing.mode)
  env = buildSigningEnv()
  console.log('[ok] Signing configuration is valid')
} catch (error) {
  console.error('[x] Signing configuration failed:', error.message)
  process.exit(1)
}
console.log()

console.log('[2/4] Building application...')
try {
  execSync('npm run build', { stdio: 'inherit', env })
  console.log('[ok] Build completed')
} catch (error) {
  console.error('[x] Build failed:', error.message)
  process.exit(1)
}
console.log()

console.log('[3/4] Packaging Windows installers (NSIS + MSI)...')
try {
  const cmd = 'npm run package:win'

  console.log('Running:', cmd)
  execSync(cmd, { stdio: 'inherit', env })
  console.log('[ok] Packaging completed')
} catch (error) {
  console.error('[x] Packaging failed:', error.message)
  process.exit(1)
}
console.log()

console.log('[4/4] Verifying Windows signatures...')
try {
  const cmd = signing.enabled ? 'npm run signing:require-valid' : 'npm run signing:verify'
  execSync(cmd, { stdio: 'inherit', env })
  console.log('[ok] Signature verification completed')
} catch (error) {
  console.error('[x] Signature verification failed:', error.message)
  process.exit(1)
}
console.log()

console.log('Done!')
console.log(`Check the ${outputDir} folder for .exe, .msi and package metadata`)
