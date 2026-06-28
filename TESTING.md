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

- `npm run smoke:release:update`
  Checks local `release/<version>/` update metadata and installers:
  `latest.yml`, NSIS installer, and MSI installer. This is read-only and does not
  install the update. Add `-- --published` after publishing to verify GitHub
  Release assets.

- `npm run smoke:release:download -- --steamcmd-exe <path> --steamcmd-download-path <path> --mods-path <path> --mod-id <id>`
  Runs a real Electron IPC download through SteamCMD and ModProcessor. This is
  intentionally opt-in because it contacts Steam and writes to the supplied
  download and Mods directories.

- `npm run release:notes -- --tag v1.1.1 --previous-tag v1.1.0 --output release-notes-preview.md`
  Renders the release notes template locally so you can preview the final GitHub Release body before tagging.

## Windows Signing

Local and CI packaging use the same `WINDOWS_CODE_SIGNING` switch:

- `disabled` (default): unsigned installers, icon and metadata still edited.
- `signtool`: requires `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`.
- `azure`: requires Azure Trusted Signing credentials plus `WINDOWS_SIGN_PUBLISHER_NAME`.

For a local unsigned release build:

```bash
npm run build:win
```

For a local PFX-signed release build:

```bash
set WINDOWS_CODE_SIGNING=signtool
set WIN_CSC_LINK=C:\path\to\certificate.pfx
set WIN_CSC_KEY_PASSWORD=...
set WINDOWS_SIGN_PUBLISHER_NAME=...
npm run build:win
```

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
- Real SteamCMD downloads and update metadata are covered by opt-in smoke commands because they require network access and local SteamCMD paths or release artifacts.
- Updater installation itself remains manual: the automated update smoke verifies release metadata and assets, but does not install a newer app over the current one.

> **Current status:** Unit tests now import real implementation code across shared
> validation, i18n helpers, renderer URL utilities, and core main-process services
> such as SteamCMD, ModProcessor, WorkshopScraper, SecureStorage, and ConfigManager.
> The current full-`src` unit coverage baseline is approximately 25.8% statements,
> 20.6% branches, 15.6% functions, and 27.4% lines. Component-level renderer
> coverage remains the largest active gap and should be ratcheted upward over time.
