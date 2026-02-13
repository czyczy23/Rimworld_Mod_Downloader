/**
 * Git Manager Service - Handles Git operations and GitHub sync
 */

import simpleGit, { SimpleGit } from 'simple-git'
import { app } from 'electron'
import { join } from 'path'
import { pathExists, writeFile, readFile } from 'fs-extra'
import { configManager } from '../utils/ConfigManager'

export class GitManagerError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'GitManagerError'
  }
}

export class GitManager {
  private git: SimpleGit | null = null
  private repoPath: string = ''

  constructor() {
    // Initialize repo path to app directory or a subdirectory
    this.repoPath = app.getAppPath()
  }

  /**
   * Check if current directory is a git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      const git = simpleGit(this.repoPath)
      return await git.checkIsRepo()
    } catch {
      return false
    }
  }

  /**
   * Initialize git repository
   */
  async initRepo(): Promise<void> {
    try {
      this.git = simpleGit(this.repoPath)

      // Check if already initialized
      const isRepo = await this.git.checkIsRepo()
      if (isRepo) {
        console.log('[GitManager] Repository already initialized')
        return
      }

      // Initialize
      await this.git.init()
      console.log('[GitManager] Repository initialized')

      // Create .gitignore if it doesn't exist
      await this.ensureGitignore()

      // Initial commit
      await this.git.add('.')
      await this.git.commit('init: Initialize repository')
      console.log('[GitManager] Initial commit created')

    } catch (error) {
      console.error('[GitManager] Failed to init repo:', error)
      throw new GitManagerError('INIT_FAILED', `Failed to initialize repository: ${error}`)
    }
  }

  /**
   * Configure remote with GitHub token
   */
  async setupRemote(remoteUrl: string, token: string): Promise<void> {
    try {
      if (!this.git) {
        this.git = simpleGit(this.repoPath)
      }

      // Remove existing origin if exists
      try {
        await this.git.removeRemote('origin')
      } catch {
        // Ignore error if remote doesn't exist
      }

      // Add remote with token authentication
      const authUrl = remoteUrl.replace('https://github.com', `https://${token}@github.com`)
      await this.git.addRemote('origin', authUrl)

      // Store token securely in config (Phase 4: implement secure token storage)
      // configManager.set('git.githubToken', token)

      console.log('[GitManager] Remote configured successfully')
    } catch (error) {
      console.error('[GitManager] Failed to setup remote:', error)
      throw new GitManagerError('REMOTE_SETUP_FAILED', `Failed to setup remote: ${error}`)
    }
  }

  /**
   * Commit changes
   */
  async commit(message: string, author?: { name: string; email: string }): Promise<string> {
    try {
      if (!this.git) {
        this.git = simpleGit(this.repoPath)
      }

      // Check if there are changes to commit
      const status = await this.git.status()
      if (status.files.length === 0) {
        console.log('[GitManager] No changes to commit')
        return ''
      }

      // Set author if provided
      if (author) {
        await this.git.addConfig('user.name', author.name)
        await this.git.addConfig('user.email', author.email)
      }

      // Add and commit
      await this.git.add('.')
      const commitResult = await this.git.commit(message)

      console.log(`[GitManager] Committed: ${message}`)
      return commitResult.commit || ''
    } catch (error) {
      console.error('[GitManager] Failed to commit:', error)
      throw new GitManagerError('COMMIT_FAILED', `Failed to commit: ${error}`)
    }
  }

  /**
   * Push to remote
   */
  async push(branch: string = 'main'): Promise<void> {
    try {
      if (!this.git) {
        this.git = simpleGit(this.repoPath)
      }

      // Check if remote exists
      const remotes = await this.git.getRemotes()
      if (remotes.length === 0) {
        console.log('[GitManager] No remote configured, skipping push')
        return
      }

      await this.git.push('origin', branch)
      console.log(`[GitManager] Pushed to origin/${branch}`)
    } catch (error) {
      console.error('[GitManager] Failed to push:', error)
      throw new GitManagerError('PUSH_FAILED', `Failed to push: ${error}`)
    }
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<{ ahead: number; dirty: boolean; lastCommit: string }> {
    try {
      if (!this.git) {
        this.git = simpleGit(this.repoPath)
      }

      const status = await this.git.status()
      const log = await this.git.log({ maxCount: 1 })

      return {
        ahead: status.ahead || 0,
        dirty: status.files.length > 0,
        lastCommit: log.latest?.hash?.substring(0, 7) || ''
      }
    } catch (error) {
      console.error('[GitManager] Failed to get status:', error)
      return { ahead: 0, dirty: false, lastCommit: '' }
    }
  }

  /**
   * Auto-commit with generated message
   */
  async autoCommit(context: string, details?: Record<string, any>): Promise<void> {
    const prefixMap: Record<string, string> = {
      'mod-download': 'feat',
      'mod-update': 'update',
      'settings-change': 'config',
      'dependency-download': 'deps',
      'error-fix': 'fix'
    }

    const prefix = prefixMap[context] || 'chore'
    let message = `${prefix}: ${context}`

    if (details?.modId) message += ` - ${details.modId}`
    if (details?.modName) message += ` (${details.modName})`

    await this.commit(message)
  }

  /**
   * Ensure .gitignore exists
   */
  private async ensureGitignore(): Promise<void> {
    const gitignorePath = join(this.repoPath, '.gitignore')

    if (await pathExists(gitignorePath)) {
      return
    }

    const gitignoreContent = `# Dependencies
node_modules/
dist/
out/

# Build files
*.tgz
*.tar.gz

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Environment
.env
.env.local
.env.*.local

# Config files (sensitive data)
config.json
*.config.json

# OS
.DS_Store
Thumbs.db

# Electron
app-update.yml
dev-app-update.yml

# Cache
.cache/
temp/
tmp/
`

    await writeFile(gitignorePath, gitignoreContent)
    console.log('[GitManager] Created .gitignore')
  }
}

export const gitManager = new GitManager()
export default gitManager
