import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { expect, test as setup } from '@playwright/test';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const AUTH_FILE = path.join(__dirname, 'playwright', '.auth', 'user.json');

/** 测试账户：admin / admin123（具备菜单管理等权限） */
const TEST_USER = { username: 'admin', password: 'admin123' };

/**
 * 登录并保存认证状态，供 E2E 测试复用
 * 执行顺序：setup 项目先运行，依赖它的测试项目使用已保存的 storageState
 */
setup('authenticate', async ({ page }) => {
  await page.goto('/login/pwd-login');
  await expect(page.locator('body')).toBeVisible();

  const usernameInput = page.getByPlaceholder(/请输入用户名|Please enter user name/);
  const passwordInput = page.getByPlaceholder(/请输入密码|Please enter password/);

  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await usernameInput.fill(TEST_USER.username);
  await passwordInput.fill(TEST_USER.password);

  const loginBtn = page.getByRole('button', { name: /登录|Login/ });
  await loginBtn.click();

  // 等待跳转：登录成功会离开登录页
  try {
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 });
  } catch {
    const demoCard = page.locator('.demo-account-card');
    if (await demoCard.isVisible()) {
      await demoCard.click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /登录|Login/ }).click();
      await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 });
    } else {
      throw new Error('登录失败，请确保后端已启动且 admin 账户可用');
    }
  }

  // 确保已登录
  await expect(page.locator('body')).toBeVisible();

  const authDir = path.dirname(AUTH_FILE);
  if (!existsSync(authDir)) {
    mkdirSync(authDir, { recursive: true });
  }
  await page.context().storageState({ path: AUTH_FILE });
});
