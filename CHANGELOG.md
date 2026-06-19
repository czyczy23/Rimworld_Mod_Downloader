# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Electron safeStorage encryption for sensitive config (GitHub token)
- Webview URL whitelist guard (steamcommunity.com only)
- Runtime validation for IPC config:set values
- Cross-volume (EXDEV) fallback for file move operations
- Download integrity check (file existence after download)
- ModId validation at SteamCMD execution point
- Unit tests for urlGuard, configSchema, WorkshopScraper, ModProcessor, SecureStorage
- Coverage thresholds in vitest config
- Husky + lint-staged pre-commit hooks
- .prettierrc configuration
- CONTRIBUTING.md, CHANGELOG.md, SECURITY.md
- Cross-platform CI matrix (Windows + Ubuntu)
- electron-updater latest.yml upload in release workflow

### Fixed
- Installer artifact name template literal bug (single quotes → backticks)
- Webview script injection (string interpolation → JSON.stringify parameter passing)
- Silent error swallowing on app initialization (now shows error dialog)
- Unimplemented IPC handlers returning fake success (now throw)
- ModProcessor validation now distinguishes missing About.xml from IO errors
- README install instructions (corrected to setup.exe format)
- ESLint rules re-enabled (no-unused-vars, no-explicit-any as warnings)

### Removed
- Hardcoded encryption key from source code
- allowpopups from webview element
- Tracked test-results from git index

## [1.1.1] - 2025-06-19

### Changed
- CI: template release notes generation
- CI: keep package metadata off public releases
- CI: clear empty signing vars in release workflow
- CI: clarify package metadata artifacts

### Fixed
- Release workflow tag validation

## [1.1.0] - 2025-06-18

### Added
- Auto-update functionality from GitHub Releases
- TypeScript strict mode

## [1.0.1] - 2025-06-17

### Fixed
- Initial bug fixes

## [1.0.0] - 2025-06-16

### Added
- Initial release
- Steam Workshop mod downloading via SteamCMD
- Mod dependency checking
- Version compatibility detection
- Multi-language support (English, Simplified Chinese, Traditional Chinese)
- Welcome wizard for first-time setup
