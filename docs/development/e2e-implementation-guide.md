# 端到端测试实现指南

本指南说明如何在本项目中实现和运行 E2E 测试，覆盖 Backend（Jest + Supertest）与 Admin-Web（Playwright）。

---

## 1. 测试类型概览

| 类型 | 工具 | 位置 | 运行命令 |
|------|------|------|----------|
| Backend E2E | Jest + Supertest | `apps/backend/test/*.e2e-spec.ts` | `pnpm --filter @apps/backend test:e2e` |
| Admin-Web E2E | Playwright | `apps/admin-web/e2e/*.spec.ts` | `pnpm --filter admin-web test:e2e` |

---

## 2. Backend E2E 实现

### 2.1 前置条件

- PostgreSQL 已启动（与 dev 环境同一库或独立测试库）
- Redis 已启动
- 环境变量：使用 `.env.development` 或 `.env.test`（`DATABASE_URL`、`REDIS_*` 等）

### 2.2 配置

- 配置文件：`apps/backend/test/jest-e2e.json`
- 匹配规则：`testRegex: ".e2e-spec.ts$"`
- 路径别名：`src/*`、`@src/*` 映射到 `../src/`

### 2.3 编写模式

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Xxx E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SomeExternalService)  // 可选：Mock 外部依赖
      .useValue(mockSomeExternalService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('应返回 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/xxx')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
  });
});
```

### 2.4 现有用例

| 文件 | 说明 |
|------|------|
| `app.e2e-spec.ts` | 冒烟：`/captchaImage`（无需外部依赖）、`/health/readiness`（需 DB+Redis） |
| `business-flow.e2e-spec.ts` | 完整业务流：注册 → 下单 → 分佣 |
| `commission-flow.e2e-spec.ts` | 分佣流程专项 |
| `commission-coupon-points.e2e-spec.ts` | 佣金 + 优惠券 + 积分 |
| `marketing.e2e-spec.ts` | 营销模块 |
| `order-full-chain.e2e-spec.ts` | 订单全链路 |

### 2.5 新增 E2E 步骤

1. 在 `apps/backend/test/` 新建 `xxx.e2e-spec.ts`
2. 导入 `AppModule`，按需 Mock 外部服务（如 WechatService、RiskService）
3. 使用 `request(app.getHttpServer())` 发 HTTP 请求
4. 断言 `res.status`、`res.body` 等
5. 运行：`pnpm --filter @apps/backend test:e2e -- xxx.e2e-spec`

---

## 3. Admin-Web E2E 实现

### 3.1 前置条件

- 前端：`pnpm dev` 或 `pnpm dev:admin` 已启动（默认 `http://localhost:9527`）
- 后端：`pnpm dev:backend` 已启动
- 测试账号：`admin` / `admin123`（具备菜单等权限）

### 3.2 配置

- 配置文件：`apps/admin-web/playwright.config.ts`
- 测试目录：`apps/admin-web/e2e/`
- 认证：`auth.setup.ts` 登录后将状态保存到 `e2e/playwright/.auth/user.json`

### 3.3 编写模式

**冒烟（无需登录）：**

```typescript
import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('首页可访问', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
```

**需登录的路由：**

```typescript
import { expect, test } from '@playwright/test';

// 使用 setup 项目预置的认证状态
const ROUTES = ['/store/finance/dashboard', '/store/finance/commission'];

test.describe('Store Finance routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
```

### 3.4 现有用例

| 文件 | 说明 |
|------|------|
| `auth.setup.ts` | 登录并保存认证状态（setup 项目） |
| `smoke.spec.ts` | 冒烟：首页、登录页可访问 |
| `login-to-home.spec.ts` | 完整登录流程，到达首页 |
| `finance-routes.spec.ts` | 门店财务路由 |
| `coupon-routes.spec.ts` | 优惠券路由 |
| `order-routes.spec.ts` | 订单路由 |
| `pms-routes.spec.ts` | PMS 路由 |
| `product-routes.spec.ts` | 商品路由 |
| `stock-routes.spec.ts` | 库存路由 |
| `distribution-routes.spec.ts` | 分销路由 |
| `store-marketing-routes.spec.ts` | 门店营销路由 |
| `menu-management.spec.ts` | 菜单管理 |

### 3.5 新增 E2E 步骤

1. 在 `apps/admin-web/e2e/` 新建 `xxx.spec.ts`
2. 若需登录：依赖 `setup` 项目（`playwright.config.ts` 中已配置）
3. 使用 `page.goto()`、`page.getByRole()`、`expect()` 等
4. 运行：`pnpm --filter admin-web test:e2e` 或 `pnpm --filter admin-web test:e2e e2e/xxx.spec.ts`

### 3.6 路由测试生成

已有脚本可生成路由 E2E：

```bash
cd apps/admin-web
pnpm generate:route-tests          # 生成指定模块
pnpm generate:route-tests:full    # 完整生成
```

---

## 4. 运行命令速查

| 场景 | 命令 |
|------|------|
| Backend E2E 全部 | `pnpm --filter @apps/backend test:e2e` |
| Backend E2E 单文件 | `pnpm --filter @apps/backend test:e2e -- app.e2e-spec` |
| Admin-Web E2E | 先 `pnpm dev:admin`，另开终端：`pnpm --filter admin-web test:e2e` |
| Admin-Web 冒烟 | `pnpm --filter admin-web test:e2e e2e/smoke.spec.ts` |
| Admin-Web UI 模式 | `pnpm --filter admin-web test:e2e:ui` |

---

## 5. CI 与门禁

按 `testing.mdc` 约定：

- 对接完页面或接口后，**必须运行 E2E**，不得跳过
- E2E 失败需修复后再提交
- 新增关键路由时，需补充 E2E 冒烟

---

## 6. 常见问题

### Backend E2E 连不上 DB/Redis

- 确认 `.env.test` 或 `.env.development` 中 `DATABASE_URL`、Redis 配置正确
- 本地需先启动 PostgreSQL 和 Redis

### Backend /health/liveness 返回 503

- liveness 检查堆内存 ≤ 500MB，Jest 并行加载时可能超限
- 冒烟测试推荐使用 `/captchaImage`（无内存阈值）或 `/health/readiness`

### Admin-Web E2E 登录失败

- 确认 backend 已启动
- 确认 `admin` / `admin123` 账户存在且未禁用
- 删除 `e2e/playwright/.auth/user.json` 后重跑，强制重新登录

### Playwright 安装

首次运行 `test:e2e` 时会自动安装浏览器；若失败可手动执行：

```bash
cd apps/admin-web && pnpm exec playwright install
```
