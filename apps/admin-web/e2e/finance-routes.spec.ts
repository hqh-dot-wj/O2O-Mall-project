import { expect, test } from '@playwright/test';

/**
 * 门店财务路由 E2E 冒烟测试（需登录）
 * 来源：apps/backend/docs/requirements/store/finance/finance-requirements.md
 * 覆盖：资金看板、佣金明细、提现管理、财务流水、分销配置
 *
 * 使用 setup 项目预置的认证状态，验证登录后可访问各路由
 */
const ROUTES = [
  '/store/finance/dashboard',
  '/store/finance/commission',
  '/store/finance/withdrawal',
  '/store/finance/ledger',
  '/store/finance/distribution-config'
];

test.describe('Store Finance routes (authenticated)', () => {
  for (const routePath of ROUTES) {
    test(`${routePath} 登录后可访问`, async ({ page }) => {
      await page.goto(routePath);
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
