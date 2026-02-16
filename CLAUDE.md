# RimWorld Mod Downloader

An Electron + TypeScript + Vite desktop application for downloading and managing RimWorld mods from Steam Workshop.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Electron 28.1.3 |
| Build | electron-vite 2.0.0 |
| UI | React 18.2.0 + TypeScript 5.3.3 |
| Styling | Tailwind CSS 3.4.1 (mostly inline styles) |
| Config | electron-store 8.1.0 |
| HTTP | axios 1.13.5 |
| HTML Parsing | cheerio 1.2.0 |
| XML Parsing | fast-xml-parser 4.3.4 (installed but unused) |
| State Management | React useState (**NOT Zustand** - installed but unused) |

## Project Status

```
✅ Phase 1: Core Shell        - Completed
✅ Phase 2: Download Pipeline  - Completed
✅ Phase 3: Intelligence      - Completed
✅ Bug Fixes: 2026-02-15     - Completed (SteamCMD config, IPC listeners, version dialog, config integration)
✅ Phase 3.5: Pending Queue   - Completed (pending download queue, Add button, unified version checking)
✅ Dependency & Version Parsing Improvements - Completed (improved multi-version parsing, enhanced dependency detection)
✅ Bug Fixes: 2026-02-16     - Completed (useCallback closure trap fix, path switching sync issue, config reset feature)
```

## Directory Structure

```
src/
├── main/                          # Main process (Node.js)
│   ├── index.ts                   # Window creation, app entry
│   ├── ipcHandlers.ts            # IPC route registration ✨
│   ├── polyfills.ts              # File/FormData polyfill for axios
│   ├── services/
│   │   ├── SteamCMD.ts           # SteamCMD process wrapper
│   │   ├── ModProcessor.ts       # File operations + About.xml validation
│   │   └── WorkshopScraper.ts    # Steam web scraping (axios + cheerio)
│   └── utils/
│       └── ConfigManager.ts      # Config management (electron-store)
├── preload/
│   └── index.ts                   # ContextBridge API definition
├── renderer/                      # Renderer process (React)
│   └── src/
│       ├── App.tsx                # Main app, download state management
│       ├── main.tsx               # React entry
│       ├── App.css                # Global styles
│       └── components/
│           ├── WebviewContainer.tsx    # Steam Workshop browser
│           ├── Toolbar.tsx              # Toolbar + download/add buttons
│           ├── DownloadQueue.tsx        # Download queue status bar
│           ├── SettingsPanel.tsx        # Settings panel
│           ├── DependencyDialog.tsx     # Dependency selection dialog
│           ├── VersionMismatchDialog.tsx # Version mismatch warning
│           ├── PendingQueueDialog.tsx   # Pending queue confirmation dialog
│           └── DeleteConfirmDialog.tsx  # Delete confirmation dialog
└── shared/
    └── types.ts                   # Shared type definitions
```

**Key file line counts:**
- `src/main/ipcHandlers.ts` - 325 lines
- `src/main/services/SteamCMD.ts` - 252 lines
- `src/main/services/ModProcessor.ts` - 264 lines
- `src/renderer/src/App.tsx` - 422 lines
- `src/renderer/src/components/Toolbar.tsx` - 469 lines

## Development Guide

### Quick Start

```bash
npm run dev          # Development mode
npm run typecheck    # Type checking
npm run build        # Build
npm run build:win    # Package Windows
```

### Core Architecture Patterns

#### 1. IPC Communication

```
Renderer (React)
    ↓ window.api.xxx() (preload ContextBridge)
Main (ipcHandlers.ts)
    ↓ calls services
Returns result
```

**Renderer → Main (invoke):**
```typescript
// Renderer call
const result = await window.api.downloadMod(modId, isCollection)

// preload forward
ipcRenderer.invoke('mod:download', { id, isCollection })

// main handle
ipcMain.handle('mod:download', async (event, { id, isCollection }) => {
  return await steamCMD.downloadMod(id)
})
```

**Main → Renderer (send):**
```typescript
// main sends event
mainWindow.webContents.send('download:progress', { id, progress: 50 })

// preload listens
ipcRenderer.on('download:progress', handler)

// renderer uses
const unsubscribe = window.api.onDownloadProgress((data) => {
  // update state
})
// remember cleanup!
return unsubscribe
```

**Registered IPC Channels:**

| Channel | Type | Function |
|---------|------|----------|
| `config:get` | invoke | Get config |
| `config:set` | invoke | Set config |
| `version:detect` | invoke | Detect game version |
| `mod:download` | invoke | Download single mod |
| `mod:downloadBatch` | invoke | Batch download |
| `mod:checkVersion` | invoke | Check mod version info |
| `mod:checkDependencies` | invoke | Check dependencies |
| `dialog:selectFolder` | invoke | Open folder picker |
| `window:minimize` | invoke | Minimize window |
| `window:maximize` | invoke | Maximize window |
| `window:close` | invoke | Close window |
| `download:progress` | send | Real-time download progress |
| `download:complete` | send | Download complete |
| `download:error` | send | Download error |
| `batch:progress` | send | Batch download progress |

#### 2. Singleton Pattern

All services are singletons with direct export instances:

```typescript
// src/main/utils/ConfigManager.ts
class ConfigManager { ... }
export const configManager = new ConfigManager()

// src/main/services/SteamCMD.ts
class SteamCMD extends EventEmitter { ... }
export const steamCMD = new SteamCMD()

// src/main/services/ModProcessor.ts
class ModProcessor { ... }
export const modProcessor = new ModProcessor()

// src/main/services/WorkshopScraper.ts
class WorkshopScraper { ... }
export const workshopScraper = new WorkshopScraper()
```

#### 3. Event-Driven Progress Updates

SteamCMD inherits EventEmitter:

```
SteamCMD.downloadMod()
    ↓ emit('progress', { stage, percent, ... })
IPC Handler listens
    ↓ mainWindow.webContents.send('download:progress')
Preload ContextBridge
    ↓ callback
React useState updates
    ↓
UI re-renders
```

### Complete Download Flow

```
1. User navigates to Mod detail page in Webview
   ↓
2. WebviewContainer parses URL (did-navigate-in-page event!)
   - Checks for /sharedfiles/filedetails/
   - Extracts ?id= parameter
   ↓
3. App.tsx receives pageChanged callback
   - Updates currentPageInfo state
   ↓
4. Toolbar receives currentPageInfo prop
   - Enables download button
   - Automatically calls checkModVersion(modId)
   - Displays supported versions and dependency count
   ↓
5. User clicks download button
   ↓
6. Toolbar.handleDownload() → App.handleDownloadClick()
   ↓
7. Check version compatibility (per config)
   ├─ skipVersionCheck=true → Skip
   ├─ Version mismatch + onMismatch=skip → Cancel download
   ├─ Version mismatch + onMismatch=ask → Show VersionMismatchDialog
   └─ Version matches or onMismatch=force → Continue
   ↓
8. Check dependencies (per config)
   ├─ No dependencies → Download directly
   ├─ With dependencies + dependencyMode=ignore → Only download main mod
   ├─ With dependencies + dependencyMode=auto → Batch download all dependencies
   └─ With dependencies + dependencyMode=ask → Show DependencyDialog
   ↓
9. Start download: window.api.downloadMod(modId, isCollection)
   ↓
10. IPC: mod:download → ipcHandlers.ts
    ↓
11. SteamCMD.downloadMod()
    ├─ Reads latest config on each call with getPaths()
    ├─ emit('progress') → Real-time progress
    ├─ Executes command: steamcmd +login anonymous +workshop_download_item 294100 {modId} +quit
    ├─ Parses stdout: "Downloading update (X of Y)"
    └─ Returns SteamCMDResult
    ↓
12. ModProcessor.processMod()
    ├─ Source: {steamcmd.downloadPath}/{modId}
    ├─ Temp: {modsPath}/.temp_{modId}_{timestamp}
    ├─ Renames to target: {modsPath}/{modId} (atomic operation!)
    └─ Returns ProcessResult
    ↓
13. ModProcessor.validateMod()
    ├─ Checks directory exists
    ├─ Checks About/About.xml
    ├─ Parses with regex (not fast-xml-parser!)
    │   ├─ Mod name: <name>([^<]+)</name>
    │   └─ Supported versions: <li>([\d.]+)</li>
    └─ Returns ValidationResult
    ↓
14. Sends download:complete event
    ↓
15. App.tsx updates download status to completed
    ↓
16. DownloadQueue shows complete ✅
```

### Key Module Details

#### ConfigManager (Configuration Management)

**File**: `src/main/utils/ConfigManager.ts`

**Default Config:**
```typescript
{
  steamcmd: {
    executablePath: '~/Documents/steamcmd/steamcmd.exe',
    downloadPath: '~/Documents/steamcmd/steamapps/workshop/content/294100'
  },
  rimworld: {
    currentVersion: '1.6',
    modsPaths: [{
      id: UUID,
      name: 'Default Mods Folder',
      path: '~/Documents/RimWorld/Mods',
      isActive: true
    }],
    autoCheckUpdates: false
  },
  download: {
    autoDownloadDependencies: false,
    skipVersionCheck: false,
    extractCollectionToSubfolder: true,
    dependencyMode: 'ask'
  },
  version: {
    autoDetect: true,
    manualVersion: '1.6',
    onMismatch: 'ask'
  }
}
```

**Version Detection Logic:**
```
1. Get active Mods path
   ↓
2. Get parent directory (game root)
   ↓
3. Find Version.txt
   ↓
4. Parse format: "version 1.5.4063 rev1071"
   ↓
5. Regex match: /(?:version\s+)?(\d+\.\d+)\.\d+/
   ↓
6. Extract "1.5"
```

**API:**
```typescript
configManager.get()              // Get all config
configManager.get('rimworld')    // Get specific key
configManager.set('rimworld', { ... })  // Set specific key (only top-level!)
configManager.getActiveModsPath() // Get active ModsPath
configManager.detectGameVersion() // Auto-detect version
```

#### SteamCMD (SteamCMD Process Wrapper)

**File**: `src/main/services/SteamCMD.ts`

**Executed Command:**
```batch
steamcmd.exe +login anonymous +workshop_download_item 294100 {modId} +quit
```

**Progress Parsing:**
Matches from stdout: `Downloading update (X of Y)" → percentage `(X/Y)*100`

**Success/Failure Detection:**
| Success Indicator | Failure Indicator |
|-------------------|-------------------|
| `Success. Downloaded item` | `ERROR` |
| `Downloaded item` | `Failure` |
| `isDownloading = true` | stderr output |

**Timeout:** 5 minutes (300,000 ms)

**API:**
```typescript
steamCMD.validate()           // Check if steamcmd.exe exists
steamCMD.downloadMod(modId)   // Download mod
steamCMD.on('progress', (progress) => { ... })  // Listen for progress
```

#### ModProcessor (Mod File Processing)

**File**: `src/main/services/ModProcessor.ts`

**Atomic File Operations:**
```
Source path: {steamcmd.downloadPath}/{modId}
    ↓
Copy to temp: {modsPath}/.temp_{modId}_{timestamp}
    ↓
Rename to target: {modsPath}/{modId} (atomic operation!)
    ↓
Validate
```

**Validation Content:**
- Checks directory exists
- Checks `About/About.xml` exists
- Extracts from About.xml (with regex!):
  - Mod name: `<name>([^<]+)</name>`
  - Supported versions: `<li>([\d.]+)</li>`

**⚠️ Note:** `fast-xml-parser` is installed but not used, currently using regex.

**API:**
```typescript
modProcessor.validateMod(modId, path?)     // Validate mod
modProcessor.processMod(modId)             // Process (move) mod
```

#### WorkshopScraper (Steam Workshop Web Scraping)

**File**: `src/main/services/WorkshopScraper.ts`

**HTTP Request Config:**
```typescript
{
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    'Accept': 'text/html,application/xhtml+xml...'
  },
  timeout: 10000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
}
```

**Version Parsing Strategy:**
Tries multiple CSS selectors:
1. `.rightDetailsBlock`
2. `.detailsStatsContainerRight`
3. `.workshopItemTags`
4. `.workshopItemDescription`
5. Finally searches entire `body`

Uses two-step regex matching:
1. First matches line starting with "Mod" using `/Mod[,\s]+([\d\.,\s]+)/gi`
2. Then extracts all versions from that line using `/\b(\d+\.\d+(?:\.\d+)?)\b/g`

Supports formats like: "Mod, 1.4, 1.5"

**Dependency Parsing:**
Looks for: `.workshopItemRequiredItems`, `.requiredItems`, `.dependencyList`, plus class name wildcard matches and text-based fallback search.

Extracts modId from links: `/filedetails\/\?id=(\d+)/`

Uses `Set` to avoid duplicate dependencies.

**API:**
```typescript
workshopScraper.scrapeModVersion(modId)
// Returns: { supportedVersions, modName, dependencies }
```

#### WebviewContainer (Steam Browser)

**File**: `src/renderer/src/components/WebviewContainer.tsx`

**Key Features:**
- `<webview partition="persist:steam"` - Persists login state!
- Listens for `did-navigate` **and** `did-navigate-in-page` (Steam is SPA!)
- Uses `parsePageInfo(url)` to extract modId
- Exposes `getCurrentPageInfo()` via ref

**Props:**
```typescript
interface WebviewContainerProps {
  onDownloadRequest?: (id: string, isCollection: boolean) => void
  onPageChanged?: (info: CurrentPageInfo) => void
}

interface CurrentPageInfo {
  url: string
  isModDetailPage: boolean
  modId?: string
  modName?: string
  isCollection?: boolean
}
```

#### Toolbar (Toolbar)

**File**: `src/renderer/src/components/Toolbar.tsx`

**Layout:**
```
[Title] [Path Selector] [Browse] [Game Version] [Download Button] [Settings]
[Mod Info Panel (conditional display)]
```

**Features:**
- Path selection and switching (sets entire rimworld object, can't set nested properties)
- Game version display
- Download button (only enabled on Mod detail page)
- Mod info display (type, ID, supported versions, dependency count)
- Version compatibility check (automatically calls checkModVersion on page change)

#### App.tsx (Main App)

**File**: `src/renderer/src/App.tsx`

**State:**
```typescript
const [downloads, setDownloads] = useState<DownloadItem[]>([])
const [batchInfo, setBatchInfo] = useState<BatchDownloadInfo | undefined>()
const [config, setConfig] = useState<AppConfig | null>(null)
const [showSettings, setShowSettings] = useState(false)
const [showDependencyDialog, setShowDependencyDialog] = useState(false)
const [showVersionMismatchDialog, setShowVersionMismatchDialog] = useState(false)
const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
const [pendingDependencies, setPendingDependencies] = useState<...>(null)
const [pendingVersionCheck, setPendingVersionCheck] = useState<...>(null)
const [gameVersion, setGameVersion] = useState<string>('')
```

**Effects:**
- Load config and game version
- Set up download progress listener (remember cleanup unsubscribe!)

**Download Flow Logic:**
1. Check version (based on `version.onMismatch` config)
2. Check dependencies (based on `download.dependencyMode` config)
3. Start download

### Pending Queue Feature (Phase 3.5)

#### Feature Overview
Users can add mods to a pending download queue and then download them in batch. The Add button uses exactly the same config constraints and version matching logic as the Download button.

#### New Components
- **PendingQueueDialog.tsx** - Pending queue confirmation dialog, displays all mods in queue and confirms starting download
- **DeleteConfirmDialog.tsx** - Delete confirmation dialog, confirms removing selected mods from queue

#### Toolbar Modifications
- Added "Add" button, side-by-side with "Download" button
- Add button uses exactly the same version checking logic
- Both buttons are constrained by the same settings (`version.onMismatch`, `download.skipVersionCheck`, `download.dependencyMode`)

#### App.tsx State
```typescript
const [pendingQueue, setPendingQueue] = useState<PendingDownloadItem[]>([])
const [showPendingQueueDialog, setShowPendingQueueDialog] = useState(false)
const [selectedForDelete, setSelectedForDelete] = useState<string[]>([])
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [pendingAddVersionCheck, setPendingAddVersionCheck] = useState<...>(null)
```

#### Download vs Add to Queue Comparison

| Feature | Download Button | Add Button |
|---------|-----------------|------------|
| Version Check | ✅ | ✅ |
| Dependency Check | ✅ | ✅ |
| Config Constraints | ✅ | ✅ |
| Version Mismatch Dialog | ✅ Shows "Force Download"/"Skip" | ✅ Shows "Force Add"/"Cancel" |
| Dependency Dialog | ✅ | ✅ |
| Immediate Execution | ✅ Direct download | ❌ Add to queue |

#### Unified Version Data Source
**Important:** App.tsx acts as the single source of truth for `gameVersion`:
- App.tsx manages `gameVersion` state
- Passes to Toolbar and SettingsPanel via props
- Toolbar and SettingsPanel no longer maintain their own local gameVersion state
- Provides `onRefreshGameVersion` callback for child components to trigger refresh
- Auto-detects version when switching mod paths and syncs to settings panel

#### DownloadQueue Enhancements
- Added `pendingQueue` prop to display pending list
- Added `selectedForDelete`, `onToggleSelectForDelete`, `onSelectAllForDelete`, `onRequestDelete` for deletion functionality
- Added `onClearCompleted` and `onClearAll` callback props (fixed the issue where clear buttons weren't working!)

#### Circular Dependency Avoidance
Uses useRef to avoid circular dependencies in useCallback:
```typescript
const pendingQueueRef = useRef<PendingDownloadItem[]>([])
const currentPageInfoRef = useRef<CurrentPageInfo | null>(null)

useEffect(() => {
  pendingQueueRef.current = pendingQueue
}, [pendingQueue])

useEffect(() => {
  currentPageInfoRef.current = currentPageInfo
}, [currentPageInfo])
```

### Development Notes (Pure Vibe Coding)

⚠️ **SteamCMD path with spaces?** → `spawn()` handles it automatically, no quotes needed

⚠️ **File moving?** → Use ModProcessor's atomic operations, don't directly fs.rename

⚠️ **IPC listeners?** → Always return unsubscribe in useEffect

⚠️ **configManager.set?** → Can only set top-level keys (like 'rimworld', not 'rimworld.currentVersion')

⚠️ **SteamCMD event listeners?** → Use try/finally to ensure off() is called

⚠️ **Webview navigation?** → Listen for did-navigate-in-page (Steam is SPA!)

⚠️ **Don't inject scripts into Steam pages!** → Download button is in app toolbar, not in page

### Vite Config Notes

**File**: `electron.vite.config.ts`

There's a polyfill injected at the top of main process for axios/undici:
- File API polyfill
- FormData API polyfill

**Don't delete this!** Otherwise axios will error in main process.

### Color Scheme (Steam Style)

| Purpose | Color Value |
|---------|-------------|
| Main Background | `#1b2838` |
| Secondary Background | `#171a21` |
| Card Background | `#243447` |
| Border | `#2a475e` |
| Primary (Steam Blue) | `#66c0f4` |
| Success | `#4CAF50` |
| Warning | `#e6b800` |
| Error | `#f44336` |
| Text | `#c6d4df` |
| Secondary Text | `#8f98a0` |

### Path Aliases

```json
{
  "@renderer/*": "src/renderer/src/*",
  "@main/*": "src/main/*",
  "@preload/*": "src/preload/*",
  "@shared/*": "src/shared/*"
}
```

## Remaining Issues (Unfixed - Low Priority)

The following issues are left as-is since they don't affect core functionality and the code is still in development:

1. **Batch download code duplication** - `mod:download` and `downloadSingleMod()` have duplicate logic
2. **About.xml parsed with regex** - `fast-xml-parser` installed but not used
3. **Unused dependencies** - `zustand` installed but not used (using React useState)
4. **Hardcoded timeout** - SteamCMD 5-minute timeout should be in config
5. **Too many console.logs** - Production may need logging system
6. **WorkshopScraper disables SSL verification** - `rejectUnauthorized: false` (security risk)

## Troubleshooting

### Dev Server Won't Start
- Check if port 5173 is in use
- Clear electron-vite cache: Delete `node_modules/.electron-vite`

### Steam Workshop Webview Won't Load
- Check network connection
- Verify webview has `partition="persist:steam"`
- Check DevTools Console for CSP errors

### Download Button Not Working
**Note:** Download button is in app toolbar, **NOT** injected into Steam page!

Check:
1. Is Toolbar receiving currentPageInfo? Look for "[App] Page changed:" in console
2. Is currentPageInfo.isModDetailPage true?
3. Is handleDownloadClick calling window.api.downloadMod?

### SteamCMD Download Fails
- Verify steamcmd.exe exists at configured path
- Check Windows Defender/antivirus isn't blocking SteamCMD
- Verify sufficient disk space
- Look for "[SteamCMD]" errors in console

### File Move Fails
- Verify Mods folder exists and is writable
- Check antivirus isn't blocking file operations
- Verify sufficient disk space
- Verify no file locks (close RimWorld!)
- Look for "[ModProcessor]" errors in console

### Progress Not Showing
- Verify window.api.onDownloadProgress is set in App.tsx
- Verify steamCMD.on('progress', ...) is registered in ipcHandlers.ts
- Verify mainWindow.webContents.send() is called
- Look at DevTools Network tab for IPC messages

### Config Changes Not Taking Effect
- Verify correct top-level key is set (like 'rimworld' not 'rimworld.currentVersion')
- SteamCMD now re-reads config on each download, no app restart needed

### Version Mismatch Dialog Not Showing
- Verify `version.onMismatch` is set to 'ask'
- Verify `download.skipVersionCheck` is false
- Verify Mod page correctly parses supported versions

### Clear Button Not Working
- DownloadQueue now uses `onClearCompleted` and `onClearAll` callback props
- These callbacks must be provided by App.tsx and passed in
- Don't rely on DownloadQueue's internal setDownloads for external downloads state

### Version Detection Not Syncing
- Verify App.tsx is the single source of truth for gameVersion
- Toolbar and SettingsPanel receive gameVersion via props
- Use onRefreshGameVersion callback to trigger refresh
- Auto-detects and syncs when switching mod paths

### Path Switching Not Updating Frontend (useCallback Closure Trap)
**Problem:** When switching mod paths, the dropdown doesn't show the selected path.

**Root Cause:** useCallback closure trap - `handlePathChange` and `handleBrowsePath` had `modsPaths` in their dependency array, causing them to use stale state values when called.

**Fix:** Use useRef to store the latest state:
```typescript
// Add ref
const modsPathsRef = useRef<ModsPath[]>([])

// Sync state to ref
useEffect(() => {
  modsPathsRef.current = modsPaths
}, [modsPaths])

// In handler, use ref instead of state
const handlePathChange = useCallback(async (selectedPath: string) => {
  // Use modsPathsRef.current instead of modsPaths
  const currentPaths = modsPathsRef.current
  // ...
}, [refreshGameVersion])  // Remove modsPaths from dependencies!
```

**Key Takeaway:** When state is used in useCallback handlers that modify the same state, use useRef to access the latest value to avoid closure traps.

## Preload API (window.api)

```typescript
window.api = {
  // Config
  getConfig: (key?: string) => Promise<any>
  setConfig: (key: string, value: any) => Promise<void>
  resetConfig: () => Promise<boolean>

  // Version detection
  detectGameVersion: () => Promise<string>

  // Mod operations
  checkModVersion: (modId: string) => Promise<ModVersionInfo>
  downloadMod: (id: string, isCollection: boolean) => Promise<ModMetadata>
  downloadBatch: (items: Item[]) => Promise<ModMetadata[]>
  checkDependencies: (id: string) => Promise<Dependency[]>

  // Dialog
  selectFolder: () => Promise<string | null>
  selectFile: (options?: SelectFileOptions) => Promise<string | null>

  // Event listeners (returns unsubscribe function!)
  onDownloadProgress: (callback) => (() => void)
  onDownloadComplete: (callback) => (() => void)
  onDownloadError: (callback) => (() => void)
  onBatchProgress: (callback) => (() => void)
  onConfigReset: (callback) => (() => void)
}
```

## Git Repository

**Repository:** https://github.com/czyczy23/Rimworld_Mod_Downloader

When committing:
1. `git status` / `git diff` to see what changed
2. Write clear commit message
3. Push to remote

---

**Okay, keep Vibe Coding!🚀**
