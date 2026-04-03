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
  Runs unit tests with coverage output in `coverage/unit/`.

- `npm run test:e2e`
  Runs Playwright smoke tests.

- `npm run verify`
  Recommended local pre-commit gate:
  lint -> typecheck -> unit tests -> production build

- `npm run package:win`
  Packages Windows installers from the current `out/` build output.
  Produces NSIS `.exe`, `.msi`, and updater metadata in `release/<version>/`.

- `npm run build:win`
  Recommended local release command:
  build -> Windows installer packaging

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

## Job Breakdown

1. `quality`
   Runs `npm run verify:ci` and uploads unit coverage artifacts.

2. `e2e`
   Installs the Chromium browser and runs Playwright smoke tests.
   The HTML report and raw Playwright results are uploaded as artifacts.

3. `package-windows`
   Builds the Electron app bundle, then packages Windows installers.
   Uploads:
   - NSIS installer `.exe`
   - MSI installer `.msi`
   - package metadata (`builder-debug.yml`, `.blockmap`)

## Artifact Directories

- Unit coverage: `coverage/unit/`
- Playwright report: `playwright-report/`
- Playwright raw results: `test-results/`
- Windows installers: `release/<version>/`

These directories are generated artifacts and should not be committed.

## Scope

- Unit tests cover renderer and shared logic with Vitest.
- End-to-end tests are currently smoke tests for the rendered app shell and key UI surfaces.
- Full native Electron integration is still a separate concern from the browser-based Playwright flow.
