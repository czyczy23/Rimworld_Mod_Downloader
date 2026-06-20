<div align="center">

# RimWorld Mod Downloader

An Electron desktop app for browsing and downloading RimWorld mods from Steam Workshop — with version checking, dependency resolution, and batch downloads.

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#installation)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat-square&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/czyczy23/Rimworld_Mod_Downloader)

**English** · [简体中文](./README_zh-CN.md) · [繁體中文](./README_zh-TW.md)

</div>

---

> **⚠️ Note**: This project is built entirely using **Vibe Coding** (AI-assisted programming) and may contain unstable bugs. Please report issues on [GitHub Issues](https://github.com/czyczy23/Rimworld_Mod_Downloader/issues).

## Features

- 🌐 **Built-in Steam Workshop browser** — browse and download mods without leaving the app
- 🎮 **Auto game version detection** — reads `Version.txt` from your RimWorld install
- ✅ **Version compatibility check** — verifies mod supports your game version before download
- 🔗 **Dependency resolution** — detects mod dependencies and prompts to download them
- 📋 **Download queue** — queue multiple mods and batch download
- 📁 **Multiple Mods paths** — manage several mod folders, switch default with one click
- 📊 **Real-time progress** — live SteamCMD download progress
- 🔄 **Auto-update** — checks GitHub Releases for new versions on startup
- 🎨 **Steam-style UI** — visually consistent with the Steam client

## Screenshots

| Main UI | Mod Details |
|---------|-------------|
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| Download Queue | Settings Panel |
|----------------|---------------|
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## Installation

### Prerequisites

- **Windows 10/11** (64-bit)
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) — for downloading Steam Workshop content
- RimWorld (optional, for auto version detection)

### Install from Release (recommended)

1. Go to the [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) page
2. Download the latest installer:
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe` (NSIS, recommended)
   - `RimWorld-Mod-Downloader-x.x.x.msi` (MSI)
3. Run the installer and follow the prompts

> **About SmartScreen warnings**: The installer is not code-signed, so Windows shows a SmartScreen warning on first run.
> Click **"More info"** → **"Run anyway"**.
> This is a common limitation for open-source projects — see [SECURITY.md](./SECURITY.md#code-signing).
>
> As of v1.2.0, the installer uses **perUser mode** — no administrator privileges or UAC prompts required.

## Quick Start

1. Install [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) and note the path
2. Launch RimWorld Mod Downloader — the welcome wizard appears on first run
3. Configure in the wizard:
   - **SteamCMD path** — locate `steamcmd.exe`
   - **Download path** — auto-derived as `steamcmd-root\steamapps\workshop\content\294100`
   - **Mods folder** — use the default or pick a custom location
4. Navigate to a Steam Workshop mod page in the built-in browser
5. Click **Download** for immediate download, or **Add** to queue for batch download

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Electron + React + TypeScript |
| Build | electron-vite, electron-builder |
| Styling | Tailwind CSS |
| Testing | Vitest (unit), Playwright (E2E) |
| Logging | electron-log |
| Config | electron-store |
| HTTP / Parsing | axios + cheerio |
| CI/CD | GitHub Actions |

## Project Structure

```
src/
├── main/                          # Main process (Node.js)
│   ├── index.ts                   # Window creation, app entry
│   ├── ipcHandlers.ts             # IPC routes + input validation
│   ├── polyfills.ts               # File/FormData polyfill
│   ├── services/
│   │   ├── SteamCMD.ts            # SteamCMD process wrapper + pure functions
│   │   ├── ModProcessor.ts        # File operations + About.xml validation
│   │   └── WorkshopScraper.ts     # Steam web scraping
│   └── utils/
│       ├── ConfigManager.ts       # Config management + encryption migration
│       ├── SecureStorage.ts       # OS keychain credential encryption
│       ├── AutoUpdater.ts         # Auto-update manager
│       └── logger.ts              # electron-log wrapper
├── preload/
│   └── index.ts                   # ContextBridge API (typed api only)
├── renderer/                      # Renderer process (React)
│   └── src/
│       ├── App.tsx                # Main app
│       ├── i18n/                  # i18n (en/zh-CN/zh-TW)
│       ├── utils/
│       │   ├── urlGuard.ts        # Webview URL whitelist
│       │   ├── url.ts             # URL utilities
│       │   └── language.ts        # Steam language param mapping
│       └── components/            # UI components
├── shared/
│   ├── types.ts                   # Shared types
│   ├── configSchema.ts            # IPC config runtime validation
│   ├── constants.ts               # Global constants
│   └── api.ts                     # Renderer API contract
└── __tests__/                     # Unit tests (92 tests)
```

## Development

### Requirements

- Node.js 20+
- npm

### Common Commands

```bash
# Install dependencies
npm install

# Dev mode (hot reload)
npm run dev

# Full quality gate (lint + typecheck + test + build)
npm run verify

# Unit tests only
npm run test:unit

# Coverage report
npm run test:coverage

# E2E tests (run npm run test:e2e:install first)
npm run test:e2e

# Package Windows installer
npm run build:win
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development guide, commit conventions, and branching strategy.

### Security

This project follows Electron security best practices (context isolation, URL whitelist, OS keychain encryption, IPC input validation).
See [SECURITY.md](./SECURITY.md) for the security architecture and vulnerability reporting process.

## Troubleshooting

<details>
<summary><b>Network issues / Steam Workshop inaccessible</b></summary>

If you experience blank Workshop pages, 0 download speed, or stuck downloads:

**Recommended: [Watt Toolkit (Steam++)](https://steampp.net/)** — a free, open-source Steam accelerator.

Other accelerators (UU, Thunder, etc.) may only accelerate game traffic, not Steam Web or SteamCMD, causing Workshop access failures.

</details>

<details>
<summary><b>SteamCMD download fails</b></summary>

- Confirm `steamcmd.exe` exists at the configured path
- Check if Windows Defender / antivirus is blocking SteamCMD
- Ensure sufficient disk space

</details>

<details>
<summary><b>File move failed / permission error</b></summary>

- Confirm the Mods folder exists and is writable
- Check if antivirus is blocking file operations
- **Close RimWorld** — a running game locks the Mods folder
- v1.2.0+ no longer requires admin privileges; if you still hit permission errors, check folder ACLs

</details>

<details>
<summary><b>Download button not working</b></summary>

- Confirm you're on a Steam Workshop **mod detail page** (not the listing page)
- Press `F12` to open DevTools and check the console

</details>

<details>
<summary><b>Version detection not working</b></summary>

- Confirm the parent directory of your Mods folder is the RimWorld install directory
- Confirm `Version.txt` exists in the RimWorld install directory

</details>

## Roadmap

- [x] Windows NSIS + MSI installers
- [x] Auto-update via GitHub Releases
- [x] Security hardening (safeStorage encryption, URL whitelist, IPC validation)
- [x] Unit test coverage (92 tests)
- [ ] macOS / Linux support
- [ ] Git sync functionality (`git:init` / `git:commit`)
- [ ] Mod version resolution (`mod:resolveVersion`)
- [ ] Code signing

## Contributing

Issues and Pull Requests are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first for the development workflow and conventions.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## License

[MIT License](./LICENSE) © 2026 czyczy23

## Disclaimer

This tool is for educational and personal use only. Please comply with the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) and RimWorld mod license agreements. Mod copyrights belong to their respective authors.
