# RimWorld 模組下載器

[English](./README_en.md) | [简体中文](./README_zh-CN.md) | [繁體中文](./README_zh-TW.md)

---

## 描述

一個用於從 Steam Workshop 下載和管理 RimWorld 模組的 Electron 桌面應用程序。

> **提醒**:本項目完全使用**Vibe Coding**進行編寫，可能會帶來不穩定的bug。

## 功能特性

- 內置 Steam Workshop 瀏覽器，可直接瀏覽和下載模組
- 自動檢測 RimWorld 遊戲版本
- 模組版本相容性檢查
- 自動檢測並下載依賴項
- 待下載佇列功能，支援批量下載
- 多個模組資料夾路徑管理
- 即時下載進度顯示
- Steam 風格的使用者介面

## 技術棧

| 分類 | 技術 |
|------|------|
| 框架 | Electron 28.1.3 |
| 構建工具 | electron-vite 2.0.0 |
| UI | React 18.2.0 + TypeScript 5.3.3 |
| 樣式 | Tailwind CSS 3.4.1 |
| 設定管理 | electron-store 8.1.0 |
| HTTP 請求 | axios 1.13.5 |
| HTML 解析 | cheerio 1.2.0 |

## 安裝

### 前置要求

- Windows 10/11
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) (用於下載 Steam Workshop 內容)
- RimWorld (可選，用於自動檢測版本)

### 從 Release 安裝

1. 前往 [Releases](../../releases) 頁面
2. 下載最新版本的.zip文件 (`RimWorld-Mod-Downloade-x.x.x.zip`)
3. 運行`RimWorld Mod Downloader.exe`

### 從原始碼構建

```bash
# 克隆倉庫
git clone https://github.com/czyczy23/Rimworld_Mod_Downloader.git
cd Rimworld_Mod_Downloader

# 安裝依賴
npm install

# 開發模式運行
npm run dev

# 類型檢查
npm run typecheck

# 構建
npm run build

# 打包 Windows 版本
npm run build:win
```

## 使用說明

### 首次啟動向導

首次啟動時會自動顯示歡迎向導，引導您完成基礎配置：

#### 步驟 1: 歡迎使用
- 了解應用的主要功能特性

#### 步驟 2: 配置 SteamCMD
- 選擇 `steamcmd.exe` 的位置
- 如果沒有安裝 SteamCMD，請先[下載安裝](https://developer.valvesoftware.com/wiki/SteamCMD)

#### 步驟 3: 配置下載路徑
- 系統會根據 SteamCMD 位置**自動推導**下載路徑
- 格式：`steamcmd根目錄\steamapps\workshop\content\294100`
- `294100` 是 RimWorld 的 Steam AppID
- **程式會自動創建該目錄**，無需手動創建

#### 步驟 4: 配置 Mods 資料夾
- **使用預設路徑**：自動添加 RimWorld 預設 Mods 資料夾
- **自訂路徑**：手動選擇其他位置作為 Mods 資料夾
- 支援添加**多個路徑**，點擊 ★ 設定預設路徑

#### 步驟 5: 完成
- 查看設定摘要，確認無誤後點擊"開始使用"

### 管理 Mods 路徑

#### 方式 1: 工具列快速切換
1. 點擊工具列中的 **Mods Path** 下拉框
2. 選擇已添加的路徑，或點擊 **Browse** 添加新路徑

#### 方式 2: 設定面板完整管理
1. 點擊右上角的 ⚙️ **設定** 按鈕
2. 找到 **📁 Mods 資料夾管理** 區域
3. 您可以進行以下操作：
   - **★/☆ 點擊星標**：設定預設路徑（下載時預設使用此路徑）
   - **✎ 編輯**：點擊編輯按鈕修改路徑名稱，支援 Enter 儲存、ESC 取消
   - **× 刪除**：移除不需要的路徑
   - **🏠 使用預設路徑**：快速添加 RimWorld 預設 Mods 資料夾
   - **📂 自訂路徑**：手動選擇其他位置
4. 點擊 **儲存設定** 應用更改

### 下載模組

1. 在應用內的瀏覽器中導航到 Steam Workshop 模組頁面
2. 應用會自動檢測模組資訊：
   - 模組 ID
   - 支援的遊戲版本
   - 依賴項數量
3. 點擊 "Download" 立即下載，或點擊 "Add" 添加到待下載佇列
4. 如果有依賴項，會提示是否一併下載
5. 如果模組版本不相容，會顯示警告

### 待下載佇列

1. 瀏覽多個模組頁面，點擊 "Add" 將它們添加到佇列
2. 點擊下載佇列區域查看所有待下載的模組
3. 可以選擇不需要的模組並刪除
4. 點擊 "Download All" 開始批量下載

### 設定選項

| 選項 | 說明 |
|------|------|
| SteamCMD Executable Path | SteamCMD 可執行檔路徑 |
| SteamCMD Download Path | SteamCMD 下載暫存目錄 |
| Mods Paths | RimWorld 模組資料夾列表 |
| Auto Detect Game Version | 自動從 RimWorld 安裝目錄檢測版本 |
| Skip Version Check | 跳過模組版本相容性檢查 |
| On Version Mismatch | 版本不相容時的行為：詢問/強制下載/跳過 |
| Dependency Mode | 依賴項處理方式：詢問/自動下載/忽略 |

## 專案結構

```
src/
├── main/                    # 主程序 (Node.js)
│   ├── index.ts            # 視窗創建、應用入口
│   ├── ipcHandlers.ts      # IPC 路由註冊
│   ├── services/
│   │   ├── SteamCMD.ts     # SteamCMD 進程包裝器
│   │   ├── ModProcessor.ts # 檔案操作 + About.xml 驗證
│   │   └── WorkshopScraper.ts # Steam 網頁抓取
│   └── utils/
│       └── ConfigManager.ts # 設定管理
├── preload/
│   └── index.ts             # ContextBridge API 定義
├── renderer/                # 渲染程序 (React)
│   └── src/
│       ├── App.tsx          # 主應用
│       └── components/
│           ├── WebviewContainer.tsx    # Steam Workshop 瀏覽器
│           ├── Toolbar.tsx              # 工具列
│           ├── DownloadQueue.tsx        # 下載佇列
│           ├── SettingsPanel.tsx        # 設定面板
│           ├── DependencyDialog.tsx     # 依賴項選擇對話框
│           ├── VersionMismatchDialog.tsx # 版本不相容警告
│           ├── PendingQueueDialog.tsx   # 待下載佇列對話框
│           └── DeleteConfirmDialog.tsx  # 刪除確認對話框
└── shared/
    └── types.ts             # 共享類型定義
```

## 故障排除

### 網路環境問題

如果您在使用應用時遇到以下問題：
- Steam Workshop 頁面載入失敗或空白
- 下載速度為 0 或下載失敗
- 提示網路連線錯誤

**推薦使用 [Watt Toolkit (Steam++)](https://steampp.net/) 加速器**

Watt Toolkit 是免費開源的 Steam 加速工具，可有效解決 Steam 創意工坊存取問題。

**注意**：使用其他加速器（如 UU 加速器、雷神加速器等）時，可能會出現：
- 創意工坊頁面無法載入
- 下載速度為 0
- 下載卡在 "Downloading" 狀態

這是因為部分加速器僅加速遊戲流量，不加速 Steam Web 頁面或 SteamCMD。建議遇到此類問題時切換到 **Watt Toolkit**。

### SteamCMD 下載失敗

- 確認 `steamcmd.exe` 存在於設定的路徑中
- 檢查 Windows Defender/防毒軟體是否阻止了 SteamCMD
- 確認有足夠的磁碟空間

### 檔案移動失敗 / 權限錯誤

- 確認 Mods 資料夾存在且可寫入
- 檢查防毒軟體是否阻止了檔案操作
- 確認沒有檔案被鎖定（關閉 RimWorld！）
- **以系統管理員身份運行程式**（某些系統需要管理員權限才能寫入 Mods 資料夾）

### 下載按鈕不工作

- 確認您在 Steam Workshop 模組詳情頁面
- 檢查主控台是否有錯誤資訊

### 版本檢測不工作

- 確認 Mods 資料夾的父目錄是 RimWorld 安裝目錄
- 確認 `Version.txt` 檔案存在

## 許可證

MIT License

## 貢獻

歡迎提交 Issue 和 Pull Request！
