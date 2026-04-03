# Release Notes Workflow

`Release Pipeline` 会按下面的顺序生成 Release notes：

1. 优先读取 `.github/release-notes/versions/<tag>.md`
2. 如果不存在，再读取 `.github/release-notes/versions/<version>.md`
3. 如果还不存在，则回退到 `.github/release-notes/template.md`

可用占位符：

- `{{RELEASE_TAG}}`
- `{{RELEASE_VERSION}}`
- `{{RELEASE_TITLE}}`
- `{{REPOSITORY}}`
- `{{COMPARE_URL}}`
- `{{COMPARE_SECTION}}`

建议做法：

1. 发版前复制 `template.md`
2. 保存为 `.github/release-notes/versions/vX.Y.Z.md`
3. 按实际变更补充“更新摘要 / 已知问题 / 计划功能”等内容

本地预览：

```powershell
node scripts/render-release-notes.cjs --tag v1.1.1 --previous-tag v1.1.0 --output release-notes-preview.md
```
