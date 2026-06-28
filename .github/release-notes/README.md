# Release Notes Workflow

## English

### Resolution Order

The `Release Pipeline` resolves release notes in this order:

1. `.github/release-notes/versions/<tag>.md`
2. `.github/release-notes/versions/<version>.md`
3. `.github/release-notes/template.md`

### Available Placeholders

- `{{RELEASE_TAG}}`
- `{{RELEASE_VERSION}}`
- `{{RELEASE_TITLE}}`
- `{{REPOSITORY}}`
- `{{COMPARE_URL}}`
- `{{COMPARE_SECTION}}`

### Recommended Workflow

1. Copy `template.md` before release.
2. Save it as `.github/release-notes/versions/vX.Y.Z.md`.
3. Fill in both English and Chinese sections.
4. Render a local preview before tagging.

### Local Preview

```powershell
node scripts/render-release-notes.cjs --tag v1.3.0 --previous-tag v1.2.0 --output release-notes-preview.md
```

## 中文

### 读取顺序

`Release Pipeline` 会按以下顺序读取发布说明：

1. `.github/release-notes/versions/<tag>.md`
2. `.github/release-notes/versions/<version>.md`
3. `.github/release-notes/template.md`

### 可用占位符

- `{{RELEASE_TAG}}`
- `{{RELEASE_VERSION}}`
- `{{RELEASE_TITLE}}`
- `{{REPOSITORY}}`
- `{{COMPARE_URL}}`
- `{{COMPARE_SECTION}}`

### 推荐流程

1. 发版前复制 `template.md`。
2. 保存为 `.github/release-notes/versions/vX.Y.Z.md`。
3. 同时补全英文与中文部分。
4. 打 tag 前先在本地渲染预览。

### 本地预览

```powershell
node scripts/render-release-notes.cjs --tag v1.3.0 --previous-tag v1.2.0 --output release-notes-preview.md
```
