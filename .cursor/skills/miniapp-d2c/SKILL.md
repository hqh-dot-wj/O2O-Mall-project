---
name: miniapp-d2c
description: Generate miniapp UI from design. Use when converting design/screenshot to Vue code in miniapp-client.
---

# Miniapp D2C（设计到代码）

根据设计稿/截图生成小程序页面代码。**规则保精准（Token/间距/尺寸），AI 管语义（组件拆分/代码结构）**。

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

## 分步生成

1. **第一步**：纯 UI 结构，Design Token，静态 mock
2. **第二步**：API 调用、Pinia、交互逻辑、加载/错误/空态

## Design Token

- 间距、颜色、字号见 `miniapp-ui-spec.mdc` 或项目 Design Token 配置
- 生成时使用 CSS 变量或 Token 常量，禁止硬编码像素值
