# Release v1.0.0

## 新功能

- 内置 Steam Workshop 浏览器，可直接浏览和下载模组
- 自动检测 RimWorld 游戏版本
- 模组版本兼容性检查
- 自动检测并下载依赖项
- 待下载队列功能，支持批量下载
- 多个模组文件夹路径管理
- 实时下载进度显示
- Steam 风格的用户界面

## 技术栈

- Electron 28.1.3
- React 18.2.0 + TypeScript 5.3.3
- Tailwind CSS 3.4.1
- electron-vite 2.0.0

## 安装说明

### 前置要求

- Windows 10/11
- [SteamCMD](https://developer.valvesoftware.com/wiki/SteamCMD) (用于下载 Steam Workshop 内容)

### 安装步骤

1. 下载 `RimWorld-Mod-Downloader-1.0.0-portable.exe`
2. 运行可执行文件
3. 首次启动后，打开设置面板配置：
   - SteamCMD 路径
   - RimWorld Mods 文件夹路径
4. 开始下载模组！

## 使用说明

详细使用说明请参考 [README.md](https://github.com/czyczy23/Rimworld_Mod_Downloader/blob/main/README.md)

## 已知问题

- 代码签名未配置，Windows SmartScreen 可能会警告
- 需要手动安装 SteamCMD

## 计划功能

- [ ] 自动安装 SteamCMD
- [ ] 代码签名
- [ ] 自动更新
- [ ] Linux 和 macOS 支持
- [ ] 模组管理（启用/禁用、排序）
