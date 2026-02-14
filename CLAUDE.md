# RimWorld Mod Downloader

一个 Electron + TypeScript + Vite 桌面应用，用于从 Steam Workshop 下载和管理 RimWorld 模组。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 28.1.3 |
| 构建 | electron-vite 2.0.0 |
| UI | React 18.2.0 + TypeScript 5.3.3 |
| 样式 | Tailwind CSS 3.4.1 (主要用内联样式) |
| 配置 | electron-store 8.1.0 |
| HTTP | axios 1.13.5 |
| HTML 解析 | cheerio 1.2.0 |
| XML 解析 | fast-xml-parser 4.3.4 (已安装但未用) |
| Git | simple-git 3.21.0 (已安装但未集成) |
| 状态管理 | React useState (**NOT Zustand** - 虽然装了但没用) |

## 项目状态

```
✅ Phase 1: Core Shell        - 完成
✅ Phase 2: Download Pipeline  - 完成
✅ Phase 3: Intelligence      - 完成
✅ Bug Fixes: 2025-02-15     - 完成 (SteamCMD配置, IPC监听器, 版本对话框, 配置集成)
✅ Phase 3.5: Pending Queue   - 完成 (待下载队列, Add按钮, 统一版本检测)
⏳ Phase 4: Git Integration   - 骨架有了，未集成
```

## 目录结构

```
src/
├── main/                          # 主进程 (Node.js)
│   ├── index.ts                   # 窗口创建, 应用入口
│   ├── ipcHandlers.ts            # IPC 路由注册 ✨
│   ├── polyfills.ts              # File/FormData polyfill (给 axios 用)
│   ├── services/
│   │   ├── SteamCMD.ts           # SteamCMD 进程包装器
│   │   ├── ModProcessor.ts       # 文件操作 + About.xml 验证
│   │   ├── WorkshopScraper.ts    # Steam 网页抓取 (axios + cheerio)
│   │   └── GitManager.ts         # Git 自动化 (Phase 4, 未集成)
│   └── utils/
│       └── ConfigManager.ts      # 配置管理 (electron-store)
├── preload/
│   └── index.ts                   # ContextBridge API 定义
├── renderer/                      # 渲染进程 (React)
│   └── src/
│       ├── App.tsx                # 主应用, 下载状态管理
│       ├── main.tsx               # React 入口
│       ├── App.css                # 全局样式
│       └── components/
│           ├── WebviewContainer.tsx    # Steam Workshop 浏览器
│           ├── Toolbar.tsx              # 工具栏 + 下载/添加按钮
│           ├── DownloadQueue.tsx        # 下载队列状态栏
│           ├── SettingsPanel.tsx        # 设置面板
│           ├── DependencyDialog.tsx     # 依赖选择对话框
│           ├── VersionMismatchDialog.tsx # 版本不匹配警告
│           ├── PendingQueueDialog.tsx   # 待下载队列确认对话框
│           └── DeleteConfirmDialog.tsx  # 删除确认对话框
└── shared/
    └── types.ts                   # 共享类型定义
```

**关键文件行数:**
- `src/main/ipcHandlers.ts` - 325 行
- `src/main/services/SteamCMD.ts` - 252 行
- `src/main/services/ModProcessor.ts` - 264 行
- `src/renderer/src/App.tsx` - 422 行
- `src/renderer/src/components/Toolbar.tsx` - 469 行

## 开发指南

### 快速开始

```bash
npm run dev          # 开发模式
npm run typecheck    # 类型检查
npm run build        # 构建
npm run build:win    # 打包 Windows
```

### 核心架构模式

#### 1. IPC 通信

```
Renderer (React)
    ↓ window.api.xxx() (preload ContextBridge)
Main (ipcHandlers.ts)
    ↓ 调用 services
返回结果
```

**Renderer → Main (invoke):**
```typescript
// 渲染进程调用
const result = await window.api.downloadMod(modId, isCollection)

// preload 转发
ipcRenderer.invoke('mod:download', { id, isCollection })

// main 处理
ipcMain.handle('mod:download', async (event, { id, isCollection }) => {
  return await steamCMD.downloadMod(id)
})
```

**Main → Renderer (send):**
```typescript
// main 发送事件
mainWindow.webContents.send('download:progress', { id, progress: 50 })

// preload 监听
ipcRenderer.on('download:progress', handler)

// 渲染进程使用
const unsubscribe = window.api.onDownloadProgress((data) => {
  // 更新状态
})
// 记得 cleanup!
return unsubscribe
```

**已注册的 IPC 通道:**

| 通道 | 类型 | 功能 |
|------|------|------|
| `config:get` | invoke | 获取配置 |
| `config:set` | invoke | 设置配置 |
| `version:detect` | invoke | 检测游戏版本 |
| `mod:download` | invoke | 下载单个 mod |
| `mod:downloadBatch` | invoke | 批量下载 |
| `mod:checkVersion` | invoke | 检查 mod 版本信息 |
| `mod:checkDependencies` | invoke | 检查依赖项 |
| `dialog:selectFolder` | invoke | 打开文件夹选择器 |
| `window:minimize` | invoke | 最小化窗口 |
| `window:maximize` | invoke | 最大化窗口 |
| `window:close` | invoke | 关闭窗口 |
| `download:progress` | send | 实时下载进度 |
| `download:complete` | send | 下载完成 |
| `download:error` | send | 下载错误 |
| `batch:progress` | send | 批量下载进度 |

#### 2. 单例模式

所有服务都是单例，直接 export 实例：

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

#### 3. 事件驱动进度更新

SteamCMD 继承 EventEmitter：

```
SteamCMD.downloadMod()
    ↓ emit('progress', { stage, percent, ... })
IPC Handler 监听
    ↓ mainWindow.webContents.send('download:progress')
Preload ContextBridge
    ↓ callback
React useState 更新
    ↓
UI 重新渲染
```

### 完整下载流程

```
1. 用户在 Webview 中导航到 Mod 详情页
   ↓
2. WebviewContainer 解析 URL (did-navigate-in-page 事件!)
   - 检查是否 /sharedfiles/filedetails/
   - 提取 ?id= 参数
   ↓
3. App.tsx 接收 pageChanged callback
   - 更新 currentPageInfo state
   ↓
4. Toolbar 接收 currentPageInfo prop
   - 启用下载按钮
   - 自动调用 checkModVersion(modId)
   - 显示支持版本和依赖数量
   ↓
5. 用户点击下载按钮
   ↓
6. Toolbar.handleDownload() → App.handleDownloadClick()
   ↓
7. 检查版本兼容性 (根据配置)
   ├─ skipVersionCheck=true → 跳过
   ├─ 版本不匹配 + onMismatch=skip → 取消下载
   ├─ 版本不匹配 + onMismatch=ask → 显示 VersionMismatchDialog
   └─ 版本匹配或 onMismatch=force → 继续
   ↓
8. 检查依赖 (根据配置)
   ├─ 无依赖 → 直接下载
   ├─ 有依赖 + dependencyMode=ignore → 仅下载主Mod
   ├─ 有依赖 + dependencyMode=auto → 批量下载全部依赖
   └─ 有依赖 + dependencyMode=ask → 显示 DependencyDialog
   ↓
9. 开始下载: window.api.downloadMod(modId, isCollection)
   ↓
10. IPC: mod:download → ipcHandlers.ts
    ↓
11. SteamCMD.downloadMod()
    ├─ 每次调用 getPaths() 读取最新配置
    ├─ emit('progress') → 实时进度
    ├─ 执行命令: steamcmd +login anonymous +workshop_download_item 294100 {modId} +quit
    ├─ 解析 stdout: "Downloading update (X of Y)"
    └─ 返回 SteamCMDResult
    ↓
12. ModProcessor.processMod()
    ├─ 源: {steamcmd.downloadPath}/{modId}
    ├─ 临时: {modsPath}/.temp_{modId}_{timestamp}
    ├─ 重命名到目标: {modsPath}/{modId} (原子操作!)
    └─ 返回 ProcessResult
    ↓
13. ModProcessor.validateMod()
    ├─ 检查目录存在
    ├─ 检查 About/About.xml
    ├─ 用正则解析 (不是 fast-xml-parser!)
    │   ├─ Mod 名称: <name>([^<]+)</name>
    │   └─ 支持版本: <li>([\d.]+)</li>
    └─ 返回 ValidationResult
    ↓
14. 发送 download:complete 事件
    ↓
15. App.tsx 更新下载状态为 completed
    ↓
16. DownloadQueue 显示完成 ✅
```

### 关键模块详解

#### ConfigManager (配置管理)

**文件**: `src/main/utils/ConfigManager.ts`

**默认配置:**
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
    dependencyMode: 'ask'  // 'ask' | 'auto' | 'ignore'
  },
  version: {
    autoDetect: true,
    manualVersion: '1.6',
    onMismatch: 'ask'     // 'ask' | 'force' | 'skip'
  },
  git: {
    enabled: false,
    autoCommit: true
  }
}
```

**版本检测逻辑:**
```
1. 获取激活的 Mods 路径
   ↓
2. 获取父目录 (游戏根目录)
   ↓
3. 查找 Version.txt
   ↓
4. 解析格式: "version 1.5.4063 rev1071"
   ↓
5. 正则匹配: /(?:version\s+)?(\d+\.\d+)\.\d+/
   ↓
6. 提取 "1.5"
```

**API:**
```typescript
configManager.get()              // 获取全部配置
configManager.get('rimworld')    // 获取某个 key
configManager.set('rimworld', { ... })  // 设置某个 key (只能设顶级!)
configManager.getActiveModsPath() // 获取激活的 ModsPath
configManager.detectGameVersion() // 自动检测版本
```

#### SteamCMD (SteamCMD 进程包装器)

**文件**: `src/main/services/SteamCMD.ts`

**执行的命令:**
```batch
steamcmd.exe +login anonymous +workshop_download_item 294100 {modId} +quit
```

**进度解析:**
从 stdout 匹配: `Downloading update (X of Y)" → 百分比 `(X/Y)*100

**成功/失败判断:**
| 成功标识 | 失败标识 |
|----------|----------|
| `Success. Downloaded item` | `ERROR` |
| `Downloaded item` | `Failure` |
| `isDownloading = true` | stderr 输出 |

**超时:** 5 分钟 (300,000 ms)

**API:**
```typescript
steamCMD.validate()           // 检查 steamcmd.exe 存在
steamCMD.downloadMod(modId)   // 下载 mod
steamCMD.on('progress', (progress) => { ... })  // 监听进度
```

#### ModProcessor (Mod 文件处理)

**文件**: `src/main/services/ModProcessor.ts`

**原子文件操作:**
```
源路径: {steamcmd.downloadPath}/{modId}
    ↓
复制到临时: {modsPath}/.temp_{modId}_{timestamp}
    ↓
重命名到目标: {modsPath}/{modId} (原子操作!)
    ↓
验证
```

**验证内容:**
- 检查目录存在
- 检查 `About/About.xml 存在
- 从 About.xml 提取 (用正则!):
  - Mod 名称: `<name>([^<]+)</name>`
  - 支持版本: `<li>([\d.]+)</li>`

**⚠️ 注意:** `fast-xml-parser` 已安装但没用，当前用正则。

**API:**
```typescript
modProcessor.validateMod(modId, path?)     // 验证 mod
modProcessor.processMod(modId)             // 处理 (移动) mod
```

#### WorkshopScraper (Steam Workshop 网页抓取)

**文件**: `src/main/services/WorkshopScraper.ts`

**HTTP 请求配置:**
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

**版本解析策略:**
尝试多个 CSS 选择器:
1. `.rightDetailsBlock`
2. `.detailsStatsContainerRight`
3. `.workshopItemTags`
4. `.workshopItemDescription`
5. 最后搜索整个 `body`

正则匹配: `/Mod[,\s]+(\d+\.\d+)/g`

**依赖解析:**
查找: `.workshopItemRequiredItems`, `.requiredItems`, `.dependencyList`

从链接提取 modId: `/filedetails\/\?id=(\d+)/`

**API:**
```typescript
workshopScraper.scrapeModVersion(modId)
// 返回: { supportedVersions, modName, dependencies }
```

#### WebviewContainer (Steam 浏览器)

**文件**: `src/renderer/src/components/WebviewContainer.tsx`

**重要特性:**
- `<webview partition="persist:steam"` - 持久化登录状态!
- 监听 `did-navigate` **和** `did-navigate-in-page` (Steam 是 SPA!)
- 用 `parsePageInfo(url)` 提取 modId
- 通过 ref 暴露 `getCurrentPageInfo()`

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

#### Toolbar (工具栏)

**文件**: `src/renderer/src/components/Toolbar.tsx`

**布局:**
```
[标题] [路径选择器] [浏览] [游戏版本] [下载按钮] [设置]
[Mod 信息面板 (条件显示)]
```

**功能:**
- 路径选择和切换 (设置整个 rimworld 对象，不能设嵌套属性)
- 游戏版本显示
- 下载按钮 (仅在 Mod 详情页启用)
- Mod 信息显示 (类型、ID、支持版本、依赖数量)
- 版本兼容性检查 (页面变化时自动调用 checkModVersion)

#### App.tsx (主应用)

**文件**: `src/renderer/src/App.tsx`

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
- 加载配置和游戏版本
- 设置下载进度监听器 (记得 cleanup unsubscribe!)

**下载流程逻辑:**
1. 检查版本 (根据 `version.onMismatch` 配置)
2. 检查依赖 (根据 `download.dependencyMode` 配置)
3. 开始下载

### 待下载队列功能 (Phase 3.5)

#### 功能概述
用户可以将 mod 添加到待下载队列，然后批量下载。Add 按钮与 Download 按钮使用完全相同的配置约束和版本匹配逻辑。

#### 新增组件
- **PendingQueueDialog.tsx** - 待下载队列确认对话框，显示队列中的所有 mod 并确认开始下载
- **DeleteConfirmDialog.tsx** - 删除确认对话框，确认从队列中删除选中的 mod

#### Toolbar 修改
- 添加了 "Add" 按钮，与 "Download" 按钮并排
- Add 按钮使用完全相同的版本检查逻辑
- 两个按钮都受相同的设置约束（`version.onMismatch`, `download.skipVersionCheck`, `download.dependencyMode`）

#### App.tsx State
```typescript
const [pendingQueue, setPendingQueue] = useState<PendingDownloadItem[]>([])
const [showPendingQueueDialog, setShowPendingQueueDialog] = useState(false)
const [selectedForDelete, setSelectedForDelete] = useState<string[]>([])
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [pendingAddVersionCheck, setPendingAddVersionCheck] = useState<...>(null)
```

#### 下载 vs 添加到队列对比

| 特性 | Download 按钮 | Add 按钮 |
|------|--------------|----------|
| 版本检查 | ✅ | ✅ |
| 依赖检查 | ✅ | ✅ |
| 配置约束 | ✅ | ✅ |
| 版本不匹配对话框 | ✅ 显示"强制下载"/"跳过" | ✅ 显示"强制添加"/"取消" |
| 依赖对话框 | ✅ | ✅ |
| 立即执行 | ✅ 直接下载 | ❌ 添加到队列 |

#### 统一的版本数据源
**重要：** App.tsx 作为唯一的 `gameVersion` 数据源：
- App.tsx 管理 `gameVersion` state
- 通过 props 传递给 Toolbar 和 SettingsPanel
- Toolbar 和 SettingsPanel 不再维护自己的本地 gameVersion state
- 提供 `onRefreshGameVersion` 回调让子组件可以触发刷新
- 切换 mod 路径时自动检测版本，并同步到设置面板

#### DownloadQueue 增强
- 添加 `pendingQueue` prop 显示待下载列表
- 添加 `selectedForDelete`, `onToggleSelectForDelete`, `onSelectAllForDelete`, `onRequestDelete` 用于删除功能
- 添加 `onClearCompleted` 和 `onClearAll` 回调 props（修复了 clear 按钮不工作的问题！）

#### 循环依赖避免
使用 useRef 来避免 useCallback 中的循环依赖：
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

### 开发注意事项 (纯 Vibe Coding)

⚠️ **SteamCMD 路径有空格?** → `spawn()` 自动处理，不用引号

⚠️ **文件移动?** → 用 ModProcessor 的原子操作，不要直接 fs.rename

⚠️ **IPC 监听器?** → 一定要在 useEffect 返回 unsubscribe

⚠️ **configManager.set?** → 只能设置顶级键 (如 'rimworld'，不能 'rimworld.currentVersion')

⚠️ **SteamCMD 事件监听器?** → 用 try/finally 保证 off() 被调用

⚠️ **Webview 导航?** → 监听 did-navigate-in-page (Steam 是 SPA!)

⚠️ **不要注入脚本到 Steam 页面!** → 下载按钮在应用工具栏，不在页面里

### Vite 配置注意事项

**文件**: `electron.vite.config.ts`

有一个 polyfill 注入到 main process 顶部，给 axios/undici 用：
- File API polyfill
- FormData API polyfill

**不要删除这个！** 否则 axios 会在 main process 报错。

### 配色方案 (Steam 风格)

| 用途 | 颜色值 |
|------|--------|
| 主背景 | `#1b2838` |
| 次背景 | `#171a21` |
| 卡片背景 | `#243447` |
| 边框 | `#2a475e` |
| 主色 (Steam 蓝) | `#66c0f4` |
| 成功 | `#4CAF50` |
| 警告 | `#e6b800` |
| 错误 | `#f44336` |
| 文本 | `#c6d4df` |
| 次要文本 | `#8f98a0` |

### 路径别名

```json
{
  "@renderer/*": "src/renderer/src/*",
  "@main/*": "src/main/*",
  "@preload/*": "src/preload/*",
  "@shared/*": "src/shared/*"
}
```

## 剩余问题 (未修复 - 低优先级

以下问题暂时保留，因为不影响核心功能且代码还在开发阶段:

1. **批量下载代码重复** - `mod:download` 和 `downloadSingleMod()` 有重复逻辑
2. **About.xml 用正则解析** - `fast-xml-parser` 已安装但未用
3. **未使用的依赖** - `zustand` 已安装但未用 (用的 React useState)
4. **硬编码的超时** - SteamCMD 5分钟超时应该放配置中
5. **Console.log 过多** - 生产环境可能需要日志系统
6. **WorkshopScraper 禁用 SSL 验证** - `rejectUnauthorized: false` (有安全风险)

## Phase 4 Git 集成提示

GitManager 已经写好了 (`src/main/services/GitManager.ts`)，但没集成。

需要做的：
1. 在 ipcHandlers.ts 注册 git:init, git:commit, git:push, git:status
2. 在 preload/index.ts 暴露 API
3. 在 SettingsPanel.tsx 添加 Git 设置 UI
4. 在下载完成后自动提交 (ipcHandlers.ts 中)
5. 在 Toolbar 显示 Git 状态

详细的集成指南可以看 GitManager.ts 的代码，它已经完整实现了。

## 故障排除

### Dev Server 不启动
- 检查端口 5173 是否被占用
- 清除 electron-vite 缓存: 删除 `node_modules/.electron-vite`

### Steam Workshop Webview 不加载
- 检查网络连接
- 确认 webview 有 `partition="persist:steam"`
- 看 DevTools Console 有没有 CSP 错误

### 下载按钮不工作
**注意:** 下载按钮在应用工具栏，**不是**注入到 Steam 页面里！

检查：
1. Toolbar 是否收到 currentPageInfo？看 console 有没有 "[App] Page changed:"
2. currentPageInfo.isModDetailPage 是否为 true？
3. handleDownloadClick 是否调用 window.api.downloadMod？

### SteamCMD 下载失败
- 确认 steamcmd.exe 存在于配置的路径
- 检查 Windows Defender/杀毒软件没屏蔽 SteamCMD
- 确认磁盘空间足够
- 看 console 有没有 "[SteamCMD]" 错误

### 文件移动失败
- 确认 Mods 文件夹存在且可写
- 检查杀毒软件没屏蔽文件操作
- 确认磁盘空间足够
- 确认没有文件锁 (关闭 RimWorld!)
- 看 console 有没有 "[ModProcessor]" 错误

### 进度不显示
- 确认 App.tsx 里设置了 window.api.onDownloadProgress
- 确认 ipcHandlers.ts 里注册了 steamCMD.on('progress', ...)
- 确认 mainWindow.webContents.send() 被调用
- 看 DevTools Network tab 有没有 IPC 消息

### 配置更改不生效
- 确认设置了正确的顶级键 (如 'rimworld' 而不是 'rimworld.currentVersion')
- SteamCMD 现在会在每次下载时重新读取配置，不需要重启应用

### 版本不匹配对话框不显示
- 确认 `version.onMismatch` 设置为 'ask'
- 确认 `download.skipVersionCheck` 为 false
- 确认 Mod 页面能正确解析到支持版本

### Clear 按钮不工作
- DownloadQueue 现在使用 `onClearCompleted` 和 `onClearAll` 回调 props
- 这些回调必须由 App.tsx 提供并传入
- 不要依赖 DownloadQueue 内部的 setDownloads 来处理外部 downloads state

### 版本检测不同步
- 确认 App.tsx 是唯一的 gameVersion 数据源
- Toolbar 和 SettingsPanel 通过 props 接收 gameVersion
- 使用 onRefreshGameVersion 回调来触发刷新
- 切换 mod 路径时会自动检测并同步更新

## Preload API (window.api)

```typescript
window.api = {
  // 配置
  getConfig: (key?: string) => Promise<any>
  setConfig: (key: string, value: any) => Promise<void>

  // 版本检测
  detectGameVersion: () => Promise<string>

  // Mod 操作
  checkModVersion: (modId: string) => Promise<ModVersionInfo>
  downloadMod: (id: string, isCollection: boolean) => Promise<ModMetadata>
  downloadBatch: (items: Item[]) => Promise<ModMetadata[]>
  checkDependencies: (id: string) => Promise<Dependency[]>

  // 对话框
  selectFolder: () => Promise<string | null>

  // 事件监听器 (返回取消订阅函数!)
  onDownloadProgress: (callback) => (() => void)
  onDownloadComplete: (callback) => (() => void)
  onDownloadError: (callback) => (() => void)
  onBatchProgress: (callback) => (() => void)
}
```

## Git 仓库

**Repository:** https://github.com/czyczy23/Rimworld_Mod_Downloader

提交代码时：
1. `git status` / `git diff` 看看改了啥
2. 写清晰的 commit message
3. push 到 remote

---

**好了，继续 Vibe Coding！🚀**
