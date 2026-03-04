import { expect, test } from '@playwright/test';

/**
 * 登录到首页 E2E 测试
 * 流程：打开登录页 → 输入账号密码 → 登录 → 验证到达首页
 * 若出现网络错误，测试会失败并汇报具体失败请求
 */

const TEST_USER = { username: 'admin', password: 'admin123' };

/** 忽略的请求 URL 模式（如静态资源、第三方脚本等可选忽略） */
const IGNORE_URL_PATTERNS = [
  /\.png$/i,
  /\.ico$/i,
  /\.woff2?$/i,
  /\.ttf$/i,
  /google-analytics/i,
  /gtm\.js/i
];

function shouldIgnoreUrl(url: string): boolean {
  return IGNORE_URL_PATTERNS.some(p => p.test(url));
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('登录到首页', () => {
  test('完整登录流程，到达首页且无网络错误', async ({ page }) => {
    const failedRequests: Array<{ url: string; failure?: string }> = [];

    page.on('requestfailed', request => {
      const url = request.url();
      if (!shouldIgnoreUrl(url)) {
        failedRequests.push({
          url,
          failure: request.failure()?.errorText ?? '未知错误'
        });
      }
    });

    await page.goto('/login/pwd-login');
    await expect(page.locator('body')).toBeVisible();

    const usernameInput = page.getByPlaceholder(/请输入用户名|Please enter user name/);
    const passwordInput = page.getByPlaceholder(/请输入密码|Please enter password/);

    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(TEST_USER.username);
    await passwordInput.fill(TEST_USER.password);

    const loginBtn = page.getByRole('button', { name: /登录|Login/ });
    await loginBtn.click();

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

    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/login/);

    const pathname = new URL(currentUrl).pathname.replace(/\/$/, '') || '/';
    const isHome = pathname === '/' || pathname === '/home';
    expect(isHome, `登录后应到达首页，当前路径: ${pathname}`).toBeTruthy();

    await expect(page.locator('body')).toBeVisible();

    if (failedRequests.length > 0) {
      const report = failedRequests
        .map((r, i) => `${i + 1}. ${r.url}\n   原因: ${r.failure}`)
        .join('\n');
      throw new Error(`检测到 ${failedRequests.length} 个网络请求失败:\n${report}`);
    }
  });
});
