const { execSync } = require('child_process')
const { version } = require('../package.json')

const outputDir = `release/${version}`

// Set environment variables to disable signing
const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
  WIN_CSC_LINK: '',
  WIN_CSC_KEY_PASSWORD: ''
}

console.log('========================================')
console.log('RimWorld Mod Downloader Build Script')
console.log('========================================')
console.log()

console.log('[1/3] Building application...')
try {
  execSync('npm run build', { stdio: 'inherit', env })
  console.log('[ok] Build completed')
} catch (error) {
  console.error('[x] Build failed:', error.message)
  process.exit(1)
}
console.log()

console.log('[2/3] Packaging Windows installers (NSIS + MSI)...')
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

console.log('[3/3] Done!')
console.log(`Check the ${outputDir} folder for .exe, .msi and updater metadata`)
