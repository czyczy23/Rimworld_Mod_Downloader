const { version } = require('./package.json')

const installerBaseName = `RimWorld-Mod-Downloader-${version}`

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
    // Code signing disabled — see SECURITY.md for details
    signAndEditExecutable: false,
    signDlls: false,
    requestedExecutionLevel: 'requireAdministrator'
  },
  nsis: {
    artifactName: `${installerBaseName}-setup.\${ext}`,
    installerIcon: 'assets/app-icon.ico',
    uninstallerIcon: 'assets/app-icon.ico',
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: true
  },
  msi: {
    artifactName: `${installerBaseName}.\${ext}`,
    perMachine: true
  },
  asar: true,
  compression: 'maximum',
  publish: {
    provider: 'github',
    owner: 'czyczy23',
    repo: 'Rimworld_Mod_Downloader'
  }
}
