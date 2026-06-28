<div align="center">

# RimWorld Mod Downloader

An Electron desktop app for browsing and downloading RimWorld mods from Steam Workshop, with version checks, dependency resolution, and batch downloads.

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#installation)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

**English** | [Simplified Chinese](./README_zh-CN.md) | [Traditional Chinese](./README_zh-TW.md)

</div>

---

> **Note:** This project is built with AI-assisted programming. Please report bugs or security concerns through the project issue and security channels.

## Features

- **Built-in Steam Workshop browser** - browse and download mods without leaving the app.
- **Automatic game version detection** - reads `Version.txt` from your RimWorld installation.
- **Version compatibility checks** - verifies whether a mod supports your configured game version.
- **Dependency resolution** - detects mod dependencies and asks before downloading them.
- **Download queue** - queue several mods and run a batch download.
- **Multiple Mods folders** - manage several mod folders and switch the default target.
- **Real-time progress** - displays SteamCMD progress while downloads run.
- **Auto-update support** - checks GitHub Releases for new versions.
- **Steam-style UI** - keeps the browsing experience close to the Steam client.

## Screenshots

| Main UI                                    | Mod Details                                   |
| ------------------------------------------ | --------------------------------------------- |
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| Download Queue                                   | Settings Panel                                    |
| ------------------------------------------------ | ------------------------------------------------- |
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## Installation

### Prerequisites

- Windows 10/11, 64-bit
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD), used to download Steam Workshop content
- RimWorld, optional but recommended for automatic version detection

### Install From Release

1. Open the [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) page.
2. Download the latest installer:
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe` for the NSIS installer.
   - `RimWorld-Mod-Downloader-x.x.x.msi` for the MSI installer.
3. Run the installer and follow the prompts.

> **About SmartScreen warnings:** Local installers are unsigned unless release signing is explicitly enabled. Windows can show a SmartScreen warning for unsigned builds. Click **More info** and then **Run anyway** only if you trust the downloaded release. See [SECURITY.md](./SECURITY.md#code-signing) for details.
>
> Since v1.2.0, the installer uses per-user installation mode and does not require administrator privileges.

## Quick Start

1. Install [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) and note the path to `steamcmd.exe`.
2. Launch RimWorld Mod Downloader. The welcome wizard appears on first run.
3. Configure:
   - **SteamCMD path** - select `steamcmd.exe`.
   - **Download path** - usually `steamcmd-root\steamapps\workshop\content\294100`.
   - **Mods folder** - use the detected folder or choose a custom RimWorld Mods folder.
4. Open a Steam Workshop mod page in the built-in browser.
5. Click **Download** for immediate download, or **Add** to queue it for a batch run.

## Tech Stack

| Category         | Technology                      |
| ---------------- | ------------------------------- |
| Framework        | Electron, React, TypeScript     |
| Build            | electron-vite, electron-builder |
| Styling          | Tailwind CSS                    |
| Testing          | Vitest, Playwright              |
| Logging          | electron-log                    |
| Config           | electron-store                  |
| HTTP and parsing | axios, cheerio                  |
| CI/CD            | GitHub Actions                  |

## Project Structure

```text
src/
|-- main/                         # Main process
|   |-- index.ts                  # Window creation and Electron security guards
|   |-- ipcHandlers.ts            # IPC routes and input validation
|   |-- polyfills.ts              # Runtime polyfills
|   |-- services/
|   |   |-- SteamCMD.ts           # SteamCMD process wrapper
|   |   |-- ModProcessor.ts       # File operations and About.xml validation
|   |   `-- WorkshopScraper.ts    # Steam Workshop scraping
|   `-- utils/
|       |-- ConfigManager.ts      # Config management and secret masking
|       |-- SecureStorage.ts      # OS keychain encryption
|       |-- AutoUpdater.ts        # Auto-update manager
|       `-- logger.ts             # electron-log wrapper
|-- preload/
|   `-- index.ts                  # Typed contextBridge API
|-- renderer/
|   `-- src/
|       |-- App.tsx               # Main renderer app
|       |-- components/           # React UI components
|       |-- i18n/                 # en, zh-CN, zh-TW locale files
|       |-- stores/               # Zustand state stores
|       `-- utils/                # Renderer helpers
`-- shared/
    |-- api.ts                    # Renderer API contract
    |-- configSchema.ts           # Runtime config validation
    |-- constants.ts              # Global constants
    |-- types.ts                  # Shared types
    `-- urlGuard.ts               # Steam URL allow-list
```

## Development

### Requirements

- Node.js 22.13+
- npm 10+

### Common Commands

```bash
# Install dependencies
npm install

# Dev mode with hot reload
npm run dev

# Full local quality gate: lint, typecheck, unit tests, production build
npm run verify

# Unit tests
npm run test:unit

# Unit tests with full-src coverage reporting
npm run test:coverage

# Browser smoke tests
npm run test:e2e

# Native Electron smoke test
npm run test:e2e:electron

# Published update metadata smoke test
npm run smoke:release:update

# Opt-in real SteamCMD download smoke test
npm run smoke:release:download -- --steamcmd-exe <path> --steamcmd-download-path <path> --mods-path <path> --mod-id <id>

# Check Windows signing configuration
npm run signing:check

# Verify Authenticode status for generated Windows installers
npm run signing:verify

# Package Windows installers
npm run build:win
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow, commit conventions, and branching strategy.

## Security

The app follows Electron security best practices: context isolation, disabled Node integration in the renderer, URL allow-listing for Steam pages, OS keychain encryption for sensitive config, and IPC input validation.

See [SECURITY.md](./SECURITY.md) for the security architecture and vulnerability reporting process.

## Testing

The main gate is:

```bash
npm run verify
```

CI also runs coverage, browser Playwright smoke tests, native Electron smoke tests, dependency audit, and Windows packaging for releases. See [TESTING.md](./TESTING.md) for the current coverage baseline and artifact layout.

## Troubleshooting

<details>
<summary><b>Network issues or Steam Workshop pages do not load</b></summary>

If you see blank Workshop pages, zero download speed, or stuck downloads, check your network route to Steam Community and SteamCMD. Some network accelerators only accelerate game traffic and do not help Steam Web or SteamCMD traffic.

</details>

<details>
<summary><b>SteamCMD download fails</b></summary>

- Confirm `steamcmd.exe` exists at the configured path.
- Check whether Windows Defender or another antivirus tool is blocking SteamCMD.
- Ensure the target disk has enough free space.

</details>

<details>
<summary><b>File move failed or permission error</b></summary>

- Confirm the Mods folder exists and is writable.
- Check whether antivirus software is blocking file operations.
- Close RimWorld before moving files into the Mods folder.
- v1.2.0+ does not require administrator privileges; if permission errors continue, check folder ACLs.

</details>

<details>
<summary><b>Download button does not work</b></summary>

- Confirm you are on a Steam Workshop mod detail page, not a listing page.
- Press `F12` to open DevTools and check the console for errors.

</details>

<details>
<summary><b>Version detection does not work</b></summary>

- Confirm the parent directory of your Mods folder is the RimWorld installation directory.
- Confirm `Version.txt` exists in the RimWorld installation directory.

</details>

## Roadmap

- [x] Windows NSIS and MSI installers
- [x] Auto-update through GitHub Releases
- [x] Security hardening: safeStorage encryption, URL allow-list, IPC validation
- [x] Unit test coverage with full-src reporting
- [x] Browser and native Electron smoke tests
- [x] Opt-in real SteamCMD download and update metadata smoke commands
- [ ] macOS and Linux support
- [ ] Git sync functionality (`git:init`, `git:commit`)
- [ ] Mod version resolution (`mod:resolveVersion`)

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a contribution.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

[MIT License](./LICENSE) (c) 2026 czyczy23

## Disclaimer

This tool is for educational and personal use only. Please comply with the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) and RimWorld mod license agreements. Mod copyrights belong to their respective authors.
