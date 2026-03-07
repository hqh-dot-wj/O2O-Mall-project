# Miniapp-Client 小程序指引

## 技术栈

uniapp + Vue3 + TypeScript + Vite5 + UnoCSS + wot-design-uni

## 目录约定

| 目录                       | 用途       |
| -------------------------- | ---------- |
| `src/pages/`               | 页面       |
| `src/components/`          | 全局组件   |
| `src/pages/xx/components/` | 页面级组件 |
| `src/api/`                 | API 接口   |
| `src/http/`                | HTTP 封装  |
| `src/store/`               | Pinia 状态 |

## 条件编译（核心）

平台差异必须用条件编译，禁止运行时 `if (platform)` 判断。

- JS：`// #ifdef H5` ... `// #endif`
- 平台：H5、MP-WEIXIN、MP

## 样式规范

- **Design Token**：色值、字号、间距在 `src/style/design-tokens.scss`
- **禁止硬编码**：使用 UnoCSS 类（`text-primary`、`text-ink`、`bg-fill`）或 CSS 变量
- **单位**：优先 rpx，8pt 网格

## 运行命令

- H5：`pnpm dev` / `pnpm dev:h5`
- 微信：`pnpm dev:mp` / `pnpm dev:mp-weixin`
- 构建：`pnpm build:h5`、`pnpm build:mp`
