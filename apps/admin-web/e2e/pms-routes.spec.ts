import { expect, test } from '@playwright/test';

/**
 * PMS 路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/pms/pms-requirements.md §5.1
 * 覆盖：商品管理、分类管理、品牌管理、属性管理
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
  '/pms/attribute',
  '/pms/brand',
  '/pms/category',
  '/pms/global-product',
  '/pms/global-product-create'
];

test.describe('PMS routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
