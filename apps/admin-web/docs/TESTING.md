# Admin-Web 前端测试说明

本仓库包含**单元/组件测试（Vitest）** 与 **E2E 测试（Playwright）** 两套方案。

---

## 一、环境准备（只需做一次）

在项目根目录或 `apps/admin-web` 下安装依赖（若尚未安装测试相关包）：

```bash
# 在仓库根目录
pnpm install

# 或仅给 admin-web 装依赖（已在 package.json 中声明）
pnpm install --filter @apps/admin-web
```

首次使用 Playwright 时需安装浏览器（仅第一次）：

```bash
cd apps/admin-web
pnpm exec playwright install chromium
```

---

## 二、单元 / 组件测试（Vitest）

- **用途**：测工具函数、单个 Vue 组件逻辑与渲染。
- **运行环境**：Node + jsdom，不启动浏览器，速度快。

### 命令

| 命令                 | 说明                     |
| -------------------- | ------------------------ |
| `pnpm test`          | 监听模式，改代码自动重跑 |
| `pnpm test:run`      | 单次运行，适合 CI        |
| `pnpm test:coverage` | 单次运行并生成覆盖率报告 |

### 约定

- 测试文件：`src/**/*.spec.{ts,tsx,vue}` 或 `*.test.{ts,tsx,vue}`。
- 示例：`src/utils/common.spec.ts`（测 `common.ts` 中的纯函数）。

### 配置与入口

- 配置：`vitest.config.ts`（别名 `@/`、`~/` 与 Vite 一致）。
- 全局 setup：`src/test/setup.ts`（可在此 mock `window.$message`、`$t` 等）。

---

## 三、E2E 测试（Playwright）

- **用途**：在真实浏览器中测整页、多页与关键业务流程。
- **运行环境**：需本地先跑起前端（或由配置自动启动）。

### 命令

| 命令               | 说明                                               |
| ------------------ | -------------------------------------------------- |
| `pnpm test:e2e`    | 运行全部 E2E 用例（默认会尝试自动启动 `pnpm dev`） |
| `pnpm test:e2e:ui` | 打开 Playwright UI 逐条运行、调试                  |

### 约定

- 用例目录：`e2e/`，推荐 `*.spec.ts`。
- 示例：`e2e/smoke.spec.ts`（访问首页、登录页的冒烟）。

### 配置

- 配置：`playwright.config.ts`。
- 默认 `baseURL`: `http://localhost:9527`（与 `pnpm dev` 端口一致）；可通过环境变量 `PLAYWRIGHT_BASE_URL` 覆盖。
- 非 CI 时可选自动启动 dev server（见配置内 `webServer`）。

### 注意

- 若未配置 `webServer`，运行 E2E 前需**先执行** `pnpm dev`，再在另一终端执行 `pnpm test:e2e`。

---

## 四、CI 中如何跑

1. **单元测试**：`pnpm test:run`（或 `pnpm test:coverage` 需要覆盖率时）。
2. **E2E**：先 `pnpm build`，再 `pnpm preview` 或起静态服务，设置 `PLAYWRIGHT_BASE_URL` 后执行 `pnpm test:e2e`；或在 Playwright 配置里为 CI 单独配置 `webServer`。

---

## 五、新增测试的推荐步骤

| 类型 | 步骤                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 单元 | 在对应模块旁新增 `xxx.spec.ts`，从 `vitest` 引入 `describe/it/expect`，写断言后执行 `pnpm test:run`。                                                                                     |
| 组件 | 同目录或 `src/test/` 下新增 `ComponentName.spec.vue` 或 `ComponentName.spec.ts`，用 `@vue/test-utils` 的 `mount` 挂载组件，断言 DOM 或 emit；复杂全局依赖在 `src/test/setup.ts` 中 mock。 |
| E2E  | 在 `e2e/` 下新增或修改 `*.spec.ts`，用 `page.goto`、`page.click`、`expect` 等编写流程，执行 `pnpm test:e2e`。                                                                             |
