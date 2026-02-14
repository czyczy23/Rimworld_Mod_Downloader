# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RimWorld Mod Downloader** is an Electron-based Windows desktop application for downloading and managing RimWorld mods from Steam Workshop. It provides a GUI wrapper around SteamCMD with features like dependency resolution, Git integration for version control, and automatic mod organization.

### Tech Stack
- **Framework**: Electron v28.1.3 with Electron Vite
- **Frontend**: React 18.2.0 + TypeScript 5.3.3 + Tailwind CSS 3.4.1
- **State**: electron-store (main), React useState (renderer)
- **Active Libraries**: Node.js built-in (fs/promises, child_process, events)
- **Phase 3 Planned**: axios, cheerio, fast-xml-parser
- **Phase 4 Planned**: simple-git

## Project Structure

```
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts            # Entry: window creation, IPC setup
│   ├── ipcHandlers.ts      # IPC route definitions
│   ├── services/
│   │   ├── GitManager.ts   # Git automation (Phase 4 - placeholder only)
│   │   ├── SteamCMD.ts     # SteamCMD process wrapper
│   │   └── ModProcessor.ts # File operations
│   └── utils/
│       └── ConfigManager.ts # electron-store wrapper
├── preload/                 # Preload scripts
│   └── index.ts            # ContextBridge API definitions
└── renderer/               # Renderer process (React)
    └── src/
        ├── App.tsx
        └── components/
            ├── WebviewContainer.tsx   # Steam Workshop webview with page tracking
            ├── DownloadQueue.tsx      # Status bar
            └── Toolbar.tsx            # Path settings + Download button
```

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Type check only
npm run typecheck

# Run ESLint and Prettier
npm run lint
npm run format
```

### Building
```bash
# Build for production (no packaging)
npm run build

# Build and package for Windows
npm run build:win

# Build and package for macOS
npm run build:mac

# Build and package for Linux
npm run build:linux
```

## Key Architectural Patterns

### IPC Communication
The app uses Electron's IPC for main-renderer communication. Key patterns:
- **Main to Renderer**: Use `mainWindow.webContents.send()` in main, `window.api.onDownloadProgress()` in renderer
- **Renderer to Main**: Use `ipcRenderer.invoke()` via the preload contextBridge

Key IPC handlers in `src/main/ipcHandlers.ts`:
- `mod:download` - Initiates mod/collection download with SteamCMD
- `download:progress` - Real-time progress updates from main to renderer
- `download:complete` - Download completion notification
- `download:error` - Error notification
- `config:get`/`config:set` - Configuration management

### Configuration Management
`ConfigManager` (src/main/utils/ConfigManager.ts) wraps electron-store with:
- Strongly typed config keys via TypeScript interfaces
- Encryption for sensitive data
- Default value fallbacks

Config categories:
- `steamcmd.executablePath` - SteamCMD installation directory (default: ~/Documents/steamcmd/steamcmd.exe)
- `steamcmd.downloadPath` - SteamCMD download cache (default: ~/Documents/steamcmd/steamapps/workshop/content/294100)
- `rimworld.modsPaths` - Array of mod installation directories
- `download.autoDownloadDependencies` - Whether to auto-download dependencies

### State Management
**Renderer (Frontend):**
- Uses **React useState** (NOT Zustand)
- No external state library currently in use
- Downloads state managed in App.tsx, passed down to DownloadQueue.tsx via props

**Main Process:**
- Uses electron-store via ConfigManager
- Singleton pattern for services (SteamCMD, ModProcessor)

### Steam Workshop Integration
`WebviewContainer` (src/renderer/src/components/WebviewContainer.tsx) embeds a Steam Workshop browser:
- Uses Electron's `<webview>` tag with `partition="persist:steam"`
- Handles SPA navigation via `did-navigate-in-page` events
- Tracks current page info (mod ID when on detail pages)
- Exposes `getCurrentPageInfo()` via ref to parent

**Note:** The app NO LONGER injects scripts into Steam pages. Download functionality is provided via the application toolbar button, not via injected page buttons.

### App Toolbar Download Button
`Toolbar` (src/renderer/src/components/Toolbar.tsx) provides application-level download controls:
- Download button positioned between Path Selector and Settings
- Disabled state when not on a mod detail page
- Mod Info Panel showing current mod name, type, and ID
- Invokes `mod:download` IPC when clicked

### Download Flow
1. User navigates to a mod detail page in webview
2. `WebviewContainer` tracks URL change, extracts mod ID
3. `Toolbar` receives page info via props, enables download button
4. User clicks Download button → `handleDownloadClick()`
5. `window.api.downloadMod()` → IPC `mod:download`
6. `SteamCMD` downloads mod to `steamapps/workshop/content/294100/[id]`
7. Progress events emitted via IPC → frontend updates progress bar
8. `ModProcessor` moves files to configured Mods folder
9. `download:complete` event → frontend shows completion

## Development Progress

### Phase 1: Core Shell ✅ COMPLETED
- [x] Electron + Vite + React scaffold
- [x] Basic window configuration
- [x] IPC bridge setup
- [x] Configuration system with electron-store

### Phase 2: Download Pipeline ✅ COMPLETED (2026-02-14)

**Implemented:**
- [x] SteamCMD process wrapper with real-time progress parsing
- [x] ModProcessor file operations (atomic move, validation)
- [x] IPC event system for progress updates
- [x] Frontend progress display in DownloadQueue
- [x] Complete error handling and logging

**Architecture Changes from Original Design:**
- ❌ Removed: Steam page injection (workshopInjector.js deleted)
- ✅ Changed: Download button moved to application toolbar
- ❌ Removed: Zustand (not used, using React useState)
- ✅ Added: Real-time progress via IPC events (not polling)

### Phase 3: Intelligence (Planned)
- [ ] Steam Workshop page scraping for dependency detection
- [ ] About.xml parsing for version compatibility
- [ ] Automatic dependency download
- [ ] Version mismatch warnings

**Key Implementation Details for Phase 3:**

**Version Detection Logic:**
```typescript
// 1. Read game version from Mods folder
const versionPath = path.join(modsPath, '..', 'Version.txt');
const versionContent = fs.readFileSync(versionPath, 'utf-8');
const gameVersion = versionContent.match(/version (\d+\.\d+)/)[1]; // "1.5"

// 2. Scrape Steam Workshop page for mod version
const modPage = await axios.get(`https://steamcommunity.com/sharedfiles/filedetails/?id=${modId}`);
const supportedVersions = cheerio.load(modPage.data)
  .find('.detailsBlock:contains("Mod")')
  .text()
  .match(/(\d\.\d)/g) || []; // ["1.4", "1.5"]

// 3. Compare versions
if (!supportedVersions.includes(gameVersion)) {
  showWarning(`Mod supports ${supportedVersions.join(', ')} but game is ${gameVersion}`);
}
```

**Dependency Resolution Flow:**
1. Scrape Steam page "Required Items" section
2. Parse mod IDs from links
3. Check local Mods folder for existing dependencies
4. Show dialog: "This mod requires: Harmony, HugsLib. Download?"
5. If yes, add to download queue with parent mod

### Phase 4: Git Integration (Planned)
- [ ] Git repository initialization
- [ ] Automatic commit on mod changes
- [ ] GitHub remote sync
- [ ] Version history and rollback

## Troubleshooting

### Dev Server Won't Start
- Check if port 5173 is in use: `lsof -i :5173`
- Clear electron-vite cache: `rm -rf node_modules/.electron-vite`

### Steam Workshop Webview Not Loading
- Check internet connection
- Verify `partition="persist:steam"` on webview element
- Check DevTools console for CSP errors

### Download Button Not Working (Current Architecture)

**Note:** The download button is in the application toolbar, NOT injected into Steam pages.

**Check:**
1. Is Toolbar receiving current mod ID from WebviewContainer?
   - Check console for "[App] Page changed:" logs
   - Verify `currentPageInfo` prop is passed to Toolbar
2. Is `handleDownloadClick` in Toolbar.tsx calling `window.api.downloadMod`?
   - Check DevTools console for "[IPC] Download requested" log
3. Is the download queue showing progress updates?
   - Check for "[App] Download progress" logs
   - Verify DownloadQueue receives `downloads` prop from App.tsx

### SteamCMD Download Fails
- Verify SteamCMD executable exists at configured path (default: `~/Documents/steamcmd/steamcmd.exe`)
- Check Windows Defender/antivirus not blocking SteamCMD
- Ensure sufficient disk space in temp and target directories
- Check network connection to Steam servers
- Review console logs for `[SteamCMD]` error messages

### File Move Fails
- Verify Mods folder path exists and is writable
- Check antivirus not blocking file operations
- Ensure sufficient disk space for Mod files
- Verify no file locks (close RimWorld if running)
- Review console logs for `[ModProcessor]` error messages

### Progress Not Showing
- Verify `window.api.onDownloadProgress` is set up in App.tsx
- Check that `steamCMD.on('progress', ...)` is registered in ipcHandlers.ts
- Ensure mainWindow.webContents.send() is being called
- Check DevTools Network tab for IPC messages