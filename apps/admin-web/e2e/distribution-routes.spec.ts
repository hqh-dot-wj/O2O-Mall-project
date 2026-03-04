import { expect, test } from '@playwright/test';

/**
 * 门店分销路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/store/distribution/distribution-requirements.md
 * 覆盖：分销配置、商品级分佣、等级体系、申请审核、数据看板
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
  '/store/distribution/distribution',
  '/store/distribution/distribution-product',
  '/store/distribution/distribution-level',
  '/store/distribution/distribution-application',
  '/store/distribution/distribution-dashboard'
];

test.describe('Distribution routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
