const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const pkg = require('../package.json')

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--tag') {
      args.tag = argv[index + 1]
      index += 1
    } else if (arg === '--previous-tag') {
      args.previousTag = argv[index + 1]
      index += 1
    } else if (arg === '--output') {
      args.output = argv[index + 1]
      index += 1
    } else if (arg === '--repo') {
      args.repo = argv[index + 1]
      index += 1
    }
  }

  return args
}

function resolveRepositorySlug(value) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
      .replace(/^https:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '')
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
  }

  if (typeof value === 'object' && typeof value.url === 'string') {
    return resolveRepositorySlug(value.url)
  }

  return ''
}

function getSortedTags() {
  try {
    const output = execFileSync('git', ['tag', '--sort=-version:refname'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })

    return output
      .split(/\r?\n/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function buildCompareSection(repository, previousTag, currentTag) {
  if (repository && previousTag) {
    return `- [${previousTag}...${currentTag}](https://github.com/${repository}/compare/${previousTag}...${currentTag})`
  }

  if (repository) {
    return `- [查看 ${currentTag} 提交记录](https://github.com/${repository}/commits/${currentTag})`
  }

  return `- Compare: ${previousTag || 'N/A'} -> ${currentTag}`
}

function renderTemplate(template, replacements) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => replacements[key] ?? '')
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const version = pkg.version
  const tag = args.tag || process.env.RELEASE_TAG || `v${version}`
  const repository =
    args.repo || process.env.GITHUB_REPOSITORY || resolveRepositorySlug(pkg.repository)
  const title = `RimWorld Mod Downloader ${tag}`

  const notesRoot = path.resolve(__dirname, '..', '.github', 'release-notes')
  const candidates = [
    path.join(notesRoot, 'versions', `${tag}.md`),
    path.join(notesRoot, 'versions', `${version}.md`),
    path.join(notesRoot, 'template.md')
  ]

  const templatePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!templatePath) {
    throw new Error('No release notes template found.')
  }

  const tags = getSortedTags()
  const previousTag =
    args.previousTag || process.env.PREVIOUS_TAG || tags.find((candidate) => candidate !== tag) || ''

  const replacements = {
    RELEASE_TAG: tag,
    RELEASE_VERSION: version,
    RELEASE_TITLE: title,
    REPOSITORY: repository,
    COMPARE_URL: previousTag
      ? `https://github.com/${repository}/compare/${previousTag}...${tag}`
      : repository
        ? `https://github.com/${repository}/commits/${tag}`
        : '',
    COMPARE_SECTION: buildCompareSection(repository, previousTag, tag)
  }

  const content = renderTemplate(fs.readFileSync(templatePath, 'utf8'), replacements).trimEnd()

  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), `${content}\n`, 'utf8')
    return
  }

  process.stdout.write(`${content}\n`)
}

main()
