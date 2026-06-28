# Testing Workflow

This repository now uses a layered test flow so local runs and CI follow the same path.

## Local Commands

- `npm run check`
  Runs lint and TypeScript checks.

- `npm run test`
  Alias for the unit test suite.

- `npm run test:unit`
  Runs Vitest once.

- `npm run test:unit:watch`
  Runs Vitest in watch mode for local development.

- `npm run test:coverage`
  Runs unit tests with coverage output in `coverage/unit/`. Coverage includes
  untested `src` files so the aggregate stays honest.

- `npm run test:e2e`
  Runs Playwright smoke tests.

- `npm run verify`
  Recommended local pre-commit gate:
  lint -> typecheck -> unit tests -> production build

- `npm run package:win`
  Packages Windows installers from the current `out/` build output.
  Produces NSIS `.exe`, `.msi`, and package metadata in `release/<version>/`.

- `npm run build:win`
  Recommended local release command:
  build -> Windows installer packaging

- `npm run release:notes -- --tag v1.1.1 --previous-tag v1.1.0 --output release-notes-preview.md`
  Renders the release notes template locally so you can preview the final GitHub Release body before tagging.

## CI Flow

GitHub Actions now runs two workflows:

1. `Test Pipeline`
   Triggered on pull requests and pushes to `main`.
   Runs:
   `quality` -> `e2e`

2. `Release Pipeline`
   Triggered on version tags and manual dispatch.
   Runs:
   `quality` -> `e2e` -> `package-windows`
   When a matching tag such as `v1.1.1` is present, the workflow also creates or updates the GitHub Release and uploads the installer files there.
   Release notes are generated from `.github/release-notes/versions/<tag>.md` first, then fall back to `.github/release-notes/template.md`.

## Job Breakdown

1. `quality`
   Runs `npm run verify:ci` and uploads unit coverage artifacts.

2. `e2e`
   Installs the Chromium browser and runs browser plus native Electron Playwright smoke tests.
   The browser report, Electron report, and raw Playwright results are uploaded as artifacts.

3. `package-windows`
   Builds the Electron app bundle, then packages Windows installers.
   Uploads:
   - NSIS installer `.exe`
   - MSI installer `.msi`
   - package metadata (`builder-debug.yml`, `.blockmap`)
   - GitHub Release assets for matching version tags

## Artifact Directories

- Unit coverage: `coverage/unit/`
- Browser Playwright report: `playwright-report/`
- Native Electron Playwright report: `playwright-report-electron/`
- Playwright raw results: `test-results/`
- Windows installers: `release/<version>/`

These directories are generated artifacts and should not be committed.

## Scope

- Unit tests cover renderer and shared logic with Vitest.
- End-to-end tests include browser smoke coverage for the rendered app shell and native Electron smoke coverage for app startup plus core UI surfaces.
- Deeper Electron integration scenarios, such as real SteamCMD downloads, updater behavior, and webview navigation against live Steam pages, remain manual or future automated coverage.

> **Current status:** Unit tests now import real implementation code across shared
> validation, i18n helpers, renderer URL utilities, and core main-process services
> such as SteamCMD, ModProcessor, WorkshopScraper, SecureStorage, and ConfigManager.
> The current full-`src` unit coverage baseline is approximately 25.8% statements,
> 20.6% branches, 15.6% functions, and 27.4% lines. Component-level renderer
> coverage remains the largest active gap and should be ratcheted upward over time.
