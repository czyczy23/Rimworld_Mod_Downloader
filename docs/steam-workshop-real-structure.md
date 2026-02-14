# Steam Workshop 真实页面结构分析

## 文档版本
- 分析日期: 2026-02-14
- 分析工具: cURL + grep
- 目标页面: https://steamcommunity.com/sharedfiles/filedetails/?id=3662471742

## 页面概述

### 页面类型
- **游戏**: RimWorld (App ID: 294100)
- **Mod**: Vanilla Fire Modes
- **页面结构**: 标准 Steam Workshop Mod 详情页

### HTML 文档结构
```html
<!DOCTYPE html>
<html class="responsive DesktopUI" lang="en">
<head>
  <title>Steam Workshop::Vanilla Fire Modes</title>
  <!-- 多个 CSS 文件 -->
  <!-- workshop_itemdetails.css 等 -->
</head>
<body class="flat_page responsive_page">
  <div class="responsive_page_frame with_header">
    <!-- 导航栏 -->
    <!-- 主要内容 -->
  </div>
</body>
</html>
```

## 订阅按钮结构分析

### 发现的真实选择器

通过分析页面源码，发现以下实际使用的类名和 ID：

#### 1. 订阅按钮容器
```html
<a onclick="SubscribeItem('3662471742', '294100');"
   id="SubscribeItemBtn"
   class="btn_green_white_innerfade btn_border_2px btn_medium">
  <div id="SubscribeItemOptionAdd" class="subscribeOption subscribe selected">Subscribe</div>
  <div id="SubscribeItemOptionSubscribed" class="subscribeOption subscribed" style="display:none;">Subscribed</div>
</a>
```

**关键选择器：**
- `#SubscribeItemBtn` - 订阅按钮 ID
- `.btn_green_white_innerfade` - 按钮样式类
- `.subscribeOption.subscribe.selected` - 订阅选项（未订阅状态）
- `.subscribeOption.subscribed` - 已订阅状态

#### 2. 图标元素
```html
<div class="subscribeIcon"></div>
```

### 未找到的传统类名

以下类名在当前页面中**未出现**：
- ❌ `.workshopItemSubscribeBtn`
- ❌ `.workshopItemSubscriptionButtons`
- ❌ `.apphub_OtherSiteActions`

## 页面加载和脚本分析

### 主要 JavaScript 文件
```html
<script src="workshop_functions.js"></script>
<script src="sharedfiles_functions_logged_out.js"></script>
<script src="workshop_previewplayer.js"></script>
```

### 关键 JavaScript 函数
```javascript
// 订阅功能
function SubscribeItem(publishedFileId, appId) {
  // 处理订阅逻辑
}

// 订阅状态切换
function UpdateSubscriptionState() {
  // 更新订阅按钮显示状态
}
```

## 页面状态变化

### 未登录状态
- 显示 "Subscribe" 按钮
- 点击后跳转到登录页面

### 已登录未订阅状态
- 显示 "Subscribe" 按钮
- 点击后立即订阅

### 已登录已订阅状态
- 显示 "Subscribed" 按钮
- 点击后取消订阅

## 注入点建议

### 推荐注入位置
```javascript
// 方案 1: 在 Subscribe 按钮后插入
const target = document.getElementById('SubscribeItemBtn')
if (target) {
  target.insertAdjacentElement('afterend', downloadButton)
}

// 方案 2: 在订阅选项容器后插入
const target = document.querySelector('.subscribeOption.subscribe.selected')
if (target && target.parentElement) {
  target.parentElement.insertAdjacentElement('afterend', downloadButton)
}
```

### 样式适配建议
```css
/* 保持与 Steam 按钮一致的样式 */
.rw-download-btn {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 2px;
  font-family: 'Motiva Sans', Arial, sans-serif;
  font-size: 14px;
  cursor: pointer;
}
```

## 测试建议

### 测试场景
1. **未登录状态** - 检查按钮是否正确显示
2. **已登录未订阅** - 检查按钮与 Subscribe 按钮并排显示
3. **已登录已订阅** - 检查按钮与 Subscribed 按钮并排显示
4. **页面刷新** - 检查按钮是否正确重新注入

### 调试方法
```javascript
// 在 DevTools 控制台测试选择器
document.getElementById('SubscribeItemBtn')
document.querySelector('.subscribeOption.subscribe.selected')

// 检查注入状态
window.__rimworldDownloaderInjected
document.getElementById('rw-downloader-btn')
```

## 结论

通过分析真实 Steam Workshop 页面，发现：
1. **订阅按钮 ID**: `#SubscribeItemBtn`
2. **按钮样式类**: `.btn_green_white_innerfade`
3. **订阅状态类**: `.subscribeOption.subscribe.selected` / `.subscribeOption.subscribed`
4. **传统类名**如 `.workshopItemSubscribeBtn` 在真实页面中不存在

建议更新注入脚本，优先使用 `SubscribeItemBtn` ID 作为定位目标。

---
*文档结束*
