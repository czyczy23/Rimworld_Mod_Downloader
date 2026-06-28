<div align="center">

# RimWorld 模组下载器

一个用于浏览和下载 Steam Workshop RimWorld 模组的 Electron 桌面应用，支持版本检查、依赖解析和批量下载。

[![Release](https://img.shields.io/github/v/release/czyczy23/Rimworld_Mod_Downloader?style=flat-square&label=Release)](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases)
[![License: MIT](https://img.shields.io/github/license/czyczy23/Rimworld_Mod_Downloader?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/release.yml?branch=main&label=Release%20CI&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/release.yml)
[![Tests](https://img.shields.io/github/actions/workflow/status/czyczy23/Rimworld_Mod_Downloader/test.yml?branch=main&label=Tests&style=flat-square)](https://github.com/czyczy23/Rimworld_Mod_Downloader/actions/workflows/test.yml)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#安装)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](./CONTRIBUTING.md)

[English](./README.md) | **简体中文** | [繁体中文](./README_zh-TW.md)

</div>

---

> **说明：** 本项目使用 AI 辅助编程构建。欢迎通过 Issues 和安全报告渠道反馈问题。

## 功能

- **内置 Steam Workshop 浏览器** - 无需离开应用即可浏览和下载模组。
- **自动游戏版本检测** - 从 RimWorld 安装目录读取 `Version.txt`。
- **版本兼容性检查** - 下载前检查模组是否支持当前游戏版本。
- **依赖解析** - 自动识别模组依赖，并在下载前向用户确认。
- **下载队列** - 可将多个模组加入队列后批量下载。
- **多 Mods 文件夹管理** - 管理多个目标目录并切换默认下载位置。
- **实时进度** - 显示 SteamCMD 下载进度。
- **自动更新** - 通过 GitHub Releases 检查新版本。
- **Steam 风格界面** - 浏览体验接近 Steam 客户端。

## 截图

| 主界面                                     | 模组详情                                      |
| ------------------------------------------ | --------------------------------------------- |
| <img src="assets/main-ui.png" width="400"> | <img src="assets/mod-detail.png" width="400"> |

| 下载队列                                         | 设置面板                                          |
| ------------------------------------------------ | ------------------------------------------------- |
| <img src="assets/pending-queue.png" width="400"> | <img src="assets/settings-panel.png" width="400"> |

## 安装

### 前置要求

- Windows 10/11，64 位
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)，用于下载 Steam Workshop 内容
- RimWorld，可选，但建议安装以便自动检测版本

### 从 Release 安装

1. 打开 [Releases](https://github.com/czyczy23/Rimworld_Mod_Downloader/releases) 页面。
2. 下载最新安装包：
   - `RimWorld-Mod-Downloader-x.x.x-setup.exe`：NSIS 安装器。
   - `RimWorld-Mod-Downloader-x.x.x.msi`：MSI 安装器。
3. 运行安装器并按提示完成安装。

> **关于 SmartScreen 提示：** 本地安装包默认不签名，发布流程可显式启用代码签名。未签名构建在 Windows 首次运行时可能显示 SmartScreen 警告。确认来源可信后，可点击 **更多信息** 再点击 **仍要运行**。详情见 [SECURITY.md](./SECURITY.md#code-signing)。
>
> v1.2.0 起安装器采用当前用户安装模式，不需要管理员权限。

## 快速开始

1. 安装 [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD)，并记录 `steamcmd.exe` 路径。
2. 启动 RimWorld Mod Downloader。首次运行会显示欢迎向导。
3. 配置：
   - **SteamCMD 路径** - 选择 `steamcmd.exe`。
   - **下载路径** - 通常是 `steamcmd-root\steamapps\workshop\content\294100`。
   - **Mods 文件夹** - 使用自动检测目录，或选择自定义 RimWorld Mods 文件夹。
4. 在内置浏览器中打开 Steam Workshop 模组详情页。
5. 点击 **下载** 立即下载，或点击 **添加** 加入队列后批量下载。

## 技术栈

| 类别        | 技术                            |
| ----------- | ------------------------------- |
| 框架        | Electron, React, TypeScript     |
| 构建        | electron-vite, electron-builder |
| 样式        | Tailwind CSS                    |
| 测试        | Vitest, Playwright              |
| 日志        | electron-log                    |
| 配置        | electron-store                  |
| HTTP 与解析 | axios, cheerio                  |
| CI/CD       | GitHub Actions                  |

## 开发

### 环境要求

- Node.js 22.13+
- npm 10+

### 常用命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 本地完整质量门禁：lint、类型检查、单元测试、生产构建
npm run verify

# 单元测试
npm run test:unit

# 覆盖率报告
npm run test:coverage

# 浏览器端冒烟测试
npm run test:e2e

# 原生 Electron 冒烟测试
npm run test:e2e:electron

# 本地更新元数据冒烟测试
npm run smoke:release:update

# 真实 SteamCMD 下载冒烟测试（需要显式提供本机路径）
npm run smoke:release:download -- --steamcmd-exe <path> --steamcmd-download-path <path> --mods-path <path> --mod-id <id>

# 打包 Windows 安装器
npm run build:win
```

更多开发流程、提交规范和分支策略见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 安全

本项目遵循 Electron 安全实践：启用 context isolation、禁用 renderer Node integration、限制 Steam URL、使用 OS keychain 加密敏感配置，并对 IPC 输入做运行时校验。

安全架构和漏洞报告流程见 [SECURITY.md](./SECURITY.md)。

## 测试

推荐本地门禁：

```bash
npm run verify
```

CI 会额外运行覆盖率、浏览器 Playwright 冒烟测试、原生 Electron 冒烟测试、依赖审计和 Windows 发布打包。当前覆盖率基线和产物目录见 [TESTING.md](./TESTING.md)。

## 路线图

- [x] Windows NSIS 和 MSI 安装器
- [x] 通过 GitHub Releases 自动更新
- [x] 安全加固：safeStorage 加密、URL 白名单、IPC 校验
- [x] 单元测试覆盖率和全 `src` 覆盖率报告
- [x] 浏览器和原生 Electron 冒烟测试
- [x] 可选真实 SteamCMD 下载和更新元数据冒烟命令
- [ ] macOS / Linux 支持
- [ ] Git 同步功能（`git:init`、`git:commit`）
- [ ] 模组版本解析（`mod:resolveVersion`）

## 贡献

欢迎提交 Issues 和 Pull Requests。贡献前请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 更新日志

版本历史见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

[MIT License](./LICENSE) (c) 2026 czyczy23

## 免责声明

本工具仅用于学习和个人使用。请遵守 [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/) 以及 RimWorld 模组许可协议。模组版权归各自作者所有。
