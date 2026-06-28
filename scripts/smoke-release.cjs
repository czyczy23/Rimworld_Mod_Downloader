const fs = require('fs')
const path = require('path')
const os = require('os')
const { _electron: electron } = require('@playwright/test')
const { version } = require('../package.json')

const DEFAULT_MOD_ID = '735106432'
const DEFAULT_RELEASE_BASE_URL = `https://github.com/czyczy23/Rimworld_Mod_Downloader/releases/download/v${version}`

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parseArgs(argv) {
  const args = new Map()
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const [key, inlineValue] = arg.slice(2).split('=', 2)
    if (inlineValue != null) {
      args.set(key, inlineValue)
    } else {
      args.set(key, argv[i + 1])
      i += 1
    }
  }
  return args
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': `rimworld-mod-downloader-smoke/${version}`
    }
  })
  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`)
  }
  return response.text()
}

async function head(url) {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'user-agent': `rimworld-mod-downloader-smoke/${version}`
    }
  })
  if (!response.ok) {
    throw new Error(`HEAD ${url} failed with ${response.status}`)
  }
  return response
}

function assertLatestYml(latestYml) {
  if (!latestYml.includes(`version: ${version}`)) {
    throw new Error(`latest.yml does not advertise version ${version}`)
  }
  if (!latestYml.includes(`RimWorld-Mod-Downloader-${version}-setup.exe`)) {
    throw new Error('latest.yml does not point at the expected NSIS installer')
  }
}

async function smokeLocalUpdateArtifacts() {
  const releaseDir = path.join(process.cwd(), 'release', version)
  const latestPath = path.join(releaseDir, 'latest.yml')
  const setupPath = path.join(releaseDir, `RimWorld-Mod-Downloader-${version}-setup.exe`)
  const msiPath = path.join(releaseDir, `RimWorld-Mod-Downloader-${version}.msi`)

  const latestYml = await fs.promises.readFile(latestPath, 'utf8')
  assertLatestYml(latestYml)

  for (const artifactPath of [setupPath, msiPath]) {
    const stats = await fs.promises.stat(artifactPath)
    if (!stats.isFile() || stats.size <= 0) {
      throw new Error(`Invalid artifact: ${artifactPath}`)
    }
    console.log(`[ok] ${path.basename(artifactPath)} exists (${stats.size} bytes)`)
  }

  console.log('[ok] local latest.yml is present and version-matched')
}

async function smokePublishedUpdateArtifacts(baseUrl) {
  const latestUrl = `${baseUrl}/latest.yml`
  const setupUrl = `${baseUrl}/RimWorld-Mod-Downloader-${version}-setup.exe`
  const msiUrl = `${baseUrl}/RimWorld-Mod-Downloader-${version}.msi`

  const latestYml = await fetchText(latestUrl)
  assertLatestYml(latestYml)

  const setup = await head(setupUrl)
  const msi = await head(msiUrl)

  console.log('[ok] latest.yml is reachable and version-matched')
  console.log(
    `[ok] NSIS installer reachable (${setup.headers.get('content-length') || 'unknown'} bytes)`
  )
  console.log(
    `[ok] MSI installer reachable (${msi.headers.get('content-length') || 'unknown'} bytes)`
  )
}

async function smokeDownload(args) {
  const steamcmdExe = args.get('steamcmd-exe') || process.env.SMOKE_STEAMCMD_EXE
  const steamcmdDownloadPath =
    args.get('steamcmd-download-path') || process.env.SMOKE_STEAMCMD_DOWNLOAD_PATH
  const modsPath =
    args.get('mods-path') ||
    process.env.SMOKE_MODS_PATH ||
    path.join(os.tmpdir(), 'rimworld-mod-downloader-smoke-mods')
  const modId = args.get('mod-id') || process.env.SMOKE_MOD_ID || DEFAULT_MOD_ID

  if (!steamcmdExe || !steamcmdDownloadPath) {
    throw new Error(
      'Real download smoke requires --steamcmd-exe and --steamcmd-download-path, or SMOKE_STEAMCMD_EXE and SMOKE_STEAMCMD_DOWNLOAD_PATH.'
    )
  }

  await fs.promises.mkdir(steamcmdDownloadPath, { recursive: true })
  await fs.promises.mkdir(modsPath, { recursive: true })

  const app = await electron.launch({
    args: [path.join(process.cwd(), 'out/main/index.js')]
  })

  try {
    const page = await app.firstWindow()
    await page.getByTestId('app-shell').waitFor({ state: 'visible', timeout: 15000 })

    const result = await page.evaluate(
      async ({ modId, modsPath, steamcmdDownloadPath, steamcmdExe }) => {
        const current = await window.api.getConfig()
        await window.api.setConfig('firstRunCompleted', true)
        await window.api.setConfig('steamcmd', {
          executablePath: steamcmdExe,
          downloadPath: steamcmdDownloadPath
        })
        await window.api.setConfig('rimworld', {
          ...current.rimworld,
          modsPaths: [
            {
              id: 'smoke-active-mods-path',
              name: 'Smoke Mods Path',
              path: modsPath,
              isActive: true
            }
          ]
        })
        await window.api.setConfig('download', {
          ...current.download,
          autoDownloadDependencies: false,
          skipVersionCheck: true,
          dependencyMode: 'ignore'
        })

        return window.api.downloadMod(modId, false)
      },
      { modId, modsPath, steamcmdDownloadPath, steamcmdExe }
    )

    if (result.downloadStatus !== 'completed') {
      throw new Error(
        `Download smoke returned ${result.downloadStatus}: ${result.errorMessage || ''}`
      )
    }
    if (!result.localPath || !fs.existsSync(result.localPath)) {
      throw new Error(`Downloaded mod path does not exist: ${result.localPath || '(missing)'}`)
    }

    console.log(`[ok] Downloaded and processed mod ${modId}`)
    console.log(`[ok] Local path: ${result.localPath}`)
  } finally {
    await app.close()
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const mode = args.get('mode') || requireEnv('SMOKE_MODE')

  if (mode === 'update') {
    const published = args.has('published') || process.env.SMOKE_PUBLISHED_RELEASE === 'true'
    const baseUrl =
      args.get('release-base-url') || process.env.RELEASE_BASE_URL || DEFAULT_RELEASE_BASE_URL
    if (published) {
      await smokePublishedUpdateArtifacts(baseUrl)
    } else {
      await smokeLocalUpdateArtifacts()
    }
    return
  }
  if (mode === 'download') {
    await smokeDownload(args)
    return
  }

  throw new Error('SMOKE_MODE must be update or download')
}

main().catch((error) => {
  console.error(`[smoke] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
