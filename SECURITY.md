# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.x   | Yes       |
| 1.1.x   | Yes       |
| < 1.1   | No        |

Update this table with each minor release so users know which branches receive security fixes.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **GitHub**: Use [Private Vulnerability Reporting](https://github.com/czyczy23/Rimworld_Mod_Downloader/security/advisories/new)
2. **Email**: Open an issue with the `security` label (do not include exploit details in public issues)

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

We aim to acknowledge reports within 48 hours and provide a fix timeline within 7 days.

## Security Architecture

This application follows Electron security best practices:

- **Context Isolation**: Enabled - renderer cannot access Node.js APIs directly
- **Node Integration**: Disabled - renderer runs in a sandboxed browser context
- **Preload Bridge**: All IPC communication goes through a typed `contextBridge` API
- **Webview Sandbox**: Steam Workshop webview uses a separate `persist:steam` partition
- **URL Guard**: Webview navigation is restricted to `steamcommunity.com` and related Steam domains
- **Input Validation**: ModId is validated as numeric at IPC and execution layers
- **Path Safety**: ModProcessor validates all paths stay within configured root directories
- **Config Encryption**: Sensitive credentials (GitHub token) are encrypted via OS keychain (Electron safeStorage)

## Known Considerations

- The app spawns external processes (`steamcmd.exe`) - ensure the SteamCMD executable path is validated
- The embedded webview has access to Steam session cookies within its partition
- Configuration is stored in the user's AppData directory with OS-level encryption for sensitive fields

## Code Signing

**Current status**: Installers are **not code-signed**. Windows SmartScreen will show a warning on first run.

**Why**: Code signing requires either a paid certificate (OV/EV from a CA) or a cloud signing service (Azure Trusted Signing). As an open-source project, this is a cost/infrastructure trade-off.

**How to help**: If you'd like to contribute code signing infrastructure, please open an issue to discuss the approach (Azure Trusted Signing is the recommended path for open-source projects).
