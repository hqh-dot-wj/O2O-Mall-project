---
inclusion: fileMatch
fileMatchPattern: 'apps/miniapp-client/src/**/*.vue'
---

# D2C 设计稿到代码映射规则

当根据设计稿生成小程序页面代码时，遵循以下规则。
核心理念：**规则保精准（Token/间距/尺寸），AI 管语义（组件拆分/代码结构/工程化）**。

## 1. 组件映射表（设计元素 → wot-design-uni 组件）

| 设计元素      | 推荐组件            | 备注                         |
| ------------- | ------------------- | ---------------------------- |
| 普通按钮      | `<wd-button>`       | type="primary" 为品牌色      |
| 搜索框        | `<wd-search>`       | 胶囊形，高度 64rpx           |
| 弹出层        | `<wd-popup>`        | 底部弹出用 position="bottom" |
| 动作面板      | `<wd-action-sheet>` | —                            |
| 对话框        | `<wd-message-box>`  | —                            |
| 标签页        | `<wd-tabs>`         | —                            |
| 步进器        | `<wd-input-number>` | 购物车数量选择               |
| 骨架屏        | `<wd-skeleton>`     | 加载状态必用                 |
| 下拉刷新/列表 | `<z-paging>`        | 长列表标配                   |
| 空状态        | `<wd-status-tip>`   | —                            |

**规则**：能用 wot-design-uni 组件的不自己写 div 堆叠。

## 2. 页面结构生成策略

### 2.1 分步生成（先 UI 后逻辑）

**第一步：UI 结构** — 纯 UI 代码 + Design Token + 正确组件映射 + 静态 mock
**第二步：逻辑注入** — API 调用 + Pinia store + 交互逻辑 + 加载/错误/空状态

### 2.2 组件拆分规则

按**功能边界**拆分，不按视觉区域拆分。页面组件放 `pages/xx/components/`，跨页面复用的放 `components/`。

## 3. 样式转换规则

### 3.1 颜色转换

设计稿色值必须映射到最近的 Design Token：

| 设计稿色值           | CSS 变量                 | UnoCSS 类                     |
| -------------------- | ------------------------ | ----------------------------- |
| #00C250 / 绿色系     | `--color-brand-primary`  | `text-primary` / `bg-primary` |
| #FF3B30 / 红色价格   | `--color-price`          | `text-price`                  |
| #FF4D4F / 红色警示   | `--color-func-error`     | `text-error`                  |
| #111111 / 黑色主文字 | `--color-text-primary`   | `text-ink`                    |
| #666666 / 灰色副文字 | `--color-text-secondary` | `text-ink-light`              |
| #999999 / 浅灰文字   | `--color-text-tertiary`  | `text-ink-lighter`            |
| #F5F5F5 / 浅灰背景   | `--color-bg-body`        | `bg-fill`                     |
| #FFFFFF / 白色卡片   | `--color-bg-surface`     | `bg-surface`                  |

### 3.2 布局转换

| 设计稿布局     | 代码实现                                      |
| -------------- | --------------------------------------------- |
| 水平排列等间距 | `flex justify-between` 或 `flex gap-space-sm` |
| 垂直居中       | `flex items-center`                           |
| 两列网格       | `grid grid-cols-2 gap-space-sm`               |
| 左图右文       | `flex gap-space-md` + 固定宽图片              |
| 固定底部       | `fixed bottom-0 left-0 right-0` + safe-area   |

## 4. 资源处理

| 资源类型 | 处理方式                                               |
| -------- | ------------------------------------------------------ |
| 商品图片 | CDN URL，`<image>` + `lazy-load` + `mode="aspectFill"` |
| 图标     | UnoCSS Icons（`i-my-icons-xxx`）或 iconfont            |
| 装饰图片 | CDN，不打包进小程序                                    |

## 5. 禁止事项

- 禁止生成"div 海"：使用语义化的 `<view>`/`<text>`/`<image>`/`<button>` + wot-design-uni 组件
- 禁止硬编码色值、字号、间距
- 禁止使用 spinner/菊花图加载（用骨架屏）
- 禁止忽略安全区域（底部固定元素必须处理 safe-area）
- 禁止一个文件超过 300 行（必须拆分组件）
- 禁止在模板中写复杂逻辑
