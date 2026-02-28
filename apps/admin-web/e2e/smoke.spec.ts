import { expect, test } from '@playwright/test';

/**
 * 冒烟 E2E：访问首页与登录页，确保应用可打开
 * 使用空 storageState 以测试未登录态
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Smoke', () => {
  test('home / login page is reachable', async ({ page }) => {
    await page.goto('/');
    // 未登录时通常会重定向到登录页或展示登录表单
    await expect(page).toHaveURL(/\//);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login route exists', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('body')).toBeVisible();
  });
});
