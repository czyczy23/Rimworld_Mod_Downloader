# Contributing to RimWorld Mod Downloader

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Prerequisites**: Node.js 20+, npm
2. **Clone and install**:
   ```bash
   git clone https://github.com/czyczy23/Rimworld_Mod_Downloader.git
   cd Rimworld_Mod_Downloader
   npm ci
   ```
3. **Start development**:
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Electron in development mode |
| `npm run build` | Typecheck + build the application |
| `npm run test:unit` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E smoke tests (Playwright) |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run verify` | Full quality gate (lint + typecheck + test + build) |

## Code Style

- **Formatter**: Prettier (`semi: false`, `singleQuote: true`, `tabWidth: 2`)
- **Linter**: ESLint with TypeScript plugin
- Pre-commit hooks run `lint-staged` automatically (via Husky)

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `refactor:` code refactoring
- `test:` adding or updating tests
- `chore:` maintenance tasks
- `ci:` CI/CD changes

Examples:
```
feat: add batch download progress indicator
fix: prevent path traversal in ModProcessor
docs: update installation instructions
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the code style
3. Run `npm run verify` to ensure all checks pass
4. Open a PR with a clear description of changes
5. Wait for CI to pass and request review

## Architecture

The app follows Electron's three-process architecture:

- **Main process** (`src/main/`): Node.js backend — SteamCMD, file operations, config, IPC handlers
- **Preload** (`src/preload/`): contextBridge security boundary
- **Renderer** (`src/renderer/`): React UI — webview, download queue, settings
- **Shared** (`src/shared/`): Types and constants shared across processes
