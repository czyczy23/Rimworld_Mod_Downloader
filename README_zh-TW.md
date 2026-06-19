<div align="center">

# RimWorld 模組下載器

從 Steam Workshop 瀏覽和下載 RimWorld 模組的 Electron 桌面應用 —— 支援版本檢查、依賴解析和批次下載。

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#安裝)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) · [简体中文](./README_zh-CN.md) · **繁體中文**

</div>

---

> **⚠️ 專案說明**：本專案完全使用 **Vibe Coding**（AI 輔助編程）編寫，可能存在不穩定的問題。歡迎在 [Issues](https://github.com/czyczy23/Rimworld_Mod_Downloader/issues) 回報 bug。

## 功能特性

- 🌐 **內建 Steam Workshop 瀏覽器** — 應用內直接瀏覽和下載模組，無需開啟瀏覽器
- 🎮 **自動偵測遊戲版本** — 從 RimWorld 安裝目錄讀取 `Version.txt`
- ✅ **模組版本相容性檢查** — 下載前驗證模組支援的遊戲版本
- 🔗 **依賴項自動偵測與下載** — 發現模組依賴並提示一併下載
- 📋 **待下載佇列** — 瀏覽多個模組後批次下載
- 📁 **多 Mods 路徑管理** — 支援新增多個模組資料夾，一鍵切換預設路徑
- 📊 **即時下載進度** — SteamCMD 下載進度即時顯示
- 🔄 **自動更新** — 應用啟動後自動檢查 GitHub Releases 新版本
- 🎨 **Steam 風格介面** — 與 Steam 用戶端視覺一致的體驗

## 截圖

| 主介面 | Mod 詳情 |
|--------|----------|
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| 下載佇列 | 設定面板 |
|----------|----------|
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## 安裝

### 前置要求

- **Windows 10/11**（64 位元）
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) — 用於下載 Steam Workshop 內容
- RimWorld（選用，用於自動偵測遊戲版本）

### 從 Release 安裝（推薦）

1. 前往 [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) 頁面
2. 下載最新版本的安裝程式：
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe`（NSIS 安裝版，推薦）
   - `RimWorld-Mod-Downloader-x.x.x.msi`（MSI 安裝版）
3. 執行安裝程式，依提示完成安裝

> **關於 SmartScreen 警告**：安裝程式目前未經程式碼簽署，Windows 首次執行時會顯示 SmartScreen 警告。
> 點擊 **「其他資訊」** → **「仍要執行」** 即可。
> 這是開源專案的常見限制，詳見 [SECURITY.md](./SECURITY.md#code-signing)。
>
> v1.2.0 起安裝程式改為 **perUser 模式**，無需系統管理員權限，不會觸發 UAC 提示。

## 快速開始

1. 安裝 [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) 並記住安裝路徑
2. 啟動 RimWorld Mod Downloader，首次執行會顯示歡迎精靈
3. 在精靈中設定：
   - **SteamCMD 路徑** — 選擇 `steamcmd.exe` 的位置
   - **下載路徑** — 自動推導為 `steamcmd根目錄\steamapps\workshop\content\294100`
   - **Mods 資料夾** — 使用預設路徑或自訂
4. 在應用內瀏覽器中導航至 Steam Workshop 模組頁面
5. 點擊 **Download** 立即下載，或 **Add** 加入佇列批次下載

## 技術棧

| 分類 | 技術 |
|------|------|
| 框架 | Electron + React + TypeScript |
| 構建 | electron-vite, electron-builder |
| 樣式 | Tailwind CSS |
| 測試 | Vitest（單元）, Playwright（E2E） |
| 日誌 | electron-log |
| 設定 | electron-store |
| HTTP / 解析 | axios + cheerio |
| CI/CD | GitHub Actions |

## 專案結構

```
src/
├── main/                          # 主程序 (Node.js)
│   ├── index.ts                   # 視窗建立、應用入口
│   ├── ipcHandlers.ts             # IPC 路由 + 輸入驗證
│   ├── polyfills.ts               # File/FormData polyfill
│   ├── services/
│   │   ├── SteamCMD.ts            # SteamCMD 程序封裝 + 純函式
│   │   ├── ModProcessor.ts        # 檔案操作 + About.xml 驗證
│   │   └── WorkshopScraper.ts     # Steam 網頁擷取
│   └── utils/
│       ├── ConfigManager.ts       # 設定管理 + 加密遷移
│       ├── SecureStorage.ts       # OS keychain 憑證加密
│       ├── AutoUpdater.ts         # 自動更新管理
│       └── logger.ts              # electron-log 封裝
├── preload/
│   └── index.ts                   # ContextBridge API（僅暴露型別化 api）
├── renderer/                      # 渲染程序 (React)
│   └── src/
│       ├── App.tsx                # 主應用
│       ├── i18n/                  # 國際化 (en/zh-CN/zh-TW)
│       ├── utils/
│       │   ├── urlGuard.ts        # Webview URL 白名單
│       │   ├── url.ts             # URL 工具函式
│       │   └── language.ts        # Steam 語言參數對映
│       └── components/            # UI 元件
├── shared/
│   ├── types.ts                   # 共用型別
│   ├── configSchema.ts            # IPC 設定執行期驗證
│   ├── constants.ts               # 全域常數
│   └── api.ts                     # Renderer API 契約
└── __tests__/                     # 單元測試 (92 tests)
```

## 開發

### 環境要求

- Node.js 20+
- npm

### 常用指令

```bash
# 安裝依賴
npm install

# 開發模式（熱重載）
npm run dev

# 完整品質檢查（lint + typecheck + test + build）
npm run verify

# 僅單元測試
npm run test:unit

# 覆蓋率報告
npm run test:coverage

# E2E 測試（需先 npm run test:e2e:install）
npm run test:e2e

# 打包 Windows 安裝程式
npm run build:win
```

完整開發指南、提交規範、分支策略見 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 安全

本專案遵循 Electron 安全最佳實踐（context isolation、URL 白名單、OS keychain 加密、IPC 輸入驗證）。
安全架構與漏洞回報流程見 [SECURITY.md](./SECURITY.md)。

## 疑難排解

<details>
<summary><b>網路問題 / Steam Workshop 無法存取</b></summary>

如果你遇到 Steam Workshop 頁面載入失敗、下載速度為 0、下載卡住等問題：

**推薦使用 [Watt Toolkit (Steam++)](https://steampp.net/)** — 免費開源的 Steam 加速工具。

其他加速器（UU、雷神等）可能僅加速遊戲流量，不加速 Steam Web 頁面或 SteamCMD，導致創意工坊無法存取。

</details>

<details>
<summary><b>SteamCMD 下載失敗</b></summary>

- 確認 `steamcmd.exe` 存在於設定的路徑中
- 檢查 Windows Defender / 防毒軟體是否阻止了 SteamCMD
- 確認有足夠的磁碟空間

</details>

<details>
<summary><b>檔案移動失敗 / 權限錯誤</b></summary>

- 確認 Mods 資料夾存在且可寫入
- 檢查防毒軟體是否阻止了檔案操作
- **關閉 RimWorld** — 執行中的遊戲會鎖定 Mods 資料夾
- v1.2.0 起無需系統管理員權限；若仍遇權限問題，檢查資料夾 ACL

</details>

<details>
<summary><b>下載按鈕不作用</b></summary>

- 確認你在 Steam Workshop **模組詳情頁面**（而非列表頁）
- 按 `F12` 開啟 DevTools 檢查主控台錯誤

</details>

<details>
<summary><b>版本偵測不作用</b></summary>

- 確認 Mods 資料夾的父目錄是 RimWorld 安裝目錄
- 確認 RimWorld 安裝目錄下有 `Version.txt` 檔案

</details>

## 路線圖

- [x] Windows NSIS + MSI 安裝包
- [x] 自動更新（GitHub Releases）
- [x] 安全加固（safeStorage 加密、URL 白名單、IPC 驗證）
- [x] 單元測試覆蓋（92 tests）
- [ ] macOS / Linux 支援
- [ ] Git 同步功能（`git:init` / `git:commit`）
- [ ] 模組版本解析（`mod:resolveVersion`）
- [ ] 程式碼簽署

## 貢獻

歡迎提交 Issue 和 Pull Request！請先閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解開發流程和提交規範。

## 更新日誌

所有版本變更記錄見 [CHANGELOG.md](./CHANGELOG.md)。

## 授權條款

[MIT License](./LICENSE) © 2026 czyczy23

## 免責聲明

本工具僅供學習和個人使用。請遵守 [Steam 服務條款](https://store.steampowered.com/subscriber_agreement/) 和 RimWorld 模組的授權條款。模組版權歸各自的模組作者所有。
