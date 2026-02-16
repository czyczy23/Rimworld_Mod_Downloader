# 快速发布指南

## 已完成

- ✅ 构建成功完成
- ✅ 发布文件已创建：`release/1.0.0/RimWorld-Mod-Downloader-1.0.0-win64.zip` (229.53 MB)

## 下一步：发布到 GitHub

### 1. 推送代码到 GitHub

```bash
git push origin main
```

### 2. 创建 GitHub Release

1. 访问：https://github.com/czyczy23/Rimworld_Mod_Downloader/releases/new
2. 填写发布信息：
   - **Tag version**: `v1.0.0`
   - **Release title**: `RimWorld Mod Downloader v1.0.0`
   - **Describe this release**: 复制 `RELEASE_NOTES.md` 的内容
3. 上传附件：
   - 点击 "Attach binaries by dropping them here or selecting them."
   - 选择 `release/1.0.0/RimWorld-Mod-Downloader-1.0.0-win64.zip`
4. 点击 "Publish release"

### 3. （可选）创建 NSIS 安装程序

如果需要创建完整的安装程序（.exe），需要：

1. 以**管理员身份**打开 PowerShell
2. 运行：
   ```powershell
   cd C:\Users\czy233\Documents\Rimworld_Mod_Downloader
   npm run build:win
   ```

或者启用 Windows 开发人员模式：
- 设置 → 更新和安全 → 开发者选项 → 开发人员模式

## 发布文件说明

| 文件 | 说明 |
|------|------|
| `RimWorld-Mod-Downloader-1.0.0-win64.zip` | Windows 64位 便携版（推荐） |

## 验证发布

发布后，可以：
1. 下载 ZIP 文件
2. 解压并运行 `RimWorld Mod Downloader.exe`
3. 验证应用程序正常工作
