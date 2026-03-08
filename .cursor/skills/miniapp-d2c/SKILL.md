---
name: miniapp-d2c
description: >
  Generate miniapp UI from design or screenshot.
  Trigger: user provides design draft, screenshot, or UI mockup for
  miniapp-client; converting design to Vue + wot-design-uni code.
---

# Miniapp D2C（设计到代码）

根据设计稿/截图生成小程序页面代码。**规则保精准（Token/间距/尺寸），AI 管语义（组件拆分/代码结构）**。

## Instructions

1. **识别设计元素**：按钮、搜索框、表单、列表、弹层、标签页等，映射到 wot-design-uni 组件。
2. **第一步生成**：纯 UI 结构、Design Token、静态 mock；间距/颜色/字号用 CSS 变量或 Token 常量，禁止硬编码像素。
3. **第二步注入**（若需）：API 调用、Pinia、交互逻辑、加载/错误/空态。见 `miniapp-p2c` skill。

## 组件映射（设计元素 → wot-design-uni）

| 设计元素 | 组件                      |
| -------- | ------------------------- |
| 普通按钮 | `<wd-button>`             |
| 搜索框   | `<wd-search>`             |
| 弹出层   | `<wd-popup>`              |
| 标签页   | `<wd-tabs>`               |
| 表单     | `<wd-form>` + `<wd-cell>` |
| 长列表   | `<z-paging>`              |
| 空状态   | `<wd-status-tip>`         |

Design Token 见 `.cursor/rules/miniapp-ui-spec.mdc` 或项目配置。

## Example

**输入**：设计稿为「搜索框 + 筛选标签 + 商品列表（卡片式）」。

**输出**：

```vue
<template>
  <view class="page">
    <wd-search v-model="keyword" placeholder="搜索商品" @search="onSearch" />
    <wd-tabs v-model="activeTab" :list="tabs" @change="onTabChange" />
    <z-paging ref="pagingRef" v-model="list" @query="queryList">
      <view v-for="item in list" :key="item.id" class="card">...</view>
      <template #empty><wd-status-tip type="empty" /></template>
    </z-paging>
  </view>
</template>
```

## Validation

- [ ] 组件来自 wot-design-uni 或项目约定
- [ ] 间距/颜色用 Token 或 CSS 变量，无硬编码 px
- [ ] 空态、加载态有对应 UI
