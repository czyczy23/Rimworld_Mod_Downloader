# RimWorld Mod Downloader - Technical Specification
**Version**: 1.0  
**Stack**: Electron + TypeScript + Vite + simple-git  
**Target Platform**: Windows 10/11 (x64)  

---

## 1. Project Architecture

### 1.1 Directory Structure
```
rimworld-mod-downloader/
├── src/
│   ├── main/
│   │   ├── index.ts                 # Entry point, window creation
│   │   ├── ipcHandlers.ts           # IPC route definitions
│   │   ├── services/
│   │   │   ├── SteamCMD.ts          # SteamCMD process wrapper
│   │   │   ├── ModProcessor.ts      # File operations, XML parsing
│   │   │   ├── VersionChecker.ts    # RimWorld version compatibility
│   │   │   ├── DependencyResolver.ts # Steam Workshop scraping
│   │   │   └── GitManager.ts        # Version control automation
│   │   └── utils/
│   │       ├── ConfigManager.ts     # electron-store wrapper
│   │       └── PathUtils.ts         # Windows path normalization
│   ├── preload/
│   │   └── index.ts                 # ContextBridge API definitions
│   └── renderer/
│       ├── components/
│       │   ├── WebviewContainer.tsx # Steam Workshop webview
│       │   ├── DownloadQueue.tsx    # Bottom status bar
│       │   └── SettingsPanel.tsx    # Configuration UI
│       ├── inject/
│       │   └── workshopInjector.js  # Script injected to Steam pages
│       └── stores/
│           └── AppStore.ts          # Renderer state management
├── resources/
│   └── scripts/
│       └── steamcmd.bat             # Wrapper batch file (if needed)
├── .gitignore                       # Must exclude: node_modules, dist, config.json
└── electron.vite.config.ts
```

### 1.2 Technology Constraints
- **Electron**: v28.0.0+ (Chromium 120+)
- **Node.js**: v18+ (LTS)
- **TypeScript**: Strict mode enabled
- **Git**: simple-git npm package (no native git CLI dependency)
- **HTTP Client**: axios (for Steam Workshop scraping fallback)
- **XML Parser**: fast-xml-parser (for About.xml)
- **State Management**: Zustand (renderer), electron-store (main)

---

## 2. Core Data Models

### 2.1 ModMetadata Interface
```typescript
interface ModMetadata {
  id: string;                    // Steam Workshop ID (e.g., "3529349795")
  name: string;                  // Mod display name
  author: string;                // Creator name
  description?: string;          // Truncated description
  supportedVersions: string[];   // Parsed from About.xml (e.g., ["1.5", "1.6"])
  dependencies: Dependency[];    // Required items from Steam page
  isCollection: boolean;         // true if this is a collection
  collectionItems?: string[];    // Array of Mod IDs if isCollection=true
  localPath?: string;            // Final destination path after move
  downloadStatus: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error';
  errorMessage?: string;
}

interface Dependency {
  id: string;
  name: string;
  isOptional: boolean;          // Steam shows some as optional
  willDownload: boolean;        // User selection state
}
```

### 2.2 AppConfig Schema (electron-store)
```typescript
interface AppConfig {
  steamcmd: {
    executablePath: string;      // Default: "C:\\Users\\{username}\\Documents\\steamcmd\\steamcmd.exe"
    downloadPath: string;        // Default: "C:\\Users\\{username}\\Documents\\steamcmd\\steamapps\\workshop\\content\\294100"
  };
  rimworld: {
    currentVersion: string;      // e.g., "1.6" (user selectable)
    modsPaths: Array<{
      id: string;                // UUID
      name: string;              // User defined label (e.g., "1.5 Stable", "1.6 Testing")
      path: string;              // Absolute path to Mods folder
      isActive: boolean;         // Currently selected target
    }>;
    autoCheckUpdates: boolean;   // Check on startup
  };
  download: {
    autoDownloadDependencies: boolean;  // Default: false (ask user)
    skipVersionCheck: boolean;          // Default: false (ask on mismatch)
    extractCollectionToSubfolder: boolean; // Default: true
  };
  git: {
    enabled: boolean;
    autoCommit: boolean;
    githubToken?: string;        // Encrypted storage
    remoteUrl?: string;
    lastCommit?: string;
  };
}
```

---

## 3. IPC Communication Protocol

### 3.1 Main → Renderer (Events)
| Channel | Payload | Description |
|---------|---------|-------------|
| `download:progress` | `{ id: string, status: string, progress: number }` | Real-time download status |
| `download:complete` | `ModMetadata` | Mod successfully installed |
| `download:error` | `{ id: string, error: string }` | Download/move failure |
| `git:status` | `{ ahead: number, dirty: boolean, lastCommit: string }` | Git state update |
| `version:mismatch` | `{ modId: string, modVersions: string[], gameVersion: string }` | User decision required |

### 3.2 Renderer → Main (Invokable)
| Channel | Request | Response | Description |
|---------|---------|----------|-------------|
| `mod:download` | `{ id: string, isCollection: boolean }` | `Promise<ModMetadata>` | Initiate download workflow |
| `mod:checkDependencies` | `string (modId)` | `Dependency[]` | Scrape Steam page for deps |
| `mod:resolveVersion` | `string (localPath)` | `string[]` | Parse About.xml versions |
| `config:get` | `key?: string` | `any` | Get configuration value |
| `config:set` | `{ key: string, value: any }` | `void` | Update configuration |
| `git:init` | `{ remoteUrl: string, token: string }` | `void` | Setup repo and remote |
| `git:commit` | `message: string` | `string (commitHash)` | Manual commit trigger |
| `dialog:selectFolder` | `void` | `string (path)` | Open folder picker |

---

## 4. Feature Specifications

### 4.1 Steam Workshop Webview Integration

**Implementation**: `src/renderer/components/WebviewContainer.tsx`

**Requirements**:
1. Create `<webview>` with attributes:
   - `src="https://steamcommunity.com/app/294100/workshop/"`
   - `partition="persist:steam"` (critical for session persistence)
   - `allowpopups` (for login flows)
   - `webpreferences="contextIsolation=no, nodeIntegration=no"`

2. Inject script on `dom-ready` event:
   ```javascript
   // Injected code (workshopInjector.js)
   (function() {
     if (window.location.pathname.includes('/filedetails/')) {
       const id = new URLSearchParams(window.location.search).get('id');
       if (!id) return;
       
       // Check if already injected
       if (document.getElementById('rw-downloader-btn')) return;
       
       const btn = document.createElement('button');
       btn.id = 'rw-downloader-btn';
       btn.innerHTML = '📥 Download to Local';
       btn.style.cssText = 'background:#4CAF50;color:white;border:none;padding:8px 16px;margin-left:10px;cursor:pointer;border-radius:4px;';
       
       btn.onclick = () => {
         window.postMessage({ 
           type: 'DOWNLOAD_REQUEST', 
           id: id,
           isCollection: document.querySelector('.collectionItem') !== null
         }, '*');
       };
       
       // Insert after subscribe button
       const subBtn = document.querySelector('.workshopItemSubscribeBtn') || 
                      document.querySelector('[data-appid="294100"]');
       if (subBtn) subBtn.parentNode.appendChild(btn);
     }
   })();
   ```

3. Message handling in preload script:
   ```typescript
   window.addEventListener('message', (e) => {
     if (e.data?.type === 'DOWNLOAD_REQUEST') {
       ipcRenderer.invoke('mod:download', {
         id: e.data.id,
         isCollection: e.data.isCollection
       });
     }
   });
   ```

**Acceptance Criteria**:
- [ ] Webview loads Steam Workshop without console errors
- [ ] Login state persists between app restarts
- [ ] Download button appears on all Mod detail pages within 2 seconds of load
- [ ] Button does not duplicate on SPA navigation (Steam uses History API)

### 4.2 SteamCMD Automation

**Implementation**: `src/main/services/SteamCMD.ts`

**Workflow**:
```typescript
class SteamCMD {
  async downloadMod(modId: string): Promise<string> {
    // 1. Validate paths
    const exePath = config.get('steamcmd.executablePath');
    if (!await fs.pathExists(exePath)) throw new Error('STEAMCMD_NOT_FOUND');
    
    // 2. Construct command
    const cmd = `"${exePath}" +login anonymous +workshop_download_item 294100 ${modId} +quit`;
    
    // 3. Execute with progress monitoring
    return new Promise((resolve, reject) => {
      const process = exec(cmd, { timeout: 300000 }); // 5 min timeout
      
      process.stdout?.on('data', (data) => {
        // Parse progress: "Downloading update (0 of 54,584)..."
        const match = data.match(/Downloading update \((\d+) of (\d+)\)/);
        if (match) {
          const progress = (parseInt(match[1]) / parseInt(match[2])) * 100;
          mainWindow.webContents.send('download:progress', { id: modId, progress });
        }
      });
      
      process.on('exit', (code) => {
        if (code === 0) {
          resolve(this.getDownloadPath(modId));
        } else {
          reject(new Error(`SteamCMD exit code: ${code}`));
        }
      });
    });
  }
  
  getDownloadPath(modId: string): string {
    const base = config.get('steamcmd.downloadPath');
    return path.join(base, modId);
  }
}
```

**Error Handling**:
- `STEAMCMD_NOT_FOUND`: Executable missing → Prompt user to select path
- `TIMEOUT`: Download hung >5min → Retry once, then fail
- `NO_SPACE`: Disk full during download → Check disk space before execution

### 4.3 File Operations & Version Checking

**Implementation**: `src/main/services/ModProcessor.ts`

**Move Logic**:
```typescript
async function installMod(sourceId: string, targetPath: string, isCollection: boolean): Promise<void> {
  const source = path.join(config.steamcmd.downloadPath, sourceId);
  const target = isCollection 
    ? path.join(targetPath, `Collection_${Date.now()}`, sourceId)
    : path.join(targetPath, sourceId);
    
  // Check if target exists (update scenario)
  if (await fs.pathExists(target)) {
    await fs.remove(target);
  }
  
  await fs.copy(source, target, { filter: (src) => !src.includes('.git') });
  
  // Verify About.xml exists
  const aboutPath = path.join(target, 'About', 'About.xml');
  if (!await fs.pathExists(aboutPath)) {
    throw new Error('INVALID_MOD_STRUCTURE: Missing About.xml');
  }
}
```

**Version Parsing**:
```typescript
async function getSupportedVersions(modPath: string): Promise<string[]> {
  const xmlPath = path.join(modPath, 'About', 'About.xml');
  const xml = await fs.readFile(xmlPath, 'utf-8');
  
  const parser = new XMLParser({ ignoreAttributes: false });
  const result = parser.parse(xml);
  
  const meta = result.ModMetaData;
  if (!meta) throw new Error('INVALID_ABOUT_XML');
  
  // Handle both <supportedVersions><li>1.5</li>...</supportedVersions>
  // and legacy <targetVersion>1.5</targetVersion>
  const versions = meta.supportedVersions?.li 
    ? [].concat(meta.supportedVersions.li) // Handle single vs array
    : [meta.targetVersion];
    
  return versions.filter(Boolean);
}
```

**Compatibility Check**:
```typescript
async function checkCompatibility(modId: string, modPath: string): Promise<boolean> {
  const versions = await getSupportedVersions(modPath);
  const currentVersion = config.get('rimworld.currentVersion');
  
  const isCompatible = versions.some(v => v.startsWith(currentVersion));
  
  if (!isCompatible && !config.get('download.skipVersionCheck')) {
    // Send to renderer for user decision
    const shouldProceed = await mainWindow.webContents.invoke('version:mismatch', {
      modId,
      modVersions: versions,
      gameVersion: currentVersion
    });
    return shouldProceed;
  }
  
  return isCompatible || config.get('download.skipVersionCheck');
}
```

### 4.4 Dependency Resolution

**Implementation**: `src/main/services/DependencyResolver.ts`

**Scraping Logic**:
```typescript
async function resolveDependencies(modId: string): Promise<Dependency[]> {
  const url = `https://steamcommunity.com/sharedfiles/filedetails/?id=${modId}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  
  const $ = cheerio.load(data);
  const deps: Dependency[] = [];
  
  $('.requiredItemsContainer .requiredItem').each((i, elem) => {
    const $el = $(elem);
    const link = $el.find('a').attr('href');
    const id = link?.match(/id=(\d+)/)?.[1];
    if (id) {
      deps.push({
        id,
        name: $el.text().trim(),
        isOptional: $el.hasClass('optional'), // Check Steam's CSS classes
        willDownload: false // User must confirm
      });
    }
  });
  
  return deps;
}
```

**Download Chain**:
When user clicks download:
1. Fetch dependencies list
2. If `autoDownloadDependencies` is false, show modal with checkboxes
3. Recursively call `mod:download` for each selected dependency
4. Track in download queue to prevent circular dependencies

### 4.5 Git Integration & GitHub Sync

**Implementation**: `src/main/services/GitManager.ts`

**Initialization**:
```typescript
async function initializeRepo(remoteUrl: string, token: string): Promise<void> {
  const git = simpleGit(app.getAppPath());
  
  // Check if already initialized
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    await git.init();
    await fs.writeFile(
      path.join(app.getAppPath(), '.gitignore'),
      `node_modules/\ndist/\nout/\n*.log\nconfig.json\n.vscode/\n.idea/\n`
    );
    await git.add('.');
    await git.commit('init: Initialize project structure');
  }
  
  // Configure remote with token
  const authUrl = remoteUrl.replace('https://github.com', `https://${token}@github.com`);
  await git.addRemote('origin', authUrl);
  
  // Store encrypted
  config.set('git.githubToken', token);
  config.set('git.remoteUrl', remoteUrl);
}
```

**Auto-Commit Strategy**:
```typescript
async function autoCommit(context: string, details?: object): Promise<void> {
  if (!config.get('git.enabled') || !config.get('git.autoCommit')) return;
  
  const git = simpleGit(app.getAppPath());
  const status = await git.status();
  
  if (status.files.length === 0) return;
  
  const message = this.generateCommitMessage(context, details);
  await git.add('.');
  await git.commit(message);
  
  // Push if remote configured
  if (config.get('git.remoteUrl')) {
    try {
      await git.push('origin', 'main');
    } catch (e) {
      console.error('Push failed:', e);
      // Notify user but don't block
    }
  }
}

private generateCommitMessage(context: string, details?: any): string {
  const prefixMap = {
    'mod-download': 'feat',
    'mod-update': 'update',
    'settings-change': 'config',
    'dependency-download': 'deps',
    'error-fix': 'fix'
  };
  
  const prefix = prefixMap[context] || 'chore';
  let msg = `${prefix}: ${context}`;
  
  if (details?.modId) msg += ` - ${details.modId}`;
  if (details?.modName) msg += ` (${details.modName})`;
  
  return msg;
}
```

**Trigger Points**:
- After successful mod download/install: `autoCommit('mod-download', { modId, modName })`
- After settings update: `autoCommit('settings-change')`
- On app close (if dirty): Prompt user "Commit uncommitted changes?"

---

## 5. UI Specifications

### 5.1 Main Window Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Path Selector ▼] [Settings ⚙️]          RimWorld Mod Sync  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Webview Container                        │
│              (Steam Workshop Browser)                       │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📥 Queue: [3] mods processing...      [Git: 2 ahead ▲]     │
│ Progress: [████████░░] 80% - Moving files...               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Settings Modal Sections
1. **Paths**:
   - SteamCMD executable: [Browse] [Validate button]
   - Active Mods folder: [Dropdown of configured paths] [+ Add New]
   - Current game version: [Dropdown: 1.4/1.5/1.6/Custom]

2. **Download Behavior**:
   - [Checkbox] Auto-download dependencies (skip confirmation)
   - [Checkbox] Skip version compatibility warnings
   - [Checkbox] Extract collections to subfolders

3. **Git Integration**:
   - [Toggle] Enable version control
   - [Toggle] Auto-commit on changes
   - GitHub Token: [Password input] [Validate button]
   - Repository: [Text display of remoteUrl]
   - Status: [Text display: "Last commit: 2 mins ago", "2 commits ahead"]

### 5.3 Dialogs
**Version Mismatch Dialog**:
- Title: "Version Incompatibility Detected"
- Content: "Mod 'X' supports versions: 1.4, 1.5. Your game is set to 1.6."
- Buttons: [Download Anyway] [Cancel] [Don't ask again for this session]

**Dependency Resolution Dialog**:
- Title: "Dependencies Required"
- Content: List with checkboxes:
  - [x] Harmony (Required)
  - [x] HugsLib (Required)
  - [ ] Optional Texture Pack
- Buttons: [Download Selected] [Skip Dependencies]

---

## 6. Error Handling & Logging

### 6.1 Error Codes
| Code | Description | User Action |
|------|-------------|-------------|
| `E_STEAMCMD_NOT_FOUND` | steamcmd.exe missing | Show file picker |
| `E_DOWNLOAD_TIMEOUT` | SteamCMD hung | Auto-retry once, then fail |
| `E_VERSION_MISMATCH` | Mod version incompatible | Show warning dialog |
| `E_INVALID_MOD_STRUCTURE` | Missing About.xml | Delete partial download, notify |
| `E_GIT_AUTH_FAIL` | GitHub token invalid | Prompt re-entry |
| `E_DISK_FULL` | No space for download | Check before download starts |
| `E_DEP_CYCLIC` | Circular dependency detected | Skip circular reference |

### 6.2 Logging
- Use `electron-log` package
- Log file: `%USERPROFILE%\AppData\Roaming\rw-mod-downloader\logs\main.log`
- Levels: error, warn, info, debug
- Rotate logs >10MB

---

## 7. Implementation Phases (For LLM Iteration)

### Phase 1: Core Shell
- [ ] Electron + Vite scaffold
- [ ] Basic window with webview loading Steam
- [ ] Config store setup
- [ ] IPC bridge setup

### Phase 2: Download Pipeline
- [ ] SteamCMD wrapper (execute command)
- [ ] File move operations
- [ ] Download queue UI
- [ ] Error handling for download flow

### Phase 3: Intelligence
- [ ] Inject download button into Steam pages
- [ ] Version checker (XML parser)
- [ ] Dependency resolver (Cheerio scraper)
- [ ] Compatibility warnings

### Phase 4: Git Integration
- [ ] simple-git integration
- [ ] GitHub token storage (encrypted)
- [ ] Auto-commit logic
- [ ] Settings UI for Git config

### Phase 5: Polish
- [ ] Multi-path management UI
- [ ] Collection handling (subfolders)
- [ ] Update checking (compare local vs Steam)
- [ ] Error dialogs and user feedback

---

## 8. Critical Implementation Notes

1. **Windows Path Handling**: Always use `path.join()` and normalize backslashes. SteamCMD paths often contain spaces (e.g., `C:\Users\czy233\Documents\...`), wrap in quotes when executing shell commands.

2. **Steam Workshop Rate Limiting**: Add 1-second delay between HTTP requests when scraping dependencies to avoid 429 errors.

3. **Webview Security**: Despite `contextIsolation=no` in webview, never expose Node.js APIs directly to Steam pages. All communication must go through `postMessage` → Preload → IPC.

4. **Git Token Security**: Store GitHub token using `electron-store` with encryptionKey. Never log the token to console or write to disk unencrypted.

5. **Mod ID Validation**: Steam Workshop IDs are 10-digit numbers (e.g., 3529349795). Validate with regex `/^\d{10}$/` before processing.

6. **Atomic Operations**: When updating an existing mod, download to temp folder first, then swap atomically to prevent corruption if interrupted.

7. **SteamCMD Idle**: SteamCMD sometimes hangs on "Update Complete". Implement timeout with SIGTERM after 30 seconds of no output.

---

## 9. Testing Checklist (Post-Implementation)

- [ ] Download single mod (Harmony) → Check version → Move to folder
- [ ] Download collection → Verify subfolder created → All items present
- [ ] Install incompatible version mod → Verify warning shows → Skip/Cancel works
- [ ] Download mod with 3 dependencies → Verify all downloaded recursively
- [ ] Enable Git → Make change → Verify auto-commit → Check GitHub
- [ ] Switch between 3 different Mods paths → Verify correct target used
- [ ] Close app mid-download → Verify partial files cleaned up on restart
- [ ] SteamCMD path with spaces → Verify execution succeeds
