// 修复下载按钮位置问题的补丁脚本
// 将这个代码片段添加到 workshopInjector.js 的 injectDownloadButton 函数中

// 修复后的按钮插入逻辑：
if (targetElement) {
  const button = createDownloadButton()

  // 方法1：在目标元素之后插入（推荐）
  targetElement.parentNode.insertBefore(button, targetElement.nextSibling)

  // 方法2：使用 insertAdjacentElement
  // targetElement.insertAdjacentElement('afterend', button)

  console.log('[RimWorld Downloader] Download button injected after target')
}

// 对于中文Steam界面的额外选择器：
const chineseSelectors = [
  '.btn_green',  // 绿色订阅按钮
  '.btn_blue',   // 蓝色按钮
  '[class*="subscribe"]',  // 包含subscribe的类
  'a[href*="subscribe"]',  // 订阅链接
  '.workshopItemActionBar', // 操作栏
]

// Browse按钮修复：检查IPC通道
// 在 preload/index.ts 中确保：
const api = {
  // ... 其他方法
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
}

// 在 main/index.ts 中确保IPC处理器已注册：
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})
