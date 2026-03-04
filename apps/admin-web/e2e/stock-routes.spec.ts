import { expect, test } from '@playwright/test';

/**
 * 门店库存路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/store/stock/stock-requirements.md
 * 覆盖：库存管理
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = ['/store/stock'];

test.describe('Store Stock routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
