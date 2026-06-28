# Release Notes Workflow / 发布说明流程

The `Release Pipeline` resolves release notes in this order:

1. `.github/release-notes/versions/<tag>.md`
2. `.github/release-notes/versions/<version>.md`
3. `.github/release-notes/template.md`

`Release Pipeline` 会按以下顺序读取发布说明：

1. `.github/release-notes/versions/<tag>.md`
2. `.github/release-notes/versions/<version>.md`
3. `.github/release-notes/template.md`

Available placeholders / 可用占位符：

- `{{RELEASE_TAG}}`
- `{{RELEASE_VERSION}}`
- `{{RELEASE_TITLE}}`
- `{{REPOSITORY}}`
- `{{COMPARE_URL}}`
- `{{COMPARE_SECTION}}`

Recommended workflow / 推荐流程：

1. Copy `template.md` before release.
2. Save it as `.github/release-notes/versions/vX.Y.Z.md`.
3. Fill in both English and Chinese sections.
4. Render a local preview before tagging.

5. 发版前复制 `template.md`。
6. 保存为 `.github/release-notes/versions/vX.Y.Z.md`。
7. 同时补全英文与中文部分。
8. 打 tag 前先在本地渲染预览。

Local preview / 本地预览：

```powershell
node scripts/render-release-notes.cjs --tag v1.3.0 --previous-tag v1.2.0 --output release-notes-preview.md
```
