import { test, expect } from '@playwright/test';

/**
 * 冒烟 E2E：访问首页与登录页，确保应用可打开
 * 实际登录与业务流程测试可在此基础上扩展
 */
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
