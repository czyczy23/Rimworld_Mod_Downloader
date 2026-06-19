# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.0] - 2026-06-19

### Changed
- Windows installer switched from perMachine/admin (requireAdministrator) to perUser/asInvoker — no UAC prompt, no SmartScreen escalation surface
- Main process logging unified through electron-log (file rotation at %APPDATA%/rimworld-mod-downloader/logs/)
- SteamCMD helpers (buildArgs, parseProgressLine, determineResult, gracefulKill) extracted as pure functions for testability
- IPC `mod:download` and `mod:downloadBatch` now reject on failure instead of returning fabricated error metadata; batch continues on per-item failure via download:error events
- Line endings normalized to LF across the repo (.gitattributes eol=lf + .prettierrc endOfLine: lf + core.autocrlf false); CI Windows/Linux lint output now identical

### Added
- Electron safeStorage encryption for sensitive config (GitHub token), with tagged `enc:v1:` prefix replacing the length-heuristic blob detection
- Config migration from legacy hardcoded-key encrypted format to OS keychain
- Webview URL whitelist guard enforced on both address-bar and in-page navigation (steamcommunity.com only)
- Runtime validation for IPC config:set values (path safety, enum checks)
- Cross-volume (EXDEV) fallback for file move operations
- Download integrity check (exit code 0 + file existence on disk)
- ModId validation at SteamCMD execution point (defense-in-depth)
- Unit tests for urlGuard, configSchema, WorkshopScraper, ModProcessor, SecureStorage, SteamCMD, ConfigManager, ipcHandlers (92 tests total, from 0)
- Coverage thresholds in vitest config
- Husky + lint-staged pre-commit hooks
- .prettierrc configuration
- CONTRIBUTING.md, CHANGELOG.md, SECURITY.md
- Cross-platform CI matrix (Windows + Ubuntu)
- electron-updater latest.yml upload in release workflow (now force-fails the release if latest.yml is missing)
- Release notes templating pipeline

### Fixed
- Installer artifact name template literal bug (single quotes → backticks)
- Webview script injection (string interpolation → JSON.stringify parameter passing)
- Silent error swallowing on app initialization (now shows error dialog)
- Unimplemented IPC handlers returning fake success (now throw)
- ModProcessor validation now distinguishes missing About.xml from IO errors
- ConfigManager legacy migration now logs all failure paths instead of silent catches
- README install instructions (corrected to setup.exe format)
- ESLint rules re-enabled (no-unused-vars, no-explicit-any as warnings)

### Removed
- Hardcoded encryption key from source code
- allowpopups from webview element
- Full electronAPI exposure from preload (narrowed to typed `api` only)
- Dead dependencies: fast-xml-parser, fs-extra, simple-git, @types/fs-extra
- Tracked test-results from git index
- Inline require() calls in configSchema.ts and ConfigManager.ts (replaced with ESM imports)

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
