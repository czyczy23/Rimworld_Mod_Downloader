# RimWorld Mod Downloader

[English](./README_en.md) | [简体中文](./README_zh-CN.md) | [繁體中文](./README_zh-TW.md)

---

## Description

An Electron desktop application for downloading and managing RimWorld mods from Steam Workshop.

> **Note**: This project is built entirely using **Vibe Coding** and may contain unstable bugs.

## Features

- Built-in Steam Workshop browser for browsing and downloading mods directly
- Automatic RimWorld game version detection
- Mod version compatibility checking
- Automatic dependency detection and download
- Pending download queue with batch download support
- Multiple mods folder path management
- Real-time download progress display
- Steam-style user interface

## Tech Stack

| Category | Technology |
|------|------|
| Framework | Electron 28.1.3 |
| Build Tool | electron-vite 2.0.0 |
| UI | React 18.2.0 + TypeScript 5.3.3 |
| Styling | Tailwind CSS 3.4.1 |
| Config | electron-store 8.1.0 |
| HTTP | axios 1.13.5 |
| HTML Parsing | cheerio 1.2.0 |

## Installation

### Prerequisites

- Windows 10/11
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) (for downloading Steam Workshop content)
- RimWorld (optional, for auto version detection)

### Install from Release

1. Go to [Releases](../../releases) page
2. Download the latest .zip file (`RimWorld-Mod-Downloade-x.x.x.zip`)
3. Run `RimWorld Mod Downloader.exe`

### Build from Source

```bash
# Clone the repository
git clone https://github.com/czyczy23/Rimworld_Mod_Downloader.git
cd Rimworld_Mod_Downloader

# Install dependencies
npm install

# Run in dev mode
npm run dev

# Type check
npm run typecheck

# Build
npm run build

# Package for Windows
npm run build:win
```

## Usage

### First Run Wizard

The welcome wizard will guide you through the initial setup:

1. **Welcome** - Learn about the app's main features
2. **Configure SteamCMD** - Select `steamcmd.exe` location
3. **Configure Download Path** - Auto-derived from SteamCMD location
4. **Configure Mods Folder** - Set RimWorld mods folder destination
5. **Complete** - Review and start using the app

### Managing Mods Paths

**Method 1: Toolbar Quick Switch**
1. Click the **Mods Path** dropdown in the toolbar
2. Select an existing path or click **Browse** to add a new one

**Method 2: Settings Panel**
1. Click the ⚙️ **Settings** button
2. Find **📁 Mods Folder Management**
3. You can:
   - **★/☆ Star**: Set default download path
   - **✎ Edit**: Modify path name (Enter to save, ESC to cancel)
   - **× Delete**: Remove path
   - **🏠 Use Default Path**: Add RimWorld default mods folder
   - **📂 Custom Path**: Manually select a location
4. Click **Save Settings** to apply

### Downloading Mods

1. Navigate to a Steam Workshop mod page in the built-in browser
2. The app automatically detects:
   - Mod ID
   - Supported game versions
   - Number of dependencies
3. Click "Download" to download immediately, or "Add" to add to queue
4. Dependencies will be prompted if any
5. Version compatibility warnings will be shown if applicable

### Pending Download Queue

1. Browse multiple mod pages and click "Add" to queue them
2. Click the download queue area to view all pending mods
3. Select and delete unwanted mods
4. Click "Download All" to start batch download

### Configuration Options

| Option | Description |
|------|------|
| SteamCMD Executable Path | Location of steamcmd.exe |
| SteamCMD Download Path | SteamCMD download temp directory |
| Mods Paths | List of RimWorld mods folders |
| Auto Detect Game Version | Auto-detect version from RimWorld installation |
| Skip Version Check | Skip mod version compatibility check |
| On Version Mismatch | Behavior on version mismatch: ask/force/skip |
| Dependency Mode | Dependency handling: ask/auto-download/ignore |

## Project Structure

```
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts            # Window creation, app entry
│   ├── ipcHandlers.ts      # IPC route registration
│   ├── services/
│   │   ├── SteamCMD.ts     # SteamCMD process wrapper
│   │   ├── ModProcessor.ts # File operations + About.xml validation
│   │   └── WorkshopScraper.ts # Steam web scraping
│   └── utils/
│       └── ConfigManager.ts # Config management
├── preload/
│   └── index.ts             # ContextBridge API definition
├── renderer/                # Renderer process (React)
│   └── src/
│       ├── App.tsx          # Main app
│       └── components/
│           ├── WebviewContainer.tsx    # Steam Workshop browser
│           ├── Toolbar.tsx              # Toolbar
│           ├── DownloadQueue.tsx        # Download queue
│           ├── SettingsPanel.tsx        # Settings panel
│           ├── DependencyDialog.tsx     # Dependency selection dialog
│           ├── VersionMismatchDialog.tsx # Version mismatch warning
│           ├── PendingQueueDialog.tsx   # Pending download queue dialog
│           └── DeleteConfirmDialog.tsx  # Delete confirmation dialog
└── shared/
    └── types.ts             # Shared type definitions
```

## Troubleshooting

### Network Issues

If you encounter:
- Steam Workshop page fails to load or blank
- Download speed is 0 or download fails
- Network connection errors

**Recommended: Use [Watt Toolkit (Steam++)](https://steampp.net/) accelerator**

Watt Toolkit is a free and open-source Steam accelerator that effectively solves Steam Workshop access issues.

**Note**: Other accelerators (like UU, Thunder, etc.) may cause:
- Workshop pages fail to load
- Download speed is 0
- Download stuck at "Downloading"

This is because some accelerators only accelerate game traffic, not Steam Web or SteamCMD. Switch to **Watt Toolkit** if you encounter these issues.

### SteamCMD Download Fails

- Confirm `steamcmd.exe` exists at the configured path
- Check if Windows Defender/antivirus blocked SteamCMD
- Ensure sufficient disk space

### File Move Failed / Permission Error

- Confirm Mods folder exists and is writable
- Check if antivirus blocked file operations
- Confirm no files are locked (close RimWorld!)
- **Run as administrator** (may be required on some systems)

### Download Button Not Working

- Confirm you are on a Steam Workshop mod detail page
- Check console for error messages

### Version Detection Not Working

- Confirm the parent directory of Mods folder is the RimWorld installation directory
- Confirm `Version.txt` file exists

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!
