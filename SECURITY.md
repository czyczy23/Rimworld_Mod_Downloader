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

**Current status**: Code signing is an optional release hook, not an active roadmap item.
Unsigned local installers are expected unless `WINDOWS_CODE_SIGNING` is explicitly set.
For mainland China-based individual development, public-trust signing should not be assumed
available or cost-effective; keep unsigned local builds as the default unless a certificate or
organization-backed signing account is explicitly provisioned.

Supported signing modes:

- `WINDOWS_CODE_SIGNING=disabled` - default. Builds unsigned installers while keeping icon and version metadata.
- `WINDOWS_CODE_SIGNING=signtool` - signs with a PFX/base64 certificate via `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`.
- `WINDOWS_CODE_SIGNING=azure` - signs with Azure Trusted Signing using Entra credentials and Trusted Signing account metadata.

Required CI secrets for PFX signing:

- `WIN_CSC_LINK`
- `WIN_CSC_KEY_PASSWORD`

Required CI secrets for Azure Trusted Signing:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TRUSTED_SIGNING_ENDPOINT`
- `AZURE_TRUSTED_SIGNING_ACCOUNT`
- `AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE`

Required repository variables when signing is enabled:

- `WINDOWS_CODE_SIGNING`: `signtool` or `azure`
- `WINDOWS_SIGN_PUBLISHER_NAME`: exact publisher name from the certificate

Local verification commands:

```bash
# Show whether signing is disabled or required signing variables are present.
npm run signing:check

# Inspect Authenticode status for release/<version> installers.
npm run signing:verify

# Fail unless generated installers have valid Authenticode signatures.
npm run signing:require-valid
```

The release workflow verifies Authenticode status for the generated `.exe` and `.msi`.
When signing is enabled, a non-valid signature fails the release packaging job.
