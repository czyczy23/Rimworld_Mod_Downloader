const { execSync } = require('child_process')
const fs = require('fs')
const { version } = require('../package.json')

const outputDir = `release/${version}`
const portableName = `RimWorld-Mod-Downloader-${version}-portable.exe`

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

console.log('[2/3] Packaging (portable)...')
try {
  const cmd = [
    'npx',
    'electron-builder',
    '--win',
    '--x64',
    '--publish',
    'never',
    '--config.asar=true',
    '--config.compression=maximum',
    `--config.directories.output=${outputDir}`,
    '--config.win.target=portable',
    '--config.win.signAndEditExecutable=false',
    '--config.win.signDlls=false',
    `--config.portable.artifactName=${portableName}`
  ].join(' ')

  console.log('Running:', cmd)
  execSync(cmd, { stdio: 'inherit', env })
  console.log('[ok] Packaging completed')
} catch (error) {
  console.error('[x] Packaging failed:', error.message)
  console.log()
  console.log('Trying alternative approach...')

  try {
    console.log()
    console.log('[2/3] Alternative packaging approach...')
    const simpleConfig = {
      appId: 'com.rimworld.moddownloader',
      productName: 'RimWorld Mod Downloader',
      directories: { output: outputDir },
      files: ['out/**/*', 'package.json'],
      win: { target: 'dir', signAndEditExecutable: false },
      asar: true
    }

    fs.writeFileSync('eb-config.json', JSON.stringify(simpleConfig, null, 2))
    execSync('npx electron-builder --win --config eb-config.json --publish never', {
      stdio: 'inherit',
      env
    })
    fs.unlinkSync('eb-config.json')
    console.log(`[ok] Directory build completed - check ${outputDir}/win-unpacked`)
  } catch {
    if (fs.existsSync('eb-config.json')) {
      fs.unlinkSync('eb-config.json')
    }

    console.error('[x] All packaging attempts failed')
    process.exit(1)
  }
}
console.log()

console.log('[3/3] Done!')
console.log(`Check the ${outputDir} folder for output`)
