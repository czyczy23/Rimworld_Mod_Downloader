<div align="center">

# RimWorld 模组下载器

从 Steam Workshop 浏览和下载 RimWorld 模组的 Electron 桌面应用 —— 支持版本检查、依赖解析和批量下载。

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#安装)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) · **简体中文** · [繁體中文](./README_zh-TW.md)

</div>

---

> **⚠️ 项目说明**：本项目完全使用 **Vibe Coding**（AI 辅助编程）编写，可能存在不稳定的问题。欢迎在 [Issues](https://github.com/czyczy23/Rimworld_Mod_Downloader/issues) 反馈 bug。

## 功能特性

- 🌐 **内置 Steam Workshop 浏览器** — 应用内直接浏览和下载模组，无需打开浏览器
- 🎮 **自动检测游戏版本** — 从 RimWorld 安装目录读取 `Version.txt`
- ✅ **模组版本兼容性检查** — 下载前校验模组支持的游戏版本
- 🔗 **依赖项自动检测与下载** — 发现模组依赖并提示一并下载
- 📋 **待下载队列** — 浏览多个模组后批量下载
- 📁 **多 Mods 路径管理** — 支持添加多个模组文件夹，一键切换默认路径
- 📊 **实时下载进度** — SteamCMD 下载进度实时显示
- 🔄 **自动更新** — 应用启动后自动检查 GitHub Releases 新版本
- 🎨 **Steam 风格界面** — 与 Steam 客户端视觉一致的体验

## 截图

| 主界面 | Mod 详情 |
|--------|----------|
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| 下载队列 | 设置面板 |
|----------|----------|
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## 安装

### 前置要求

- **Windows 10/11**（64 位）
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) — 用于下载 Steam Workshop 内容
- RimWorld（可选，用于自动检测游戏版本）

### 从 Release 安装（推荐）

1. 前往 [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) 页面
2. 下载最新版本的安装程序：
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe`（NSIS 安装版，推荐）
   - `RimWorld-Mod-Downloader-x.x.x.msi`（MSI 安装版）
3. 运行安装程序，按提示完成安装

> **关于 SmartScreen 警告**：安装程序目前未经代码签名，Windows 首次运行时会显示 SmartScreen 警告。
> 点击 **"更多信息"** → **"仍要运行"** 即可。
> 这是开源项目的常见限制，详见 [SECURITY.md](./SECURITY.md#code-signing)。
>
> v1.2.0 起安装程序改为 **perUser 模式**，无需管理员权限，不会触发 UAC 提示。

## 快速开始

1. 安装 [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) 并记住安装路径
2. 启动 RimWorld Mod Downloader，首次运行会显示欢迎向导
3. 在向导中配置：
   - **SteamCMD 路径** — 选择 `steamcmd.exe` 的位置
   - **下载路径** — 自动推导为 `steamcmd根目录\steamapps\workshop\content\294100`
   - **Mods 文件夹** — 使用默认路径或自定义
4. 在应用内浏览器中导航到 Steam Workshop 模组页面
5. 点击 **Download** 立即下载，或 **Add** 加入队列批量下载

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Electron + React + TypeScript |
| 构建 | electron-vite, electron-builder |
| 样式 | Tailwind CSS |
| 测试 | Vitest（单元）, Playwright（E2E） |
| 日志 | electron-log |
| 配置 | electron-store |
| HTTP / 解析 | axios + cheerio |
| CI/CD | GitHub Actions |

## 项目结构

```
src/
├── main/                          # 主进程 (Node.js)
│   ├── index.ts                   # 窗口创建、应用入口
│   ├── ipcHandlers.ts             # IPC 路由 + 输入校验
│   ├── polyfills.ts               # File/FormData polyfill
│   ├── services/
│   │   ├── SteamCMD.ts            # SteamCMD 进程包装 + 纯函数
│   │   ├── ModProcessor.ts        # 文件操作 + About.xml 验证
│   │   └── WorkshopScraper.ts     # Steam 网页抓取
│   └── utils/
│       ├── ConfigManager.ts       # 配置管理 + 加密迁移
│       ├── SecureStorage.ts       # OS keychain 凭据加密
│       ├── AutoUpdater.ts         # 自动更新管理
│       └── logger.ts              # electron-log 封装
├── preload/
│   └── index.ts                   # ContextBridge API（仅暴露类型化 api）
├── renderer/                      # 渲染进程 (React)
│   └── src/
│       ├── App.tsx                # 主应用
│       ├── i18n/                  # 国际化 (en/zh-CN/zh-TW)
│       ├── utils/
│       │   ├── urlGuard.ts        # Webview URL 白名单
│       │   ├── url.ts             # URL 工具函数
│       │   └── language.ts        # Steam 语言参数映射
│       └── components/            # UI 组件
├── shared/
│   ├── types.ts                   # 共享类型
│   ├── configSchema.ts            # IPC 配置运行时校验
│   ├── constants.ts               # 全局常量
│   └── api.ts                     # Renderer API 契约
└── __tests__/                     # 单元测试 (92 tests)
```

## 开发

### 环境要求

- Node.js 20+
- npm

### 常用命令

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 完整质量检查（lint + typecheck + test + build）
npm run verify

# 仅单元测试
npm run test:unit

# 覆盖率报告
npm run test:coverage

# E2E 测试（需先 npm run test:e2e:install）
npm run test:e2e

# 打包 Windows 安装程序
npm run build:win
```

完整开发指南、提交规范、分支策略见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

### 安全

本项目遵循 Electron 安全最佳实践（context isolation、URL 白名单、OS keychain 加密、IPC 输入校验）。
安全架构与漏洞报告流程见 [SECURITY.md](./SECURITY.md)。

## 故障排除

<details>
<summary><b>网络问题 / Steam Workshop 无法访问</b></summary>

如果你遇到 Steam Workshop 页面加载失败、下载速度为 0、下载卡住等问题：

**推荐使用 [Watt Toolkit (Steam++)](https://steampp.net/)** — 免费开源的 Steam 加速工具。

其他加速器（UU、雷神等）可能只加速游戏流量，不加速 Steam Web 页面或 SteamCMD，导致创意工坊无法访问。

</details>

<details>
<summary><b>SteamCMD 下载失败</b></summary>

- 确认 `steamcmd.exe` 存在于配置的路径中
- 检查 Windows Defender / 杀毒软件是否阻止了 SteamCMD
- 确认有足够的磁盘空间

</details>

<details>
<summary><b>文件移动失败 / 权限错误</b></summary>

- 确认 Mods 文件夹存在且可写
- 检查杀毒软件是否阻止了文件操作
- **关闭 RimWorld** — 运行中的游戏会锁定 Mods 文件夹
- v1.2.0 起无需管理员权限；若仍遇权限问题，检查文件夹 ACL

</details>

<details>
<summary><b>下载按钮不工作</b></summary>

- 确认你在 Steam Workshop **模组详情页面**（而非列表页）
- 按 `F12` 打开 DevTools 检查控制台错误

</details>

<details>
<summary><b>版本检测不工作</b></summary>

- 确认 Mods 文件夹的父目录是 RimWorld 安装目录
- 确认 RimWorld 安装目录下有 `Version.txt` 文件

</details>

## 路线图

- [x] Windows NSIS + MSI 安装包
- [x] 自动更新（GitHub Releases）
- [x] 安全加固（safeStorage 加密、URL 白名单、IPC 校验）
- [x] 单元测试覆盖（92 tests）
- [ ] macOS / Linux 支持
- [ ] Git 同步功能（`git:init` / `git:commit`）
- [ ] 模组版本解析（`mod:resolveVersion`）
- [ ] 代码签名

## 贡献

欢迎提交 Issue 和 Pull Request！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发流程和提交规范。

## 更新日志

所有版本变更记录见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

[MIT License](./LICENSE) © 2026 czyczy23

## 免责声明

本工具仅供学习和个人使用。请遵守 [Steam 服务条款](https://store.steampowered.com/subscriber_agreement/) 和 RimWorld 模组的许可协议。模组版权归各自的模组作者所有。
