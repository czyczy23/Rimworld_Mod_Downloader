# 构建说明

## 前置要求

- Windows 10/11
- Node.js 18+
- npm 或 yarn

## 开发模式

```bash
npm install
npm run dev
```

## 类型检查

```bash
npm run typecheck
```

## 构建（不打包）

```bash
npm run build
```

构建输出在 `out/` 目录。

## 打包为可执行文件

由于 electron-builder 在某些 Windows 环境下可能会遇到符号链接权限问题，建议以下方法：

### 方法 1：使用管理员权限（推荐）

1. 以管理员身份打开 PowerShell 或命令提示符
2. 运行：
   ```bash
   npm run build:win
   ```

### 方法 2：禁用代码签名

如果只需要内部使用，可以禁用代码签名：

```bash
# PowerShell
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build:win

# CMD
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:win
```

### 方法 3：清理缓存后重试

```bash
# 清理 electron-builder 缓存
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache"
npm run build:win
```

## 打包输出

成功打包后，文件将输出到：
- `release/[版本号]/RimWorld-Mod-Downloader-[版本号]-portable.exe` - 便携版

## 故障排除

### 符号链接错误

如果看到 `Cannot create symbolic link` 错误：
1. 以管理员身份运行终端
2. 或启用 Windows 开发人员模式：设置 -> 更新和安全 -> 开发者选项 -> 开发人员模式

### 下载 winCodeSign 失败

如果下载 winCodeSign 工具失败：
1. 检查网络连接
2. 配置代理（如果需要）
3. 或使用 `--publish never` 参数跳过发布相关步骤

## GitHub Release 发布步骤

1. 构建可执行文件
2. 在 GitHub 创建新 Release
3. 上传生成的 .exe 文件
4. 编写发布说明，包括：
   - 版本号
   - 新功能
   - 修复的 bug
   - 安装说明
