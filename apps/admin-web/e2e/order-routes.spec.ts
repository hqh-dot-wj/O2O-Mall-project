import { expect, test } from '@playwright/test';

/**
 * 门店订单路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/store/order/order-requirements.md
 * 覆盖：订单列表、待派单、订单详情
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = ['/store/order/list', '/store/order/dispatch', '/store/order/detail'];

test.describe('Store Order routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
