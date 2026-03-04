import { expect, test } from '@playwright/test';

/**
 * 优惠券路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/marketing/coupon/coupon-requirements.md
 * 覆盖：优惠券模板、统计数据、门店发放、门店使用记录
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
  '/marketing/coupon/template',
  '/marketing/statistics/coupon',
  '/store/distribution/coupon-distribution',
  '/store/distribution/coupon-usage'
];

test.describe('Coupon routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
