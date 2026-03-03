---
inclusion: fileMatch
fileMatchPattern: 'apps/miniapp-client/src/**/*.{vue,ts,tsx}'
---

# miniapp-client 开发规范（小程序 + H5）

基于 **uniapp + Vue3 + TypeScript + Vite5 + UnoCSS**，支持 H5、微信小程序。核心配置：`vite.config.ts`、`pages.config.ts`、`manifest.config.ts`、`uno.config.ts`。

## 1. 目录结构

| 目录                       | 用途              |
| -------------------------- | ----------------- |
| `src/pages/`               | 页面              |
| `src/components/`          | 全局组件          |
| `src/pages/xx/components/` | 页面级组件        |
| `src/api/`                 | API 接口定义      |
| `src/http/`                | HTTP 封装、拦截器 |
| `src/store/`               | Pinia 状态        |
| `src/tabbar/`              | 自定义 tabbar     |
| `src/utils/`               | 工具函数          |

## 2. 条件编译规范（核心）

**平台差异必须用条件编译**，禁止用运行时判断。

- JS/TS：`// #ifdef H5` ... `// #endif`
- CSS：`/* #ifdef H5 */` ... `/* #endif */`
- 模板：`<!-- #ifdef H5 -->` ... `<!-- #endif -->`
- 支持 `||` 组合：`// #ifdef H5 || MP-WEIXIN`

## 3. 样式规范

- **Design Token**：所有色值、字号、间距定义在 `src/style/design-tokens.scss`，**禁止硬编码色值或尺寸**
- **布局单位**：优先 rpx；间距使用 8pt 网格（`space-xs/sm/md/lg/xl`）
- **UnoCSS**：优先原子类；语义化类名如 `text-primary`、`text-ink`、`bg-fill`、`bg-surface`
- **SCSS**：`<style lang="scss" scoped>`
- **详细 UI/UX 规范**：参见 `miniapp-ui-spec.md` 和 `miniapp-d2c.md`

## 4. Vue3 + TypeScript

- Composition API、`<script setup lang="ts">`；顺序：script → template → style
- 组件名 PascalCase；文件 kebab-case
- **禁止 any**；`import type` 导入类型
- `definePage` 配置在文件最上方

## 5. 包体积与性能

- 主包 < 1.5M，单包 ≤ 2M；超 1.5M 用分包
- 静态资源 > 200K 放 CDN
- 长列表使用 `z-paging` 或虚拟列表
- 防抖/节流：搜索输入、滚动等高频逻辑

## 6. 安全与隐私

- 不信任用户/第三方提交数据，必须校验
- 敏感数据禁止明文存储
- 使用位置、相册等需在 `manifest.config.ts` 声明

## 7. 命名与文件

- 目录/文件：kebab-case；组件名：PascalCase；变量/方法：camelCase；常量：UPPER_SNAKE_CASE
- 自定义组件：`fg-*`（easycom 已配置）

## 8. 命令

- H5：`pnpm dev`/`pnpm dev:h5`；微信：`pnpm dev:mp`/`pnpm dev:mp-weixin`
- 构建：`pnpm build:h5`、`pnpm build:mp`
- 质量：`pnpm lint`、`pnpm lint:fix`、`pnpm type-check`
