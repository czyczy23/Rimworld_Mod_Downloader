<div align="center">

# RimWorld 模組下載器

一個用於瀏覽和下載 Steam Workshop RimWorld 模組的 Electron 桌面應用程式，支援版本檢查、依賴解析和批次下載。

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#安裝)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) | [簡體中文](./README_zh-CN.md) | **繁體中文**

</div>

---

> **說明：** 本專案使用 AI 輔助程式設計建置。歡迎透過 Issues 和安全回報管道回報問題。

## 功能

- **內建 Steam Workshop 瀏覽器** - 不需離開應用程式即可瀏覽和下載模組。
- **自動遊戲版本偵測** - 從 RimWorld 安裝目錄讀取 `Version.txt`。
- **版本相容性檢查** - 下載前檢查模組是否支援目前遊戲版本。
- **依賴解析** - 自動識別模組依賴，並在下載前向使用者確認。
- **下載佇列** - 可將多個模組加入佇列後批次下載。
- **多個 Mods 資料夾管理** - 管理多個目標目錄並切換預設下載位置。
- **即時進度** - 顯示 SteamCMD 下載進度。
- **自動更新** - 透過 GitHub Releases 檢查新版本。
- **Steam 風格介面** - 瀏覽體驗接近 Steam 用戶端。

## 截圖

| 主介面                                     | 模組詳情                                      |
| ------------------------------------------ | --------------------------------------------- |
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| 下載佇列                                         | 設定面板                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## 安裝

### 前置需求

- Windows 10/11，64 位元
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)，用於下載 Steam Workshop 內容
- RimWorld，可選，但建議安裝以便自動偵測版本

### 從 Release 安裝

1. 開啟 [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) 頁面。
2. 下載最新安裝包：
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe`：NSIS 安裝器。
   - `RimWorld-Mod-Downloader-x.x.x.msi`：MSI 安裝器。
3. 執行安裝器並依照提示完成安裝。

> **關於 SmartScreen 提示：** 本機安裝包預設不簽章，發布流程可明確啟用程式碼簽章。未簽章建置在 Windows 首次執行時可能顯示 SmartScreen 警告。確認來源可信後，可點選 **更多資訊** 再點選 **仍要執行**。詳情見 [SECURITY.md](./SECURITY.md#code-signing)。
>
> v1.2.0 起安裝器採用目前使用者安裝模式，不需要系統管理員權限。

## 快速開始

1. 安裝 [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)，並記錄 `steamcmd.exe` 路徑。
2. 啟動 RimWorld Mod Downloader。首次執行會顯示歡迎精靈。
3. 設定：
   - **SteamCMD 路徑** - 選擇 `steamcmd.exe`。
   - **下載路徑** - 通常是 `steamcmd-root\steamapps\workshop\content\294100`。
   - **Mods 資料夾** - 使用自動偵測目錄，或選擇自訂 RimWorld Mods 資料夾。
4. 在內建瀏覽器中開啟 Steam Workshop 模組詳情頁。
5. 點選 **下載** 立即下載，或點選 **新增** 加入佇列後批次下載。

## 技術棧

| 類別        | 技術                            |
| ----------- | ------------------------------- |
| 框架        | Electron, React, TypeScript     |
| 建置        | electron-vite, electron-builder |
| 樣式        | Tailwind CSS                    |
| 測試        | Vitest, Playwright              |
| 日誌        | electron-log                    |
| 設定        | electron-store                  |
| HTTP 與解析 | axios, cheerio                  |
| CI/CD       | GitHub Actions                  |

## 開發

### 環境需求

- Node.js 22.13+
- npm 10+

### 常用命令

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 本機完整品質門檻：lint、型別檢查、單元測試、正式建置
npm run verify

# 單元測試
npm run test:unit

# 覆蓋率報告
npm run test:coverage

# 瀏覽器端流程驗證
npm run test:e2e

# 原生 Electron 流程驗證
npm run test:e2e:electron

# 本機更新中繼資料驗證
npm run smoke:release:update

# 真實 SteamCMD 下載流程驗證（需要明確提供本機路徑）
npm run smoke:release:download -- --steamcmd-exe <path> --steamcmd-download-path <path> --mods-path <path> --mod-id <id>

# 打包 Windows 安裝器
npm run build:win
```

更多開發流程、提交規範和分支策略見 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 安全

本專案遵循 Electron 安全實務：啟用上下文隔離、停用渲染進程中的 Node.js 整合、限制 Steam URL、使用系統鑰匙圈加密敏感設定，並對 IPC 輸入做執行期驗證。

安全架構和漏洞回報流程見 [SECURITY.md](./SECURITY.md)。

## 測試

推薦本機門檻：

```bash
npm run verify
```

CI 會額外執行覆蓋率、瀏覽器 Playwright 流程驗證、原生 Electron 流程驗證、依賴審計和 Windows 發布打包。目前覆蓋率基線和產物目錄見 [TESTING.md](./TESTING.md)。

## 路線圖

- [x] Windows NSIS 和 MSI 安裝器
- [x] 透過 GitHub Releases 自動更新
- [x] 安全加固：safeStorage 加密、URL 白名單、IPC 驗證
- [x] 單元測試覆蓋率和全 `src` 覆蓋率報告
- [x] 瀏覽器和原生 Electron 流程驗證
- [x] 可選真實 SteamCMD 下載和更新中繼資料驗證命令
- [ ] macOS / Linux 支援
- [ ] Git 同步功能（`git:init`、`git:commit`）
- [ ] 模組版本解析（`mod:resolveVersion`）

## 貢獻

歡迎提交 Issues 和 Pull Requests。貢獻前請先閱讀 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 更新日誌

版本歷史見 [CHANGELOG.md](./CHANGELOG.md)。

## 授權

[MIT License](./LICENSE) (c) 2026 czyczy23

## 免責聲明

本工具僅用於學習和個人使用。請遵守 [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) 以及 RimWorld 模組授權條款。模組版權歸各自作者所有。
