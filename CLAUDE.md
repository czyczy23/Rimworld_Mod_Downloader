# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RimWorld Mod Downloader** is an Electron-based Windows desktop application for downloading and managing RimWorld mods from Steam Workshop. It provides a GUI wrapper around SteamCMD with features like dependency resolution, Git integration for version control, and automatic mod organization.

### Tech Stack
- **Framework**: Electron v28.1.3 with Electron Vite
- **Frontend**: React 18.2.0 + TypeScript 5.3.3 + Tailwind CSS 3.4.1
- **State**: Zustand (renderer), electron-store (main)
- **Key Libraries**: simple-git, axios, cheerio, fast-xml-parser, fs-extra

## Project Structure

```
src/
├── main/                    # Main process (Node.js)
│   ├── index.ts            # Entry: window creation, IPC setup
│   ├── ipcHandlers.ts      # IPC route definitions
│   ├── services/
│   │   └── GitManager.ts   # Git automation
│   └── utils/
│       └── ConfigManager.ts # electron-store wrapper
├── preload/                 # Preload scripts
│   └── index.ts            # ContextBridge API definitions
└── renderer/               # Renderer process (React)
    └── src/
        ├── App.tsx
        ├── components/
        │   ├── WebviewContainer.tsx   # Steam Workshop webview
        │   ├── DownloadQueue.tsx      # Status bar
        │   └── Toolbar.tsx            # Path settings
        ├── inject/
        │   └── workshopInjector.js    # Injected into Steam pages
        └── stores/                    # Zustand stores
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

### Testing Single Components
The project uses electron-vite for hot module replacement. To test a specific component:
1. Run `npm run dev`
2. Navigate to the relevant page in the app
3. Edit the component file - changes will hot reload

## Key Architectural Patterns

### IPC Communication
The app uses Electron's IPC for main-renderer communication. Key patterns:
- **Main to Renderer**: Use `mainWindow.webContents.send()` in main, `window.api.onMessage()` in renderer
- **Renderer to Main**: Use `ipcRenderer.invoke()` via the preload contextBridge

Key IPC handlers in `src/main/ipcHandlers.ts`:
- `mod:download` - Initiates mod/collection download
- `config:get`/`config:set` - Configuration management
- `git:init`/`git:commit` - Git operations
- `dialog:selectFolder` - Native folder picker

### Configuration Management
`ConfigManager` (src/main/utils/ConfigManager.ts) wraps electron-store with:
- Strongly typed config keys
- Encryption for sensitive data
- Default value fallbacks

Config categories:
- `steamcmdPath` - SteamCMD installation directory
- `modsPaths` - Array of mod installation directories
- `rimworldVersion` - Target RimWorld version
- `gitConfig` - Git repository settings

### Git Integration
`GitManager` (src/main/services/GitManager.ts) provides:
- Repository initialization
- Commit and push operations
- Remote configuration

Git workflow:
1. User selects a mod folder with Git enabled
2. GitManager initializes repo if needed
3. On mod changes, creates commits with descriptive messages
4. Optionally pushes to remote (GitHub, etc.)

### Steam Workshop Integration
`WebviewContainer` (src/renderer/src/components/WebviewContainer.tsx) embeds a Steam Workshop browser:
- Uses Electron's `<webview>` tag
- Injects `workshopInjector.js` for UI modifications
- Handles SPA navigation via `did-navigate-in-page` events

Injection flow:
1. On `dom-ready`, execute `workshopInjector.js`
2. Script finds subscribe button using CSS selectors
3. Injects "Download to Local" button adjacent to subscribe
4. Button click sends IPC message back to renderer

## Critical Implementation Details

### Workshop Injector Selectors
The real Steam Workshop page (as of 2026-02-14) uses these selectors:
- Primary: `#SubscribeItemBtn` - Subscribe button ID
- State: `.subscribeOption.subscribe.selected` / `.subscribeOption.subscribed`
- Icon: `.subscribeIcon`

Legacy selectors (`.workshopItemSubscribeBtn`, etc.) found in older code do not exist on current Steam pages.

### IPC Security
- All main-renderer communication goes through preload script
- Preload uses `contextBridge` to expose controlled API surface
- No direct `nodeIntegration` or `contextIsolation: false`

### Type Safety
- Strict TypeScript enabled
- Shared types in `src/shared/types.ts` for IPC contracts
- Zustand stores typed with store-specific interfaces

## Troubleshooting

### Dev Server Won't Start
- Check if port 5173 is in use: `lsof -i :5173`
- Clear electron-vite cache: `rm -rf node_modules/.electron-vite`

### Steam Workshop Webview Not Loading
- Check internet connection
- Verify `partition="persist:steam"` on webview element
- Check DevTools console for CSP errors

### Injector Script Not Working
- Verify selectors match current Steam HTML
- Check `window.__rimworldDownloaderInjected` to avoid double-injection
- Use DevTools to inspect actual button classes on target page