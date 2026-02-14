# Steam Workshop 页面 DOM 结构分析

## 文档目的
本文档详细分析 Steam Workshop Mod 详情页的 DOM 结构，用于指导下载按钮的注入逻辑。

## 页面类型判断

### Mod 详情页特征
- URL 包含 `/sharedfiles/filedetails/?id=`
- 页面包含订阅按钮
- 有 Mod 标题、作者信息

### 集合页特征
- 包含 `.collectionItem` 元素
- 包含 `.collectionHeader` 元素

## 关键 DOM 元素分析

### 1. 订阅按钮 (Subscribe Button)

**常见选择器（按优先级排序）：**

```javascript
// 主要选择器
'.workshopItemSubscribeBtn'

// 属性包含选择器
'[class*="workshopItemSubscribeBtn"]'

// 容器选择器
'.workshopItemSubscriptionButtons'

// 通用按钮类（备用）
'.btn_green'
'.btn_blue'

// 文本内容匹配（最后手段）
// 查找包含 "subscribe" 或 "订阅" 文本的按钮
```

**结构示例：**
```html
<div class="workshopItemSubscriptionButtons">
  <div class="workshopItemSubscribeBtn">
    <div class="subscribeIcon"></div>
    <span>Subscribe</span>
  </div>
</div>
```

### 2. 操作区域 (Action Area)

**备用容器选择器：**
```javascript
'.workshopItemActions'
'.apphub_OtherSiteActions'
'.apphub_HeaderBottomRight'
'.workshopItemAuthorLine'
```

### 3. Mod 标题

**选择器：**
```javascript
'.workshopItemTitle'
'.apphub_ContentHeader .workshopItemTitle'
'div[class*="workshopItemTitle"]'
```

## 按钮注入策略

### 推荐方法

1. **定位订阅按钮** - 使用 `findSubscribeButton()` 函数
2. **插入下载按钮** - 使用 `insertAdjacentElement('afterend', button)`
3. **确保唯一性** - 检查是否已存在 `id="rw-downloader-btn"`

### 代码逻辑

```javascript
function injectDownloadButton() {
  // 1. 移除已存在的按钮
  const existingBtn = document.getElementById('rw-downloader-btn')
  if (existingBtn) existingBtn.remove()

  // 2. 查找订阅按钮
  const targetElement = findSubscribeButton()
  if (!targetElement) return

  // 3. 创建并插入下载按钮
  const button = createDownloadButton()
  targetElement.insertAdjacentElement('afterend', button)
}
```

## 中文界面适配

Steam 中文界面可能使用不同的文本：
- "Subscribe" → "订阅"
- "Subscribed" → "已订阅"

**文本匹配策略：**
```javascript
const text = button.textContent?.toLowerCase() || ''
if (text.includes('subscribe') || text.includes('订阅') || text.includes('subscribed')) {
  return button
}
```

## 调试技巧

1. **检查控制台日志** - 查看注入脚本的输出
2. **验证选择器** - 在 DevTools 中测试 `document.querySelector()`
3. **检查按钮是否存在** - `document.getElementById('rw-downloader-btn')`

## 常见问题

### Q: 按钮没有显示
- 检查是否匹配了正确的订阅按钮选择器
- 检查页面是否已完全加载（Steam 使用动态加载）
- 检查是否有 JavaScript 错误

### Q: 按钮位置不正确
- 确保使用 `insertAdjacentElement('afterend', button)`
- 确认目标元素不是嵌套在复杂结构中

### Q: SPA 导航后按钮消失
- 确保在 URL 变化时重新注入按钮
- 使用 `setInterval` 监控 URL 变化

## 参考链接

- Steam Workshop: https://steamcommunity.com/workshop/
- Mod 详情页示例: https://steamcommunity.com/sharedfiles/filedetails/?id=3662471742
