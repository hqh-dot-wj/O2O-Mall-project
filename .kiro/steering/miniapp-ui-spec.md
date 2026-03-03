---
inclusion: fileMatch
fileMatchPattern: '{apps/miniapp-client/**/*.vue,apps/miniapp-client/**/*.scss,apps/miniapp-client/**/*.ts}'
---

# 小程序 C 端 UI/UX 规范（AI 代码生成约束）

生成或修改小程序 UI 代码时，**必须**遵循以下规范。

## 1. Design Token 强制约束

所有 Design Token 定义在 `src/style/design-tokens.scss`，UnoCSS 主题已同步。

### 1.1 颜色：禁止硬编码

```vue
<!-- UnoCSS 原子类（优先） -->
<view class="text-primary bg-primary-light">品牌色</view>
<text class="text-ink">主文字</text>
<text class="text-ink-light">副文字</text>
<text class="text-price">¥29.90</text>
<view class="bg-fill">页面背景</view>
<view class="bg-surface rounded-card">卡片</view>
```

### 1.2 颜色速查表

| 用途         | UnoCSS 类                     | CSS 变量                 |
| ------------ | ----------------------------- | ------------------------ |
| 品牌主色     | `text-primary` / `bg-primary` | `--color-brand-primary`  |
| 品牌浅色背景 | `bg-primary-light`            | `--color-brand-light`    |
| 错误/警示    | `text-error` / `bg-error`     | `--color-func-error`     |
| 价格红色     | `text-price`                  | `--color-price`          |
| 一级文本     | `text-ink`                    | `--color-text-primary`   |
| 二级文本     | `text-ink-light`              | `--color-text-secondary` |
| 辅助文本     | `text-ink-lighter`            | `--color-text-tertiary`  |
| 分割线/边框  | `border-line`                 | `--color-border-default` |
| 页面背景     | `bg-fill`                     | `--color-bg-body`        |
| 卡片背景     | `bg-surface`                  | `--color-bg-surface`     |

### 1.3 字号阶梯

| 场景       | UnoCSS 类         | 尺寸            |
| ---------- | ----------------- | --------------- |
| 促销大标题 | `text-display-lg` | 64rpx / Bold    |
| 商品价格   | `text-display-md` | 48rpx / Bold    |
| 页面标题   | `text-title-lg`   | 36rpx / Medium  |
| 列表标题   | `text-title-md`   | 32rpx / Medium  |
| 标准正文   | `text-body-lg`    | 28rpx / Regular |
| 辅助说明   | `text-body-md`    | 26rpx / Regular |
| 标签       | `text-caption`    | 24rpx / Regular |
| 角标       | `text-micro`      | 20rpx / Medium  |

### 1.4 间距系统（8pt 网格）

| 用途       | UnoCSS 类      | 尺寸  |
| ---------- | -------------- | ----- |
| 图标与文字 | `gap-space-xs` | 8rpx  |
| 标签间距   | `gap-space-sm` | 16rpx |
| 卡片内边距 | `p-space-md`   | 24rpx |
| 页面边距   | `p-space-lg`   | 32rpx |
| 大模块分隔 | `p-space-xl`   | 48rpx |

### 1.5 圆角

| 场景             | UnoCSS 类       | 尺寸   |
| ---------------- | --------------- | ------ |
| 次级按钮/标签    | `rounded-sm`    | 8rpx   |
| 商品卡片         | `rounded-card`  | 16rpx  |
| 弹窗             | `rounded-popup` | 24rpx  |
| 主按钮（胶囊形） | `rounded-pill`  | 999rpx |

## 2. 价格排版规范

电商价格必须遵循"符号小、整数大、小数中"：

```vue
<view class="flex items-baseline text-price">
  <text class="text-caption">¥</text>
  <text class="text-display-md font-bold">29</text>
  <text class="text-body-lg">.90</text>
</view>
```

划线价：`text-ink-lighter line-through text-caption`

## 3. 交互与动态规范

### 3.1 按压反馈

所有可点击元素必须有按压态：`hover-class="opacity-80"` 或 `:active { opacity: 0.8; }`

### 3.2 加载状态

禁止使用旋转菊花/spinner，必须使用骨架屏 `<wd-skeleton>`。

### 3.3 空状态

展示插画 + 引导文案 + 行动按钮。场景：购物车为空、搜索无结果、网络错误、列表无数据。

### 3.4 Toast

`uni.showToast`，停留 1500ms，屏幕中间。

## 4. 无障碍与性能

- 正文文本与背景对比度 ≥ 4.5:1（WCAG AA）
- 所有交互元素最小点击区域：88x88rpx
- 非透明商品图使用 WebP 格式
- 大图放 CDN，商品图 `lazy-load`

## 5. AI 生成代码检查清单

- [ ] 颜色全部使用 Design Token（无硬编码色值）
- [ ] 间距为 8rpx 的倍数（使用 space-\* token）
- [ ] 使用语义化组件（wot-design-uni 优先）
- [ ] 价格使用"符号小整数大小数中"排版
- [ ] 卡片使用 `rounded-card` + `shadow-card`
- [ ] 可点击元素有按压反馈
- [ ] 点击热区 ≥ 88x88rpx
- [ ] 图片使用 `lazy-load`
- [ ] 加载状态使用骨架屏
- [ ] 字号使用阶梯 token
