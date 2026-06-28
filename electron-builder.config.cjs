const { version } = require('./package.json')
const { buildWindowsSigningConfig } = require('./scripts/signing-config.cjs')

const installerBaseName = `RimWorld-Mod-Downloader-${version}`
const signingConfig = buildWindowsSigningConfig()

module.exports = {
  appId: 'com.rimworld.moddownloader',
  productName: 'RimWorld Mod Downloader',
  directories: {
    output: `release/${version}`
  },
  files: ['out/**/*', 'package.json'],
  win: {
    icon: 'assets/app-icon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'msi',
        arch: ['x64']
      }
    ],
    ...signingConfig.win
  },
  nsis: {
    artifactName: `${installerBaseName}-setup.\${ext}`,
    installerIcon: 'assets/app-icon.ico',
    uninstallerIcon: 'assets/app-icon.ico',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false
  },
  msi: {
    artifactName: `${installerBaseName}.\${ext}`,
    perMachine: false
  },
  asar: true,
  compression: 'maximum',
  publish: {
    provider: 'github',
    owner: 'czyczy23',
    repo: 'Rimworld_Mod_Downloader'
  }
}
