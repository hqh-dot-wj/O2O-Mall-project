import { expect, test } from '@playwright/test';

/**
 * store/marketing 路由完整 E2E 测试（需登录）
 * 来源：src/views/store/marketing
 * 生成脚本：pnpm generate:route-tests store/marketing --full
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
  '/store/marketing',
  '/store/marketing/activity',
  '/store/marketing/coupon-distribution',
  '/store/marketing/coupon-usage',
  '/store/marketing/distribution',
  '/store/marketing/distribution-application',
  '/store/marketing/distribution-dashboard',
  '/store/marketing/distribution-level',
  '/store/marketing/distribution-product'
];

test.describe('store/marketing routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
